// components/admin-phone-manager.tsx
'use client'

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Phone, Loader2, Plus, Trash2 } from "lucide-react"
import { setAdminPhone } from "@/app/actions/stables"
import { useDictionary } from '@/context/dictionary-context'

type Contact = { name: string; phone: string }

export function AdminPhoneManager({ initialPhone }: { initialPhone: string | null }) {
  const { dictionary , lang} = useDictionary()
  const t = dictionary.adminPhone

  const [isPending, startTransition] = useTransition()
  
  // Parse existing JSON string or default to one empty object
  const [contacts, setContacts] = useState<Contact[]>(() => {
    if (initialPhone) {
      try {
        const parsed = JSON.parse(initialPhone)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch (e) {
        // Fallback for legacy single-string data
        return [{ name: 'Admin', phone: initialPhone }]
      }
    }
    return [{ name: '', phone: '' }]
  })

  const handleUpdateContact = (index: number, field: keyof Contact, value: string) => {
    const newContacts = [...contacts]
    newContacts[index][field] = value
    setContacts(newContacts)
  }

  const handleAddContact = () => {
    setContacts([...contacts, { name: '', phone: '' }])
  }

  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    startTransition(async () => {
      // Filter out entirely empty rows
      const validContacts = contacts.filter(c => c.name.trim() || c.phone.trim())
      const contactsJson = JSON.stringify(validContacts)

      const res = await setAdminPhone(contactsJson, lang)
      if (res.ok) {
        toast.success(t.success)
        if (validContacts.length === 0) setContacts([{ name: '', phone: '' }])
        else setContacts(validContacts)
      } else {
        toast.error(res.error || t.error)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="size-4 text-primary" />
          {t.title}
        </CardTitle>
        <CardDescription>
          {t.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {contacts.map((contact, index) => (
          <div key={index} className="flex flex-col sm:flex-row gap-2 items-center">
            <Input
              type="text"
              placeholder="Name (e.g. Manager)"
              value={contact.name}
              onChange={(e) => handleUpdateContact(index, 'name', e.target.value)}
              className="flex-1"
            />
            <Input
              type="tel"
              placeholder={t.placeholder}
              value={contact.phone}
              onChange={(e) => handleUpdateContact(index, 'phone', e.target.value)}
              className="flex-1 pl-2"
            />
            <Button 
              variant="destructive" 
              size="icon" 
              onClick={() => handleRemoveContact(index)}
              disabled={contacts.length === 1 && !contact.name && !contact.phone}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        
        <div className="flex justify-between items-center mt-2">
          <Button variant="outline" onClick={handleAddContact} type="button">
            <Plus className="size-4 mr-2" /> Add Contact
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}