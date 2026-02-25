import { z } from 'zod'
import { AppError, ErrorCodes } from './errors'

// Define validation schemas
export const templateDataSchema = z.object({
  // Vehicle Information
  plate1: z.string().optional(),
  vin1: z.string()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'Invalid VIN format')
    .optional(),
  make1: z.string().optional(),
  model1: z.string().optional(),
  year: z.string()
    .regex(/^\d{4}$/, 'Invalid year format')
    .optional(),
  color: z.string().optional(),
  car: z.string().optional(),
  number: z.string().optional(),
  body: z.string().optional(),
  
  // Additional Vehicle Info
  plate2: z.string().optional(),
  plate3: z.string().optional(),
  vin2: z.string()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'Invalid VIN format')
    .optional(),
  vin3: z.string()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'Invalid VIN format')
    .optional(),
  make2: z.string().optional(),
  model2: z.string().optional(),
  
  // Dates and Expirations
  date1: z.string().optional(),
  date2: z.string().optional(),
  exp1: z.string().optional(),
  exp2: z.string().optional(),
  exp3: z.string().optional(),
  
  // Owner Information
  first: z.string().optional(),
  last: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string()
    .length(2, 'State must be 2 characters')
    .optional(),
  zip: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format')
    .optional(),
  
  // Insurance Information
  ins: z.string().optional(),
  policy: z.string().optional(),
})

export type ValidatedTemplateData = z.infer<typeof templateDataSchema>

export function validateTemplateData(data: unknown) {
  try {
    return templateDataSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(
        'Invalid form data',
        ErrorCodes.VALIDATION_ERROR,
        400,
        error.errors
      )
    }
    throw error
  }
}

// Add format validation helpers
export const formatValidation = {
  vin: (value: string) => /^[A-HJ-NPR-Z0-9]{17}$/i.test(value),
  year: (value: string) => /^\d{4}$/.test(value),
  state: (value: string) => /^[A-Z]{2}$/.test(value),
  zip: (value: string) => /^\d{5}(-\d{4})?$/.test(value),
  date: (value: string) => !isNaN(Date.parse(value)),
} 