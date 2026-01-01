import { z } from 'zod';

const headingBlock = z.object({
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string(),
});

const paragraphBlock = z.object({
  type: z.literal('paragraph'),
  text: z.string(),
});

const bulletsBlock = z.object({
  type: z.literal('bullets'),
  items: z.array(z.string()),
});

const dividerBlock = z.object({
  type: z.literal('divider'),
});

const embedBlock = z.object({
  type: z.literal('embed'),
  url: z.string().url(),
  title: z.string().optional(),
});

const imageBlock = z.object({
  type: z.literal('image'),
  url: z.string().url(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

const fileBlock = z.object({
  type: z.literal('file'),
  url: z.string().url(),
  label: z.string(),
});

export const LessonBlocksSchema = z.array(
  z.discriminatedUnion('type', [
    headingBlock,
    paragraphBlock,
    bulletsBlock,
    dividerBlock,
    embedBlock,
    imageBlock,
    fileBlock,
  ]),
);

export type LessonBlocks = z.infer<typeof LessonBlocksSchema>;
