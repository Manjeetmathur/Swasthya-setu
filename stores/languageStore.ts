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
    (set, get) => {
      // Initialize with current translations
      const initialLanguage = 'English'
      
      return {
        language: initialLanguage,
        translations: getTranslation(initialLanguage),
        
        setLanguage: (language: Language) => {
          const translations = getTranslation(language)
          set({ language, translations })
        },
        
        t: (key: string) => {
          const state = get()
          // Always load fresh translations from source files (never use stale persisted data)
          const currentLanguage = state.language || initialLanguage
          const translations = getTranslation(currentLanguage)
          
          const keys = key.split('.')
          let value = translations
          
          for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
              value = value[k]
            } else {
              // Fallback to English if key not found in current language
              const englishTranslations = getTranslation('English')
              let englishValue = englishTranslations
              for (const ek of keys) {
                if (englishValue && typeof englishValue === 'object' && ek in englishValue) {
                  englishValue = englishValue[ek]
                } else {
                  console.warn(`Translation key not found: ${key}`)
                  return key // Return key if not found in English either
                }
              }
              return typeof englishValue === 'string' || Array.isArray(englishValue) ? englishValue : key
            }
          }
          
          return typeof value === 'string' || Array.isArray(value) ? value : key
        }
      }
    },
    {
      name: 'language-storage',
      // Only persist language preference, not translations (to avoid stale data)
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        // When rehydrating, always load fresh translations
        if (state) {
          state.translations = getTranslation(state.language || 'English')
        }
      },
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