import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';
import { requireLocationAccess } from '@/server/tenancy/requireLocationAccess';
import { createCourseQuiz } from '@/server/actions/quizzes/createCourseQuiz';
import { updateCourseQuiz } from '@/server/actions/quizzes/updateCourseQuiz';
import { setQuizStatus } from '@/server/actions/quizzes/setQuizStatus';
import { deleteQuizQuestion } from '@/server/actions/quizzes/deleteQuizQuestion';
import QuizQuestionForm, { QuizQuestionEditor } from './quiz-question-form';

const courseIdSchema = z.string().uuid();

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export default async function CourseQuizBuilderPage({
  params,
}: {
  params: Promise<{ groupSlug: string; locationSlug: string; courseId: string }>;
}) {
  const { groupSlug, locationSlug, courseId } = await params;
  const parsedCourseId = courseIdSchema.safeParse(courseId);
  if (!parsedCourseId.success) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  const isSuperAdmin =
    !!user.email && allowlist.includes(user.email.toLowerCase());

  const access = isSuperAdmin
    ? null
    : await requireLocationAccess(groupSlug, locationSlug);

  const canManage =
    isSuperAdmin ||
    !!access &&
      (access.roles.isGroupAdmin ||
        access.roles.locationRole === 'location_admin' ||
        access.roles.locationRole === 'trainer');

  if (!canManage) {
    notFound();
  }

  const adminClient = createServiceRoleClient();
  const { data: group } = isSuperAdmin
    ? await adminClient
        .from('groups')
        .select('id, name, slug')
        .eq('slug', groupSlug)
        .maybeSingle()
    : { data: access?.group ?? null };

  if (!group) {
    notFound();
  }

  const { data: location } = isSuperAdmin
    ? await adminClient
        .from('locations')
        .select('id, group_id, name, slug')
        .eq('group_id', group.id)
        .eq('slug', locationSlug)
        .maybeSingle()
    : { data: access?.location ?? null };

  if (!location) {
    notFound();
  }

  const { data: course } = await adminClient
    .from('modules')
    .select('id, title, location_id, org_id')
    .eq('id', parsedCourseId.data)
    .eq('location_id', location.id)
    .maybeSingle();

  if (!course || !course.org_id) {
    notFound();
  }

  const { data: quiz } = await adminClient
    .from('quizzes')
    .select('id, title, status')
    .eq('module_id', course.id)
    .maybeSingle();

  const { data: questions } = quiz
    ? await adminClient
        .from('questions')
        .select('id, prompt, type, options_json, answer_json, content_json')
        .eq('quiz_id', quiz.id)
        .order('order_index', { ascending: true })
    : {
        data: [] as Array<{
          id: string;
          prompt: string;
          type: string;
          options_json: string[];
          answer_json: unknown;
          content_json: unknown;
        }>,
      };

  const questionsList = questions ?? [];
  const coursesPath = `/${group.slug}/${location.slug}/courses`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Quiz final</h1>
          <p className="text-sm text-muted-foreground">{course.title}</p>
          <p className="text-xs text-muted-foreground">
            {group.name} · {location.name}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`${coursesPath}/${course.id}`}>Volver al curso</Link>
        </Button>
      </header>

      {!quiz ? (
        <form
          action={async (formData) => {
            'use server';
            const title = formData.get('title');
            await createCourseQuiz({
              groupSlug: group.slug,
              locationSlug: location.slug,
              courseId: course.id,
              title: typeof title === 'string' ? title : 'Quiz final',
            });
          }}
          className="space-y-3 rounded-lg border p-4"
        >
          <div className="text-sm font-semibold">Crear quiz final</div>
          <input
            name="title"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            placeholder="Quiz final"
            defaultValue="Quiz final"
          />
          <Button type="submit">Crear quiz</Button>
        </form>
      ) : (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form
              action={async (formData) => {
                'use server';
                const title = formData.get('title');
                await updateCourseQuiz({
                  groupSlug: group.slug,
                  locationSlug: location.slug,
                  courseId: course.id,
                  quizId: quiz.id,
                  title: typeof title === 'string' ? title : quiz.title,
                });
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                name="title"
                className="flex h-9 w-full min-w-[220px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                defaultValue={quiz.title}
              />
              <Button type="submit" variant="secondary">
                Guardar titulo
              </Button>
            </form>
            <form
              action={async () => {
                'use server';
                await setQuizStatus({
                  groupSlug: group.slug,
                  locationSlug: location.slug,
                  courseId: course.id,
                  quizId: quiz.id,
                  status: quiz.status === 'published' ? 'draft' : 'published',
                });
              }}
            >
              <Button type="submit" variant="outline">
                {quiz.status === 'published' ? 'Volver a borrador' : 'Publicar'}
              </Button>
            </form>
          </div>
          <p className="text-xs text-muted-foreground">
            Estado: <span className="font-medium">{quiz.status}</span>
          </p>
        </div>
      )}

      {quiz ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Preguntas</h2>
          </div>
          {questionsList.length ? (
            <div className="space-y-3">
              {questionsList.map((question, idx) => {
                const options = Array.isArray(question.options_json)
                  ? question.options_json
                  : [];
                const answer =
                  question.answer_json &&
                  typeof question.answer_json === 'object' &&
                  'correctIndex' in question.answer_json
                    ? (question.answer_json as { correctIndex?: number })
                        .correctIndex
                    : null;
                const content =
                  question.content_json &&
                  typeof question.content_json === 'object' &&
                  'imageUrl' in question.content_json
                    ? (question.content_json as { imageUrl?: string })
                        .imageUrl
                    : null;
                const points =
                  question.content_json &&
                  typeof question.content_json === 'object' &&
                  'points' in question.content_json &&
                  typeof (question.content_json as { points?: number }).points ===
                    'number'
                    ? (question.content_json as { points?: number }).points
                    : 1;
                const typeLabel =
                  question.type === 'cloze_select'
                    ? 'Completar frase'
                    : question.type === 'order'
                      ? 'Ordenar'
                      : question.type === 'multi_select'
                        ? 'Selección múltiple'
                        : 'Multiple choice';
                return (
                  <div
                    key={question.id}
                    className="rounded-lg border p-4 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Pregunta {idx + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{question.prompt}</div>
                          <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                            {typeLabel}
                          </span>
                          <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                            {points} pts
                          </span>
                        </div>
                        {content ? (
                          <img
                            src={content}
                            alt="Question"
                            className="mt-3 max-h-60 rounded-md border object-contain"
                          />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <QuizQuestionEditor
                          groupSlug={group.slug}
                          locationSlug={location.slug}
                          courseId={course.id}
                          question={{
                            id: question.id,
                            type: question.type as
                              | 'mcq'
                              | 'multi_select'
                              | 'cloze_select'
                              | 'order',
                            prompt: question.prompt,
                            options,
                            content:
                              question.content_json &&
                              typeof question.content_json === 'object'
                                ? (question.content_json as {
                                    imageUrl?: string;
                                    blanks?: Array<{ id: string; choices: string[] }>;
                                    items?: string[];
                                    minSelections?: number;
                                    allowMoreThanMin?: boolean;
                                    points?: number;
                                  })
                                : undefined,
                            answer: question.answer_json ?? undefined,
                          }}
                        />
                        <form
                          action={async () => {
                            'use server';
                            await deleteQuizQuestion({
                              groupSlug: group.slug,
                              locationSlug: location.slug,
                              courseId: course.id,
                              quizId: quiz.id,
                              questionId: question.id,
                            });
                          }}
                        >
                          <Button type="submit" variant="ghost" size="sm">
                            Borrar
                          </Button>
                        </form>
                      </div>
                    </div>
                    {question.type === 'mcq' ? (
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {options.map((option, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span>
                              {index + 1}. {option}
                            </span>
                            {answer === index ? (
                              <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                                Correcta
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : question.type === 'multi_select' ? (
                      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                        <div>
                          Min selecciones:{' '}
                          {question.content_json &&
                          typeof question.content_json === 'object' &&
                          'minSelections' in question.content_json
                            ? (question.content_json as { minSelections?: number })
                                .minSelections
                            : 1}
                        </div>
                        <ul className="space-y-1">
                          {options.map((option, index) => {
                            const correct =
                              question.answer_json &&
                              typeof question.answer_json === 'object' &&
                              'correctIndices' in question.answer_json
                                ? (
                                    question.answer_json as {
                                      correctIndices?: number[];
                                    }
                                  ).correctIndices?.includes(index)
                                : false;
                            return (
                              <li key={index} className="flex items-center gap-2">
                                <span>
                                  {index + 1}. {option}
                                </span>
                                {correct ? (
                                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                                    Correcta
                                  </span>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : question.type === 'cloze_select' ? (
                      <div className="mt-3 text-xs text-muted-foreground">
                        {question.content_json &&
                        typeof question.content_json === 'object' &&
                        'blanks' in question.content_json
                          ? (question.content_json as { blanks?: Array<{ id: string; choices: string[] }> })
                              .blanks?.map((blank) => (
                                <div key={blank.id} className="mt-2">
                                  <span className="font-medium">{blank.id}</span>
                                  <div className="ml-2 text-[11px]">
                                    Opciones: {blank.choices?.join(', ')}
                                  </div>
                                </div>
                              ))
                          : null}
                      </div>
                    ) : question.type === 'order' ? (
                      <div className="mt-3 text-xs text-muted-foreground">
                        {question.content_json &&
                        typeof question.content_json === 'object' &&
                        'items' in question.content_json
                          ? (question.content_json as { items?: string[] })
                              .items?.join(' · ')
                          : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavia no hay preguntas.
            </p>
          )}

          <QuizQuestionForm
            groupSlug={group.slug}
            locationSlug={location.slug}
            courseId={course.id}
            quizId={quiz.id}
          />
        </section>
      ) : null}
    </div>
  );
}
