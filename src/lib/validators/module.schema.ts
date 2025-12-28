import { z } from 'zod';

export const moduleSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  order_index: z.number().int().min(0).optional(),
});

export type ModuleInput = z.infer<typeof moduleSchema>;
