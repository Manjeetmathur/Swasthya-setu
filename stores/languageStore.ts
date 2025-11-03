import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Language, getTranslation } from '@/i18n'

interface LanguageState {
  language: Language
  translations: any
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'English',
      translations: getTranslation('English'),
      
      setLanguage: (language: Language) => {
        const translations = getTranslation(language)
        set({ language, translations })
      },
      
      t: (key: string) => {
        const { translations } = get()
        const keys = key.split('.')
        let value = translations
        
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k]
          } else {
            return key // Return key if translation not found
          }
        }
        
        return typeof value === 'string' || Array.isArray(value) ? value : key
      }
    }),
    {
      name: 'language-storage',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name)
          return value ? JSON.parse(value) : null
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name)
        }
      }
    }
  )
)