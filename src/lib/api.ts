const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? ""
  : "https://civi-track-tau.vercel.app";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!API_BASE_URL) {
    return normalizedPath;
  }

  return `${API_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
}
