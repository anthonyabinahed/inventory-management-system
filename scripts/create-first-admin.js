#!/usr/bin/env node
/**
 * First Admin Setup Script
 *
 * Creates the first admin user for the laboratory stock management system.
 *
 * Usage:
 *   npm run create-admin -- --local            # uses .env.local
 *   npm run create-admin -- --staging          # uses .env.staging
 *
 * You can pre-set credentials via env vars to skip prompts:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret ADMIN_NAME="Admin" \
 *     npm run create-admin -- --staging
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { createClient } = require("@supabase/supabase-js");

// --- Parse .env file ---
function parseEnvFile(filePath) {
  const vars = {};
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    vars[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
  }
  return vars;
}

// --- Prompt helper ---
function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  return {
    ask(question) {
      return new Promise((resolve) => rl.question(question, resolve));
    },
    close() {
      rl.close();
    },
  };
}

// --- Resolve Supabase config from --local / --staging flag ---
function resolveConfig() {
  const ENV_MAP = {
    "--local": ".env.local",
    "--staging": ".env.staging",
  };

  const envFlag = process.argv.find((arg) => ENV_MAP[arg]);

  if (!envFlag) {
    console.error("Usage: npm run create-admin -- --local | --staging");
    process.exit(1);
  }

  const envFile = ENV_MAP[envFlag];
  const envPath = path.resolve(__dirname, "..", envFile);

  if (!fs.existsSync(envPath)) {
    console.error(`Environment file not found: ${envFile}`);
    process.exit(1);
  }

  const vars = parseEnvFile(envPath);
  const supabaseUrl = vars.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = vars.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ${envFile}`
    );
    process.exit(1);
  }

  return { supabaseUrl, serviceRoleKey, envName: envFlag.replace("--", "") };
}

// --- Create admin user ---
async function createAdmin(supabaseAdmin, email, password, name) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "admin", full_name: name },
  });

  let userId;

  if (error) {
    console.log("User already exists, updating to admin...");
    const { data: users, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = users.users.find((u) => u.email === email);
    if (!existingUser) throw new Error("Could not find existing user");

    userId = existingUser.id;

    const { error: updateAuthError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { role: "admin", full_name: name },
      });
    if (updateAuthError) throw updateAuthError;
  } else {
    userId = data.user.id;
  }

  const { error: upsertError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: userId, email, role: "admin", full_name: name },
      { onConflict: "id" }
    );

  if (upsertError) {
    console.warn("Could not upsert profile:", upsertError.message);
  }

  return { id: userId, email };
}

// --- Main ---
async function main() {
  const { supabaseUrl, serviceRoleKey, envName } = resolveConfig();

  console.log(`\nEnvironment: ${envName}`);
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  const prompt = createPrompt();

  try {
    const email =
      process.env.ADMIN_EMAIL || (await prompt.ask("Admin email: "));
    const password =
      process.env.ADMIN_PASSWORD || (await prompt.ask("Admin password: "));
    const name =
      process.env.ADMIN_NAME ?? (await prompt.ask("Admin full name: "));

    prompt.close();

    if (!email || !password) {
      console.error("Email and password are required.");
      process.exit(1);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const user = await createAdmin(supabaseAdmin, email, password, name);

    console.log("\nAdmin created successfully");
    console.log("Email:", user.email);
    console.log("Name:", name || "(not set)");
    console.log("User ID:", user.id);
  } catch (error) {
    prompt.close();
    console.error("Error creating admin:", error.message);
    process.exit(1);
  }
}

main();
