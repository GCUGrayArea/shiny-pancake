/**
 * Theme Context - Manages app-wide theme (light/dark mode)
 * Supports automatic system theme detection and user preferences
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, ThemeColors, ThemeMode } from '../constants/themes';

interface ThemeContextType {
  /** Current theme mode (light/dark/auto) */
  themeMode: ThemeMode;
  /** Active color scheme (light or dark) - resolved from mode and system */
  colorScheme: 'light' | 'dark';
  /** Current theme colors */
  colors: ThemeColors;
  /** Set theme mode */
  setThemeMode: (mode: ThemeMode) => void;
  /** Check if dark mode is active */
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@messageai_theme_mode';

interface ThemeProviderProps {
  children: ReactNode;
  /** User theme mode from database - used to sync theme on login */
  userThemeMode?: 'light' | 'dark' | 'auto';
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, userThemeMode }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Determine active color scheme based on mode and system preference
  const colorScheme: 'light' | 'dark' =
    themeMode === 'auto'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : themeMode === 'dark'
      ? 'dark'
      : 'light';

  const colors = THEMES[colorScheme];
  const isDark = colorScheme === 'dark';

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Sync with user's theme mode from database
  useEffect(() => {
    if (userThemeMode && userThemeMode !== themeMode) {
      console.log('Syncing theme from user data:', userThemeMode);
      setThemeModeState(userThemeMode);
    }
  }, [userThemeMode]);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  /**
   * Load theme preference from AsyncStorage
   */
  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto')) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  /**
   * Set theme mode and persist to storage
   */
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const value: ThemeContextType = {
    themeMode,
    colorScheme,
    colors,
    setThemeMode,
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Hook to access theme context
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
