/**
 * Theme color schemes for light and dark modes
 * Designed for optimal readability and visual hierarchy
 */

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  // Base colors
  background: string;
  surface: string;
  surfaceElevated: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Primary/accent colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Message bubbles
  messageBubbleSent: string;
  messageBubbleSentText: string;
  messageBubbleReceived: string;
  messageBubbleReceivedText: string;

  // UI elements
  border: string;
  divider: string;
  inputBackground: string;
  inputBorder: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Special states
  online: string;
  offline: string;
  typing: string;

  // Overlays
  overlay: string;
  modalBackground: string;

  // Shadows
  shadow: string;
}

export const LIGHT_THEME: ThemeColors = {
  // Base colors
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceElevated: '#FFFFFF',

  // Text colors
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',

  // Primary/accent colors
  primary: '#2196F3',
  primaryLight: '#64B5F6',
  primaryDark: '#1976D2',

  // Message bubbles
  messageBubbleSent: '#2196F3',
  messageBubbleSentText: '#FFFFFF',
  messageBubbleReceived: '#F0F0F0',
  messageBubbleReceivedText: '#000000',

  // UI elements
  border: '#E0E0E0',
  divider: '#E0E0E0',
  inputBackground: '#F5F5F5',
  inputBorder: '#DDDDDD',

  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Special states
  online: '#4CAF50',
  offline: '#999999',
  typing: '#2196F3',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: '#FFFFFF',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const DARK_THEME: ThemeColors = {
  // Base colors
  background: '#121212',
  surface: '#1E1E1E',
  surfaceElevated: '#2C2C2C',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',
  textInverse: '#000000',

  // Primary/accent colors (slightly lighter for dark mode)
  primary: '#64B5F6',
  primaryLight: '#90CAF9',
  primaryDark: '#42A5F5',

  // Message bubbles
  messageBubbleSent: '#1976D2',
  messageBubbleSentText: '#FFFFFF',
  messageBubbleReceived: '#2C2C2C',
  messageBubbleReceivedText: '#FFFFFF',

  // UI elements
  border: '#333333',
  divider: '#333333',
  inputBackground: '#2C2C2C',
  inputBorder: '#444444',

  // Status colors (adjusted for dark mode)
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  info: '#64B5F6',

  // Special states
  online: '#66BB6A',
  offline: '#808080',
  typing: '#64B5F6',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: '#2C2C2C',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export const THEMES = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
};
