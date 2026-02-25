export class AppError extends Error {
    constructor(message, code, statusCode = 400, details) {
        super(message);
        this.message = message;
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
export const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
    DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
    PDF_GENERATION_ERROR: 'PDF_GENERATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
};
