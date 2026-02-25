/**
 * process-export Edge Function
 *
 * Invoked by POST /api/export/request after creating an export_jobs record.
 * Runs asynchronously — the API route does not wait for this to complete.
 *
 * Steps:
 *  1. Mark job as 'processing'
 *  2. Read export options from the job record
 *  3. Batch-fetch all reagents and lots (handles Supabase's 1000-row limit)
 *  4. Generate .xlsx with ExcelJS
 *  5. Upload to Supabase Storage (exports/{user_id}/{job_id}/inventory-export-{date}.xlsx)
 *  6. Mark job as 'completed' with file_path
 *  7. On any error: mark job as 'failed' with error_message
 */

import { createAdminClient } from "../_shared/supabase.ts";
import { buildInventoryWorkbook } from "../_shared/excel.ts";

const PAGE_SIZE = 1000;

// deno-lint-ignore no-explicit-any
async function fetchAllReagents(supabase: any) {
  const all = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("reagents")
      .select("id, name, reference, description, supplier, category, minimum_stock, unit, total_quantity, storage_location, storage_temperature, sector, machine, created_at")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

// deno-lint-ignore no-explicit-any
async function fetchAllLots(supabase: any, options: { include_empty_lots: boolean; include_expired_lots: boolean }) {
  const all = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("lots")
      .select(`
        id,
        lot_number,
        quantity,
        expiry_date,
        date_of_reception,
        shelf_life_days,
        reagents (
          name,
          reference,
          category,
          unit
        )
      `)
      .eq("is_active", true)
      .order("expiry_date", { ascending: true, nullsFirst: false });

    if (!options.include_empty_lots) {
      query = query.gt("quantity", 0);
    }

    if (!options.include_expired_lots) {
      const today = new Date().toISOString().split("T")[0];
      query = query.or(`expiry_date.is.null,expiry_date.gte.${today}`);
    }

    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

/**
 * Core export job processing logic — exported for unit testing.
 * Accepts an injected Supabase client so tests can pass a mock.
 */
// deno-lint-ignore no-explicit-any
export async function processExportJob(jobId: string, supabase: any): Promise<Response> {
  // 1. Mark as processing and read job details
  const { data: job, error: jobError } = await supabase
    .from("export_jobs")
    .update({ status: "processing" })
    .eq("id", jobId)
    .eq("status", "pending") // Guard: only process pending jobs
    .select("id, user_id, options")
    .single();

  if (jobError || !job) {
    console.error("Job not found or already processed:", jobError);
    return new Response(JSON.stringify({ error: "Job not found" }), { status: 404 });
  }

  const options = {
    include_empty_lots: job.options?.include_empty_lots ?? true,
    include_expired_lots: job.options?.include_expired_lots ?? true,
  };

  try {
    // 2. Fetch all data (sequential to avoid DB overload)
    const reagents = await fetchAllReagents(supabase);
    const lots = await fetchAllLots(supabase, options);

    // 3. Generate Excel workbook
    const buffer = await buildInventoryWorkbook(reagents, lots);

    // 4. Upload to Storage
    const date = new Date().toISOString().split("T")[0];
    const filePath = `${job.user_id}/${jobId}/inventory-export-${date}.xlsx`;

    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(filePath, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 5. Mark as completed
    await supabase
      .from("export_jobs")
      .update({
        status: "completed",
        file_path: filePath,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (processingError) {
    // 6. Mark as failed
    console.error("process-export processing error:", processingError);
    await supabase
      .from("export_jobs")
      .update({
        status: "failed",
        error_message: processingError instanceof Error
          ? processingError.message
          : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({ error: processingError instanceof Error ? processingError.message : "Processing failed" }),
      { status: 500 }
    );
  }
}

// Entry point — only runs when executed directly (not when imported in tests)
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    try {
      const { jobId } = await req.json();

      if (!jobId) {
        return new Response(JSON.stringify({ error: "Missing jobId" }), { status: 400 });
      }

      const supabase = createAdminClient();
      return await processExportJob(jobId, supabase);
    } catch (err) {
      console.error("process-export error:", err);
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
        { status: 500 }
      );
    }
  });
}
