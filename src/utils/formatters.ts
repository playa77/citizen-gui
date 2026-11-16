/**
 * Format utilities for currency, dates, and percentages.
 * Adheres strictly to German legal document formatting conventions.
 */

/**
 * Format cent amounts into standard German currency string (e.g. 50200 -> "502,00 €").
 */
export function formatCentsToEuro(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(euros)
    .replace(/\s+/g, ' ');
}

/**
 * Format cent difference with explicit sign (e.g. +12,50 € or -34,00 €).
 */
export function formatCentDifference(cents: number): string {
  const formatted = formatCentsToEuro(Math.abs(cents));
  if (cents > 0) {
    return `+${formatted}`;
  }
  if (cents < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

/**
 * Format ISO or standard date strings into German date format (e.g. "2026-11-16" -> "16.11.2026").
 */
export function formatDateGerman(dateString?: string | null): string {
  if (!dateString) return '—';
  
  // Try parsing date
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) {
    // Return original string if not a valid ISO date
    return dateString;
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

/**
 * Format decimal confidence score (0.0 - 1.0) as percentage (e.g. 0.85 -> "85 %").
 */
export function formatConfidenceScore(score: number): string {
  const percentage = Math.round(score * 100);
  return `${percentage} %`;
}
