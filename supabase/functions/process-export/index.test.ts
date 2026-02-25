/**
 * Tests for process-export/index.ts — processExportJob()
 *
 * Runs with: deno task test (from supabase/functions/)
 * Strategy: inject a hand-written Supabase mock to test orchestration logic
 *           without a real DB or storage bucket.
 */

import { assertEquals, assert } from "jsr:@std/assert";
import { processExportJob } from "./index.ts";

// ─── Mock factory ─────────────────────────────────────────────────────────────

const DEFAULT_JOB = {
  id: "job-id",
  user_id: "user-id",
  options: { include_empty_lots: true, include_expired_lots: true },
};

interface MockOpts {
  job?: typeof DEFAULT_JOB | null;
  jobError?: { message: string } | null;
  reagents?: unknown[];
  reagentsError?: { message: string } | null;
  lotsData?: unknown[];
  lotsError?: { message: string } | null;
  uploadError?: { message: string } | null;
}

interface UpdateCall {
  table: string;
  // deno-lint-ignore no-explicit-any
  data: any;
}

interface Tracked {
  updates: UpdateCall[];
  gtCalled: boolean;
  orCalled: boolean;
  uploadPath: string;
}

function createMockSupabase(opts: MockOpts = {}) {
  const o: Required<MockOpts> = {
    job: DEFAULT_JOB,
    jobError: null,
    reagents: [],
    reagentsError: null,
    lotsData: [],
    lotsError: null,
    uploadError: null,
    ...opts,
  };

  const tracked: Tracked = {
    updates: [],
    gtCalled: false,
    orCalled: false,
    uploadPath: "",
  };

  let currentTable = "";

  // deno-lint-ignore no-explicit-any
  const chain: any = {
    from(table: string) {
      currentTable = table;
      return chain;
    },
    // deno-lint-ignore no-explicit-any
    update(data: any) {
      tracked.updates.push({ table: currentTable, data });
      return chain;
    },
    select() { return chain; },
    eq() { return chain; },
    gt() { tracked.gtCalled = true; return chain; },
    or() { tracked.orCalled = true; return chain; },
    order() { return chain; },
    range() {
      if (currentTable === "reagents") {
        return Promise.resolve({ data: o.reagents, error: o.reagentsError });
      }
      if (currentTable === "lots") {
        return Promise.resolve({ data: o.lotsData, error: o.lotsError });
      }
      return Promise.resolve({ data: [], error: null });
    },
    single() {
      return Promise.resolve({
        data: o.jobError ? null : o.job,
        error: o.jobError ?? null,
      });
    },
    // Make the chain awaitable for bare `await supabase.from().update().eq()` calls
    then(
      resolve: (v: { data: null; error: null }) => void,
      _reject: (e: unknown) => void,
    ) {
      return Promise.resolve({ data: null, error: null }).then(resolve);
    },
    storage: {
      from: () => ({
        upload(path: string, _buffer: unknown, _opts: unknown) {
          tracked.uploadPath = path;
          return Promise.resolve({ data: {}, error: o.uploadError ?? null });
        },
      }),
    },
  };

  return { client: chain, tracked };
}

// ─── Job not found / 404 ─────────────────────────────────────────────────────

Deno.test("returns 404 when single returns a DB error", async () => {
  const { client } = createMockSupabase({
    jobError: { message: "not found" },
  });
  const res = await processExportJob("job-id", client);
  assertEquals(res.status, 404);
  const body = await res.json();
  assertEquals(body.error, "Job not found");
});

Deno.test("returns 404 when single returns null data with no error", async () => {
  const { client } = createMockSupabase({ job: null });
  const res = await processExportJob("job-id", client);
  assertEquals(res.status, 404);
});

// ─── Success path ─────────────────────────────────────────────────────────────

Deno.test("returns 200 with { success: true } on success", async () => {
  const { client } = createMockSupabase();
  const res = await processExportJob("job-id", client);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
});

Deno.test("marks job as processing before doing any work", async () => {
  const { client, tracked } = createMockSupabase();
  await processExportJob("job-id", client);
  assert(tracked.updates.length >= 1, "expected at least one update");
  const processingUpdate = tracked.updates[0];
  assertEquals(processingUpdate.table, "export_jobs");
  assertEquals(processingUpdate.data.status, "processing");
});

