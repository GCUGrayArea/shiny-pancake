/**
 * Tests for chat utility functions
 */

import { getChatDisplayName, getInitials } from '../../utils/chat.utils';
import { Chat } from '../../types';

describe('chat.utils', () => {
  describe('getChatDisplayName', () => {
    const currentUserId = 'user123';
    const otherUserId = 'user456';

    it('should return group name for group chats', () => {
      const groupChat: Chat = {
        id: 'chat1',
        type: 'group',
        name: 'My Group',
        participantIds: [currentUserId, otherUserId, 'user789'],
        createdAt: Date.now(),
      };

      const result = getChatDisplayName(groupChat, currentUserId);
      expect(result).toBe('My Group');
    });

    it('should return fallback for group chats without a name', () => {
      const groupChat: Chat = {
        id: 'chat1',
        type: 'group',
        participantIds: [currentUserId, otherUserId, 'user789'],
        createdAt: Date.now(),
      };

      const result = getChatDisplayName(groupChat, currentUserId);
      expect(result).toBe('Group Chat');
    });

    it('should return other user name for 1:1 chats with userNames map', () => {
      const oneOnOneChat: Chat = {
        id: 'chat2',
        type: '1:1',
        participantIds: [currentUserId, otherUserId],
        createdAt: Date.now(),
      };

      const userNames = new Map([
        [otherUserId, 'Alice Smith'],
      ]);

      const result = getChatDisplayName(oneOnOneChat, currentUserId, userNames);
      expect(result).toBe('Alice Smith');
    });

    it('should return fallback for 1:1 chats without userNames map', () => {
      const oneOnOneChat: Chat = {
        id: 'chat2',
        type: '1:1',
        participantIds: [currentUserId, otherUserId],
        createdAt: Date.now(),
      };

      const result = getChatDisplayName(oneOnOneChat, currentUserId);
      expect(result).toBe('User u456');
    });

    it('should handle 1:1 chat where current user is not in participants', () => {
      const oneOnOneChat: Chat = {
        id: 'chat3',
        type: '1:1',
        participantIds: ['user789', 'user101'],
        createdAt: Date.now(),
      };

      const result = getChatDisplayName(oneOnOneChat, currentUserId);
      expect(result).toBe('User u789');
    });

    it('should return fallback when no other user found', () => {
      const oneOnOneChat: Chat = {
        id: 'chat4',
        type: '1:1',
        participantIds: [currentUserId],
        createdAt: Date.now(),
      };

      const result = getChatDisplayName(oneOnOneChat, currentUserId);
      expect(result).toBe('Chat');
    });
  });

  describe('getInitials', () => {
    it('should return first two letters for single word names', () => {
      expect(getInitials('Alice')).toBe('AL');
      expect(getInitials('Bob')).toBe('BO');
      expect(getInitials('A')).toBe('A');
    });

    it('should return first letter of first two words', () => {
      expect(getInitials('Alice Smith')).toBe('AS');
      expect(getInitials('John Doe Jr')).toBe('JD');
    });

    it('should handle extra whitespace', () => {
      expect(getInitials('  Alice   Smith  ')).toBe('AS');
      expect(getInitials('Alice    Bob    Charlie')).toBe('AB');
    });

    it('should return ? for empty or invalid names', () => {
      expect(getInitials('')).toBe('?');
      expect(getInitials('   ')).toBe('?');
    });

    it('should return uppercase initials', () => {
      expect(getInitials('alice smith')).toBe('AS');
      expect(getInitials('ALICE SMITH')).toBe('AS');
    });
  });
});
