import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createOrUpdateQuiz } from '@/server/actions/quizzes/createOrUpdateQuiz';
import { createUnitQuiz } from '@/server/actions/quizzes/createUnitQuiz';
import QuizQuestionsEditor from '@/components/admin/quiz/QuizQuestionsEditor';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const moduleIdSchema = z.string().uuid();
const unitIdSchema = z.string().uuid();

export default async function UnitQuizAdminPage({
  params,
}: {
  params: Promise<{ courseId: string; unitId: string }>;
}) {
  const { courseId, unitId } = await params;
  const profile = await getCurrentProfile();

  if (!profile || !isAdminLike(profile.role)) {
    redirect('/home');
  }

  const parsedModuleId = moduleIdSchema.safeParse(courseId);
  const parsedUnitId = unitIdSchema.safeParse(unitId);
  if (!parsedModuleId.success || !parsedUnitId.success) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: unit, error: unitError } = await supabase
    .from('module_units')
    .select('id, module_id, title')
    .eq('id', parsedUnitId.data)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!unit) {
    if (process.env.NODE_ENV !== 'production' && unitError) {
      console.error('[unit-quiz] unit error', unitError);
    }
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Error cargando unidad. Revisa permisos o RLS.
      </div>
    );
  }

  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select('id, title')
    .eq('id', unit.module_id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!module) {
    if (process.env.NODE_ENV !== 'production' && moduleError) {
      console.error('[unit-quiz] module error', moduleError);
    }
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Error cargando curso. Revisa permisos o RLS.
      </div>
    );
  }

  if (module.id !== parsedModuleId.data) {
    notFound();
  }

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, title, passing_score')
    .eq('unit_id', parsedUnitId.data)
    .is('module_id', null)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (quizError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[unit-quiz] quiz error', quizError);
    }
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Error cargando quiz. Revisa permisos o RLS.
      </div>
    );
  }

  const { data: questions, error: questionsError } = quiz
    ? await supabase
        .from('questions')
        .select('id, prompt, options_json, answer_json, order_index, type')
        .eq('quiz_id', quiz.id)
        .eq('org_id', profile.org_id)
        .order('order_index', { ascending: true })
    : { data: [], error: null };

  if (questionsError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[unit-quiz] questions error', questionsError);
    }
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Error cargando preguntas. Revisa permisos o RLS.
      </div>
    );
  }

  const questionList = questions ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Quiz de unidad</h1>
          <p className="text-sm text-muted-foreground">
            {module.title} · {unit.title}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/courses/${module.id}`}>Volver al builder</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Configuracion del quiz</CardTitle>
          <CardDescription>Titulo y puntaje minimo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              await createOrUpdateQuiz(formData);
            }}
            className="grid gap-3 md:grid-cols-[1fr_120px_auto]"
          >
            <input type="hidden" name="unit_id" value={parsedUnitId.data} />
            <Input
              name="title"
              defaultValue={quiz?.title ?? `Quiz - ${unit.title}`}
              placeholder="Titulo del quiz"
              required
            />
            <Input
              name="passing_score"
              type="number"
              min={0}
              max={100}
              defaultValue={quiz?.passing_score ?? 70}
            />
            <Button type="submit">Guardar</Button>
          </form>
        </CardContent>
      </Card>

      {quiz ? (
        <QuizQuestionsEditor quizId={quiz.id} questions={questionList} />
      ) : (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          <p>Esta unidad todavia no tiene quiz.</p>
          <form
            action={async (formData) => {
              await createUnitQuiz(formData);
            }}
            className="mt-3"
          >
            <input type="hidden" name="unit_id" value={parsedUnitId.data} />
            <Button type="submit">Crear quiz</Button>
          </form>
        </div>
      )}
    </div>
  );
}
