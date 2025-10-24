/**
 * Formality Preview Modal
 * Shows side-by-side comparison of original and adjusted text
 * Allows user to accept or reject the formality adjustment
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Modal } from 'react-native';
import { Text, Button, Card, Divider } from 'react-native-paper';
import type { FormalityAdjustmentResult } from '@/services/ai/types';
import { getFormalityLabel, getFormalityEmoji } from '@/services/ai/agents/formality-agent';

interface FormalityPreviewModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Adjustment result to display */
  adjustmentResult?: FormalityAdjustmentResult;
  /** Callback when user accepts the adjusted text */
  onAccept: (adjustedText: string) => void;
  /** Callback when user rejects and keeps original */
  onReject: () => void;
  /** Callback to close modal */
  onClose: () => void;
}

export default function FormalityPreviewModal({
  visible,
  adjustmentResult,
  onAccept,
  onReject,
  onClose,
}: FormalityPreviewModalProps) {
  if (!adjustmentResult) {
    return null;
  }

  const { originalText, adjustedText, changes, fromLevel, toLevel } = adjustmentResult;

  const fromEmoji = getFormalityEmoji(fromLevel);
  const toEmoji = getFormalityEmoji(toLevel);
  const fromLabel = getFormalityLabel(fromLevel);
  const toLabel = getFormalityLabel(toLevel);

  const handleAccept = () => {
    onAccept(adjustedText);
    onClose();
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Formality Adjustment</Text>
            <View style={styles.levelIndicator}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelEmoji}>{fromEmoji}</Text>
                <Text style={styles.levelText}>{fromLabel}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelEmoji}>{toEmoji}</Text>
                <Text style={styles.levelText}>{toLabel}</Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Original text */}
            <Card style={styles.textCard}>
              <Card.Content>
                <Text style={styles.sectionLabel}>Original:</Text>
                <Text style={styles.originalText}>{originalText}</Text>
              </Card.Content>
            </Card>

            {/* Adjusted text */}
            <Card style={[styles.textCard, styles.adjustedCard]}>
              <Card.Content>
                <Text style={styles.sectionLabel}>Adjusted:</Text>
                <Text style={styles.adjustedText}>{adjustedText}</Text>
              </Card.Content>
            </Card>

            {/* Changes made */}
            {changes.length > 0 && (
              <View style={styles.changesContainer}>
                <Text style={styles.changesTitle}>Changes Made:</Text>
                {changes.map((change, index) => (
                  <View key={index} style={styles.changeItem}>
                    <Text style={styles.changeBullet}>•</Text>
                    <Text style={styles.changeText}>{change}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleReject}
              style={styles.rejectButton}
            >
              Keep Original
            </Button>
            <Button
              mode="contained"
              onPress={handleAccept}
              style={styles.acceptButton}
            >
              Use This
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '50%',
    minHeight: 400,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  levelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 8,
  },
  levelEmoji: {
    fontSize: 20,
  },
  levelText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#424242',
  },
  arrow: {
    fontSize: 22,
    color: '#757575',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  textCard: {
    marginBottom: 14,
    elevation: 2,
  },
  adjustedCard: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#757575',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  originalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#424242',
  },
  adjustedText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1b5e20',
    fontWeight: '500',
  },
  changesContainer: {
    marginTop: 10,
    padding: 18,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  changesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 10,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  changeBullet: {
    fontSize: 16,
    color: '#757575',
    marginRight: 10,
    marginTop: 2,
  },
  changeText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#616161',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4caf50',
  },
});
