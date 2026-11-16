import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SanitizedHtml, sanitizeHtml } from '@/components/common/SanitizedHtml';

describe('WP-03: DOMPurify HTML Sanitization [C-07]', () => {
  it('should remove <script> tags and malicious payloads', () => {
    const dirty = '<p>Normal text</p><script>alert("pwned")</script>';
    const cleaned = sanitizeHtml(dirty);

    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('alert("pwned")');
    expect(cleaned).toContain('<p>Normal text</p>');
  });

  it('should eliminate onerror and event handlers from elements', () => {
    const dirty = '<img src="invalid.png" onerror="alert(\'xss\')" /><b onmouseover="steal()">Text</b>';
    const cleaned = sanitizeHtml(dirty);

    expect(cleaned).not.toContain('onerror');
    expect(cleaned).not.toContain('onmouseover');
    expect(cleaned).not.toContain('alert');
    expect(cleaned).not.toContain('steal');
    expect(cleaned).toContain('<b>Text</b>');
  });

  it('should strip javascript: pseudo-protocols from hyperlinks', () => {
    const dirty = '<a href="javascript:alert(\'attack\')">Klick mich</a>';
    const cleaned = sanitizeHtml(dirty);

    expect(cleaned).not.toContain('javascript:');
    expect(cleaned).not.toContain('alert');
    expect(cleaned).toContain('Klick mich');
  });

  it('should preserve permitted structural formatting tags', () => {
    const legalMarkup = `
      <section>
        <h2>Bescheid nach § 20 SGB II</h2>
        <p>Der Regelbedarf wird wie folgt <strong>festgesetzt</strong>:</p>
        <table>
          <thead><tr><th>Position</th><th>Betrag</th></tr></thead>
          <tbody><tr><td>Regelbedarf</td><td>563 €</td></tr></tbody>
        </table>
        <a href="https://example.com/info" target="_blank" rel="noopener">Weitere Informationen</a>
      </section>
    `;
    const cleaned = sanitizeHtml(legalMarkup);

    expect(cleaned).toContain('<h2>Bescheid nach § 20 SGB II</h2>');
    expect(cleaned).toContain('<strong>festgesetzt</strong>');
    expect(cleaned).toContain('<table>');
    expect(cleaned).toContain('563 €');
    expect(cleaned).toContain('href="https://example.com/info"');
  });

  it('should render sanitized output inside SanitizedHtml component', () => {
    const dirty = '<span>Sicherer Inhalt</span><script>evil()</script>';
    render(React.createElement(SanitizedHtml, {
      html: dirty,
      className: 'legal-notice',
      as: 'article',
    }));

    const article = screen.getByText('Sicherer Inhalt').closest('article');
    expect(article).toBeInTheDocument();
    expect(article).toHaveClass('legal-notice');
    expect(screen.queryByText('evil()')).not.toBeInTheDocument();
  });
});
