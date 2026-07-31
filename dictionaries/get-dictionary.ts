const dictionaries = {
  en: () => import('./en.json').then((module) => module.default),
  ar: () => import('./ar.json').then((module) => module.default),
}

// Accept a standard string, but ensure it safely matches our keys
export const getDictionary = async (locale: string) => {
  // If it's not 'ar', default to 'en'
  const safeLocale = locale === 'ar' ? 'ar' : 'en'
  return dictionaries[safeLocale]()
}