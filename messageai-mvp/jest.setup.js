// Add custom jest matchers from @testing-library/react-native
import '@testing-library/react-native/extend-expect';

// Mock Expo modules
jest.mock('expo-secure-store');
jest.mock('expo-sqlite');
jest.mock('expo-image-picker');
jest.mock('expo-notifications');
jest.mock('expo-image-manipulator');
jest.mock('@react-native-community/netinfo');
jest.mock('expo-device');

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
