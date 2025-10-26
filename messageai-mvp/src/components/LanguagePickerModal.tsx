/**
 * Language Picker Modal
 * Allows users to select a target language for translation
 */

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { LanguageCode } from "@/services/ai/types";

interface LanguagePickerModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Currently selected language */
  selectedLanguage?: LanguageCode;
  /** Callback when language is selected */
  onSelect: (language: LanguageCode) => void;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Title for the modal */
  title?: string;
}

interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

/**
 * Available languages for translation
 */
const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
];

export default function LanguagePickerModal({
  visible,
  selectedLanguage,
  onSelect,
  onClose,
  title = "Select Language",
}: LanguagePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter languages based on search query
  const filteredLanguages = searchQuery.trim()
    ? LANGUAGES.filter(
        (lang) =>
          lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lang.code.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : LANGUAGES;

  const handleSelect = (language: LanguageCode) => {
    setSearchQuery(""); // Reset search
    onSelect(language);
  };

  const handleClose = () => {
    setSearchQuery(""); // Reset search
    onClose();
  };

  const renderLanguageItem = ({ item }: { item: LanguageOption }) => {
    const isSelected = item.code === selectedLanguage;

    return (
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.selectedItem]}
        onPress={() => handleSelect(item.code)}
      >
        <View style={styles.languageInfo}>
          <Text style={styles.flag}>{item.flag}</Text>
          <View style={styles.languageNames}>
            <Text
              style={[styles.languageName, isSelected && styles.selectedText]}
            >
              {item.name}
            </Text>
            <Text
              variant="bodySmall"
              style={[
                styles.nativeName,
                isSelected && styles.selectedNativeText,
              ]}
            >
              {item.nativeName}
            </Text>
          </View>
        </View>
        {isSelected && (
          <MaterialCommunityIcons name="check" size={24} color="#2196F3" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            {title}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search languages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Language list */}
        <FlatList
          data={filteredLanguages}
          renderItem={renderLanguageItem}
          keyExtractor={(item) => item.code}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No languages found</Text>
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  clearButton: {
    padding: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  languageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  selectedItem: {
    backgroundColor: "#E3F2FD",
  },
  languageInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  flag: {
    fontSize: 28,
    marginRight: 12,
  },
  languageNames: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  selectedText: {
    color: "#2196F3",
    fontWeight: "600",
  },
  nativeName: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  selectedNativeText: {
    color: "#1976D2",
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginLeft: 64, // Align with text, not flag
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});
