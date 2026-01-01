'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createQuestion } from '@/server/actions/quizzes/createQuestion';
import { deleteQuestion } from '@/server/actions/quizzes/deleteQuestion';
import { reorderQuestions } from '@/server/actions/quizzes/reorderQuestions';
import { updateQuestion } from '@/server/actions/quizzes/updateQuestion';

export type AdminQuestion = {
  id: string;
  prompt: string;
  options_json: unknown;
  answer_json: unknown;
  order_index: number | null;
  type: string;
};

type QuizQuestionsEditorProps = {
  quizId: string;
  questions: AdminQuestion[];
};

type LocalQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
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

function parseCorrectIndex(answer_json: unknown): number {
  if (
    answer_json &&
    typeof answer_json === 'object' &&
    typeof (answer_json as { correctIndex?: unknown }).correctIndex === 'number'
  ) {
    return (answer_json as { correctIndex: number }).correctIndex;
  }
  return 0;
}

export default function QuizQuestionsEditor({
  quizId,
  questions,
}: QuizQuestionsEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const initialQuestions = useMemo<LocalQuestion[]>(
    () =>
      questions.map((question) => {
        const options = parseOptions(question.options_json);
        const normalizedOptions = options.length >= 2 ? options : ['Opcion 1', 'Opcion 2'];
        return {
          id: question.id,
          prompt: question.prompt,
          options: normalizedOptions,
          correctIndex: Math.min(
            parseCorrectIndex(question.answer_json),
            normalizedOptions.length - 1,
          ),
        };
      }),
    [questions],
  );

  const [localQuestions, setLocalQuestions] = useState<LocalQuestion[]>(
    initialQuestions,
  );

  useEffect(() => {
    setLocalQuestions(initialQuestions);
  }, [initialQuestions]);

  const handleCreate = () => {
    setStatus(null);
    startTransition(async () => {
      const result = await createQuestion({
        quiz_id: quizId,
        prompt: 'Pregunta nueva',
        options: ['Opcion 1', 'Opcion 2'],
        correct_index: 0,
      });
      if (result.error) {
        setStatus(result.error);
        return;
      }
      router.refresh();
    });
  };

  const handleSave = (question: LocalQuestion) => {
    setStatus(null);
    startTransition(async () => {
      const result = await updateQuestion({
        question_id: question.id,
        prompt: question.prompt,
        options: question.options,
        correct_index: question.correctIndex,
      });
      setStatus(result.error ?? 'Guardado.');
      if (!result.error) {
        router.refresh();
      }
    });
  };

  const handleDelete = (questionId: string) => {
    setStatus(null);
    startTransition(async () => {
      const result = await deleteQuestion({ question_id: questionId });
      setStatus(result.error ?? 'Eliminado.');
      if (!result.error) {
        router.refresh();
      }
    });
  };

  const handleReorder = (questionId: string, direction: 'up' | 'down') => {
    setStatus(null);
    startTransition(async () => {
      const result = await reorderQuestions({ question_id: questionId, direction });
      setStatus(result.error ?? null);
      if (!result.error) {
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preguntas</CardTitle>
        <CardDescription>Gestiona preguntas y respuestas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={handleCreate} disabled={isPending}>
            Nueva pregunta
          </Button>
          {status ? (
            <span className="text-xs text-muted-foreground">{status}</span>
          ) : null}
        </div>

        {localQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay preguntas aun. Agrega la primera.
          </p>
        ) : (
          <div className="space-y-4">
            {localQuestions.map((question, index) => (
              <Card key={question.id} className="gap-3 py-4">
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      Pregunta {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        onClick={() => handleReorder(question.id, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        onClick={() => handleReorder(question.id, 'down')}
                        disabled={index === localQuestions.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="destructive"
                        onClick={() => handleDelete(question.id)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">
                      Prompt
                    </label>
                    <Textarea
                      value={question.prompt}
                      onChange={(event) => {
                        const value = event.target.value;
                        setLocalQuestions((prev) =>
                          prev.map((item) =>
                            item.id === question.id
                              ? { ...item, prompt: value }
                              : item,
                          ),
                        );
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">
                      Opciones
                    </label>
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={`${question.id}-${optionIndex}`} className="flex gap-2">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={question.correctIndex === optionIndex}
                            onChange={() => {
                              setLocalQuestions((prev) =>
                                prev.map((item) =>
                                  item.id === question.id
                                    ? { ...item, correctIndex: optionIndex }
                                    : item,
                                ),
                              );
                            }}
                          />
                          <Input
                            value={option}
                            onChange={(event) => {
                              const value = event.target.value;
                              setLocalQuestions((prev) =>
                                prev.map((item) =>
                                  item.id === question.id
                                    ? {
                                        ...item,
                                        options: item.options.map((opt, idx) =>
                                          idx === optionIndex ? value : opt,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={question.options.length <= 2}
                            onClick={() => {
                              setLocalQuestions((prev) =>
                                prev.map((item) => {
                                  if (item.id !== question.id) return item;
                                  const nextOptions = item.options.filter(
                                    (_, idx) => idx !== optionIndex,
                                  );
                                  const nextCorrectIndex = Math.min(
                                    item.correctIndex,
                                    nextOptions.length - 1,
                                  );
                                  return {
                                    ...item,
                                    options: nextOptions,
                                    correctIndex: nextCorrectIndex,
                                  };
                                }),
                              );
                            }}
                          >
                            −
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLocalQuestions((prev) =>
                          prev.map((item) =>
                            item.id === question.id
                              ? {
                                  ...item,
                                  options: [...item.options, ''],
                                }
                              : item,
                          ),
                        );
                      }}
                    >
                      Agregar opcion
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSave(question)}
                      disabled={isPending}
                    >
                      Guardar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
