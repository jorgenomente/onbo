'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';

const baseSchema = z.object({
  groupSlug: z.string().trim().min(1),
  locationSlug: z.string().trim().min(1),
  courseId: z.string().uuid(),
  quizId: z.string().uuid(),
  prompt: z.string().trim().min(1),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
  points: z.number().int().min(1).optional(),
});

const mcqSchema = z.object({
  type: z.literal('mcq'),
  options: z.array(z.string().trim().min(1)).min(2).max(6),
  correctIndex: z.number().int().min(0).max(5),
});

const multiSelectSchema = z.object({
  type: z.literal('multi_select'),
  options: z.array(z.string().trim().min(1)).min(2).max(20),
  correctIndices: z.array(z.number().int().min(0)).min(1),
  minSelections: z.number().int().min(1),
  allowMoreThanMin: z.boolean().optional(),
});

const clozeSchema = z.object({
  type: z.literal('cloze_select'),
  blanks: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        choices: z.array(z.string().trim().min(1)).min(2),
        correct: z.string().trim().min(1),
      }),
    )
    .min(1),
});

const orderSchema = z.object({
  type: z.literal('order'),
  items: z.array(z.string().trim().min(1)).min(2).max(10),
  correctOrder: z.array(z.string().trim().min(1)).min(2),
});

const inputSchema = z
  .intersection(
    baseSchema,
    z.discriminatedUnion('type', [
      mcqSchema,
      multiSelectSchema,
      clozeSchema,
      orderSchema,
    ]),
  )
  .superRefine((data, ctx) => {
    if (data.type === 'mcq') {
      if (data.correctIndex >= data.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Respuesta correcta invalida.',
          path: ['correctIndex'],
        });
      }
      return;
    }

    if (data.type === 'multi_select') {
      if (data.minSelections > data.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'minSelections supera la cantidad de opciones.',
          path: ['minSelections'],
        });
      }
      const unique = new Set(data.correctIndices);
      if (unique.size !== data.correctIndices.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Las respuestas correctas deben ser unicas.',
          path: ['correctIndices'],
        });
      }
      const outOfRange = data.correctIndices.some(
        (index) => index >= data.options.length,
      );
      if (outOfRange) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Indice correcto fuera de rango.',
          path: ['correctIndices'],
        });
      }
      if (data.correctIndices.length < data.minSelections) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe haber al menos minSelections respuestas correctas.',
          path: ['correctIndices'],
        });
      }
      return;
    }

    if (data.type === 'cloze_select') {
      const ids = new Set<string>();
      data.blanks.forEach((blank, index) => {
        if (ids.has(blank.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Los blanks deben ser unicos.',
            path: ['blanks', index, 'id'],
          });
        }
        ids.add(blank.id);
        if (!blank.choices.includes(blank.correct)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'La respuesta correcta debe estar en las opciones.',
            path: ['blanks', index, 'correct'],
          });
        }
      });
      return;
    }

    if (data.type === 'order') {
      if (data.correctOrder.length !== data.items.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El orden correcto debe tener la misma cantidad de items.',
          path: ['correctOrder'],
        });
        return;
      }
      const missing = data.items.filter(
        (item) => !data.correctOrder.includes(item),
      );
      if (missing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El orden correcto debe usar los mismos items.',
          path: ['correctOrder'],
        });
      }
    }
  });

export async function createQuizQuestion(input: {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
  quizId: string;
  prompt: string;
  type: 'mcq' | 'multi_select' | 'cloze_select' | 'order';
  points?: number;
  options?: string[];
  correctIndex?: number;
  correctIndices?: number[];
  minSelections?: number;
  allowMoreThanMin?: boolean;
  blanks?: Array<{ id: string; choices: string[]; correct: string }>;
  items?: string[];
  correctOrder?: string[];
  imageUrl?: string;
}) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autorizado.');
  }

  const access = await requireLocationAccess(
    parsed.data.groupSlug,
    parsed.data.locationSlug,
  );

  const canManage =
    access.roles.isGroupAdmin ||
    access.roles.locationRole === 'location_admin' ||
    access.roles.locationRole === 'trainer';

  if (!canManage) {
    throw new Error('No autorizado.');
  }

  const adminClient = createServiceRoleClient();
  const { data: quiz } = await adminClient
    .from('quizzes')
    .select('id, module_id, org_id')
    .eq('id', parsed.data.quizId)
    .maybeSingle();

  if (!quiz || quiz.module_id !== parsed.data.courseId || !quiz.org_id) {
    throw new Error('Quiz no encontrado.');
  }

  const { data: course } = await adminClient
    .from('modules')
    .select('id, location_id')
    .eq('id', parsed.data.courseId)
    .maybeSingle();

  if (!course || course.location_id !== access.location.id) {
    throw new Error('Curso no encontrado.');
  }

  const contentBase = parsed.data.imageUrl
    ? { imageUrl: parsed.data.imageUrl }
    : {};
  const pointsValue = parsed.data.points ?? 1;

  const questionPayload =
    parsed.data.type === 'mcq'
      ? {
          org_id: quiz.org_id,
          quiz_id: quiz.id,
          type: parsed.data.type,
          prompt: parsed.data.prompt,
          options_json: parsed.data.options,
          answer_json: { correctIndex: parsed.data.correctIndex },
          content_json: {
            ...contentBase,
            options: parsed.data.options,
            points: pointsValue,
          },
          order_index: 0,
        }
      : parsed.data.type === 'multi_select'
        ? {
            org_id: quiz.org_id,
            quiz_id: quiz.id,
            type: parsed.data.type,
            prompt: parsed.data.prompt,
            options_json: parsed.data.options,
            answer_json: { correctIndices: parsed.data.correctIndices },
            content_json: {
              ...contentBase,
              options: parsed.data.options,
              minSelections: parsed.data.minSelections,
              allowMoreThanMin: parsed.data.allowMoreThanMin ?? true,
              points: pointsValue,
            },
            order_index: 0,
          }
      : parsed.data.type === 'cloze_select'
        ? {
            org_id: quiz.org_id,
            quiz_id: quiz.id,
            type: parsed.data.type,
            prompt: parsed.data.prompt,
            options_json: [] as string[],
            answer_json: {
              correct: Object.fromEntries(
                parsed.data.blanks.map((blank) => [blank.id, blank.correct]),
              ),
            },
            content_json: {
              ...contentBase,
              blanks: parsed.data.blanks.map((blank) => ({
                id: blank.id,
                choices: blank.choices,
              })),
              points: pointsValue,
            },
            order_index: 0,
          }
        : {
            org_id: quiz.org_id,
            quiz_id: quiz.id,
            type: parsed.data.type,
            prompt: parsed.data.prompt,
            options_json: [] as string[],
            answer_json: { correctOrder: parsed.data.correctOrder },
            content_json: {
              ...contentBase,
              items: parsed.data.items,
              points: pointsValue,
            },
            order_index: 0,
          };

  const { error } = await adminClient.from('questions').insert(questionPayload);

  if (error) {
    throw new Error(error.message ?? 'No se pudo crear la pregunta.');
  }

  revalidatePath(
    `/${access.group.slug}/${access.location.slug}/courses/${parsed.data.courseId}/quiz`,
  );
}
