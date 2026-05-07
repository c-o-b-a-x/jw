export const API_BASE_URL = "https://juicewrldapi.com";
export const SONGS_PER_PAGE = 16;

export type Song = {
  id: number;
  public_id?: number | string;
  name: string;
  category?: string;
  path?: string;
  image_url?: string;
  length?: string;
  credited_artists?: string;
  producers?: string;
  additional_information?: string;
  track_titles?: string[];
  record_dates?: string;
  recording_locations?: string;
  preview_date?: string;
  date_leaked?: string;
  lyrics?: string;
  era?: {
    id?: number;
    name?: string;
    description?: string;
    time_frame?: string;
  };
};

export type Category = {
  name?: string;
  description?: string;
  slug?: string;
  value?: string;
};

export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchSongs(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    page_size: String(params.pageSize ?? SONGS_PER_PAGE),
  });

  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", params.category);

  return fetchJson<{ count: number; results: Song[] }>(
    `/juicewrld/songs/?${query.toString()}`,
    params.signal,
  );
}

export async function fetchSong(id: number | string, signal?: AbortSignal) {
  return fetchJson<Song>(`/juicewrld/songs/${id}/`, signal);
}

export async function fetchCategories(signal?: AbortSignal) {
  return fetchJson<{ categories: Category[] }>("/juicewrld/categories/", signal);
}

export function buildImageUrl(path?: string) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

export function buildAudioUrl(path?: string) {
  if (!path) return "";
  return `${API_BASE_URL}/juicewrld/files/download/?path=${encodeURIComponent(path)}`;
}

export function formatCategoryLabel(value?: string) {
  if (!value) return "All songs";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
