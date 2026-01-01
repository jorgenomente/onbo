import { z } from 'zod';

export const enrollmentSchema = z.object({
  user_id: z.string().uuid(),
  course_id: z.string().uuid(),
  interval_days: z.number().int().min(1).optional(),
});

export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
