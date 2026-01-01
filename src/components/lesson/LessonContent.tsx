import { FileText } from 'lucide-react';

import { LessonBlocksSchema } from '@/lib/lessonBlocks';

const EMBED_HOST_ALLOWLIST = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'www.vimeo.com',
  'loom.com',
  'www.loom.com',
]);

function isAllowedEmbed(url: string) {
  try {
    const parsed = new URL(url);
    return EMBED_HOST_ALLOWLIST.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

type LessonContentProps = {
  blocks: unknown;
};

export default function LessonContent({ blocks }: LessonContentProps) {
  if (blocks === null || blocks === undefined) {
    return (
      <p className="text-sm text-muted-foreground">
        Lección sin contenido aún.
      </p>
    );
  }

  const parsed = LessonBlocksSchema.safeParse(blocks);

  if (!parsed.success) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Contenido inválido.</p>
        {process.env.NODE_ENV !== 'production' ? (
          <pre className="whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
            {JSON.stringify(parsed.error.format(), null, 2)}
          </pre>
        ) : null}
      </div>
    );
  }

  if (parsed.data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Lección sin contenido aún.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {parsed.data.map((block, index) => {
        switch (block.type) {
          case 'heading': {
            const HeadingTag =
              block.level === 1
                ? 'h1'
                : block.level === 2
                  ? 'h2'
                  : 'h3';
            const headingClass =
              block.level === 1
                ? 'text-2xl font-semibold'
                : block.level === 2
                  ? 'text-xl font-semibold'
                  : 'text-lg font-semibold';
            return (
              <HeadingTag key={index} className={headingClass}>
                {block.text}
              </HeadingTag>
            );
          }
          case 'paragraph':
            return (
              <p key={index} className="text-sm text-muted-foreground">
                {block.text}
              </p>
            );
          case 'bullets':
            return (
              <ul key={index} className="list-disc space-y-1 pl-5 text-sm">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );
          case 'divider':
            return <hr key={index} className="border-muted" />;
          case 'image':
            return (
              <figure key={index} className="space-y-2">
                <img
                  src={block.url}
                  alt={block.alt ?? 'Lesson image'}
                  className="w-full rounded-md border object-cover"
                />
                {block.caption ? (
                  <figcaption className="text-xs text-muted-foreground">
                    {block.caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          case 'file':
            return (
              <a
                key={index}
                href={block.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:border-foreground/30"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                {block.label}
              </a>
            );
          case 'embed':
            if (!isAllowedEmbed(block.url)) {
              return (
                <a
                  key={index}
                  href={block.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {block.title ?? block.url}
                </a>
              );
            }
            return (
              <div key={index} className="space-y-2">
                {block.title ? (
                  <p className="text-sm font-medium">{block.title}</p>
                ) : null}
                <div className="aspect-video w-full overflow-hidden rounded-lg border">
                  <iframe
                    src={block.url}
                    title={block.title ?? 'Embedded content'}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
