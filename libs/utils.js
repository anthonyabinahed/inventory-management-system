export const getErrorMessage = (
    error,
    defaultMessage = "Something went wrong"
) => {
    console.error(error);

    // Handle Supabase/PostgreSQL errors by code
    // Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html

    // 23505 — unique_violation: parse detail for the specific field
    if (error?.code === '23505') {
        const detail = error.detail || '';
        if (detail.includes('reference')) {
            return "An item with this reference already exists.";
        }
        if (detail.includes('lot_number')) {
            return "This lot number already exists for this reagent.";
        }
        return "A record with this value already exists.";
    }

    // 23503 — foreign_key_violation
    if (error?.code === '23503') {
        return "Referenced record not found.";
    }

    // 23514 — check_violation
    if (error?.code === '23514') {
        const detail = error.detail || error.message || '';
        if (detail.includes('quantity') || detail.includes('minimum_stock') || detail.includes('total_quantity')) {
            return "Quantity cannot be negative.";
        }
        return "Value does not meet the required constraints.";
    }

    // 42P01 — undefined_table
    if (error?.code === '42P01') {
        return "Database table not found. Please run migrations.";
    }

    // Handle error messages
    let errorMessage = defaultMessage;
    if (error?.message) {
        // Truncate long messages but still show something useful
        errorMessage = error.message.length > 150
            ? error.message.substring(0, 150) + '...'
            : error.message;
    }

    return errorMessage;
}