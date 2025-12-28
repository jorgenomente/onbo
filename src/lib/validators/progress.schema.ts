import { z } from 'zod';

export const progressSchema = z.object({
  lesson_id: z.string().uuid(),
  module_id: z.string().uuid(),
  completed: z.boolean(),
});

export type ProgressInput = z.infer<typeof progressSchema>;
