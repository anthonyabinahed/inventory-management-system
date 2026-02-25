import { vi, describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import {
  createTestUser,
  getAnonClient,
  getAdminClient,
  cleanupAll,
} from '../helpers/supabase.js';

// ─── Mocks (Next.js framework only — Supabase is real) ───────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return { ...actual, cache: (fn) => fn };
});

let currentClient;
vi.mock('@/libs/supabase/server', () => ({
  createSupabaseClient: vi.fn(async () => currentClient),
}));

// Import route handlers after mocks are declared
const { POST } = await import('@/app/api/export/request/route');
const { GET } = await import('@/app/api/export/status/[jobId]/route');

// ─── Test state ───────────────────────────────────────────────────────────────

let user, userClient, adminClient;

beforeAll(async () => {
  await cleanupAll();
  adminClient = getAdminClient();
  ({ user, client: userClient } = await createTestUser({
    email: 'export-api-test@test.com',
    password: 'TestPass123!',
    role: 'user',
  }));
});

beforeEach(() => {
  vi.clearAllMocks();
  currentClient = userClient;
  // Stub fetch so the fire-and-forget Edge Function call never hits a real server
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  // export_jobs references profiles(id) with no CASCADE — delete jobs before cleanupAll
  await adminClient.from('export_jobs').delete().eq('user_id', user.id);
  await cleanupAll();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePostRequest(body) {
  return new Request('http://localhost/api/export/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function callGet(jobId) {
  return GET(
    new Request(`http://localhost/api/export/status/${jobId}`),
    { params: Promise.resolve({ jobId }) }
  );
}

/** Insert a job record directly via the admin client (bypasses RLS). */
async function insertJob(status, filePath = null, errorMessage = null) {
  const { data } = await adminClient
    .from('export_jobs')
    .insert({
      user_id: user.id,
      status,
      options: { include_empty_lots: true, include_expired_lots: true },
      file_path: filePath,
      error_message: errorMessage,
    })
    .select('id')
    .single();
  return data.id;
}

// ─── POST /api/export/request ─────────────────────────────────────────────────

describe('POST /api/export/request', () => {
  describe('auth guard', () => {
    it('returns 401 when unauthenticated', async () => {
      currentClient = getAnonClient();
      const res = await POST(makePostRequest({}));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('request body validation', () => {
    it('returns 400 when include_empty_lots is a string', async () => {
      const res = await POST(makePostRequest({ include_empty_lots: 'true', include_expired_lots: true }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(typeof body.error).toBe('string');
    });

    it('returns 400 when include_expired_lots is a number', async () => {
      const res = await POST(makePostRequest({ include_empty_lots: true, include_expired_lots: 1 }));
      expect(res.status).toBe(400);
    });
  });

  describe('successful export request', () => {
    it('returns 202 with success:true and a jobId', async () => {
      const res = await POST(makePostRequest({ include_empty_lots: true, include_expired_lots: false }));
      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(typeof body.jobId).toBe('string');
    });

    it('creates a real export_jobs record with correct user_id, status, and options', async () => {
      const res = await POST(makePostRequest({ include_empty_lots: false, include_expired_lots: true }));
      const { jobId } = await res.json();

      const { data: job } = await adminClient
        .from('export_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      expect(job.status).toBe('pending');
      expect(job.user_id).toBe(user.id);
      expect(job.options.include_empty_lots).toBe(false);
      expect(job.options.include_expired_lots).toBe(true);
    });

    it('fires fetch to the Edge Function URL with a Bearer token', async () => {
      const res = await POST(makePostRequest({}));
      const { jobId } = await res.json();

      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining('process-export'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer '),
          }),
          body: JSON.stringify({ jobId }),
        })
      );
    });

    it('returns 202 even when the Edge Function fetch rejects (fire-and-forget)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
      const res = await POST(makePostRequest({}));
      expect(res.status).toBe(202);
    });

    it('accepts empty body (no JSON) and returns 202 with schema defaults', async () => {
      const req = new Request('http://localhost/api/export/request', { method: 'POST' });
      const res = await POST(req);
      expect(res.status).toBe(202);
    });
  });
});

// ─── GET /api/export/status/[jobId] ──────────────────────────────────────────

describe('GET /api/export/status/[jobId]', () => {
  describe('auth guard', () => {
    it('returns 401 when unauthenticated', async () => {
      currentClient = getAnonClient();
      const res = await callGet('00000000-0000-0000-0000-000000000001');
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('job not found', () => {
    it('returns 404 for a nonexistent job UUID', async () => {
      const res = await callGet('00000000-0000-0000-0000-000000000001');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Job not found');
    });
  });

  describe('pending / processing status', () => {
    it('returns 200 with status:pending and no downloadUrl', async () => {
      const jobId = await insertJob('pending');
      const res = await callGet(jobId);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('pending');
      expect(body.errorMessage).toBeNull();
      expect(body).not.toHaveProperty('downloadUrl');
    });

    it('returns 200 with status:processing and no downloadUrl', async () => {
      const jobId = await insertJob('processing');
      const res = await callGet(jobId);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('processing');
      expect(body).not.toHaveProperty('downloadUrl');
    });
  });

  describe('failed status', () => {
    it('returns 200 with status:failed and errorMessage from the job record', async () => {
      const jobId = await insertJob('failed', null, 'Out of memory');
      const res = await callGet(jobId);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('failed');
      expect(body.errorMessage).toBe('Out of memory');
    });

    it('returns 200 with status:failed and errorMessage:null when not set', async () => {
      const jobId = await insertJob('failed', null, null);
      const res = await callGet(jobId);
      const body = await res.json();
      expect(body.status).toBe('failed');
      expect(body.errorMessage).toBeNull();
    });
  });

  describe('completed status', () => {
    // A real file must exist in the bucket for createSignedUrl to succeed
    let testFilePath;

    beforeAll(async () => {
      testFilePath = `${user.id}/test-job/test-export.xlsx`;
      await adminClient.storage.from('exports').upload(
        testFilePath,
        new Uint8Array([0x50, 0x4b, 0x05, 0x06]), // minimal ZIP/XLSX magic bytes
        {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true,
        }
      );
    });

    afterAll(async () => {
      await adminClient.storage.from('exports').remove([testFilePath]);
    });

    it('returns 200 with status:completed and a downloadUrl (real signed URL)', async () => {
      const jobId = await insertJob('completed', testFilePath);
      const res = await callGet(jobId);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('completed');
      expect(typeof body.downloadUrl).toBe('string');
      expect(body.downloadUrl.length).toBeGreaterThan(0);
    });

    it('returns 200 with status:completed but no downloadUrl when file_path is null', async () => {
      const jobId = await insertJob('completed', null);
      const res = await callGet(jobId);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('completed');
      expect(body).not.toHaveProperty('downloadUrl');
    });
  });
});
