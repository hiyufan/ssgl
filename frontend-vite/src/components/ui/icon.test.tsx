import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Icon } from './icon';

describe('Icon', () => {
  it('renders known semantic icon names as SVG', () => {
    const markup = renderToStaticMarkup(<Icon name="alert" size={18} />);

    expect(markup).toContain('data-icon="alert"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('<svg');
  });

  it('falls back to sparkles for unknown icon names', () => {
    const markup = renderToStaticMarkup(<Icon name="does-not-exist" />);

    expect(markup).toContain('data-icon="sparkles"');
    expect(markup).toContain('<svg');
    expect(markup).not.toContain('does-not-exist');
  });
});
