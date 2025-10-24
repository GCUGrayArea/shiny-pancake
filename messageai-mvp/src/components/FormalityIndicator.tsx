/**
 * Formality Indicator Component
 * Shows the detected formality level with quick adjustment buttons
 * Displays above message input for real-time feedback
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import type { FormalityLevel } from '@/services/ai/types';
import { getFormalityLabel, getFormalityEmoji } from '@/services/ai/agents/formality-agent';

interface FormalityIndicatorProps {
  /** Current detected formality level */
  currentLevel?: FormalityLevel;
  /** Whether formality detection is in progress */
  isDetecting?: boolean;
  /** Confidence score (0-1) for the detection */
  confidence?: number;
  /** Callback when user wants to make text more formal */
  onMakeFormal?: () => void;
  /** Callback when user wants to make text more casual */
  onMakeCasual?: () => void;
  /** Whether adjustment is currently in progress */
  isAdjusting?: boolean;
  /** Whether the indicator should be visible */
  visible?: boolean;
}

export default function FormalityIndicator({
  currentLevel,
  isDetecting = false,
  confidence,
  onMakeFormal,
  onMakeCasual,
  isAdjusting = false,
  visible = true,
}: FormalityIndicatorProps) {
  // Don't render if not visible
  if (!visible) {
    return null;
  }

  // Show loading state during detection
  if (isDetecting) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Analyzing tone...</Text>
      </View>
    );
  }

  // Don't show if no level detected
  if (!currentLevel) {
    return null;
  }

  const emoji = getFormalityEmoji(currentLevel);
  const label = getFormalityLabel(currentLevel);

  // Check if we can make more formal or more casual
  const canMakeFormal = currentLevel !== 'very-formal' && currentLevel !== 'formal';
  const canMakeCasual = currentLevel !== 'very-informal' && currentLevel !== 'informal';

  return (
    <View style={styles.container}>
      {/* Current formality display */}
      <View style={styles.levelContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.levelText}>{label}</Text>
        {confidence !== undefined && confidence < 0.7 && (
          <Text style={styles.lowConfidence}>?</Text>
        )}
      </View>

      {/* Adjustment buttons */}
      {!isAdjusting && (
        <View style={styles.buttonsContainer}>
          {/* Make more casual button */}
          {canMakeCasual && onMakeCasual && (
            <TouchableOpacity
              style={[styles.adjustButton, styles.casualButton]}
              onPress={onMakeCasual}
              disabled={isAdjusting}
            >
              <Text style={styles.buttonText}>↓ More Casual</Text>
            </TouchableOpacity>
          )}

          {/* Make more formal button */}
          {canMakeFormal && onMakeFormal && (
            <TouchableOpacity
              style={[styles.adjustButton, styles.formalButton]}
              onPress={onMakeFormal}
              disabled={isAdjusting}
            >
              <Text style={styles.buttonText}>↑ More Formal</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Adjusting indicator */}
      {isAdjusting && (
        <View style={styles.adjustingContainer}>
          <ActivityIndicator size="small" color="#6200ee" />
          <Text style={styles.adjustingText}>Adjusting...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 18,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#424242',
  },
  lowConfidence: {
    fontSize: 12,
    color: '#ff9800',
    marginLeft: 2,
  },
  loadingText: {
    fontSize: 13,
    color: '#757575',
    marginLeft: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  casualButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  formalButton: {
    backgroundColor: '#f3e5f5',
    borderColor: '#9c27b0',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#424242',
  },
  adjustingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustingText: {
    fontSize: 13,
    color: '#6200ee',
    fontWeight: '500',
  },
});
