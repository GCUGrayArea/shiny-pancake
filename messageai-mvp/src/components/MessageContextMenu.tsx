/**
 * Message Context Menu
 * Displays action options for a message (Translate, Copy, etc.)
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface MenuAction {
  /** Unique identifier for the action */
  id: string;
  /** Display label */
  label: string;
  /** Material Community Icon name */
  icon: string;
  /** Optional color override */
  color?: string;
  /** Whether the action is destructive */
  destructive?: boolean;
}

interface MessageContextMenuProps {
  /** Whether the menu is visible */
  visible: boolean;
  /** Array of available actions */
  actions: MenuAction[];
  /** Callback when an action is selected */
  onActionPress: (actionId: string) => void;
  /** Callback when menu should close */
  onClose: () => void;
  /** Position of the menu on screen */
  position?: { x: number; y: number };
}

export default function MessageContextMenu({
  visible,
  actions,
  onActionPress,
  onClose,
  position,
}: MessageContextMenuProps) {
  const handleActionPress = (actionId: string) => {
    onActionPress(actionId);
    onClose();
  };

  const screenHeight = Dimensions.get('window').height;
  const menuHeight = actions.length * 56 + 16; // Approximate height
  const shouldPositionAbove = position && position.y > screenHeight / 2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.menu,
                position && {
                  position: 'absolute',
                  left: Math.max(16, Math.min(position.x - 100, Dimensions.get('window').width - 216)),
                  top: shouldPositionAbove
                    ? Math.max(16, position.y - menuHeight - 8)
                    : position.y + 8,
                },
              ]}
            >
              {actions.map((action, index) => (
                <React.Fragment key={action.id}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleActionPress(action.id)}
                  >
                    <MaterialCommunityIcons
                      name={action.icon as any}
                      size={22}
                      color={
                        action.destructive
                          ? '#F44336'
                          : action.color || '#666'
                      }
                      style={styles.menuIcon}
                    />
                    <Text
                      style={[
                        styles.menuText,
                        action.destructive && styles.destructiveText,
                        action.color && { color: action.color },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                  {index < actions.length - 1 && <View style={styles.separator} />}
                </React.Fragment>
              ))}
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 200,
    maxWidth: 280,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  destructiveText: {
    color: '#F44336',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
});
