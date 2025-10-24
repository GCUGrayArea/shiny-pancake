/**
 * Translation Bubble Component
 * Displays translated message text with language indicators
 * Used within MessageBubble for on-demand translations
 */

import React from 'react';
import { View, StyleSheet, Text as RNText, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import type { LanguageCode } from '@/services/ai/types';

interface TranslationBubbleProps {
  /** Original message text */
  original: string;
  /** Translated text */
  translated?: string;
  /** Source language code */
  fromLang: LanguageCode;
  /** Target language code */
  toLang: LanguageCode;
  /** Whether translation is currently loading */
  loading?: boolean;
  /** Error message if translation failed */
  error?: string;
  /** Whether this is the user's own message */
  isOwnMessage: boolean;
  /** Callback when user toggles between original and translated */
  onToggleOriginal?: () => void;
  /** Whether showing original (true) or translation (false) */
  showingOriginal?: boolean;
}

/**
 * Flag emoji mapping for language codes
 */
const LANGUAGE_FLAGS: Record<LanguageCode, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  ru: '🇷🇺',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  ar: '🇸🇦',
  hi: '🇮🇳',
  nl: '🇳🇱',
  pl: '🇵🇱',
  sv: '🇸🇪',
  tr: '🇹🇷',
  unknown: '🌐',
};

/**
 * Get flag emoji for language code
 */
function getFlag(lang: LanguageCode): string {
  return LANGUAGE_FLAGS[lang] || '🌐';
}

export default function TranslationBubble({
  original,
  translated,
  fromLang,
  toLang,
  loading = false,
  error,
  isOwnMessage,
  onToggleOriginal,
  showingOriginal = false,
}: TranslationBubbleProps) {
  // Render language indicator badge
  const renderLanguageBadge = () => {
    if (loading) {
      return (
        <View style={styles.badge}>
          <ActivityIndicator size="small" color={isOwnMessage ? '#FFF' : '#666'} />
          <Text
            variant="bodySmall"
            style={[
              styles.badgeText,
              isOwnMessage ? styles.ownBadgeText : styles.otherBadgeText,
            ]}
          >
            Translating...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.badge}>
          <RNText style={styles.errorIcon}>⚠️</RNText>
          <Text
            variant="bodySmall"
            style={[
              styles.badgeText,
              isOwnMessage ? styles.ownBadgeText : styles.otherBadgeText,
            ]}
          >
            Translation failed
          </Text>
        </View>
      );
    }

    if (translated) {
      return (
        <View style={styles.badge}>
          <RNText style={styles.badgeEmoji}>
            {getFlag(fromLang)} {fromLang.toUpperCase()} → {getFlag(toLang)} {toLang.toUpperCase()}
          </RNText>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Main translated text */}
      {!loading && translated && !error && (
        <RNText
          style={[
            styles.translatedText,
            isOwnMessage ? styles.ownTranslatedText : styles.otherTranslatedText,
          ]}
        >
          {showingOriginal ? original : translated}
        </RNText>
      )}

      {/* Language badge and toggle */}
      <View style={styles.footer}>
        {renderLanguageBadge()}

        {/* Toggle button */}
        {translated && !loading && !error && onToggleOriginal && (
          <TouchableOpacity
            onPress={onToggleOriginal}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.toggleButton}
          >
            <Text
              variant="bodySmall"
              style={[
                styles.toggleText,
                isOwnMessage ? styles.ownToggleText : styles.otherToggleText,
              ]}
            >
              {showingOriginal ? 'Show Translation' : 'Show Original'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error message */}
      {error && (
        <RNText
          style={[
            styles.errorText,
            isOwnMessage ? styles.ownErrorText : styles.otherErrorText,
          ]}
        >
          {error}
        </RNText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  translatedText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 6,
  },
  ownTranslatedText: {
    color: 'rgba(255, 255, 255, 0.95)',
  },
  otherTranslatedText: {
    color: 'rgba(0, 0, 0, 0.87)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeEmoji: {
    fontSize: 11,
  },
  badgeText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  ownBadgeText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherBadgeText: {
    color: 'rgba(0, 0, 0, 0.6)',
  },
  toggleButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  ownToggleText: {
    color: '#FFFFFF',
  },
  otherToggleText: {
    color: '#2196F3',
  },
  errorIcon: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  ownErrorText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherErrorText: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
});
