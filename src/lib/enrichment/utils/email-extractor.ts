// Regex robusto para extrair emails de HTML/texto
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

export function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];

  return [...new Set(matches)]
    .map(e => e.toLowerCase().trim())
    .filter(email => {
      // Filtra emails inválidos ou genéricos
      const invalid = [
        'example.com', 'test.com', 'email.com',
        'yourcompany', 'domain.com', 'noreply',
        'no-reply', 'donotreply', 'sentry.io',
      ];
      return !invalid.some(bad => email.includes(bad));
    });
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function getDomain(email: string): string {
  return email.split('@')[1] || '';
}
