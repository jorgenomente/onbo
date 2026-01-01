/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';

import LessonContent from '@/components/lesson/LessonContent';

describe('LessonContent', () => {
  it('renders a valid block array', () => {
    render(
      <LessonContent
        blocks={[{ type: 'heading', level: 1, text: 'Intro title' }]}
      />,
    );

    expect(screen.getByText('Intro title')).toBeTruthy();
  });

  it('renders non-allowlisted embeds as links', () => {
    const { container } = render(
      <LessonContent
        blocks={[
          {
            type: 'embed',
            url: 'https://example.com/video',
            title: 'External video',
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'External video' })).toBeTruthy();
    expect(container.querySelector('iframe')).toBeNull();
  });
});
