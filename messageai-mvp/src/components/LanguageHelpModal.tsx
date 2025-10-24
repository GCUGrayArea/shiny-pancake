/**
 * Language Help Modal
 * Combined modal for cultural context hints and slang/idiom explanations
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ContextHint, SlangItem } from '@/services/ai/types';

interface LanguageHelpModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Array of cultural hints to display */
  culturalHints: ContextHint[];
  /** Array of slang items to display */
  slangItems: SlangItem[];
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when user marks a hint as seen */
  onMarkHintAsSeen?: (hintId: string) => void;
  /** Callback when user marks slang as known */
  onMarkSlangAsKnown?: (itemId: string) => void;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
}

/**
 * Get emoji icon for cultural hint category
 */
function getCulturalIcon(category: string): string {
  switch (category) {
    case 'holiday': return '🎉';
    case 'idiom': return '💬';
    case 'custom': return '🎭';
    case 'historical': return '📜';
    case 'norm': return '🤝';
    default: return '🌍';
  }
}

/**
 * Get emoji icon for slang category
 */
function getSlangIcon(category: string): string {
  switch (category) {
    case 'slang': return '😎';
    case 'idiom': return '💡';
    case 'colloquialism': return '🗣️';
    case 'internet-slang': return '💻';
    default: return '📖';
  }
}

/**
 * Get category display name
 */
function getCategoryName(category: string, isCultural: boolean): string {
  if (isCultural) {
    switch (category) {
      case 'holiday': return 'Holiday/Festival';
      case 'idiom': return 'Idiom/Expression';
      case 'custom': return 'Cultural Custom';
      case 'historical': return 'Historical Reference';
      case 'norm': return 'Cultural Norm';
      default: return 'Cultural Reference';
    }
  } else {
    switch (category) {
      case 'slang': return 'Slang';
      case 'idiom': return 'Idiom';
      case 'colloquialism': return 'Colloquialism';
      case 'internet-slang': return 'Internet Slang';
      default: return 'Expression';
    }
  }
}

