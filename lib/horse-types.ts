// lib/horse-types.ts

// Add the TR option to your existing genders if it isn't there
export const GENDER_OPTIONS = [
  { value: 'stallion', label: 'Stallion' },
  { value: 'gelding', label: 'Gelding' },
  { value: 'mare', label: 'Mare' },
  { value: 'tr', label: 'TR' },
]

export type GenderType = 'stallion' | 'gelding' | 'mare' | 'tr'

export const GENDER_META: Record<
  GenderType,
  { label: string; dot: string; cell: string; text: string }
> = {
  stallion: {
    label: 'Stallion',
    dot: 'bg-red-500',
    cell: 'bg-red-100 border-red-300 hover:bg-red-200',
    text: 'text-red-900',
  },
  gelding: {
    label: 'Gelding',
    dot: 'bg-blue-500',
    cell: 'bg-blue-100 border-blue-300 hover:bg-blue-200',
    text: 'text-blue-900',
  },
  mare: {
    label: 'Mare',
    dot: 'bg-pink-500',
    cell: 'bg-pink-100 border-pink-300 hover:bg-pink-200',
    text: 'text-pink-900',
  },
  tr: {
    label: 'TR',
    dot: 'bg-yellow-500',
    cell: 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200',
    text: 'text-yellow-900',
  },
}