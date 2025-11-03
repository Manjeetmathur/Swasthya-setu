import React, { useEffect } from 'react'
import { useColorScheme } from 'nativewind'
import { useThemeStore } from '@/stores/themeStore'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { colorScheme, setColorScheme } = useColorScheme()
  const { theme, isDark, initializeTheme } = useThemeStore()

  useEffect(() => {
    initializeTheme()
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      setColorScheme('dark')
    } else if (theme === 'light') {
      setColorScheme('light')
    } else {
      setColorScheme('system')
    }
  }, [theme, setColorScheme])

  return <>{children}</>
}