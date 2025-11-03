import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Appearance } from 'react-native'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => Promise<void>
  initializeTheme: () => Promise<void>
}

const THEME_STORAGE_KEY = 'app_theme'

const getSystemTheme = () => {
  return Appearance.getColorScheme() === 'dark'
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  isDark: false,
  
  setTheme: async (theme: Theme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme)
      
      let isDark = false
      if (theme === 'dark') {
        isDark = true
      } else if (theme === 'light') {
        isDark = false
      } else {
        // system theme
        isDark = getSystemTheme()
      }
      
      set({ theme, isDark })
    } catch (error) {
      console.error('Failed to save theme:', error)
    }
  },
  
  initializeTheme: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY) as Theme
      const theme = savedTheme || 'light'
      
      let isDark = false
      if (theme === 'dark') {
        isDark = true
      } else if (theme === 'light') {
        isDark = false
      } else {
        // system theme
        isDark = getSystemTheme()
      }
      
      set({ theme, isDark })
    } catch (error) {
      console.error('Failed to load theme:', error)
      set({ theme: 'light', isDark: false })
    }
  }
}))