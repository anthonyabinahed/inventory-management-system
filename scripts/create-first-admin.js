#!/usr/bin/env node
/**
 * First Admin Setup Script
 *
 * Creates the first admin user for the laboratory stock management system.
 *
 * Usage:
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
ADMIN_EMAIL=anthonyabinahed@gmail.com ADMIN_PASSWORD=12345Aa@ ADMIN_NAME="Anthony Nahed" \
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
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: "admin",
      full_name: ADMIN_NAME,
    },
  });

  if (error) throw error;

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ role: "admin", full_name: ADMIN_NAME })
    .eq("id", data.user.id);

  if (updateError) {
    console.warn("Could not update profile:", updateError.message);
  }

  return data.user;
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
