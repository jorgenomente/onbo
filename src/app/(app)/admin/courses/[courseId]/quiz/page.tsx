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
import { getQuizAdminData } from '@/server/queries/quizzes/getQuizAdminData';
import QuizQuestionsEditor from '@/components/admin/quiz/QuizQuestionsEditor';

const moduleIdSchema = z.string().uuid();

export default async function CourseQuizAdminPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const profile = await getCurrentProfile();

  if (!profile || !isAdminLike(profile.role)) {
    redirect('/home');
  }

  const parsedModuleId = moduleIdSchema.safeParse(courseId);
  if (!parsedModuleId.success) {
    notFound();
  }

  const { module, quiz, questions, moduleError, quizError, questionsError } =
    await getQuizAdminData({ moduleId: parsedModuleId.data }, profile);

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

  if (quizError || questionsError) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Error cargando quiz o preguntas.
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
            <input type="hidden" name="module_id" value={module.id} />
            <Input
              name="title"
              defaultValue={quiz?.title ?? `${module.title} - Quiz final`}
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
        <QuizQuestionsEditor quizId={quiz.id} questions={questions} />
      ) : (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Crea el quiz para empezar a agregar preguntas.
        </div>
      )}
    </div>
  );
}
