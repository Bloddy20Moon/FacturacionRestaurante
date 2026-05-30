export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  }

  const text = await response.text();
  if (text.includes('<!doctype') || text.includes('<html')) {
    return `${fallback} (la API no respondió JSON; verifica backend y proxy).`;
  }

  return text || fallback;
}

export async function fetchWithRetry(url: string, options?: RequestInit, retries = 5): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      // Si el estado es exitoso o es un error del cliente (4xx), retornar de inmediato.
      // Los errores 5xx (como el 502/504 de proxy de Vite) dispararán reintentos.
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }
    } catch (e) {
      // Ignorar error temporal para reintentar
    }
    // Esperar antes del reintento (exponential backoff o fijo 2s)
    await new Promise(r => setTimeout(r, 2000));
  }
  return fetch(url, options);
}

export function getCategoryImage(category: string): string {
  const categoryKey = category.trim().toLowerCase();
  const map: Record<string, string> = {
    pollo: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=320&q=80',
    especialidades: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=320&q=80',
    entradas: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=320&q=80',
    ensaladas: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=320&q=80',
    guarniciones: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=320&q=80',
    postres: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=320&q=80',
    bebidas: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=320&q=80'
  };
  return map[categoryKey] ?? 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=320&q=80';
}
