import { z } from 'zod';

export const resourceSchema = z.object({
  title: z.string().trim().min(2).max(120),
  type: z.enum(['link', 'video', 'pdf']),
  url: z.string().url(),
  description: z.string().trim().max(500).optional().nullable(),
  order_index: z.coerce.number().int().min(0).default(0),
});
