'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { submitQuiz } from '@/server/actions/quizzes/submitQuiz';

export type QuizQuestion = {
  id: string;
  prompt: string;
  options_json: unknown;
  order_index: number | null;
  type: string;
};

type QuizAttempt = {
  score: number;
  passed: boolean;
  created_at: string;
};

type QuizFormProps = {
  moduleId: string;
  quizId: string;
  passingScore: number;
  questions: QuizQuestion[];
  lastAttempt: QuizAttempt | null;
};

type AnswerState = Record<string, number>;

type SubmitResult = {
  score: number;
  passed: boolean;
};

function parseOptions(options_json: unknown): string[] {
  if (Array.isArray(options_json)) {
    return options_json.filter((item) => typeof item === 'string');
  }
  if (
    options_json &&
    typeof options_json === 'object' &&
    Array.isArray((options_json as { options?: unknown }).options)
  ) {
    return (options_json as { options: unknown[] }).options.filter(
      (item) => typeof item === 'string',
    ) as string[];
  }
  return [];
}

export default function QuizForm({
  moduleId,
  quizId,
  passingScore,
  questions,
  lastAttempt,
}: QuizFormProps) {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const normalizedQuestions = useMemo(
    () =>
      questions.map((question) => ({
        ...question,
        options: parseOptions(question.options_json),
      })),
    [questions],
  );

  const handleSubmit = () => {
    setStatus(null);
    setResult(null);

    if (normalizedQuestions.some((question) => answers[question.id] === undefined)) {
      setStatus('Responde todas las preguntas.');
      return;
    }

    startTransition(async () => {
      const payload = {
        quiz_id: quizId,
        answers: normalizedQuestions.map((question) => ({
          questionId: question.id,
          selectedIndex: answers[question.id],
        })),
      };

      const response = await submitQuiz(payload);
      if (response.error) {
        setStatus(response.error);
        return;
      }

      if (response.score !== null && response.passed !== null) {
        setResult({ score: response.score, passed: response.passed });
      }

      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {lastAttempt ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Ultimo intento: {lastAttempt.score}% -{' '}
          {lastAttempt.passed ? 'Aprobado' : 'Reprobado'}
        </div>
      ) : null}

      {normalizedQuestions.map((question, index) => (
        <div key={question.id} className="space-y-3 rounded-lg border p-4">
          <div className="text-sm font-semibold">
            {index + 1}. {question.prompt}
          </div>
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <label
                key={`${question.id}-${optionIndex}`}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={answers[question.id] === optionIndex}
                  onChange={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [question.id]: optionIndex,
                    }))
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {status ? (
        <p className="text-sm text-muted-foreground">{status}</p>
      ) : null}

      {result ? (
        <div className="rounded-lg border p-4 text-sm">
          <p className="font-semibold">
            Resultado: {result.score}% ({result.passed ? 'Aprobado' : 'Reprobado'})
          </p>
          <p className="text-xs text-muted-foreground">
            Puntaje minimo: {passingScore}%
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Enviando...' : 'Enviar quiz'}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/modules/${moduleId}`}>Volver al curso</Link>
        </Button>
      </div>
    </div>
  );
}
