import '@testing-library/jest-dom';

// Mock window.ethereum for tests
const mockEthereum = {
  isMetaMask: true,
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  selectedAddress: null,
  chainId: '0x1',
  providers: undefined
};

Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true,
  configurable: true
});

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  writable: true
});