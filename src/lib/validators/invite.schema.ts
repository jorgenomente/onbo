import { z } from 'zod';

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['employee', 'trainer', 'org_admin']).default('employee'),
  auto_assign_course: z.boolean(),
  course_id: z.string().uuid().optional().nullable(),
  interval_days: z.number().int().min(1).optional(),
  start_date: z.string().optional(),
});

export type InviteInput = z.infer<typeof inviteSchema>;
