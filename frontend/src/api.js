export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function api(path, { method = "GET", body, token } = {}) {
  // a reusable function for calling the backend
  const t = token ?? localStorage.getItem("token");
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(t && { Authorization: `Bearer ${t}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
