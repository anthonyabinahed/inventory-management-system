#!/usr/bin/env node
/**
 * First Admin Setup Script
 *
 * Creates the first admin user for the laboratory stock management system.
 *
 * Usage:
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU \
ADMIN_EMAIL=anthonyabinahed@gmail.com ADMIN_PASSWORD=12345678 ADMIN_NAME="Anthony Nahed" \
npm run create-admin
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createAdmin() {
  // Try to create the user first
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: "admin",
      full_name: ADMIN_NAME,
    },
  });

  let userId;

  if (error) {
    // User already exists — look them up and ensure admin role
    console.log("User already exists, updating to admin...");
    const { data: users, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = users.users.find((u) => u.email === ADMIN_EMAIL);
    if (!existingUser) throw new Error("Could not find existing user");

    userId = existingUser.id;

    // Update user metadata to include admin role
    const { error: updateAuthError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { role: "admin", full_name: ADMIN_NAME },
      });
    if (updateAuthError) throw updateAuthError;
  } else {
    userId = data.user.id;
  }

  // Upsert the profile to ensure it exists with admin role
  const { error: upsertError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: userId, email: ADMIN_EMAIL, role: "admin", full_name: ADMIN_NAME },
      { onConflict: "id" }
    );

  if (upsertError) {
    console.warn("Could not upsert profile:", upsertError.message);
  }

  return { id: userId, email: ADMIN_EMAIL };
}

createAdmin()
  .then((user) => {
    console.log("Admin created successfully");
    console.log("Email:", ADMIN_EMAIL);
    console.log("Name:", ADMIN_NAME || "(not set)");
    console.log("User ID:", user.id);
  })
  .catch((error) => {
    console.error("Error creating admin:", error.message);
    process.exit(1);
  });
