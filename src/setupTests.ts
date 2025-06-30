import '@testing-library/jest-dom';

// Mock environment variables for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_R2_ENDPOINT: 'https://test-account.r2.cloudflarestorage.com',
    VITE_R2_ACCESS_KEY: 'test-access-key',
    VITE_R2_SECRET_KEY: 'test-secret-key',
    VITE_R2_BUCKET_NAME: 'test-bucket',
    VITE_R2_PUBLIC_URL: 'https://cdn.test.com/',
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  },
  writable: true,
});

// Mock crypto.randomUUID for tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(global.URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:test-url'),
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: jest.fn(),
});

// Mock XMLHttpRequest for upload progress testing
class MockXMLHttpRequest {
  upload = {
    addEventListener: jest.fn(),
  };
  addEventListener = jest.fn();
  open = jest.fn();
  setRequestHeader = jest.fn();
  send = jest.fn();
  status = 200;
}

Object.defineProperty(global, 'XMLHttpRequest', {
  value: MockXMLHttpRequest,
});