export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// One simple function for all HTTP requests.
export async function api(path, options = {}) {
  const { method = 'GET', body, token } = options;
  const savedToken = token || localStorage.getItem('token');

  const response = await fetch(API_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(savedToken ? { Authorization: `Bearer ${savedToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}
