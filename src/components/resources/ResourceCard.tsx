import Link from 'next/link';

import { Button } from '@/components/ui/button';

export type ResourceItem = {
  id: string;
  title: string;
  type: 'link' | 'video' | 'pdf';
  url: string;
  description: string | null;
};

const ALLOWED_EMBED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'www.vimeo.com',
]);

function isEmbedAllowed(url: string) {
  try {
    const parsed = new URL(url);
    return ALLOWED_EMBED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export default function ResourceCard({ resource }: { resource: ResourceItem }) {
  const canEmbed = resource.type === 'video' && isEmbedAllowed(resource.url);

  return (
    <div className="rounded-lg border p-4 text-sm">
      <div className="space-y-1">
        <div className="font-semibold">{resource.title}</div>
        {resource.description ? (
          <p className="text-xs text-muted-foreground">{resource.description}</p>
        ) : null}
      </div>

      {canEmbed ? (
        <div className="mt-3 aspect-video overflow-hidden rounded-lg border">
          <iframe
            src={resource.url}
            title={resource.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      <div className="mt-3">
        <Button asChild variant="outline" size="sm">
          <Link href={resource.url} target="_blank" rel="noreferrer">
            Abrir
          </Link>
        </Button>
      </div>
    </div>
  );
}
