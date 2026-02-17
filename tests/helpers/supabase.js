import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY };

/**
 * Service role client — bypasses RLS. Use for test setup/teardown.
 */
export function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Anonymous client — respects RLS with no auth. Tests unauthenticated access.
 */
export function getAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Deletes a user by email if they exist (idempotent cleanup).
 * Uses profiles table instead of listUsers() which has a GoTrue bug locally.
 */
export async function deleteUserByEmail(email) {
  const admin = getAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (profile) {
    // Clean up any data referencing this user's profile before deletion
    await admin.from('audit_logs').delete().eq('user_id', profile.id);
    await admin.from('stock_movements').delete().eq('performed_by', profile.id);
    await admin.from('lots').delete().eq('created_by', profile.id);
    await admin.from('reagents').delete().eq('created_by', profile.id);
    await admin.auth.admin.deleteUser(profile.id);
    await new Promise((r) => setTimeout(r, 100));
  }
}

/**
 * Creates a real user via admin API and returns an authenticated client.
 * @param {Object} opts
 * @param {string} opts.email
 * @param {string} opts.password
 * @param {string} [opts.role='user'] - 'admin' or 'user'
 * @param {string} [opts.fullName='Test User']
 * @returns {Promise<{ client: SupabaseClient, user: object }>}
 */
export async function createTestUser({
  email,
  password = 'TestPass123!',
  role = 'user',
  fullName = 'Test User',
}) {
  const admin = getAdminClient();

  // Delete existing user with this email if leftover from a previous run
  await deleteUserByEmail(email);

  // Create user via admin API (auto-confirms email)
  let { data: { user }, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  // Handle orphaned auth user (profile deleted but auth user remains)
  if (error?.message?.includes('already been registered')) {
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signInData } = await tempClient.auth.signInWithPassword({ email, password });
    if (signInData?.user?.id) {
      await admin.auth.admin.deleteUser(signInData.user.id);
      await new Promise((r) => setTimeout(r, 100));
      ({ data: { user }, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: fullName, role },
      }));
    }
  }

  if (error) throw new Error(`Failed to create test user ${email}: ${error.message}`);

  // Wait a moment for the trigger to create the profile
  await new Promise((r) => setTimeout(r, 200));

  // Sign in with a fresh client
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`Failed to sign in test user ${email}: ${signInError.message}`);

  return { client, user };
}

/**
 * Creates a reagent. Pass an authenticated client to go through RLS,
 * or omit to use admin (bypasses RLS — for setup/teardown only).
 */
export async function createTestReagent(overrides = {}, client) {
  const db = client || getAdminClient();
  const defaults = {
    name: `Test Reagent ${Date.now()}`,
    reference: `REF-${Date.now()}`,
    supplier: 'Test Supplier',
    category: 'reagent',
    storage_location: 'Room A',
    storage_temperature: '2-8°C',
    sector: 'Serology',
    unit: 'vials',
    minimum_stock: 5,
    total_quantity: 0,
    is_active: true,
  };

  const { data, error } = await db
    .from('reagents')
    .insert({ ...defaults, ...overrides })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test reagent: ${error.message}`);
  return data;
}

/**
 * Creates a lot. Pass an authenticated client to go through RLS,
 * or omit to use admin (bypasses RLS — for setup/teardown only).
 */
export async function createTestLot(reagentId, overrides = {}, client) {
  const db = client || getAdminClient();
  const defaults = {
    reagent_id: reagentId,
    lot_number: `LOT-${Date.now()}`,
    quantity: 10,
    expiry_date: '2026-12-31',
    date_of_reception: '2026-01-01',
    is_active: true,
  };

  const { data, error } = await db
    .from('lots')
    .insert({ ...defaults, ...overrides })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test lot: ${error.message}`);
  return data;
}

/**
 * Deletes only test-created data. Preserves seed data and real user data.
 * Test data is identified by:
 * - created_by belonging to a @test.com / @example.com user, or
 * - created_by being NULL (test helpers using admin client without overrides)
 */
export async function cleanupAll() {
  const admin = getAdminClient();

  // Collect test user IDs (profiles with test email domains)
  const { data: testProfiles } = await admin
    .from('profiles')
    .select('id, email');
  const testUserIds = (testProfiles || [])
    .filter(p => p.email?.endsWith('@test.com') || p.email?.endsWith('@example.com'))
    .map(p => p.id);

  // Delete test audit logs (FK to profiles)
  if (testUserIds.length > 0) {
    await admin.from('audit_logs').delete().in('user_id', testUserIds);
  }

  // Delete test stock movements (FK to lots and profiles)
  if (testUserIds.length > 0) {
    await admin.from('stock_movements').delete().in('performed_by', testUserIds);
  }

  // Delete test lots (created by test users or with NULL created_by)
  if (testUserIds.length > 0) {
    await admin.from('lots').delete().in('created_by', testUserIds);
  }
  await admin.from('lots').delete().is('created_by', null);

  // Delete test reagents (created by test users or with NULL created_by)
  if (testUserIds.length > 0) {
    await admin.from('reagents').delete().in('created_by', testUserIds);
  }
  await admin.from('reagents').delete().is('created_by', null);

  // Delete test auth users
  for (const profile of (testProfiles || [])) {
    if (profile.email?.endsWith('@test.com') || profile.email?.endsWith('@example.com')) {
      await admin.auth.admin.deleteUser(profile.id);
    }
  }
}
