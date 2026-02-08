export const getErrorMessage = (
    error,
    defaultMessage = "Something went wrong"
) => {
    console.error(error);
    // TODO: check these codes, not descriptive at all. why do we need them anyway? 

    // Handle Supabase/PostgreSQL errors
    if (error?.code === '42P01') {
        return "Database table not found. Please run migrations.";
    }
    if (error?.code === '23505') {
        return "A record with this value already exists.";
    }
    if (error?.code === '23503') {
        return "Referenced record not found.";
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