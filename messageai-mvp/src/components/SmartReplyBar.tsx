/**
 * Smart Reply Bar Component
 * Displays horizontally scrollable smart reply suggestions above the keyboard
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Reply } from "../services/ai/types";
import AILoadingIndicator from "./AILoadingIndicator";

interface SmartReplyBarProps {
  /** Array of reply suggestions to display */
  replies: Reply[];
  /** Whether replies are currently being generated */
  loading: boolean;
  /** Callback when a reply is selected */
  onReplySelect: (reply: Reply) => void;
  /** Callback when refresh button is tapped */
  onRefresh: () => void;
  /** Whether the bar is visible */
  visible: boolean;
}

/**
 * SmartReplyBar displays reply suggestions as horizontally scrollable chips
 */
export default function SmartReplyBar({
  replies,
  loading,
  onReplySelect,
  onRefresh,
  visible,
}: SmartReplyBarProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          // Show loading indicator while generating replies
          <AILoadingIndicator
            style="inline"
            message="Generating smart replies..."
            visible={true}
            size="small"
            timeout={15000}
          />
        ) : replies.length > 0 ? (
          // Show reply chips
          <>
            {replies.map((reply, index) => (
              <ReplyChip
                key={index}
                reply={reply}
                onPress={() => onReplySelect(reply)}
              />
            ))}
            {/* Refresh button */}
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshIcon}>↻</Text>
            </TouchableOpacity>
          </>
        ) : (
          // No replies available
          <Text style={styles.noRepliesText}>No suggestions available</Text>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Individual reply chip component
 */
interface ReplyChipProps {
  reply: Reply;
  onPress: () => void;
}

function ReplyChip({ reply, onPress }: ReplyChipProps) {
  // Get emoji based on reply type
  const emoji = getReplyTypeEmoji(reply.type);

  return (
    <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.chipText}>
        {emoji} {reply.text}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Get emoji icon for reply type
 */
function getReplyTypeEmoji(type: Reply["type"]): string {
  switch (type) {
    case "agree":
      return "👍";
    case "question":
      return "❓";
    case "continue":
      return "💬";
    case "polite-close":
      return "👋";
    case "enthusiasm":
      return "🎉";
    default:
      return "💬";
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 15,
    alignItems: "center",
    gap: 10,
  },
  chip: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    marginRight: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chipText: {
    fontSize: 15,
    color: "#333",
  },
  refreshButton: {
    backgroundColor: "#007AFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  refreshIcon: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
  noRepliesText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
});
