export const getErrorMessage = (
    error, 
    defaultMessage = "Something went wrong" 
) => {
    console.error(error);
    let errorMessage = defaultMessage;
    if (error instanceof Error && error.message.length < 100) {
        errorMessage = error.message;
    }
    return errorMessage; 
}