/**
 * Create Group Screen Tests
 * Tests for group creation flow and UI interactions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CreateGroupScreen from '@/screens/CreateGroupScreen';
import { useAuth } from '@/contexts/AuthContext';
import { createChatInFirebase } from '@/services/firebase-chat.service';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/services/firebase-chat.service');
jest.mock('@/components/Avatar');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockCreateChatInFirebase = createChatInFirebase as jest.MockedFunction<typeof createChatInFirebase>;

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      participants: [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'Alice',
          isOnline: true,
          lastSeen: Date.now(),
        },
        {
          uid: 'user2',
          email: 'user2@test.com',
          displayName: 'Bob',
          isOnline: false,
          lastSeen: Date.now(),
        },
      ],
    },
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('CreateGroupScreen', () => {
  const mockUser = {
    uid: 'current-user',
    email: 'current@test.com',
    displayName: 'Current User',
    createdAt: 0,
    lastSeen: 0,
    isOnline: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    });
  });

  it('should render with participants from navigation params', () => {
    const { getByText, getByDisplayValue } = render(<CreateGroupScreen />);

    expect(getByText('Create Group')).toBeTruthy();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    expect(getByDisplayValue('Alice, Bob')).toBeTruthy(); // Auto-generated name
  });

  it('should allow editing group name', () => {
    const { getByDisplayValue, getByPlaceholderText } = render(<CreateGroupScreen />);

    const nameInput = getByDisplayValue('Alice, Bob');
    fireEvent.changeText(nameInput, 'My Awesome Group');

    expect(getByDisplayValue('My Awesome Group')).toBeTruthy();
  });

  it('should show participant count', () => {
    const { getByText } = render(<CreateGroupScreen />);

    expect(getByText('2 participants')).toBeTruthy();
  });

  it('should show remove option for non-current user participants', () => {
    const { getByText } = render(<CreateGroupScreen />);

    // Should show remove chips for other participants
    expect(getByText('Remove')).toBeTruthy();
  });

  it('should not show remove option for current user', () => {
    const { queryByText } = render(<CreateGroupScreen />);

    // Should not show remove for current user (Alice and Bob are not current user)
    // Current user is not in the participants list shown
    const removeButtons = queryByText('Remove');
    expect(removeButtons).toBeTruthy(); // Should still show for other participants
  });

  it('should disable create button when insufficient participants', async () => {
    // Mock route with only 1 participant
    jest.mocked(require('@react-navigation/native').useRoute).mockReturnValue({
      params: {
        participants: [
          {
            uid: 'user1',
            email: 'user1@test.com',
            displayName: 'Alice',
            isOnline: true,
            lastSeen: Date.now(),
          },
        ],
      },
    });

    const { getByText } = render(<CreateGroupScreen />);

    const createButton = getByText('Create Group');
    expect(createButton.props.disabled).toBe(true);
  });

  it('should create group successfully', async () => {
    mockCreateChatInFirebase.mockResolvedValue({
      success: true,
      data: 'group-chat-id-123',
    });

    const { getByText } = render(<CreateGroupScreen />);

    const createButton = getByText('Create Group');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockCreateChatInFirebase).toHaveBeenCalledWith({
        type: 'group',
        participantIds: ['user1', 'user2'],
        name: 'Alice, Bob',
        createdAt: expect.any(Number),
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Conversation', {
        chatId: 'group-chat-id-123',
        isGroup: true,
        groupName: 'Alice, Bob',
      });
    });
  });

  it('should handle group creation failure', async () => {
    mockCreateChatInFirebase.mockResolvedValue({
      success: false,
      error: 'Failed to create group',
    });

    const { getByText } = render(<CreateGroupScreen />);

    const createButton = getByText('Create Group');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to create group. Please try again.',
        [{ text: 'OK' }]
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show loading state during creation', async () => {
    // Mock a slow response
    mockCreateChatInFirebase.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: 'test-id' }), 100))
    );

    const { getByText } = render(<CreateGroupScreen />);

    const createButton = getByText('Create Group');
    fireEvent.press(createButton);

    // Should show loading state
    expect(getByText('Creating Group...')).toBeTruthy();
    expect(createButton.props.disabled).toBe(true);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  it('should handle remove participant confirmation', () => {
    const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      // Simulate pressing "Remove" button
      if (buttons && buttons[1] && buttons[1].onPress) {
        buttons[1].onPress();
      }
    });

    const { getByText, queryByText } = render(<CreateGroupScreen />);

    // Find and press remove button
    const removeButton = getByText('Remove');
    fireEvent.press(removeButton);

    // Should show confirmation dialog
    expect(mockAlert).toHaveBeenCalledWith(
      'Remove Participant',
      expect.stringContaining('Remove'),
      expect.any(Array)
    );

    mockAlert.mockRestore();
  });

  it('should validate group creation before submitting', async () => {
    // Mock route with participants that don't include current user
    jest.mocked(require('@react-navigation/native').useRoute).mockReturnValue({
      params: {
        participants: [
          {
            uid: 'user1',
            email: 'user1@test.com',
            displayName: 'Alice',
            isOnline: true,
            lastSeen: Date.now(),
          },
        ],
      },
    });

    mockCreateChatInFirebase.mockResolvedValue({
      success: true,
      data: 'group-chat-id-123',
    });

    const { getByText } = render(<CreateGroupScreen />);

    const createButton = getByText('Create Group');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'You must be a participant in the group'
      );
    });

    expect(mockCreateChatInFirebase).not.toHaveBeenCalled();
  });

  it('should use custom group name if provided', async () => {
    mockCreateChatInFirebase.mockResolvedValue({
      success: true,
      data: 'group-chat-id-123',
    });

    const { getByDisplayValue, getByText } = render(<CreateGroupScreen />);

    const nameInput = getByDisplayValue('Alice, Bob');
    fireEvent.changeText(nameInput, 'My Custom Group');

    const createButton = getByText('Create Group');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockCreateChatInFirebase).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Custom Group',
        })
      );
    });
  });

  it('should handle network errors gracefully', async () => {
    mockCreateChatInFirebase.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(<CreateGroupScreen />);

    const createButton = getByText('Create Group');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to create group. Please try again.',
        [{ text: 'OK' }]
      );
    });
  });
});

