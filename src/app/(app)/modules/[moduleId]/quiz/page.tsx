import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentProfile } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import QuizForm from '@/components/quiz/QuizForm';
import { getQuizForModule } from '@/server/queries/quizzes/getQuizForModule';
import { getMyLatestAttempt } from '@/server/queries/quizzes/getMyLatestAttempt';

const moduleIdSchema = z.string().uuid();

export default async function ModuleQuizPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const profile = await getCurrentProfile();

  if (!profile || !profile.org_id) {
    redirect('/login');
  }

  const parsedModuleId = moduleIdSchema.safeParse(moduleId);
  if (!parsedModuleId.success) {
    notFound();
  }

  const { module, quiz, questions, moduleError, quizError } =
    await getQuizForModule(parsedModuleId.data, profile);

  if (!module) {
    if (moduleError) {
      return (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Error cargando curso. Revisa permisos o RLS.
        </div>
      );
    }
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
          <h1 className="text-2xl font-semibold">Quiz final</h1>
          <p className="text-sm text-muted-foreground">{module.title}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/modules/${module.id}`}>Volver al curso</Link>
        </Button>
      </header>

      {!quiz ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          No hay quiz aun para este curso.
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          El quiz aun no tiene preguntas.
        </div>
      ) : (
        // Fetch latest attempt only when quiz exists
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
