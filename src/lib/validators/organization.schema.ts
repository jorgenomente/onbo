import { z } from 'zod';

const kebabCaseRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .transform((value) => value.toLowerCase())
    .refine((value) => kebabCaseRegex.test(value), {
      message: 'El slug debe estar en kebab-case (ej: mi-empresa).',
    }),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;
