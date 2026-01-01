import { z } from 'zod';

export const courseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  interval_days_default: z.number().int().min(1),
  status: z.enum(['active', 'archived']).optional(),
});

export type CourseInput = z.infer<typeof courseSchema>;
