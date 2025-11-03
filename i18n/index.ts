import { en } from './locales/en'
import { hi } from './locales/hi'

export type Language = 'English' | 'Hindi'

export const translations = {
  English: en,
  Hindi: hi
}

export const getTranslation = (language: Language) => {
  return translations[language] || translations.English
}

// Translation function - will be used from the store
export const t = (key: string): string => {
  // This will be overridden by the store's t function
  // Fallback to English if store is not available
  const translation = getTranslation('English')
  
  const keys = key.split('.')
  let result: any = translation
  
  for (const k of keys) {
    result = result?.[k]
  }
  
  return result || key
}