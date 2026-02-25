import { z } from 'zod';
import { AppError, ErrorCodes } from './errors';
// Define validation schemas
export const templateDataSchema = z.object({
    // Vehicle Information
    vehiclename: z.string().optional(),
    plate1: z.string().min(1, 'License plate is required'),
    vin1: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'Invalid VIN format'),
    make1: z.string().min(1, 'Make is required'),
    model1: z.string().min(1, 'Model is required'),
    year: z.string().regex(/^\d{4}$/, 'Invalid year format'),
    color: z.string().optional(),
    // Owner Information
    first: z.string().min(1, 'First name is required'),
    last: z.string().min(1, 'Last name is required'),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().length(2, 'State must be 2 characters'),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
    // Optional fields
    car: z.string().optional(),
    number: z.string().optional(),
    plate2: z.string().optional(),
    plate3: z.string().optional(),
    vin2: z.string().optional(),
    vin3: z.string().optional(),
    make2: z.string().optional(),
    model2: z.string().optional(),
    body: z.string().optional(),
    date1: z.string().optional(),
    date2: z.string().optional(),
    exp1: z.string().optional(),
    exp2: z.string().optional(),
    exp3: z.string().optional(),
    ins: z.string().optional(),
    policy: z.string().optional(),
});
export function validateTemplateData(data) {
    try {
        return templateDataSchema.parse(data);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new AppError('Invalid form data', ErrorCodes.VALIDATION_ERROR, 400, error.errors);
        }
        throw error;
    }
}
