/**
 * AI Settings Screen
 * Configure AI features including auto-translation
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Switch, ActivityIndicator, Divider, Menu, Button } from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserInFirebase } from '@/services/firebase-user.service';
import { updateUser } from '@/services/local-user.service';

// Language options for the picker
const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'sv', name: 'Swedish (Svenska)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
];

export default function AISettingsScreen() {
  const { user, refreshUser } = useAuth();
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [menuVisible, setMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current settings
  useEffect(() => {
    if (user) {
      setAutoTranslateEnabled(user.autoTranslateEnabled || false);
      setPreferredLanguage(user.preferredLanguage || 'en');
      setLoading(false);
    }
  }, [user]);

  /**
   * Save settings to Firebase and local database
   */
  const saveSettings = async (
    newAutoTranslate: boolean,
    newLanguage: string
  ) => {
    if (!user) return;

    try {
      setSaving(true);

      const updates = {
        autoTranslateEnabled: newAutoTranslate,
        preferredLanguage: newLanguage,
      };

      // Update Firebase
      await updateUserInFirebase(user.uid, updates);

      // Update local database
      await updateUser(user.uid, updates);

      // Refresh user in context
      await refreshUser();
    } catch (error) {
      console.error('Failed to save AI settings:', error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle auto-translate toggle
   */
  const handleAutoTranslateToggle = async () => {
    const newValue = !autoTranslateEnabled;
    setAutoTranslateEnabled(newValue);
    await saveSettings(newValue, preferredLanguage);
  };

  /**
   * Handle language selection
   */
  const handleLanguageChange = async (language: string) => {
    setPreferredLanguage(language);
    setMenuVisible(false);
    await saveSettings(autoTranslateEnabled, language);
  };

  /**
   * Get language name from code
   */
  const getLanguageName = (code: string): string => {
    const lang = LANGUAGE_OPTIONS.find(l => l.code === code);
    return lang ? lang.name : code;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Translation Settings
        </Text>
        <Text variant="bodySmall" style={styles.sectionDescription}>
          Automatically translate messages to your preferred language
        </Text>
      </View>

      <Divider />

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text variant="bodyLarge">Auto-translate Messages</Text>
          <Text variant="bodySmall" style={styles.settingDescription}>
            Automatically translate incoming messages
          </Text>
        </View>
        <Switch
          value={autoTranslateEnabled}
          onValueChange={handleAutoTranslateToggle}
          disabled={saving}
        />
      </View>

      <Divider />

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text variant="bodyLarge">Preferred Language</Text>
          <Text variant="bodySmall" style={styles.settingDescription}>
            Messages will be translated to this language
          </Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Pressable
              onPress={() => setMenuVisible(true)}
              disabled={saving}
              style={styles.languageButton}
            >
              <Text variant="bodyMedium">{getLanguageName(preferredLanguage)}</Text>
              <Text variant="bodySmall" style={styles.chevron}>▼</Text>
            </Pressable>
          }
        >
          <ScrollView style={styles.menuScroll}>
            {LANGUAGE_OPTIONS.map(lang => (
              <Menu.Item
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                title={lang.name}
                titleStyle={
                  lang.code === preferredLanguage
                    ? styles.selectedLanguage
                    : undefined
                }
              />
            ))}
          </ScrollView>
        </Menu>
      </View>

      <Divider />

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          How it Works
        </Text>
        <Text variant="bodySmall" style={styles.helpText}>
          When auto-translate is enabled, messages in other languages will be
          automatically translated to your preferred language. You can always
          view the original message by tapping "Show Original".
        </Text>
        <Text variant="bodySmall" style={styles.helpText}>
          Translation is powered by AI and works best for common languages.
          The original message is always preserved.
        </Text>
      </View>

      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" />
          <Text variant="bodySmall" style={styles.savingText}>
            Saving...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 4,
    fontWeight: 'bold',
  },
  sectionDescription: {
    color: '#666',
    marginTop: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 72,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingDescription: {
    color: '#666',
    marginTop: 4,
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chevron: {
    color: '#666',
    marginLeft: 8,
  },
  menuScroll: {
    maxHeight: 300,
  },
  selectedLanguage: {
    fontWeight: 'bold',
    color: '#6200ee',
  },
  helpText: {
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  savingText: {
    color: '#666',
  },
});
