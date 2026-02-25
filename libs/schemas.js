import { z } from "zod";
import { UNITS, CATEGORIES } from "@/libs/constants";

// Derive valid values from constants (single source of truth)
const UNIT_VALUES = UNITS.map(u => u.value);
const CATEGORY_VALUES = CATEGORIES.map(c => c.value);

// ============ HELPERS ============

// Transforms empty strings to null (for optional DB columns)
const optionalNullString = z
  .string()
  .transform(v => v || null)
  .nullable()
  .optional();

// Transforms empty strings to undefined (for optional non-DB fields)
const optionalString = z
  .string()
  .transform(v => v || undefined)
  .optional();

/**
 * Validate data against a Zod schema.
 * Returns { success, data } on success, or { success, errorMessage } on failure.
 * Use in server actions for consistent error handling.
 */
export function validateWithSchema(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues[0]?.message || "Validation failed";
    return { success: false, errorMessage: message };
  }
  return { success: true, data: result.data };
}

// ============ INVENTORY SCHEMAS ============

export const reagentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  reference: z.string().min(1, "Reference is required"),
  description: optionalNullString,
  supplier: z.string().min(1, "Supplier is required"),
  category: z.enum(CATEGORY_VALUES, { errorMap: () => ({ message: "Invalid category" }) }).default("reagent"),
  minimum_stock: z.coerce.number().int().min(0, "Minimum stock must be 0 or greater").default(0),
  unit: z.enum(UNIT_VALUES, { errorMap: () => ({ message: "Invalid unit" }) }).default("units"),
  storage_location: z.string().min(1, "Storage location is required"),
  storage_temperature: z.string().min(1, "Storage temperature is required"),
  sector: z.string().min(1, "Sector is required"),
  machine: optionalNullString,
});

// For updateReagent — all fields optional, only provided fields are validated
export const reagentUpdateSchema = reagentSchema.partial();

export const stockInSchema = z.object({
  reagent_id: z.uuid("Invalid reagent ID"),
  lot_number: z.string().min(1, "Lot number is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  expiry_date: z.string().optional(),
  date_of_reception: z.string().optional(),
  notes: optionalString,
});

export const stockOutSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  notes: optionalString,
});

// ============ AUTH SCHEMAS ============

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Server-side only — validates just the password string (no confirmPassword)
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

// ============ BARCODE SCHEMAS ============

// Validates decoded QR payload (client-side, used in Scanner)
export const qrPayloadSchema = z.object({
  reagent_id: z.uuid("Invalid reagent ID in QR code"),
  lot_number: z.string().min(1, "Lot number is required"),
  expiry_date: z.string().nullable().optional(),
});

// Validates add-label form in BarcodeManager (client-side only)
export const addLabelSchema = z.object({
  lot_number: z.string().min(1, "Lot number is required"),
  expiry_date: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "At least 1 label required").max(384, "Maximum 384 labels per entry").default(1),
});

// ============ AUDIT LOG SCHEMAS ============

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  resourceType: z.string().optional(),
  action: z.string().optional(),
  dateRange: z.string().optional(),
  userId: z.string().min(1).optional(),
});

// ============ EXPORT SCHEMAS ============

export const exportOptionsSchema = z.object({
  include_empty_lots: z.boolean().default(true),
  include_expired_lots: z.boolean().default(true),
});

// ============ ADMIN SCHEMAS ============

export const inviteUserSchema = z.object({
  email: z.email("Invalid email address"),
  fullName: z.string().min(1, "Full name is required"),
  role: z.enum(["admin", "user"], {
    errorMap: () => ({ message: "Invalid role. Must be 'admin' or 'user'" }),
  }).default("user"),
});

export const updateUserRoleSchema = z.object({
  userId: z.uuid("Invalid user ID"),
  role: z.enum(["admin", "user"], {
    errorMap: () => ({ message: "Invalid role. Must be 'admin' or 'user'" }),
  }),
});
