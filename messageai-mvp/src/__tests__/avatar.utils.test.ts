/**
 * Unit tests for Avatar utilities
 */

import { getInitials, getAvatarColor, AVATAR_SIZES } from '../utils/avatar.utils';
import { AVATAR_COLORS } from '../constants';

describe('getInitials', () => {
  it('should return ? for empty/null/undefined input', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(null as any)).toBe('?');
    expect(getInitials(undefined as any)).toBe('?');
  });

  it('should handle single character names', () => {
    expect(getInitials('A')).toBe('A');
    expect(getInitials('a')).toBe('A'); // Should uppercase
  });

  it('should handle single word names', () => {
    expect(getInitials('Alice')).toBe('AL');
    expect(getInitials('Bob')).toBe('BO');
    expect(getInitials('John')).toBe('JO');
  });

  it('should handle two word names', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Alice Smith')).toBe('AS');
    expect(getInitials('Jean-Pierre')).toBe('JP');
  });

  it('should handle multiple word names', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MW');
    expect(getInitials('John Q Public')).toBe('JP');
    expect(getInitials('Dr. Emmett Brown')).toBe('DB');
  });

  it('should handle names with extra whitespace', () => {
    expect(getInitials('  John   Doe  ')).toBe('JD');
    expect(getInitials('\tAlice\tSmith\n')).toBe('AS');
  });

  it('should handle names with special characters', () => {
    expect(getInitials('José')).toBe('JO');
    expect(getInitials('François')).toBe('FR');
    expect(getInitials('Björk')).toBe('BJ');
  });

  it('should handle names with numbers', () => {
    expect(getInitials('User123')).toBe('US');
    expect(getInitials('Test456')).toBe('TE');
  });

  it('should handle emoji names', () => {
    // Emojis should be treated as regular characters
    // Note: Some emoji edge cases may not work perfectly due to JavaScript string handling
    expect(getInitials('Rocket🚀')).toBe('RO');
    expect(getInitials('User🚀')).toBe('US');
  });

  it('should handle very long names', () => {
    const longName = 'A'.repeat(100);
    expect(getInitials(longName)).toBe('AA');
  });

  it('should handle names with only non-letter characters', () => {
    expect(getInitials('123')).toBe('12');
    expect(getInitials('!!!')).toBe('!!');
    expect(getInitials('@#$')).toBe('@#');
  });

  it('should return uppercase initials', () => {
    expect(getInitials('alice')).toBe('AL');
    expect(getInitials('bOB')).toBe('BO');
    expect(getInitials('jOHN dOE')).toBe('JD');
  });

  it('should handle edge case of single character after trimming', () => {
    expect(getInitials(' A ')).toBe('A');
    expect(getInitials('  A  ')).toBe('A');
  });
});

describe('getAvatarColor', () => {
  it('should return first color for empty/null/undefined input', () => {
    expect(getAvatarColor('')).toBe(AVATAR_COLORS[0]);
    expect(getAvatarColor(null as any)).toBe(AVATAR_COLORS[0]);
    expect(getAvatarColor(undefined as any)).toBe(AVATAR_COLORS[0]);
  });

  it('should return consistent colors for same UID', () => {
    const uid = 'test-user-123';
    const color1 = getAvatarColor(uid);
    const color2 = getAvatarColor(uid);
    expect(color1).toBe(color2);
    expect(AVATAR_COLORS).toContain(color1);
  });

  it('should return different colors for different UIDs', () => {
    const uid1 = 'user-1';
    const uid2 = 'user-2';
    const color1 = getAvatarColor(uid1);
    const color2 = getAvatarColor(uid2);
    expect(color1).not.toBe(color2);
  });

  it('should cycle through color palette for sequential UIDs', () => {
    // Test that different UIDs get different colors from palette
    const colors = new Set();
    for (let i = 0; i < 100; i++) {
      const color = getAvatarColor(`user-${i}`);
      colors.add(color);
      expect(AVATAR_COLORS).toContain(color);
    }

    // Should have used multiple colors from palette
    expect(colors.size).toBeGreaterThan(1);
    expect(colors.size).toBeLessThanOrEqual(AVATAR_COLORS.length);
  });

  it('should handle special characters in UID', () => {
    const uid = 'user@#$%^&*()_+';
    const color = getAvatarColor(uid);
    expect(AVATAR_COLORS).toContain(color);
  });

  it('should handle very long UIDs', () => {
    const uid = 'a'.repeat(1000);
    const color = getAvatarColor(uid);
    expect(AVATAR_COLORS).toContain(color);
  });

  it('should return colors from the predefined palette only', () => {
    const testUids = ['user1', 'user2', 'user3', 'test@example.com', '123', ''];
    testUids.forEach(uid => {
      const color = getAvatarColor(uid);
      expect(AVATAR_COLORS).toContain(color);
    });
  });
});

describe('AVATAR_SIZES', () => {
  it('should have the correct size values', () => {
    expect(AVATAR_SIZES.small).toBe(32);
    expect(AVATAR_SIZES.medium).toBe(48);
    expect(AVATAR_SIZES.large).toBe(64);
  });
});
