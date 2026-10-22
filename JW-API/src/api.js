export const API_BASE_URL = "/api";
export const SONGS_PER_PAGE = 12;

const responseCache = new Map();

export async function fetchJson(
  path,
  {
    signal,
    useCache = false,
    method = "GET",
    headers = {},
    body,
  } = {},
) {
  const cacheKey = `${method}:${path}`;

  if (useCache && method === "GET" && responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal,
    method,
    headers,
    body,
  });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  const data = await response.json();
  if (useCache && method === "GET") {
    responseCache.set(cacheKey, data);
  }

  return data;
}

export function postJson(path, payload, options = {}) {
  return fetchJson(path, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function fetchSongs(
  {
    page = 1,
    pageSize = SONGS_PER_PAGE,
    search = "",
    searchAll = "",
    lyrics = "",
    category = "",
    era = "",
    fileNamesArray = false,
  } = {},
  options = {},
) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  if (category) params.set("category", category);
  if (era) params.set("era", era);
  if (search) params.set("search", search);
  if (searchAll) params.set("searchall", searchAll);
  if (lyrics) params.set("lyrics", lyrics);
  if (fileNamesArray) params.set("file_names_array", "true");

  return fetchJson(`/juicewrld/songs/?${params.toString()}`, options);
}

export function fetchSong(id, options = {}) {
  return fetchJson(`/juicewrld/songs/${id}/`, options);
}

export function browseFiles({ path = "", search = "" } = {}, options = {}) {
  const params = new URLSearchParams();

  if (path) params.set("path", path);
  if (search) params.set("search", search);

  const queryString = params.toString();
  return fetchJson(
    `/juicewrld/files/browse/${queryString ? `?${queryString}` : ""}`,
    options,
  );
}

export function fetchCategories(options = {}) {
  return fetchJson("/juicewrld/categories/", { ...options, useCache: true });
}

export function fetchStats(options = {}) {
  return fetchJson("/juicewrld/stats/", { ...options, useCache: true });
}

export function fetchEras(options = {}) {
  return fetchJson("/juicewrld/eras/", { ...options, useCache: true });
}

export function fetchRandomRadioSong(options = {}) {
  return fetchJson("/juicewrld/radio/random/", options);
}

function normalizeSharedPlaylistResponse(payload) {
  const root = payload?.playlist || payload?.data || payload;
  const rawShareUrl =
    root?.share_url ||
    root?.shareUrl ||
    payload?.share_url ||
    payload?.shareUrl ||
    "";
  let derivedShareId =
    root?.share_id ||
    root?.shareId ||
    payload?.share_id ||
    payload?.shareId ||
    root?.id ||
    payload?.id ||
    "";

  if (!derivedShareId && rawShareUrl) {
    try {
      const parsedUrl = new URL(rawShareUrl);
      derivedShareId =
        parsedUrl.searchParams.get("playlist") ||
        parsedUrl.pathname.split("/").filter(Boolean).pop() ||
        "";
    } catch {
      derivedShareId = rawShareUrl.split("/").filter(Boolean).pop() || "";
    }
  }

  const rawSongs = Array.isArray(
    root?.songs ||
    root?.song_data ||
    root?.results ||
    root?.tracks,
  )
    ? root?.songs ||
      root?.song_data ||
      root?.results ||
      root?.tracks
    : [];
  const songs = rawSongs.filter((entry) => entry && typeof entry === "object");
  const rawSongIds = Array.isArray(
    root?.song_ids ||
    root?.songIds ||
    root?.songs?.filter((entry) => typeof entry !== "object"),
  )
    ? root?.song_ids ||
      root?.songIds ||
      root?.songs?.filter((entry) => typeof entry !== "object")
    : [];

  return {
    shareId: derivedShareId,
    shareUrl: rawShareUrl,
    name: root?.name || root?.title || "Untitled Playlist",
    description: root?.description || "",
    songs,
    songIds: rawSongIds
      .map((songId) => Number(songId))
      .filter((songId) => Number.isFinite(songId)),
    songCount:
      root?.song_count ||
      root?.songCount ||
      songs.length ||
      rawSongIds.length ||
      0,
  };
}

export function createSharedPlaylist(payload, options = {}) {
  return postJson(
    "/juicewrld/playlists/share/",
    {
      name: payload.name,
      title: payload.name,
      description: payload.description || "",
      song_ids: payload.songIds,
      songIds: payload.songIds,
      songs: payload.songIds,
    },
    options,
  ).then(normalizeSharedPlaylistResponse);
}

export function fetchSharedPlaylist(shareId, options = {}) {
  return fetchJson(`/juicewrld/playlists/shared/${encodeURIComponent(shareId)}/`, options)
    .then(normalizeSharedPlaylistResponse);
}

export function fetchSharedPlaylistInfo(shareId, options = {}) {
  return fetchJson(
    `/juicewrld/playlists/shared/${encodeURIComponent(shareId)}/info/`,
    options,
  ).then(normalizeSharedPlaylistResponse);
}

export async function downloadZipSelection(paths, suggestedName = "juicewrld-selection.zip") {
  const response = await fetch(`${API_BASE_URL}/juicewrld/files/zip-selection/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paths }),
  });

  if (!response.ok) {
    throw new Error(`ZIP request failed with ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = suggestedName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export function buildImageUrl(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

export function buildAudioUrl(path) {
  if (!path) return "";
  return `${API_BASE_URL}/juicewrld/files/download/?path=${encodeURIComponent(path)}`;
}

export function buildFileUrl(path) {
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
