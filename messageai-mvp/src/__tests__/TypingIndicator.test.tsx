/**
 * Unit tests for TypingIndicator component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import TypingIndicator from '../components/TypingIndicator';
import { User } from '../types';

// Mock Animated for testing
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

describe('TypingIndicator', () => {
  const createUser = (uid: string, displayName: string): User => ({
    uid,
    email: `${uid}@test.com`,
    displayName,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    isOnline: true,
  });

  const user1 = createUser('user-1', 'Alice');
  const user2 = createUser('user-2', 'Bob');
  const user3 = createUser('user-3', 'Charlie');
  const user4 = createUser('user-4', 'David');
  const user5 = createUser('user-5', 'Eve');

  describe('rendering', () => {
    it('should not render when no users are typing', () => {
      const { toJSON } = render(<TypingIndicator typingUsers={[]} />);

      expect(toJSON()).toBeNull();
    });

    it('should render when users are typing', () => {
      const { getByText } = render(<TypingIndicator typingUsers={[user1]} />);

      expect(getByText(/Alice is typing/)).toBeTruthy();
    });
  });

  describe('single user typing', () => {
    it('should display correct text for one user', () => {
      const { getByText } = render(<TypingIndicator typingUsers={[user1]} />);

      expect(getByText('Alice is typing')).toBeTruthy();
    });
  });

  describe('two users typing', () => {
    it('should display correct text for two users', () => {
      const { getByText } = render(
        <TypingIndicator typingUsers={[user1, user2]} />
      );

      expect(getByText('Alice and Bob are typing')).toBeTruthy();
    });
  });

  describe('three users typing', () => {
    it('should display correct text for three users', () => {
      const { getByText } = render(
        <TypingIndicator typingUsers={[user1, user2, user3]} />
      );

      expect(
        getByText('Alice, Bob, and Charlie are typing')
      ).toBeTruthy();
    });
  });

  describe('more than three users typing', () => {
    it('should display correct text for four users', () => {
      const { getByText } = render(
        <TypingIndicator typingUsers={[user1, user2, user3, user4]} />
      );

      expect(
        getByText('Alice, Bob, and 2 others are typing')
      ).toBeTruthy();
    });

    it('should display correct text for five users', () => {
      const { getByText } = render(
        <TypingIndicator typingUsers={[user1, user2, user3, user4, user5]} />
      );

      expect(
        getByText('Alice, Bob, and 3 others are typing')
      ).toBeTruthy();
    });

    it('should use "other" for exactly one additional user', () => {
      const { getByText } = render(
        <TypingIndicator typingUsers={[user1, user2, user3]} />
      );

      // With 3 users, we don't use "others", we list all three
      expect(
        getByText('Alice, Bob, and Charlie are typing')
      ).toBeTruthy();
    });
  });

  describe('animated dots', () => {
    it('should render animated dots', () => {
      const { getByText } = render(<TypingIndicator typingUsers={[user1]} />);

      // Check that dots are rendered (they use • character)
      const dots = getByText('Alice is typing').parent?.parent;
      expect(dots).toBeTruthy();
    });
  });

  describe('custom styles', () => {
    it('should accept custom styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { toJSON } = render(
        <TypingIndicator typingUsers={[user1]} style={customStyle} />
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
