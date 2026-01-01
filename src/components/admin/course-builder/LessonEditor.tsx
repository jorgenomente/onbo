'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LessonBlocksSchema, type LessonBlocks } from '@/lib/lessonBlocks';
import LessonContent from '@/components/lesson/LessonContent';
import { updateLessonContent } from '@/server/actions/lessons/updateLessonContent';

import BlockEditor from './BlockEditor';

type LessonEditorProps = {
  lesson: { id: string; title: string; content_json: unknown | null } | null;
};

type Block = LessonBlocks[number];

type BlockType = Block['type'];

const BLOCK_TYPES: { type: BlockType; label: string }[] = [
  { type: 'heading', label: 'Heading' },
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'bullets', label: 'Bullets' },
  { type: 'divider', label: 'Divider' },
  { type: 'embed', label: 'Embed' },
  { type: 'image', label: 'Image' },
  { type: 'file', label: 'File' },
];

function createEmptyBlock(type: BlockType): Block {
  switch (type) {
    case 'heading':
      return { type: 'heading', level: 2, text: 'Nuevo titulo' };
    case 'paragraph':
      return { type: 'paragraph', text: '' };
    case 'bullets':
      return { type: 'bullets', items: [''] };
    case 'divider':
      return { type: 'divider' };
    case 'embed':
      return { type: 'embed', url: '' };
    case 'image':
      return { type: 'image', url: '' };
    case 'file':
      return { type: 'file', url: '', label: '' };
    default:
      return { type: 'paragraph', text: '' };
  }
}

export default function LessonEditor({ lesson }: LessonEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const initialBlocks = useMemo(() => {
    if (!lesson) {
      return [] as LessonBlocks;
    }
    const parsed = LessonBlocksSchema.safeParse(lesson.content_json ?? []);
    return parsed.success ? parsed.data : [];
  }, [lesson]);

  const [blocks, setBlocks] = useState<LessonBlocks>(initialBlocks);

  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks, lesson?.id]);

  if (!lesson) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Editor</CardTitle>
          <CardDescription>Selecciona una leccion.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleAddBlock = (type: BlockType) => {
    setBlocks((prev) => [...prev, createEmptyBlock(type)]);
  };

  const handleUpdate = (index: number, next: Block) => {
    setBlocks((prev) => prev.map((block, i) => (i === index ? next : block)));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev;
      }
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleDelete = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    setStatus(null);
    startTransition(async () => {
      const result = await updateLessonContent({
        lesson_id: lesson.id,
        content_json: blocks,
      });
      setStatus(result.error ?? 'Guardado.');
    });
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Editor</CardTitle>
        <CardDescription>{lesson.title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Agregar bloque
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {BLOCK_TYPES.map((blockType) => (
                <DropdownMenuItem
                  key={blockType.type}
                  onClick={() => handleAddBlock(blockType.type)}
                >
                  {blockType.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {status ? (
            <span className="text-xs text-muted-foreground">{status}</span>
          ) : null}
        </div>

        {blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay bloques. Agrega el primero.
          </p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, index) => (
              <BlockEditor
                key={`${block.type}-${index}`}
                block={block}
                index={index}
                total={blocks.length}
                onChange={(next) => handleUpdate(index, next)}
                onMove={(direction) => handleMove(index, direction)}
                onDelete={() => handleDelete(index)}
              />
            ))}
          </div>
        )}

        <div className="rounded-lg border p-4">
          <div className="mb-3 text-sm font-semibold">Preview</div>
          <LessonContent blocks={blocks} />
        </div>
      </CardContent>
    </Card>
  );
}
