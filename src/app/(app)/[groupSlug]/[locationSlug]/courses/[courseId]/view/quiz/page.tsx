import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireCourseViewAccess } from '@/server/guards/requireCourseViewAccess';
import { submitQuizAttempt } from '@/server/actions/quizzes/submitQuizAttempt';

const courseIdSchema = z.string().uuid();
const quizIdSchema = z.string().uuid();

export default async function CourseQuizPlayerPage({
  params,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string; courseId: string }>;
}) {
  const { groupSlug, locationSlug, courseId } = await params;
  const parsedCourseId = courseIdSchema.safeParse(courseId);
  if (!parsedCourseId.success) {
    notFound();
  }

  const ctx = await requireCourseViewAccess({ groupSlug, locationSlug, courseId });
  const adminClient = createServiceRoleClient();
  const { data: quiz } = await adminClient
    .from('quizzes')
    .select('id, title, status')
    .eq('module_id', ctx.course.id)
    .maybeSingle();

  if (!quiz || quiz.status !== 'published') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Quiz no disponible</h1>
        <p className="text-sm text-muted-foreground">
          El quiz final todavia no esta publicado.
        </p>
        <Button asChild variant="outline">
          <Link href={`/${ctx.group.slug}/${ctx.location.slug}/courses/${ctx.course.id}/view`}>
            Volver al curso
          </Link>
        </Button>
      </div>
    );
  }

  const { data: questions } = await adminClient
    .from('questions')
    .select('id, prompt, type, options_json, content_json')
    .eq('quiz_id', quiz.id)
    .order('order_index', { ascending: true });

  const questionsList = questions ?? [];
  const { data: attempts } = await adminClient
    .from('quiz_attempts')
    .select('score, passed, answers_json, created_at')
    .eq('quiz_id', quiz.id)
    .eq('user_id', ctx.user.id)
    .order('created_at', { ascending: false })
    .limit(1);
  const latestAttempt = attempts?.[0] ?? null;
  const attemptMeta =
    latestAttempt &&
    latestAttempt.answers_json &&
    typeof latestAttempt.answers_json === 'object' &&
    'earnedPoints' in latestAttempt.answers_json &&
    'totalPoints' in latestAttempt.answers_json
      ? (latestAttempt.answers_json as {
          earnedPoints?: number;
          totalPoints?: number;
        })
      : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/${ctx.group.slug}/${ctx.location.slug}/courses/${ctx.course.id}/view`}>
            ← Volver al curso
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{quiz.title}</h1>
          <p className="text-xs text-muted-foreground">
            {ctx.group.name} · {ctx.location.name}
          </p>
        </div>
      </header>

      {latestAttempt ? (
        <div className="rounded-lg border px-4 py-3 text-sm">
          <div className="font-semibold">Resultado del intento</div>
          <div className="text-xs text-muted-foreground">
            {attemptMeta &&
            typeof attemptMeta.earnedPoints === 'number' &&
            typeof attemptMeta.totalPoints === 'number'
              ? `Puntaje: ${attemptMeta.earnedPoints}/${attemptMeta.totalPoints} (${latestAttempt.score}%)`
              : `Puntaje: ${latestAttempt.score}%`}
            {' · '}
            {latestAttempt.passed ? 'Aprobado' : 'Reprobado'}
          </div>
        </div>
      ) : null}

      {questionsList.length ? (
        <form
          action={async (formData) => {
            'use server';
            const answers: Record<string, number> = {};
            questionsList.forEach((question) => {
              if (question.type === 'mcq') {
                const value = formData.get(`question_${question.id}`);
                if (typeof value === 'string' && value !== '') {
                  answers[question.id] = { type: 'mcq', value: Number(value) };
                }
                return;
              }

              if (question.type === 'cloze_select') {
                const content =
                  question.content_json &&
                  typeof question.content_json === 'object'
                    ? (question.content_json as {
                        blanks?: Array<{ id: string; choices: string[] }>;
                      })
                    : null;
                const selections: Record<string, string> = {};
                content?.blanks?.forEach((blank) => {
                  const value = formData.get(
                    `question_${question.id}_blank_${blank.id}`,
                  );
                  if (typeof value === 'string' && value !== '') {
                    selections[blank.id] = value;
                  }
                });
                answers[question.id] = { type: 'cloze_select', value: selections };
                return;
              }

              if (question.type === 'multi_select') {
                const values = formData.getAll(`question_${question.id}_multi`);
                const selected = values
                  .map((value) => Number(value))
                  .filter((value) => !Number.isNaN(value));
                answers[question.id] = {
                  type: 'multi_select',
                  value: selected,
                };
                return;
              }

              if (question.type === 'order') {
                const content =
                  question.content_json &&
                  typeof question.content_json === 'object'
                    ? (question.content_json as { items?: string[] })
                    : null;
                const items = content?.items ?? [];
                const order = items.map((_, index) => {
                  const value = formData.get(
                    `question_${question.id}_pos_${index}`,
                  );
                  return typeof value === 'string' ? value : '';
                });
                answers[question.id] = { type: 'order', value: order };
              }
            });
            await submitQuizAttempt({
              groupSlug: ctx.group.slug,
              locationSlug: ctx.location.slug,
              courseId: ctx.course.id,
              quizId: quiz.id,
              answers,
            });
          }}
          className="space-y-6"
        >
          {questionsList.map((question, index) => {
            const options = Array.isArray(question.options_json)
              ? question.options_json
              : [];
            const imageUrl =
              question.content_json &&
              typeof question.content_json === 'object' &&
              'imageUrl' in question.content_json
                ? (question.content_json as { imageUrl?: string }).imageUrl
                : null;
            const content =
              question.content_json &&
              typeof question.content_json === 'object'
                ? (question.content_json as {
                    blanks?: Array<{ id: string; choices: string[] }>;
                    items?: string[];
                    options?: string[];
                  })
                : null;
            const resolvedOptions =
              (question.type === 'mcq' || question.type === 'multi_select') &&
              content?.options?.length
                ? content.options
                : options;
            return (
              <div key={question.id} className="rounded-lg border p-4 text-sm">
                <div className="text-xs text-muted-foreground">
                  Pregunta {index + 1}
                </div>
                <div className="mt-1 font-semibold">{question.prompt}</div>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Question"
                    className="mt-3 max-h-64 rounded-md border object-contain"
                  />
                ) : null}
                {question.type === 'mcq' ? (
                  <div className="mt-3 space-y-2">
                    {resolvedOptions.map((option, optIndex) => (
                      <label
                        key={optIndex}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="radio"
                          name={`question_${question.id}`}
                          value={optIndex}
                          required
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : question.type === 'multi_select' ? (
                  <div className="mt-3 space-y-2">
                    {resolvedOptions.map((option, optIndex) => (
                      <label
                        key={optIndex}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          name={`question_${question.id}_multi`}
                          value={optIndex}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : question.type === 'cloze_select' ? (
                  <div className="mt-3 space-y-3">
                    {content?.blanks?.map((blank) => (
                      <div key={blank.id} className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {blank.id}
                        </div>
                        <select
                          name={`question_${question.id}_blank_${blank.id}`}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                          required
                        >
                          <option value="">Selecciona una opcion</option>
                          {blank.choices.map((choice) => (
                            <option key={choice} value={choice}>
                              {choice}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                ) : question.type === 'order' ? (
                  <div className="mt-3 space-y-2">
                    {(content?.items ?? []).map((_, index, arr) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Pos {index + 1}
                        </span>
                        <select
                          name={`question_${question.id}_pos_${index}`}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                          required
                        >
                          <option value="">Selecciona item</option>
                          {arr.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          <Button type="submit">Enviar respuestas</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Este quiz todavia no tiene preguntas.
        </p>
      )}
    </div>
  );
}
