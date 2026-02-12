import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock NextResponse
const mockRedirect = vi.fn();
const mockNextResponse = {
  cookies: {
    getAll: vi.fn(() => []),
    set: vi.fn(),
  },
};

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({ ...mockNextResponse })),
    redirect: vi.fn((url) => {
      mockRedirect(url.pathname);
      return { cookies: { set: vi.fn() } };
    }),
  },
}));

// Mock Supabase SSR
let mockClaims = null;
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getClaims: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: { claims: mockClaims } })
      ),
    },
  })),
}));

const { updateSession } = await import('@/libs/supabase/middleware');

beforeEach(() => {
  vi.clearAllMocks();
  mockClaims = null;
});

function createRequest(path) {
  const url = new URL(path, 'http://localhost:3000');
  return {
    url: url.toString(),
    cookies: {
      getAll: vi.fn(() => []),
      set: vi.fn(),
    },
    nextUrl: {
      clone: () => ({ pathname: '', toString: () => url.toString() }),
    },
  };
}

// ============ Unauthenticated user ============

describe('unauthenticated user', () => {
  beforeEach(() => {
    mockClaims = null;
  });

  it('redirects / to /login', async () => {
    await updateSession(createRequest('/'));
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects /admin/dashboard to /login', async () => {
    await updateSession(createRequest('/admin/dashboard'));
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects /api/something to /login', async () => {
    await updateSession(createRequest('/api/something'));
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('allows /login (pass through)', async () => {
    await updateSession(createRequest('/login'));
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('allows /forgot-password (pass through)', async () => {
    await updateSession(createRequest('/forgot-password'));
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('allows /reset-password (not an auth route)', async () => {
    await updateSession(createRequest('/reset-password'));
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('allows /accept-invite (not an auth route)', async () => {
    await updateSession(createRequest('/accept-invite'));
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

// ============ Authenticated user ============

describe('authenticated user', () => {
  beforeEach(() => {
    mockClaims = { sub: 'user-123', email: 'user@example.com' };
  });

  it('allows / (pass through)', async () => {
    await updateSession(createRequest('/'));
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('allows /admin/dashboard (middleware does not check role)', async () => {
    await updateSession(createRequest('/admin/dashboard'));
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects /login to / (already authenticated)', async () => {
    await updateSession(createRequest('/login'));
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('redirects /forgot-password to / (already authenticated)', async () => {
    await updateSession(createRequest('/forgot-password'));
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('allows /reset-password (needed for the flow)', async () => {
    await updateSession(createRequest('/reset-password'));
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('allows /accept-invite (needed for the flow)', async () => {
    await updateSession(createRequest('/accept-invite'));
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
