import { z } from 'zod';

export const lessonSchema = z.object({
  title: z.string().trim().min(2).max(120),
  content_json: z.record(z.unknown()).optional(),
  order_index: z.number().int().min(0).optional(),
});

export type LessonInput = z.infer<typeof lessonSchema>;
