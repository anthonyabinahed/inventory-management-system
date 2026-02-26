import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  createTestUser,
  getAdminClient,
  createTestReagent,
  createTestLot,
  cleanupAll,
} from '../helpers/supabase.js';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return { ...actual, cache: (fn) => fn };
});

const mockSendEmail = vi.fn().mockResolvedValue({ id: 'mock-email-id' });
vi.mock('@/libs/resend', () => ({
  sendEmail: (...args) => mockSendEmail(...args),
}));

// The API route creates its own supabase client directly (service role),
// so we don't need to mock createSupabaseClient for it. But we do need
// CRON_SECRET and the inventory helpers use withAuth which needs the mock.
let currentClient;
vi.mock('@/libs/supabase/server', () => ({
  createSupabaseClient: vi.fn(async () => currentClient),
}));

const { GET } = await import('@/app/api/alerts/send-digest/route');

// ─── Test state ─────────────────────────────────────────────────────────────

let adminClient;
let subscriberUser, nonSubscriberUser;
let previouslyEnabledUserIds = [];
const CRON_SECRET = process.env.CRON_SECRET;

function makeRequest(secret) {
  return new Request('http://localhost/api/alerts/send-digest', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secret}`,
    },
  });
}

beforeAll(async () => {
  // Set CRON_SECRET for tests
  process.env.CRON_SECRET = CRON_SECRET;

  await cleanupAll();
  adminClient = getAdminClient();

  // Disable alerts for all existing (non-test) users so they don't interfere;
  // save their IDs to restore in afterAll
  const { data: enabledUsers } = await adminClient
    .from('profiles')
    .select('id')
    .eq('receive_email_alerts', true);
  previouslyEnabledUserIds = (enabledUsers || []).map(u => u.id);

  if (previouslyEnabledUserIds.length > 0) {
    await adminClient
      .from('profiles')
      .update({ receive_email_alerts: false })
      .in('id', previouslyEnabledUserIds);
  }

  // Create subscriber user
  ({ user: subscriberUser } = await createTestUser({
    email: 'alert-subscriber@test.com',
    password: 'TestPass123!',
    role: 'user',
    fullName: 'Subscriber User',
  }));

  // Enable alerts for subscriber
  await adminClient
    .from('profiles')
    .update({ receive_email_alerts: true })
    .eq('id', subscriberUser.id);

  // Create non-subscriber user
  ({ user: nonSubscriberUser } = await createTestUser({
    email: 'alert-nonsub@test.com',
    password: 'TestPass123!',
    role: 'user',
    fullName: 'Non Subscriber',
  }));
  // receive_email_alerts defaults to false — no update needed
});

beforeEach(() => {
  vi.clearAllMocks();
  // Clean up alert_notifications before each test
});

afterAll(async () => {
  // Clean up alert_notifications
  if (subscriberUser) {
    await adminClient.from('alert_notifications').delete().eq('user_id', subscriberUser.id);
  }
  if (nonSubscriberUser) {
    await adminClient.from('alert_notifications').delete().eq('user_id', nonSubscriberUser.id);
  }
  await cleanupAll();

  // Restore alerts for users that had them enabled before tests
  if (previouslyEnabledUserIds.length > 0) {
    await adminClient
      .from('profiles')
      .update({ receive_email_alerts: true })
      .in('id', previouslyEnabledUserIds);
  }
});

// ─── Auth ───────────────────────────────────────────────────────────────────

describe('GET /api/alerts/send-digest — auth', () => {
  it('returns 401 without authorization header', async () => {
    const req = new Request('http://localhost/api/alerts/send-digest', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with wrong bearer token', async () => {
    const res = await GET(makeRequest('wrong-secret'));
    expect(res.status).toBe(401);
  });
});

// ─── No subscribers / no alerts ─────────────────────────────────────────────

describe('GET /api/alerts/send-digest — no subscribers', () => {
  it('returns sent:0 when no users have alerts enabled', async () => {
    // Temporarily disable subscriber
    await adminClient
      .from('profiles')
      .update({ receive_email_alerts: false })
      .eq('id', subscriberUser.id);

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toBe('No subscribers');

    // Re-enable subscriber
    await adminClient
      .from('profiles')
      .update({ receive_email_alerts: true })
      .eq('id', subscriberUser.id);
  });
});

describe('GET /api/alerts/send-digest — with alerts from seed data', () => {
  beforeEach(async () => {
    await adminClient.from('alert_notifications').delete().eq('user_id', subscriberUser.id);
  });

  it('sends alerts when seed data has low stock or expired items', async () => {
    // Seed data has low-stock and expired items — this tests the real scenario
    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    // With seed data, there should be alerts to send
    expect(body.totalAlerts).toBeGreaterThan(0);
    expect(body.sent).toBe(1);
  });
});

// ─── Sending alerts ─────────────────────────────────────────────────────────

describe('GET /api/alerts/send-digest — sending', () => {
  let lowStockReagent;

  beforeAll(async () => {
    // Create a reagent that triggers low stock alert
    lowStockReagent = await createTestReagent({
      name: 'Low Stock Reagent',
      reference: 'LSR-001',
      minimum_stock: 10,
      total_quantity: 3,
      unit: 'vials',
    });
  });

  beforeEach(async () => {
    // Clean notifications from previous test runs
    await adminClient.from('alert_notifications').delete().eq('user_id', subscriberUser.id);
  });

  it('sends email to opted-in user when low stock exists', async () => {
    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.totalAlerts).toBeGreaterThan(0);

    // Verify sendEmail was called with correct recipient and structure
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendEmail.mock.calls[0][0];
    expect(callArgs.to).toBe('alert-subscriber@test.com');
    expect(callArgs.subject).toContain('[Anamed]');
    expect(callArgs.subject).toContain('need attention');
    expect(callArgs.html).toContain('Daily Inventory Alert');
    expect(callArgs.html).toContain('View Inventory');
    expect(callArgs.text).toContain('Daily Inventory Alert');
  });

  it('does NOT send email to user with receive_email_alerts = false', async () => {
    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.sent).toBe(1); // Only subscriber

    // Verify non-subscriber did NOT receive email
    const calls = mockSendEmail.mock.calls;
    const recipients = calls.map(c => c[0].to);
    expect(recipients).not.toContain('alert-nonsub@test.com');
  });

  it('records successful send in alert_notifications table', async () => {
    await GET(makeRequest(CRON_SECRET));

    const { data: notifications } = await adminClient
      .from('alert_notifications')
      .select('*')
      .eq('user_id', subscriberUser.id)
      .eq('email_status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].alert_summary).toHaveProperty('low_stock_count');
    expect(notifications[0].alert_summary).toHaveProperty('out_of_stock_count');
    expect(notifications[0].alert_summary).toHaveProperty('expired_count');
    expect(notifications[0].alert_summary).toHaveProperty('expiring_soon_count');
  });

  it('records failed send with error_message when sendEmail throws', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('SMTP down'));

    await GET(makeRequest(CRON_SECRET));

    const { data: notifications } = await adminClient
      .from('alert_notifications')
      .select('*')
      .eq('user_id', subscriberUser.id)
      .eq('email_status', 'failed')
      .order('sent_at', { ascending: false })
      .limit(1);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].error_message).toBe('SMTP down');
  });

  it('skips user who already received digest today (dedup)', async () => {
    // First call sends email
    await GET(makeRequest(CRON_SECRET));
    expect(mockSendEmail).toHaveBeenCalledTimes(1);

    mockSendEmail.mockClear();

    // Second call should skip (already sent today)
    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe('GET /api/alerts/send-digest — expired lots', () => {
  beforeAll(async () => {
    // Create expired lot
    const reagent = await createTestReagent({
      name: 'Expired Reagent',
      reference: 'EXP-001',
      minimum_stock: 0,
      total_quantity: 50,
    });
    await createTestLot(reagent.id, {
      quantity: 10,
      expiry_date: '2025-01-01', // In the past
    });
  });

  beforeEach(async () => {
    await adminClient.from('alert_notifications').delete().eq('user_id', subscriberUser.id);
  });

  it('sends email when expired lots exist', async () => {
    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBe(1);

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('EXPIRED'),
      })
    );
  });
});

describe('GET /api/alerts/send-digest — multiple subscribers', () => {
  let secondSubscriber;

  beforeAll(async () => {
    ({ user: secondSubscriber } = await createTestUser({
      email: 'alert-sub2@test.com',
      password: 'TestPass123!',
      role: 'user',
      fullName: 'Second Subscriber',
    }));
    await adminClient
      .from('profiles')
      .update({ receive_email_alerts: true })
      .eq('id', secondSubscriber.id);

    // Ensure there's an alert condition (low stock reagent from earlier tests still exists)
  });

  beforeEach(async () => {
    await adminClient.from('alert_notifications').delete().eq('user_id', subscriberUser.id);
    if (secondSubscriber) {
      await adminClient.from('alert_notifications').delete().eq('user_id', secondSubscriber.id);
    }
  });

  afterAll(async () => {
    if (secondSubscriber) {
      await adminClient.from('alert_notifications').delete().eq('user_id', secondSubscriber.id);
    }
  });

  it('sends to all opted-in users', async () => {
    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.sent).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);

    const recipients = mockSendEmail.mock.calls.map(c => c[0].to);
    expect(recipients).toContain('alert-subscriber@test.com');
    expect(recipients).toContain('alert-sub2@test.com');
  });
});
