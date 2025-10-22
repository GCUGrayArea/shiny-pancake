/**
 * Group Utilities Tests
 * Tests for group name generation, initials, and validation
 */

import { describe, it, expect } from '@jest/globals';
import { generateGroupName, generateGroupInitials, validateGroupCreation } from '@/utils/group.utils';
import { User } from '@/types';

describe('Group Utilities', () => {
  describe('generateGroupName', () => {
    it('should return "Group Chat" for empty participants', () => {
      const result = generateGroupName([]);
      expect(result).toBe('Group Chat');
    });

    it('should return user\'s group for single participant', () => {
      const participants: User[] = [{
        uid: 'user1',
        email: 'user1@test.com',
        displayName: 'Alice',
        createdAt: 0,
        lastSeen: 0,
        isOnline: false
      }];

      const result = generateGroupName(participants);
      expect(result).toBe("Alice's Group");
    });

    it('should return both names for two participants', () => {
      const participants: User[] = [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'Alice',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        },
        {
          uid: 'user2',
          email: 'user2@test.com',
          displayName: 'Bob',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        }
      ];

      const result = generateGroupName(participants);
      expect(result).toBe('Alice, Bob');
    });

    it('should return first two names + count for three participants', () => {
      const participants: User[] = [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'Alice',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        },
        {
          uid: 'user2',
          email: 'user2@test.com',
          displayName: 'Bob',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        },
        {
          uid: 'user3',
          email: 'user3@test.com',
          displayName: 'Charlie',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        }
      ];

      const result = generateGroupName(participants);
      expect(result).toBe('Alice, Bob, +1 others');
    });

    it('should handle five participants correctly', () => {
      const participants: User[] = [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'Alice',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        },
        {
          uid: 'user2',
          email: 'user2@test.com',
          displayName: 'Bob',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        },
        {
          uid: 'user3',
          email: 'user3@test.com',
          displayName: 'Charlie',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        },
        {
          uid: 'user4',
          email: 'user4@test.com',
          displayName: 'David',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        },
        {
          uid: 'user5',
          email: 'user5@test.com',
          displayName: 'Eve',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        }
      ];

      const result = generateGroupName(participants);
      expect(result).toBe('Alice, Bob, +3 others');
    });
  });

  describe('generateGroupInitials', () => {
    it('should return "GC" for empty participants', () => {
      const result = generateGroupInitials([]);
      expect(result).toBe('GC');
    });

    it('should return single user initials for one participant', () => {
      const participants: User[] = [{
        uid: 'user1',
        email: 'user1@test.com',
        displayName: 'Alice Johnson',
        createdAt: 0,
        lastSeen: 0,
        isOnline: false
      }];

      const result = generateGroupInitials(participants);
      expect(result).toBe('AJ');
    });

    it('should return first letters of first two participants', () => {
      const participants: User[] = [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'Alice',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        },
        {
          uid: 'user2',
          email: 'user2@test.com',
          displayName: 'Bob',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        }
      ];

      const result = generateGroupInitials(participants);
      expect(result).toBe('AB');
    });

    it('should handle single character names', () => {
      const participants: User[] = [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'A',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        },
        {
          uid: 'user2',
          email: 'user2@test.com',
          displayName: 'B',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        }
      ];

      const result = generateGroupInitials(participants);
      expect(result).toBe('AB');
    });
  });

  describe('validateGroupCreation', () => {
    const currentUser: User = {
      uid: 'current-user',
      email: 'current@test.com',
      displayName: 'Current User',
      createdAt: 0,
      lastSeen: 0,
      isOnline: true
    };

    it('should be valid with 2-5 participants including current user', () => {
      const participants: User[] = [
        currentUser,
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'Alice',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        }
      ];

      const result = validateGroupCreation(participants, currentUser);
      expect(result.isValid).toBe(true);
    });

    it('should be invalid with no participants', () => {
      const result = validateGroupCreation([], currentUser);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select at least one participant');
    });

    it('should be invalid with more than 5 participants', () => {
      const participants: User[] = Array(6).fill(null).map((_, i) => ({
        uid: `user${i}`,
        email: `user${i}@test.com`,
        displayName: `User ${i}`,
        createdAt: 0,
        lastSeen: 0,
        isOnline: false
      }));

      const result = validateGroupCreation(participants, currentUser);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Groups cannot have more than 5 participants');
    });

    it('should be invalid if current user is not included', () => {
      const participants: User[] = [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'Alice',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        }
      ];

      const result = validateGroupCreation(participants, currentUser);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('You must be a participant in the group');
    });

    it('should handle edge case with exactly 5 participants', () => {
      const participants: User[] = Array(5).fill(null).map((_, i) => ({
        uid: i === 0 ? currentUser.uid : `user${i}`,
        email: i === 0 ? currentUser.email : `user${i}@test.com`,
        displayName: i === 0 ? currentUser.displayName : `User ${i}`,
        createdAt: 0,
        lastSeen: 0,
        isOnline: false
      }));

      const result = validateGroupCreation(participants, currentUser);
      expect(result.isValid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined or null participants gracefully', () => {
      // @ts-ignore - testing edge cases
      expect(() => generateGroupName(null)).not.toThrow();
      // @ts-ignore - testing edge cases
      expect(() => generateGroupName(undefined)).not.toThrow();
    });

    it('should handle participants with empty display names', () => {
      const participants: User[] = [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: '',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        }
      ];

      const result = generateGroupName(participants);
      expect(result).toBe("Group");
    });

    it('should handle participants with special characters in names', () => {
      const participants: User[] = [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'Alice-Bob',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        },
        {
          uid: 'user2',
          email: 'user2@test.com',
          displayName: 'Charlie_David',
          createdAt: 0,
          lastSeen: 0,
          isOnline: false
        }
      ];

      const result = generateGroupName(participants);
      expect(result).toBe('Alice-Bob, Charlie_David');
    });
  });
});

