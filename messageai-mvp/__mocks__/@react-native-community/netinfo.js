/**
 * Mock for @react-native-community/netinfo
 */

const netInfoMock = {
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })
  ),
  addEventListener: jest.fn(() => jest.fn()),
  configure: jest.fn(),
};

module.exports = netInfoMock;
