import { ENV } from '@/src/config/env';

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', headers = {}, body } = options;

  const response = await fetch(`${ENV.API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
