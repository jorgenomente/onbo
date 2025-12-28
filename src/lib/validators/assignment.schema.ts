import { z } from 'zod';

export const assignmentSchema = z.object({
  user_id: z.string().uuid(),
  module_id: z.string().uuid(),
  due_date: z.string().optional().nullable(),
  status: z.enum(['assigned', 'completed']).optional(),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;
