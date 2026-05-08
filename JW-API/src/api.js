export const API_BASE_URL = "https://juicewrldapi.com";
export const SONGS_PER_PAGE = 12;

const responseCache = new Map();

export async function fetchJson(path, { signal, useCache = false } = {}) {
  if (useCache && responseCache.has(path)) {
    return responseCache.get(path);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  const data = await response.json();
  if (useCache) {
    responseCache.set(path, data);
  }

  return data;
}

export function fetchSongs(
  { page = 1, pageSize = SONGS_PER_PAGE, search = "", category = "" } = {},
  options = {},
) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  if (category) params.set("category", category);
  if (search) params.set("search", search);

  return fetchJson(`/juicewrld/songs/?${params.toString()}`, options);
}

export function fetchSong(id, options = {}) {
  return fetchJson(`/juicewrld/songs/${id}/`, options);
}

export function fetchCategories(options = {}) {
  return fetchJson("/juicewrld/categories/", { ...options, useCache: true });
}

export function fetchStats(options = {}) {
  return fetchJson("/juicewrld/stats/", { ...options, useCache: true });
}

export function buildImageUrl(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

export function buildAudioUrl(path) {
  if (!path) return "";
  return `${API_BASE_URL}/juicewrld/files/download/?path=${encodeURIComponent(path)}`;
}

export function formatCategoryLabel(value) {
  if (!value) return "All songs";
  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatCount(value) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}
