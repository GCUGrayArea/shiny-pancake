/**
 * UserListItem component for displaying users in lists
 * Shows avatar, name, and presence status
 */

import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useTheme } from "@/contexts/ThemeContext";
import Avatar from "./Avatar";
import { User } from "@/types";

export interface UserListItemProps {
  /** User to display */
  user: User;
  /** Optional subtitle text (e.g., "Last seen 2 hours ago") */
  subtitle?: string;
  /** Callback when user item is pressed */
  onPress?: (user: User) => void;
  /** Whether to show online status indicator */
  showOnlineStatus?: boolean;
  /** Whether the item is in a loading state */
  loading?: boolean;
  /** Additional styles */
  style?: any;
}

/**
 * User list item component with avatar and presence
 */
export default function UserListItem({
  user,
  subtitle,
  onPress,
  showOnlineStatus = true,
  loading = false,
  style,
}: UserListItemProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    onPress?.(user);
  };

  return (
    <TouchableOpacity
      onPress={loading ? undefined : handlePress}
      disabled={!onPress || loading}
      style={[style, loading && styles.disabled]}
    >
      <View style={styles.container}>
        <Avatar
          displayName={user.displayName}
          userId={user.uid}
          profilePictureUrl={user.profilePictureUrl}
          size="medium"
          showOnlineStatus={showOnlineStatus && !loading}
          isOnline={user.isOnline}
          style={styles.avatar}
        />

        <View style={styles.content}>
          <Text
            variant="bodyLarge"
            style={[
              styles.displayName,
              { color: colors.text },
              loading && styles.disabledText,
            ]}
          >
            {user.displayName}
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text
                variant="bodyMedium"
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                Starting chat...
              </Text>
            </View>
          ) : (
            <>
              {subtitle && (
                <Text
                  variant="bodyMedium"
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                >
                  {subtitle}
                </Text>
              )}

              {showOnlineStatus && (
                <Text
                  variant="bodySmall"
                  style={[
                    styles.statusText,
                    {
                      color: user.isOnline
                        ? colors.success
                        : colors.textTertiary,
                    },
                  ]}
                >
                  {user.isOnline ? "Online" : "Offline"}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  avatar: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  displayName: {
    fontWeight: "500",
  },
  subtitle: {
    color: "#666",
    marginTop: 2,
  },
  statusText: {
    marginTop: 2,
    fontSize: 12,
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#666",
  },
});
