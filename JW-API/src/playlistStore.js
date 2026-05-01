const PLAYLISTS_STORAGE_KEY = "jw_playlists";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `playlist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readPlaylists() {
  if (!canUseStorage()) return [];

  try {
    const rawValue = window.localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function writePlaylists(playlists) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
}

export function listPlaylists() {
  return readPlaylists().sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

export function getPlaylistById(id) {
  return readPlaylists().find((playlist) => String(playlist.id) === String(id)) ?? null;
}

export function createPlaylist({ name, description = "", songs = [] }) {
  const playlists = readPlaylists();

  const playlist = {
    id: generateId(),
    name: name?.trim() || "Untitled Playlist",
    description: description.trim(),
    created_at: new Date().toISOString(),
    songs: songs.map((song) => ({ ...song })),
    song_count: songs.length,
  };

  playlists.unshift(playlist);
  writePlaylists(playlists);
  return playlist;
}

export function updatePlaylist(updatedPlaylist) {
  const playlists = readPlaylists();
  const nextPlaylists = playlists.map((playlist) =>
    String(playlist.id) === String(updatedPlaylist.id)
      ? {
          ...updatedPlaylist,
          song_count: updatedPlaylist.songs?.length ?? 0,
        }
      : playlist,
  );

  writePlaylists(nextPlaylists);
  return getPlaylistById(updatedPlaylist.id);
}

export function deletePlaylist(id) {
  const playlists = readPlaylists().filter((playlist) => String(playlist.id) !== String(id));
  writePlaylists(playlists);
}

export function addSongToPlaylist(playlistId, song) {
  const playlist = getPlaylistById(playlistId);
  if (!playlist) return null;

  if (playlist.songs?.some((existingSong) => existingSong.id === song.id)) {
    return playlist;
  }

  return updatePlaylist({
    ...playlist,
    songs: [...(playlist.songs ?? []), song],
  });
}

export function removeSongFromPlaylist(playlistId, songId) {
  const playlist = getPlaylistById(playlistId);
  if (!playlist) return null;

  return updatePlaylist({
    ...playlist,
    songs: (playlist.songs ?? []).filter((song) => song.id !== songId),
  });
}

function encodeBase64Url(value) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalizedValue.length % 4)) % 4;
  const paddedValue = normalizedValue.padEnd(normalizedValue.length + paddingLength, "=");
  return decodeURIComponent(escape(atob(paddedValue)));
}

export function buildShareToken({ name, description = "", songs = [] }) {
  const payload = {
    name: name?.trim() || "Untitled Playlist",
    description: description.trim(),
    songIds: songs.map((song) => song.id),
  };

  return encodeBase64Url(JSON.stringify(payload));
}

export function parseShareToken(shareToken) {
  try {
    const parsedValue = JSON.parse(decodeBase64Url(shareToken));
    if (!parsedValue || !Array.isArray(parsedValue.songIds)) {
      return null;
    }

    return {
      name: parsedValue.name || "Untitled Playlist",
      description: parsedValue.description || "",
      songIds: parsedValue.songIds.filter((songId) => Number.isFinite(Number(songId))),
    };
  } catch {
    return null;
  }
}
