// context/dictionary-context.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'

const DictionaryContext = createContext<any>(null)

export function DictionaryProvider({
  dictionary,
  lang,
  children,
}: {
  dictionary: any
   lang: string
  children: ReactNode
}) {
  return (
    <DictionaryContext.Provider value={{ dictionary, lang }}>
      {children}
    </DictionaryContext.Provider>
  )
}

export function useDictionary() {
  const context = useContext(DictionaryContext)
  if (!context) {
    throw new Error('useDictionary must be used within a DictionaryProvider')
  }
  return context
}