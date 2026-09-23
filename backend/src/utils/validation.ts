import { z } from 'zod';

import { AppError } from './app-error.js';

const cleanStringArray = z.array(z.string().trim().min(1).max(100)).max(50);

export const credentialsSchema = z
  .object({
    email: z.string().trim().email().transform((email) => email.toLowerCase()),
    password: z.string().min(8).max(128),
  })
  .strict();

export const profileSchema = z
  .object({
    age: z.number().int().min(1).max(120).nullable().optional(),
    gender: z
      .enum(['male', 'female', 'non-binary', 'other', 'prefer-not-to-say'])
      .nullable()
      .optional(),
    height: z.number().positive().max(300).nullable().optional(),
    weight: z.number().positive().max(1000).nullable().optional(),
    activityLevel: z
      .enum(['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extra-active'])
      .nullable()
      .optional(),
    fitnessGoal: z.string().trim().min(1).max(100).nullable().optional(),
    dietPreference: z.string().trim().min(1).max(100).nullable().optional(),
    allergies: cleanStringArray.optional(),
    dietaryRestrictions: cleanStringArray.optional(),
  })
  .strict()
  .refine((profile) => Object.keys(profile).length > 0, {
    message: 'At least one profile field is required',
  });

export const parseInput = <Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> => {
  const result = schema.safeParse(input);

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Invalid request data';
    throw new AppError(message, 400);
  }

  return result.data;
};

export type CredentialsInput = z.infer<typeof credentialsSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

