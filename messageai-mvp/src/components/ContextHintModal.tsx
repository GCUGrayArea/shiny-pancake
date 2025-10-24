/**
 * Context Hint Modal
 * Displays cultural context explanations for messages
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ContextHint } from '@/services/ai/types';

interface ContextHintModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Array of cultural hints to display */
  hints: ContextHint[];
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when user marks a hint as seen */
  onMarkAsSeen?: (hintId: string) => void;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
}

/**
 * Get emoji icon for hint category
 */
function getCategoryIcon(category: string): string {
  switch (category) {
    case 'holiday':
      return '🎉';
    case 'idiom':
      return '💬';
    case 'custom':
      return '🎭';
    case 'historical':
      return '📜';
    case 'norm':
      return '🤝';
    default:
      return '🌍';
  }
}

/**
 * Get category display name
 */
function getCategoryName(category: string): string {
  switch (category) {
    case 'holiday':
      return 'Holiday/Festival';
    case 'idiom':
      return 'Idiom/Expression';
    case 'custom':
      return 'Cultural Custom';
    case 'historical':
      return 'Historical Reference';
    case 'norm':
      return 'Cultural Norm';
    default:
      return 'Cultural Reference';
  }
}

export default function ContextHintModal({
  visible,
  hints,
  onClose,
  onMarkAsSeen,
  loading = false,
  error = null,
}: ContextHintModalProps) {
  const handleMarkAsSeen = (hintId: string) => {
    if (onMarkAsSeen) {
      onMarkAsSeen(hintId);
    }
  };

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
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Cultural Context</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {loading && (
                  <View style={styles.centerContent}>
                    <MaterialCommunityIcons name="loading" size={32} color="#9C27B0" />
                    <Text style={styles.loadingText}>Analyzing cultural context...</Text>
                  </View>
                )}

                {error && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={32} color="#F44336" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {!loading && !error && hints.length === 0 && (
                  <View style={styles.centerContent}>
                    <MaterialCommunityIcons name="check-circle" size={32} color="#4CAF50" />
                    <Text style={styles.noHintsText}>No cultural references detected</Text>
                    <Text style={styles.noHintsSubtext}>
                      This message doesn't contain any cultural references that need explanation.
                    </Text>
                  </View>
                )}

                {!loading && !error && hints.length > 0 && (
                  <>
                    <Text style={styles.subtitle}>
                      Found {hints.length} cultural reference{hints.length > 1 ? 's' : ''}
                    </Text>
                    {hints.map((hint, index) => (
                      <View key={hint.id} style={styles.hintCard}>
                        <View style={styles.hintHeader}>
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryIcon}>{getCategoryIcon(hint.category)}</Text>
                            <Text style={styles.categoryText}>{getCategoryName(hint.category)}</Text>
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

                        {!hint.seen && (
                          <TouchableOpacity
                            style={styles.gotItButton}
                            onPress={() => handleMarkAsSeen(hint.id)}
                          >
                            <Text style={styles.gotItText}>Got it!</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>

              {/* Footer */}
              {!loading && (hints.length > 0 || error) && (
                <View style={styles.footer}>
                  <TouchableOpacity style={styles.closeButtonBottom} onPress={onClose}>
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
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
    maxHeight: Dimensions.get('window').height * 0.8,
    paddingBottom: 20,
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
    paddingHorizontal: 20,
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
  noHintsText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  noHintsSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  hintCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  hintHeader: {
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9C27B0',
    textTransform: 'uppercase',
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
  gotItButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  gotItText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