export default function LanguageHelpModal({
  visible,
  culturalHints,
  slangItems,
  onClose,
  onMarkHintAsSeen,
  onMarkSlangAsKnown,
  loading = false,
  error = null,
}: LanguageHelpModalProps) {
  const totalItems = culturalHints.length + slangItems.length;
  const { height } = useWindowDimensions();
  const modalHeight = height * 0.85;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Pressable style={[styles.modalContainer, { height: modalHeight }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Language Help</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={true}
              indicatorStyle="black"
              scrollEventThrottle={16}
              directionalLockEnabled={false}
              alwaysBounceVertical={true}
              bounces={true}
            >
                {loading && (
                  <View style={styles.centerContent}>
                    <MaterialCommunityIcons name="loading" size={32} color="#2196F3" />
                    <Text style={styles.loadingText}>Analyzing language...</Text>
                  </View>
                )}

                {error && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={32} color="#F44336" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {!loading && !error && totalItems === 0 && (
                  <View style={styles.centerContent}>
                    <MaterialCommunityIcons name="check-circle" size={32} color="#4CAF50" />
                    <Text style={styles.noItemsText}>No language help needed</Text>
                    <Text style={styles.noItemsSubtext}>
                      This message uses standard language without cultural references or slang.
                    </Text>
                  </View>
                )}

                {!loading && !error && totalItems > 0 && (
                  <>
                    <Text style={styles.subtitle}>
                      Found {totalItems} item{totalItems > 1 ? 's' : ''} to explain
                    </Text>

                    {/* Cultural Hints Section */}
                    {culturalHints.length > 0 && (
                      <>
                        <Text style={styles.sectionHeader}>Cultural References</Text>
                        {culturalHints.map((hint) => (
                          <View key={hint.id} style={[styles.itemCard, styles.culturalCard]}>
                            <View style={styles.itemHeader}>
                              <View style={[styles.categoryBadge, styles.culturalBadge]}>
                                <Text style={styles.categoryIcon}>{getCulturalIcon(hint.category)}</Text>
                                <Text style={[styles.categoryText, styles.culturalText]}>
                                  {getCategoryName(hint.category, true)}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.phraseContainer}>
                              <Text style={styles.phraseLabel}>Phrase:</Text>
                              <Text style={styles.phraseText}>"{hint.phrase}"</Text>
                            </View>

                            <View style={styles.explanationContainer}>
                              <Text style={styles.sectionLabel}>Meaning:</Text>
                              <Text style={styles.explanationText}>{hint.explanation}</Text>
                            </View>

                            <View style={styles.backgroundContainer}>
                              <Text style={styles.sectionLabel}>Cultural Background:</Text>
                              <Text style={styles.backgroundText}>{hint.culturalBackground}</Text>
                            </View>

                            {!hint.seen && onMarkHintAsSeen && (
                              <TouchableOpacity
                                style={[styles.actionButton, styles.culturalButton]}
                                onPress={() => onMarkHintAsSeen(hint.id)}
                              >
                                <Text style={styles.actionButtonText}>Got it!</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </>
                    )}

                    {/* Slang Items Section */}
                    {slangItems.length > 0 && (
                      <>
                        <Text style={styles.sectionHeader}>Slang & Informal Language</Text>
                        {slangItems.map((item) => (
                          <View key={item.id} style={[styles.itemCard, styles.slangCard]}>
                            <View style={styles.itemHeader}>
                              <View style={[styles.categoryBadge, styles.slangBadge]}>
                                <Text style={styles.categoryIcon}>{getSlangIcon(item.category)}</Text>
                                <Text style={[styles.categoryText, styles.slangText]}>
                                  {getCategoryName(item.category, false)}
                                </Text>
                              </View>
                              {item.regions && item.regions.length > 0 && (
                                <Text style={styles.regionText}>{item.regions.join(', ')}</Text>
                              )}
                            </View>

                            <View style={styles.phraseContainer}>
                              <Text style={styles.phraseLabel}>Phrase:</Text>
                              <Text style={styles.phraseText}>"{item.phrase}"</Text>
                            </View>

                            <View style={styles.explanationContainer}>
                              <Text style={styles.sectionLabel}>Literal Meaning:</Text>
                              <Text style={styles.literalText}>{item.literal}</Text>
                            </View>

                            <View style={styles.explanationContainer}>
                              <Text style={styles.sectionLabel}>Actual Meaning:</Text>
                              <Text style={styles.actualText}>{item.actual}</Text>
                            </View>

                            <View style={styles.explanationContainer}>
                              <Text style={styles.sectionLabel}>Example:</Text>
                              <Text style={styles.usageText}>"{item.usage}"</Text>
                            </View>

                            <View style={styles.formalityContainer}>
                              <Text style={styles.sectionLabel}>Formality:</Text>
                              <Text style={styles.formalityText}>{item.formality}</Text>
                            </View>

                            {!item.known && onMarkSlangAsKnown && (
                              <TouchableOpacity
                                style={[styles.actionButton, styles.slangButton]}
                                onPress={() => onMarkSlangAsKnown(item.id)}
                              >
                                <Text style={styles.actionButtonText}>I know this</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </>
                    )}
                  </>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.closeButtonBottom} onPress={onClose}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingLeft: 30,
    paddingRight: 30,
    paddingTop: 16,
  },
  centerContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  noItemsText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  noItemsSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
    marginBottom: 12,
  },
  itemCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  culturalCard: {
    backgroundColor: '#F3E5F5',
    borderLeftColor: '#9C27B0',
  },
  slangCard: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#2196F3',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  culturalBadge: {
    backgroundColor: '#FFFFFF',
  },
  slangBadge: {
    backgroundColor: '#FFFFFF',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  culturalText: {
    color: '#9C27B0',
  },
  slangText: {
    color: '#2196F3',
  },
  regionText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  phraseContainer: {
    marginBottom: 12,
  },
  phraseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  phraseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontStyle: 'italic',
  },
  explanationContainer: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
  backgroundContainer: {
    marginBottom: 12,
  },
  backgroundText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  literalText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actualText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
    fontWeight: '500',
  },
  usageText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  formalityContainer: {
    marginBottom: 12,
  },
  formalityText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  culturalButton: {
    backgroundColor: '#9C27B0',
  },
  slangButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  closeButtonBottom: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
