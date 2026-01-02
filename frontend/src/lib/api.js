export const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
const devLogs =
  import.meta.env.DEV || import.meta.env.VITE_DEV_LOGS === "true";

export function authHeaders(token) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const error = new Error("Solicitud fallida");
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export function logDev(...args) {
  if (devLogs) {
    console.debug("[dev]", ...args);
  }
}
