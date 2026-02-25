import { AppError } from '../lib/errors.js';
export const errorHandler = (error, req, res, next) => {
    console.error('Error:', error);
    if (error instanceof AppError) {
        return res.status(error.statusCode || 500).json({
            message: error.message,
            code: error.code,
            details: error.details,
        });
    }
    // Handle specific database errors
    if (error.message.includes('SQLITE_CONSTRAINT')) {
        return res.status(400).json({
            error: {
                code: 'DATABASE_CONSTRAINT_ERROR',
                message: 'Database constraint violation',
            },
        });
    }
    // Default error response
    return res.status(500).json({
        message: error.message || 'Internal Server Error',
        code: 'INTERNAL_ERROR',
    });
};
