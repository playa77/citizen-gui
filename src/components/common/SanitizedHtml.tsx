import React from 'react';
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return '';

  const purifier =
    typeof DOMPurify === 'function' && typeof (DOMPurify as unknown as { sanitize?: unknown }).sanitize !== 'function'
      ? (DOMPurify as unknown as (win: Window) => typeof DOMPurify)(window)
      : DOMPurify;

  return purifier.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      'p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'table',
      'thead', 'tbody', 'tr', 'th', 'td', 'span', 'code', 'pre',
      'blockquote', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'div', 'section', 'article',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'title', 'class', 'id', 'aria-label', 'aria-hidden'],
  });
}

export interface SanitizedHtmlProps {
  html: string;
  className?: string;
  as?: React.ElementType;
}

export const SanitizedHtml: React.FC<SanitizedHtmlProps> = ({
  html,
  className,
  as: Component = 'div',
}) => {
  const cleanHtml = React.useMemo(() => sanitizeHtml(html), [html]);

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};
