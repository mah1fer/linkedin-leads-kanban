/**
 * Extrai o domínio de uma URL corporativa.
 */
export function extractDomain(url: string): string | null {
  try {
    const domain = url
      .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
      .split('/')[0]
      .split('?')[0];
    return domain.toLowerCase();
  } catch {
    return null;
  }
}