Deno.test("marks job as completed after successful upload", async () => {
  const { client, tracked } = createMockSupabase();
  await processExportJob("job-id", client);
  const completedUpdate = tracked.updates.find((u) => u.data.status === "completed");
  assert(completedUpdate !== undefined, "expected a 'completed' update");
  assertEquals(completedUpdate.table, "export_jobs");
});

Deno.test("completed update includes file_path", async () => {
  const { client, tracked } = createMockSupabase();
  await processExportJob("job-id", client);
  const completedUpdate = tracked.updates.find((u) => u.data.status === "completed");
  assert(completedUpdate !== undefined);
  assert(typeof completedUpdate.data.file_path === "string");
});

Deno.test("uploads to {user_id}/{job_id}/inventory-export-{YYYY-MM-DD}.xlsx", async () => {
  const { client, tracked } = createMockSupabase();
  await processExportJob("job-id", client);
  const today = new Date().toISOString().split("T")[0];
  assertEquals(tracked.uploadPath, `user-id/job-id/inventory-export-${today}.xlsx`);
});

// ─── Filter options ───────────────────────────────────────────────────────────

Deno.test("calls gt('quantity',0) when include_empty_lots is false", async () => {
  const job = { ...DEFAULT_JOB, options: { include_empty_lots: false, include_expired_lots: true } };
  const { client, tracked } = createMockSupabase({ job });
  await processExportJob("job-id", client);
  assertEquals(tracked.gtCalled, true);
});

Deno.test("does NOT call gt() when include_empty_lots is true", async () => {
  const { client, tracked } = createMockSupabase();
  await processExportJob("job-id", client);
  assertEquals(tracked.gtCalled, false);
});

Deno.test("calls or() with expiry filter when include_expired_lots is false", async () => {
  const job = { ...DEFAULT_JOB, options: { include_empty_lots: true, include_expired_lots: false } };
  const { client, tracked } = createMockSupabase({ job });
  await processExportJob("job-id", client);
  assertEquals(tracked.orCalled, true);
});

Deno.test("does NOT call or() when include_expired_lots is true", async () => {
  const { client, tracked } = createMockSupabase();
  await processExportJob("job-id", client);
  assertEquals(tracked.orCalled, false);
});

// ─── Error paths ──────────────────────────────────────────────────────────────

Deno.test("returns 500 when storage upload fails", async () => {
  const { client } = createMockSupabase({ uploadError: { message: "bucket full" } });
  const res = await processExportJob("job-id", client);
  assertEquals(res.status, 500);
});

Deno.test("marks job as failed when storage upload fails", async () => {
  const { client, tracked } = createMockSupabase({ uploadError: { message: "bucket full" } });
  await processExportJob("job-id", client);
  const failedUpdate = tracked.updates.find((u) => u.data.status === "failed");
  assert(failedUpdate !== undefined, "expected a 'failed' update");
  assertEquals(failedUpdate.table, "export_jobs");
});

Deno.test("does not mark as completed when upload fails", async () => {
  const { client, tracked } = createMockSupabase({ uploadError: { message: "bucket full" } });
  await processExportJob("job-id", client);
  const completedUpdate = tracked.updates.find((u) => u.data.status === "completed");
  assertEquals(completedUpdate, undefined);
});

Deno.test("returns 500 when reagent fetch fails", async () => {
  const { client } = createMockSupabase({ reagentsError: { message: "db error" } });
  const res = await processExportJob("job-id", client);
  assertEquals(res.status, 500);
});

Deno.test("marks job as failed when reagent fetch fails", async () => {
  const { client, tracked } = createMockSupabase({ reagentsError: { message: "db error" } });
  await processExportJob("job-id", client);
  const failedUpdate = tracked.updates.find((u) => u.data.status === "failed");
  assert(failedUpdate !== undefined, "expected a 'failed' update");
});

Deno.test("returns 500 when lots fetch fails", async () => {
  const { client } = createMockSupabase({ lotsError: { message: "lots db error" } });
  const res = await processExportJob("job-id", client);
  assertEquals(res.status, 500);
});

Deno.test("marks job as failed when lots fetch fails", async () => {
  const { client, tracked } = createMockSupabase({ lotsError: { message: "lots db error" } });
  await processExportJob("job-id", client);
  const failedUpdate = tracked.updates.find((u) => u.data.status === "failed");
  assert(failedUpdate !== undefined, "expected a 'failed' update");
});
