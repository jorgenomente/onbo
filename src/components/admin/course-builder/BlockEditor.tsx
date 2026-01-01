'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { LessonBlocks } from '@/lib/lessonBlocks';

type Block = LessonBlocks[number];

type BlockEditorProps = {
  block: Block;
  index: number;
  total: number;
  onChange: (next: Block) => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
};

export default function BlockEditor({
  block,
  index,
  total,
  onChange,
  onMove,
  onDelete,
}: BlockEditorProps) {
  return (
    <Card className="gap-4 py-4">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            {block.type.toUpperCase()}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={() => onMove('up')}
              disabled={index === 0}
            >
              ↑
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={() => onMove('down')}
              disabled={index === total - 1}
            >
              ↓
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              onClick={onDelete}
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {block.type === 'heading' ? (
          <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
            <label className="text-xs text-muted-foreground">Nivel</label>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={block.level}
              onChange={(event) =>
                onChange({
                  ...block,
                  level: Number(event.target.value) as 1 | 2 | 3,
                })
              }
            >
              <option value={1}>H1</option>
              <option value={2}>H2</option>
              <option value={3}>H3</option>
            </select>
            <label className="text-xs text-muted-foreground">Texto</label>
            <Input
              value={block.text}
              onChange={(event) =>
                onChange({ ...block, text: event.target.value })
              }
            />
          </div>
        ) : null}

        {block.type === 'paragraph' ? (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Texto</label>
            <Textarea
              value={block.text}
              onChange={(event) =>
                onChange({ ...block, text: event.target.value })
              }
            />
          </div>
        ) : null}

        {block.type === 'bullets' ? (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Items</label>
            <Textarea
              value={block.items.join('\n')}
              onChange={(event) =>
                onChange({
                  ...block,
                  items: event.target.value
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        ) : null}

        {block.type === 'divider' ? (
          <p className="text-xs text-muted-foreground">
            Separador horizontal.
          </p>
        ) : null}

        {block.type === 'embed' ? (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">URL</label>
            <Input
              value={block.url}
              onChange={(event) =>
                onChange({ ...block, url: event.target.value })
              }
            />
            <label className="text-xs text-muted-foreground">Titulo</label>
            <Input
              value={block.title ?? ''}
              onChange={(event) =>
                onChange({
                  ...block,
                  title: event.target.value || undefined,
                })
              }
            />
          </div>
        ) : null}

        {block.type === 'image' ? (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">URL</label>
            <Input
              value={block.url}
              onChange={(event) =>
                onChange({ ...block, url: event.target.value })
              }
            />
            <label className="text-xs text-muted-foreground">Alt</label>
            <Input
              value={block.alt ?? ''}
              onChange={(event) =>
                onChange({
                  ...block,
                  alt: event.target.value || undefined,
                })
              }
            />
            <label className="text-xs text-muted-foreground">Caption</label>
            <Input
              value={block.caption ?? ''}
              onChange={(event) =>
                onChange({
                  ...block,
                  caption: event.target.value || undefined,
                })
              }
            />
          </div>
        ) : null}

        {block.type === 'file' ? (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">URL</label>
            <Input
              value={block.url}
              onChange={(event) =>
                onChange({ ...block, url: event.target.value })
              }
            />
            <label className="text-xs text-muted-foreground">Label</label>
            <Input
              value={block.label}
              onChange={(event) =>
                onChange({ ...block, label: event.target.value })
              }
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
