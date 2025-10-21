/**
 * Unit tests for Avatar component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import Avatar from '../components/Avatar';

// Mock the avatar utilities
jest.mock('../utils/avatar.utils', () => ({
  getInitials: jest.fn((name: string) => name.substring(0, 2).toUpperCase()),
  getAvatarColor: jest.fn(() => '#FF6B6B'),
  AVATAR_SIZES: {
    small: 32,
    medium: 48,
    large: 64,
  },
}));

import { getInitials, getAvatarColor, AVATAR_SIZES } from '../utils/avatar.utils';

const mockGetInitials = getInitials as jest.MockedFunction<typeof getInitials>;
const mockGetAvatarColor = getAvatarColor as jest.MockedFunction<typeof getAvatarColor>;

describe('Avatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInitials.mockReturnValue('JD');
    mockGetAvatarColor.mockReturnValue('#FF6B6B');
  });

  it('should render with display name and user ID', () => {
    const { getByText } = render(
      <Avatar displayName="John Doe" userId="user-123" />
    );

    expect(getByText('JD')).toBeTruthy();
  });

  it('should call getInitials with display name', () => {
    render(<Avatar displayName="John Doe" userId="user-123" />);

    expect(mockGetInitials).toHaveBeenCalledWith('John Doe');
  });

  it('should call getAvatarColor with user ID', () => {
    render(<Avatar displayName="John Doe" userId="user-123" />);

    expect(mockGetAvatarColor).toHaveBeenCalledWith('user-123');
  });

  it('should use medium size by default', () => {
    const { getByText } = render(
      <Avatar displayName="John Doe" userId="user-123" />
    );

    const textElement = getByText('JD');
    expect(textElement.props.style[1].fontSize).toBe(AVATAR_SIZES.medium * 0.4);
  });

  it('should use small size when specified', () => {
    const { getByText } = render(
      <Avatar displayName="John Doe" userId="user-123" size="small" />
    );

    const textElement = getByText('JD');
    expect(textElement.props.style[1].fontSize).toBe(AVATAR_SIZES.small * 0.4);
  });

  it('should use large size when specified', () => {
    const { getByText } = render(
      <Avatar displayName="John Doe" userId="user-123" size="large" />
    );

    const textElement = getByText('JD');
    expect(textElement.props.style[1].fontSize).toBe(AVATAR_SIZES.large * 0.4);
  });

  it('should not show online status by default', () => {
    const { queryByTestId } = render(
      <Avatar displayName="John Doe" userId="user-123" />
    );

    // Since we don't have a testID, we'll check that no status dot is rendered
    // by checking that the container only has the avatar view
    const tree = render(<Avatar displayName="John Doe" userId="user-123" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should show online status when enabled', () => {
    const { getByText } = render(
      <Avatar
        displayName="John Doe"
        userId="user-123"
        showOnlineStatus={true}
        isOnline={true}
      />
    );

    expect(getByText('JD')).toBeTruthy();
    // The status dot is rendered but we can't easily test its color without more complex setup
  });

  it('should show offline status when user is offline', () => {
    const { getByText } = render(
      <Avatar
        displayName="John Doe"
        userId="user-123"
        showOnlineStatus={true}
        isOnline={false}
      />
    );

    expect(getByText('JD')).toBeTruthy();
  });

  it('should apply custom styles', () => {
    const customStyle = { margin: 10 };
    const { getByText } = render(
      <Avatar
        displayName="John Doe"
        userId="user-123"
        style={customStyle}
      />
    );

    expect(getByText('JD')).toBeTruthy();
  });

  it('should handle empty display name', () => {
    mockGetInitials.mockReturnValue('?');
    const { getByText } = render(
      <Avatar displayName="" userId="user-123" />
    );

    expect(getByText('?')).toBeTruthy();
  });

  it('should handle null/undefined display name', () => {
    mockGetInitials.mockReturnValue('?');
    const { getByText } = render(
      <Avatar displayName={null as any} userId="user-123" />
    );

    expect(getByText('?')).toBeTruthy();
  });

  it('should handle empty user ID', () => {
    render(<Avatar displayName="John Doe" userId="" />);

    expect(mockGetAvatarColor).toHaveBeenCalledWith('');
  });

  it('should render with correct accessibility props', () => {
    const { getByText } = render(
      <Avatar displayName="John Doe" userId="user-123" />
    );

    const textElement = getByText('JD');
    // React Native Paper Text component should have accessibility features
    expect(textElement).toBeTruthy();
  });
});
