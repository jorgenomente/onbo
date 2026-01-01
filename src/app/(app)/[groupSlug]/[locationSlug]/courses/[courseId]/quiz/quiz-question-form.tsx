'use client';

import { useState, useTransition, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { createQuizQuestion } from '@/server/actions/quizzes/createQuizQuestion';
import { updateQuizQuestion } from '@/server/actions/quizzes/updateQuizQuestion';

type QuizQuestionFormProps = {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
  quizId: string;
};

const INITIAL_OPTIONS = ['', '', '', ''];

type QuestionType = 'mcq' | 'multi_select' | 'cloze_select' | 'order';

type ClozeBlank = {
  id: string;
  choicesText: string;
  correct: string;
};

export default function QuizQuestionForm({
  groupSlug,
  locationSlug,
  courseId,
  quizId,
}: QuizQuestionFormProps) {
  const [questionType, setQuestionType] = useState<QuestionType>('mcq');
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [points, setPoints] = useState(1);
  const [options, setOptions] = useState<string[]>(INITIAL_OPTIONS);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [multiCorrect, setMultiCorrect] = useState<number[]>([]);
  const [minSelections, setMinSelections] = useState(1);
  const [allowMoreThanMin, setAllowMoreThanMin] = useState(true);
  const [blanks, setBlanks] = useState<ClozeBlank[]>([
    { id: 'blank1', choicesText: '', correct: '' },
  ]);
  const [orderItemsText, setOrderItemsText] = useState('');
  const [orderCorrect, setOrderCorrect] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOptionChange(index: number, value: string) {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        if (questionType === 'mcq') {
          const trimmedOptions = options.map((option) => option.trim());
          if (trimmedOptions.some((option) => option.length === 0)) {
            setError('Todas las opciones son obligatorias.');
            return;
          }
          if (points < 1) {
            setError('Los puntos deben ser al menos 1.');
            return;
          }
          await createQuizQuestion({
            groupSlug,
            locationSlug,
            courseId,
            quizId,
            type: 'mcq',
            prompt,
            options: trimmedOptions,
            correctIndex,
            imageUrl: imageUrl.trim() || undefined,
            points,
          });
        } else if (questionType === 'multi_select') {
          const trimmedOptions = options.map((option) => option.trim());
          if (trimmedOptions.some((option) => option.length === 0)) {
            setError('Todas las opciones son obligatorias.');
            return;
          }
          if (minSelections < 1) {
            setError('minSelections debe ser mayor o igual a 1.');
            return;
          }
          if (multiCorrect.length < minSelections) {
            setError('Selecciona al menos minSelections respuestas correctas.');
            return;
          }
          if (points < 1) {
            setError('Los puntos deben ser al menos 1.');
            return;
          }
          await createQuizQuestion({
            groupSlug,
            locationSlug,
            courseId,
            quizId,
            type: 'multi_select',
            prompt,
            options: trimmedOptions,
            correctIndices: multiCorrect,
            minSelections,
            allowMoreThanMin,
            imageUrl: imageUrl.trim() || undefined,
            points,
          });
        } else if (questionType === 'cloze_select') {
          const payloadBlanks = blanks
            .map((blank) => {
              const choices = blank.choicesText
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean);
              return {
                id: blank.id.trim(),
                choices,
                correct: blank.correct.trim(),
              };
            })
            .filter((blank) => blank.id.length > 0);

          if (payloadBlanks.length === 0) {
            setError('Agrega al menos un blank.');
            return;
          }
          if (points < 1) {
            setError('Los puntos deben ser al menos 1.');
            return;
          }

          await createQuizQuestion({
            groupSlug,
            locationSlug,
            courseId,
            quizId,
            type: 'cloze_select',
            prompt,
            blanks: payloadBlanks,
            imageUrl: imageUrl.trim() || undefined,
            points,
          });
        } else {
          const items = orderItemsText
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);
          if (items.length < 2) {
            setError('Agrega al menos dos items.');
            return;
          }
          const trimmedOrder = orderCorrect
            .map((item) => item.trim())
            .filter(Boolean);
          if (trimmedOrder.length !== items.length) {
            setError('Completa el orden correcto.');
            return;
          }
          if (points < 1) {
            setError('Los puntos deben ser al menos 1.');
            return;
          }
          await createQuizQuestion({
            groupSlug,
            locationSlug,
            courseId,
            quizId,
            type: 'order',
            prompt,
            items,
            correctOrder: trimmedOrder,
            imageUrl: imageUrl.trim() || undefined,
            points,
          });
        }
        setPrompt('');
        setImageUrl('');
        setPoints(1);
        setOptions(INITIAL_OPTIONS);
        setCorrectIndex(0);
        setMultiCorrect([]);
        setMinSelections(1);
        setAllowMoreThanMin(true);
        setBlanks([{ id: 'blank1', choicesText: '', correct: '' }]);
        setOrderItemsText('');
        setOrderCorrect([]);
        setSuccess('Pregunta agregada.');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo guardar.';
        setError(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div className="text-sm font-semibold">Nueva pregunta</div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo de pregunta</label>
        <select
          value={questionType}
          onChange={(event) =>
            setQuestionType(event.target.value as QuestionType)
          }
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        >
          <option value="mcq">Opción múltiple</option>
          <option value="multi_select">Selección múltiple</option>
          <option value="cloze_select">Completar frase</option>
          <option value="order">Ordenar items</option>
        </select>
      </div>
      <textarea
        name="prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
        placeholder="Escribe la pregunta"
        required
      />
      <div className="space-y-2">
        <label className="text-sm font-medium">Puntos</label>
        <input
          type="number"
          min={1}
          value={points}
          onChange={(event) => setPoints(Number(event.target.value))}
          className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Imagen (URL opcional)</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          placeholder="https://..."
        />
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-60 rounded-md border object-contain"
          />
        ) : null}
      </div>
      {questionType === 'mcq' ? (
        <div className="space-y-3">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct_index"
                value={index}
                checked={correctIndex === index}
                onChange={() => setCorrectIndex(index)}
                required
              />
              <input
                value={option}
                onChange={(event) =>
                  handleOptionChange(index, event.target.value)
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                placeholder={`Opcion ${index + 1}`}
                required
              />
              <span className="text-xs text-muted-foreground">Correcta</span>
            </div>
          ))}
        </div>
      ) : null}

      {questionType === 'multi_select' ? (
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-sm font-medium">Min selecciones</label>
            <input
              type="number"
              min={1}
              value={minSelections}
              onChange={(event) => setMinSelections(Number(event.target.value))}
              className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allowMoreThanMin}
                onChange={(event) => setAllowMoreThanMin(event.target.checked)}
              />
              Permitir más de min
            </label>
          </div>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={multiCorrect.includes(index)}
                onChange={(event) => {
                  setMultiCorrect((prev) => {
                    if (event.target.checked) {
                      return [...prev, index];
                    }
                    return prev.filter((value) => value !== index);
                  });
                }}
              />
              <input
                value={option}
                onChange={(event) =>
                  handleOptionChange(index, event.target.value)
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                placeholder={`Opcion ${index + 1}`}
                required
              />
              <span className="text-xs text-muted-foreground">Correcta</span>
            </div>
          ))}
        </div>
      ) : null}

      {questionType === 'cloze_select' ? (
        <div className="space-y-4 rounded-md border border-dashed p-3">
          <div className="text-xs text-muted-foreground">
            Usá placeholders como {'{blank1}'} en el texto.
          </div>
          {blanks.map((blank, index) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <input
                  value={blank.id}
                  onChange={(event) => {
                    const value = event.target.value;
                    setBlanks((prev) =>
                      prev.map((item, idx) =>
                        idx === index ? { ...item, id: value } : item,
                      ),
                    );
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  placeholder="blank1"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setBlanks((prev) => prev.filter((_, idx) => idx !== index))
                  }
                  disabled={blanks.length === 1}
                >
                  Quitar
                </Button>
              </div>
              <textarea
                value={blank.choicesText}
                onChange={(event) => {
                  const value = event.target.value;
                  setBlanks((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, choicesText: value } : item,
                    ),
                  );
                }}
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                placeholder="Opciones (una por linea)"
                required
              />
              <input
                value={blank.correct}
                onChange={(event) => {
                  const value = event.target.value;
                  setBlanks((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, correct: value } : item,
                    ),
                  );
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                placeholder="Respuesta correcta"
                required
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setBlanks((prev) => [
                ...prev,
                { id: `blank${prev.length + 1}`, choicesText: '', correct: '' },
              ])
            }
          >
            Agregar blank
          </Button>
        </div>
      ) : null}

      {questionType === 'order' ? (
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <textarea
            value={orderItemsText}
            onChange={(event) => {
              const value = event.target.value;
              setOrderItemsText(value);
              const items = value
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean);
              setOrderCorrect((prev) => prev.slice(0, items.length));
            }}
            className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
            placeholder="Items (uno por linea)"
            required
          />
          <div className="space-y-2">
            {(orderItemsText
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean) || []
            ).map((item, index, arr) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Pos {index + 1}
                </span>
                <select
                  value={orderCorrect[index] ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setOrderCorrect((prev) => {
                      const next = [...prev];
                      next[index] = value;
                      return next;
                    });
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  required
                >
                  <option value="">Selecciona item</option>
                  {arr.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Guardando…' : 'Agregar pregunta'}
      </Button>
      {success ? <p className="text-xs text-emerald-600">{success}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}

type QuizQuestionEditorProps = {
  groupSlug: string;
  locationSlug: string;
  courseId: string;
  question: {
    id: string;
    type: QuestionType;
    prompt: string;
    options?: string[];
    content?: {
      imageUrl?: string;
      blanks?: Array<{ id: string; choices: string[] }>;
      items?: string[];
      minSelections?: number;
      allowMoreThanMin?: boolean;
      points?: number;
    };
    answer?: unknown;
  };
};

export function QuizQuestionEditor({
  groupSlug,
  locationSlug,
  courseId,
  question,
}: QuizQuestionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [imageUrl, setImageUrl] = useState(question.content?.imageUrl ?? '');
  const [points, setPoints] = useState(() => {
    if (typeof question.content?.points === 'number') {
      return question.content.points;
    }
    return 1;
  });
  const [options, setOptions] = useState<string[]>(
    question.options && question.options.length ? question.options : INITIAL_OPTIONS,
  );
  const [correctIndex, setCorrectIndex] = useState(() => {
    if (
      question.answer &&
      typeof question.answer === 'object' &&
      'correctIndex' in question.answer
    ) {
      const value = (question.answer as { correctIndex?: number }).correctIndex;
      return typeof value === 'number' ? value : 0;
    }
    return 0;
  });
  const [multiCorrect, setMultiCorrect] = useState<number[]>(() => {
    if (
      question.answer &&
      typeof question.answer === 'object' &&
      'correctIndices' in question.answer
    ) {
      return (question.answer as { correctIndices?: number[] }).correctIndices ?? [];
    }
    return [];
  });
  const [minSelections, setMinSelections] = useState(() => {
    if (typeof question.content?.minSelections === 'number') {
      return question.content.minSelections;
    }
    return 1;
  });
  const [allowMoreThanMin, setAllowMoreThanMin] = useState(() => {
    if (typeof question.content?.allowMoreThanMin === 'boolean') {
      return question.content.allowMoreThanMin;
    }
    return true;
  });
  const [blanks, setBlanks] = useState<ClozeBlank[]>(() => {
    if (question.type !== 'cloze_select' || !question.content?.blanks) {
      return [{ id: 'blank1', choicesText: '', correct: '' }];
    }
    const correctMap =
      question.answer &&
      typeof question.answer === 'object' &&
      'correct' in question.answer
        ? (question.answer as { correct?: Record<string, string> }).correct ?? {}
        : {};
    return question.content.blanks.map((blank) => ({
      id: blank.id,
      choicesText: blank.choices.join('\n'),
      correct: correctMap[blank.id] ?? '',
    }));
  });
  const [orderItemsText, setOrderItemsText] = useState(() => {
    return question.type === 'order' && question.content?.items
      ? question.content.items.join('\n')
      : '';
  });
  const [orderCorrect, setOrderCorrect] = useState<string[]>(() => {
    if (
      question.answer &&
      typeof question.answer === 'object' &&
      'correctOrder' in question.answer
    ) {
      return (question.answer as { correctOrder?: string[] }).correctOrder ?? [];
    }
    return [];
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetState() {
    setPrompt(question.prompt);
    setImageUrl(question.content?.imageUrl ?? '');
    setPoints(typeof question.content?.points === 'number' ? question.content.points : 1);
    setOptions(
      question.options && question.options.length ? question.options : INITIAL_OPTIONS,
    );
    setCorrectIndex(() => {
      if (
        question.answer &&
        typeof question.answer === 'object' &&
        'correctIndex' in question.answer
      ) {
        const value = (question.answer as { correctIndex?: number }).correctIndex;
        return typeof value === 'number' ? value : 0;
      }
      return 0;
    });
    setBlanks(() => {
      if (question.type !== 'cloze_select' || !question.content?.blanks) {
        return [{ id: 'blank1', choicesText: '', correct: '' }];
      }
      const correctMap =
        question.answer &&
        typeof question.answer === 'object' &&
        'correct' in question.answer
          ? (question.answer as { correct?: Record<string, string> }).correct ?? {}
          : {};
      return question.content.blanks.map((blank) => ({
        id: blank.id,
        choicesText: blank.choices.join('\n'),
        correct: correctMap[blank.id] ?? '',
      }));
    });
    setOrderItemsText(
      question.type === 'order' && question.content?.items
        ? question.content.items.join('\n')
        : '',
    );
    setOrderCorrect(() => {
      if (
        question.answer &&
        typeof question.answer === 'object' &&
        'correctOrder' in question.answer
      ) {
        return (question.answer as { correctOrder?: string[] }).correctOrder ?? [];
      }
      return [];
    });
    setMultiCorrect(() => {
      if (
        question.answer &&
        typeof question.answer === 'object' &&
        'correctIndices' in question.answer
      ) {
        return (question.answer as { correctIndices?: number[] }).correctIndices ?? [];
      }
      return [];
    });
    setMinSelections(
      typeof question.content?.minSelections === 'number'
        ? question.content.minSelections
        : 1,
    );
    setAllowMoreThanMin(
      typeof question.content?.allowMoreThanMin === 'boolean'
        ? question.content.allowMoreThanMin
        : true,
    );
    setError(null);
    setSuccess(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        if (question.type === 'mcq') {
          const trimmedOptions = options.map((option) => option.trim());
          if (trimmedOptions.some((option) => option.length === 0)) {
            setError('Todas las opciones son obligatorias.');
            return;
          }
          if (points < 1) {
            setError('Los puntos deben ser al menos 1.');
            return;
          }
          await updateQuizQuestion({
            groupSlug,
            locationSlug,
            courseId,
            questionId: question.id,
            type: 'mcq',
            prompt,
            options: trimmedOptions,
            correctIndex,
            imageUrl: imageUrl.trim() || undefined,
            points,
          });
        } else if (question.type === 'multi_select') {
          const trimmedOptions = options.map((option) => option.trim());
          if (trimmedOptions.some((option) => option.length === 0)) {
            setError('Todas las opciones son obligatorias.');
            return;
          }
          if (minSelections < 1) {
            setError('minSelections debe ser mayor o igual a 1.');
            return;
          }
          if (multiCorrect.length < minSelections) {
            setError('Selecciona al menos minSelections respuestas correctas.');
            return;
          }
          if (points < 1) {
            setError('Los puntos deben ser al menos 1.');
            return;
          }
          await updateQuizQuestion({
            groupSlug,
            locationSlug,
            courseId,
            questionId: question.id,
            type: 'multi_select',
            prompt,
            options: trimmedOptions,
            correctIndices: multiCorrect,
            minSelections,
            allowMoreThanMin,
            imageUrl: imageUrl.trim() || undefined,
            points,
          });
        } else if (question.type === 'cloze_select') {
          const payloadBlanks = blanks
            .map((blank) => {
              const choices = blank.choicesText
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean);
              return {
                id: blank.id.trim(),
                choices,
                correct: blank.correct.trim(),
              };
            })
            .filter((blank) => blank.id.length > 0);

          if (payloadBlanks.length === 0) {
            setError('Agrega al menos un blank.');
            return;
          }
          if (points < 1) {
            setError('Los puntos deben ser al menos 1.');
            return;
          }

          await updateQuizQuestion({
            groupSlug,
            locationSlug,
            courseId,
            questionId: question.id,
            type: 'cloze_select',
            prompt,
            blanks: payloadBlanks,
            imageUrl: imageUrl.trim() || undefined,
            points,
          });
        } else if (question.type === 'order') {
          const items = orderItemsText
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);
          if (items.length < 2) {
            setError('Agrega al menos dos items.');
            return;
          }
          const trimmedOrder = orderCorrect
            .map((item) => item.trim())
            .filter(Boolean);
          if (trimmedOrder.length !== items.length) {
            setError('Completa el orden correcto.');
            return;
          }
          if (points < 1) {
            setError('Los puntos deben ser al menos 1.');
            return;
          }
          await updateQuizQuestion({
            groupSlug,
            locationSlug,
            courseId,
            questionId: question.id,
            type: 'order',
            prompt,
            items,
            correctOrder: trimmedOrder,
            imageUrl: imageUrl.trim() || undefined,
            points,
          });
        } else {
          setError('Edicion no soportada aun.');
          return;
        }
        setSuccess('Guardado.');
        setIsEditing(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo guardar.';
        setError(message);
      }
    });
  }

  if (!isEditing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsEditing(true)}
      >
        Editar
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-3">
      <div className="text-xs text-muted-foreground">Editar pregunta</div>
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
        required
      />
      <div className="space-y-2">
        <label className="text-sm font-medium">Imagen (URL opcional)</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        />
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-60 rounded-md border object-contain"
          />
        ) : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Puntos</label>
        <input
          type="number"
          min={1}
          value={points}
          onChange={(event) => setPoints(Number(event.target.value))}
          className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        />
      </div>

      {question.type === 'mcq' ? (
        <div className="space-y-3">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct_index"
                value={index}
                checked={correctIndex === index}
                onChange={() => setCorrectIndex(index)}
                required
              />
              <input
                value={option}
                onChange={(event) => handleOptionChange(index, event.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                required
              />
              <span className="text-xs text-muted-foreground">Correcta</span>
            </div>
          ))}
        </div>
      ) : null}

      {question.type === 'multi_select' ? (
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-sm font-medium">Min selecciones</label>
            <input
              type="number"
              min={1}
              value={minSelections}
              onChange={(event) => setMinSelections(Number(event.target.value))}
              className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allowMoreThanMin}
                onChange={(event) => setAllowMoreThanMin(event.target.checked)}
              />
              Permitir más de min
            </label>
          </div>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={multiCorrect.includes(index)}
                onChange={(event) => {
                  setMultiCorrect((prev) => {
                    if (event.target.checked) {
                      return [...prev, index];
                    }
                    return prev.filter((value) => value !== index);
                  });
                }}
              />
              <input
                value={option}
                onChange={(event) => handleOptionChange(index, event.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                required
              />
              <span className="text-xs text-muted-foreground">Correcta</span>
            </div>
          ))}
        </div>
      ) : null}

      {question.type === 'cloze_select' ? (
        <div className="space-y-4 rounded-md border border-dashed p-3">
          {blanks.map((blank, index) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <input
                  value={blank.id}
                  onChange={(event) => {
                    const value = event.target.value;
                    setBlanks((prev) =>
                      prev.map((item, idx) =>
                        idx === index ? { ...item, id: value } : item,
                      ),
                    );
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setBlanks((prev) => prev.filter((_, idx) => idx !== index))
                  }
                  disabled={blanks.length === 1}
                >
                  Quitar
                </Button>
              </div>
              <textarea
                value={blank.choicesText}
                onChange={(event) => {
                  const value = event.target.value;
                  setBlanks((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, choicesText: value } : item,
                    ),
                  );
                }}
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                required
              />
              <input
                value={blank.correct}
                onChange={(event) => {
                  const value = event.target.value;
                  setBlanks((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, correct: value } : item,
                    ),
                  );
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                required
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setBlanks((prev) => [
                ...prev,
                { id: `blank${prev.length + 1}`, choicesText: '', correct: '' },
              ])
            }
          >
            Agregar blank
          </Button>
        </div>
      ) : null}

      {question.type === 'order' ? (
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <textarea
            value={orderItemsText}
            onChange={(event) => {
              const value = event.target.value;
              setOrderItemsText(value);
              const items = value
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean);
              setOrderCorrect((prev) => prev.slice(0, items.length));
            }}
            className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
            required
          />
          <div className="space-y-2">
            {(orderItemsText
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean) || []
            ).map((item, index, arr) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Pos {index + 1}
                </span>
                <select
                  value={orderCorrect[index] ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setOrderCorrect((prev) => {
                      const next = [...prev];
                      next[index] = value;
                      return next;
                    });
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  required
                >
                  <option value="">Selecciona item</option>
                  {arr.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            resetState();
            setIsEditing(false);
          }}
        >
          Cancelar
        </Button>
      </div>
      {success ? <p className="text-xs text-emerald-600">{success}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
