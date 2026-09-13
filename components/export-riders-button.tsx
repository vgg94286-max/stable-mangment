'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getRiderReservationsExport } from '@/app/actions/stables'
import { useDictionary } from '@/context/dictionary-context'

// Brand navy used across the app (see --primary in globals.css)
const BRAND_COLOR = 'FF003A70'
const BRAND_LIGHT = 'FFE8F0F7'
const ROW_ALT_COLOR = 'FFF4F7FA'
const BORDER_COLOR = 'FFD9DEE3'

export function ExportRidersButton({ dict }: { dict: any }) {
  const [loading, setLoading] = useState(false)
  const { lang } = useDictionary()
  const t = dict.riderDirectory
  const isRtl = lang === 'ar'

  async function handleExport() {
    setLoading(true)
    try {
      const rows = await getRiderReservationsExport()

      if (rows.length === 0) {
        toast.info(t.exportEmpty)
        return
      }

      // exceljs is only needed for this one action, so it's loaded on demand
      // instead of being bundled into the main admin page chunk.
      const ExcelJS = (await import('exceljs')).default

      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'Fanda Stable Management'
      workbook.created = new Date()

      const sheet = workbook.addWorksheet('Active Reservations', {
        views: [{ rightToLeft: isRtl, state: 'frozen', ySplit: 3 }],
      })

      const columns = [
        { header: t.exportColRiderId, key: 'rider_id', width: 12, numeric: true },
        { header: t.exportColRiderName, key: 'rider_name', width: 26, numeric: false },
        { header: t.exportColHorseId, key: 'horse_id', width: 12, numeric: true },
        { header: t.exportColHorseName, key: 'horse_name', width: 22, numeric: false },
        { header: t.exportColBarn, key: 'barn', width: 12, numeric: false },
        { header: t.exportColNumber, key: 'number', width: 12, numeric: true },
      ]
      sheet.columns = columns.map((c) => ({ key: c.key, width: c.width }))

      const textAlign: 'left' | 'right' = isRtl ? 'right' : 'left'

      // --- Title band (merged across all columns) ---
      sheet.mergeCells(1, 1, 1, columns.length)
      const titleCell = sheet.getCell(1, 1)
      titleCell.value = t.exportSheetTitle
      titleCell.font = { bold: true, size: 14, color: { argb: BRAND_COLOR } }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT } }
      sheet.getRow(1).height = 26

      sheet.mergeCells(2, 1, 2, columns.length)
      const subtitleCell = sheet.getCell(2, 1)
      const dateStr = new Date().toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      subtitleCell.value = `${t.exportGeneratedOn} ${dateStr} — ${rows.length} ${t.exportRowsLabel}`
      subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF5B6B7A' } }
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      sheet.getRow(2).height = 18

      // --- Header row ---
      const headerRow = sheet.getRow(3)
      columns.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1)
        cell.value = col.header
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLOR } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin', color: { argb: BORDER_COLOR } },
          bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
          left: { style: 'thin', color: { argb: BORDER_COLOR } },
          right: { style: 'thin', color: { argb: BORDER_COLOR } },
        }
      })
      headerRow.height = 20

      // --- Data rows ---
      rows.forEach((r, idx) => {
        const row = sheet.addRow({
          rider_id: r.rider_id,
          rider_name: r.rider_name,
          horse_id: r.horse_id,
          horse_name: r.horse_name,
          barn: r.barn,
          number: r.number,
        })

        const isAlt = idx % 2 === 1
        columns.forEach((col, i) => {
          const cell = row.getCell(i + 1)
          cell.alignment = {
            horizontal: col.numeric ? 'center' : textAlign,
            vertical: 'middle',
          }
          cell.border = {
            top: { style: 'thin', color: { argb: BORDER_COLOR } },
            bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
            left: { style: 'thin', color: { argb: BORDER_COLOR } },
            right: { style: 'thin', color: { argb: BORDER_COLOR } },
          }
          if (isAlt) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT_COLOR } }
          }
        })
        row.height = 18
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      link.href = url
      link.download = `riders-active-reservations-${date}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(t.exportError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleExport}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Download className="size-4" aria-hidden />
      )}
      {t.exportButton}
    </Button>
  )
}