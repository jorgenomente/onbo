import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import QuizForm from '@/components/quiz/QuizForm';
import { getQuizForUnit } from '@/server/queries/quizzes/getQuizForUnit';
import { getMyLatestAttempt } from '@/server/queries/quizzes/getMyLatestAttempt';

const moduleIdSchema = z.string().uuid();
const unitIdSchema = z.string().uuid();

export default async function UnitQuizPage({
  params,
}: {
  params: Promise<{ moduleId: string; unitId: string }>;
}) {
  const { moduleId, unitId } = await params;
  const profile = await getCurrentProfile();

  if (!profile || !profile.org_id) {
    redirect('/login');
  }

  const parsedModuleId = moduleIdSchema.safeParse(moduleId);
  const parsedUnitId = unitIdSchema.safeParse(unitId);
  if (!parsedModuleId.success || !parsedUnitId.success) {
    notFound();
  }

  const {
    module,
    unit,
    quiz,
    questions,
    moduleError,
    quizError,
  } = await getQuizForUnit(parsedUnitId.data, profile);

  if (!module || !unit) {
    if (moduleError) {
      return (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Error cargando curso o unidad. Revisa permisos o RLS.
        </div>
      );
    }
    notFound();
  }

  if (module.id !== parsedModuleId.data) {
    notFound();
  }

  if (quizError) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Error cargando quiz.
      </div>
    );
  }

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
          <Link href={`/modules/${module.id}`}>Volver al curso</Link>
        </Button>
      </header>

      {!quiz ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          No hay quiz aun para esta unidad.
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          El quiz aun no tiene preguntas.
        </div>
      ) : (
        <QuizWithAttempt
          moduleId={module.id}
          quizId={quiz.id}
          passingScore={quiz.passing_score}
          questions={questions}
        />
      )}
    </div>
  );
}

async function QuizWithAttempt({
  moduleId,
  quizId,
  passingScore,
  questions,
}: {
  moduleId: string;
  quizId: string;
  passingScore: number;
  questions: Parameters<typeof QuizForm>[0]['questions'];
}) {
  const lastAttempt = await getMyLatestAttempt(quizId);
  return (
        <QuizForm
          moduleId={moduleId}
          quizId={quizId}
          passingScore={passingScore}
          questions={questions}
          lastAttempt={lastAttempt}
        />
  );
}
