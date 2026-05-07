import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Song } from "@/lib/api";

const STORAGE_KEY = "jw_mobile_playlists";

export type Playlist = {
  id: string;
  name: string;
  createdAt: string;
  songs: Song[];
};

function createId() {
  return `playlist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readPlaylists() {
  try {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? (parsedValue as Playlist[]) : [];
  } catch {
    return [];
  }
}

async function writePlaylists(playlists: Playlist[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
}

export async function listPlaylists() {
  const playlists = await readPlaylists();
  return playlists.sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export async function createPlaylist(name: string) {
  const playlists = await readPlaylists();
  const nextPlaylist: Playlist = {
    id: createId(),
    name: name.trim() || "Untitled Playlist",
    createdAt: new Date().toISOString(),
    songs: [],
  };

  const nextPlaylists = [nextPlaylist, ...playlists];
  await writePlaylists(nextPlaylists);
  return nextPlaylist;
}

export async function deletePlaylist(playlistId: string) {
  const playlists = await readPlaylists();
  const nextPlaylists = playlists.filter((playlist) => playlist.id !== playlistId);
  await writePlaylists(nextPlaylists);
  return nextPlaylists;
}

export async function addSongToPlaylist(playlistId: string, song: Song) {
  const playlists = await readPlaylists();
  const nextPlaylists = playlists.map((playlist) => {
    if (playlist.id !== playlistId) return playlist;
    if (playlist.songs.some((existingSong) => existingSong.id === song.id)) {
      return playlist;
    }

    return {
      ...playlist,
      songs: [...playlist.songs, song],
    };
  });

  await writePlaylists(nextPlaylists);
  return nextPlaylists;
}

export async function removeSongFromPlaylist(playlistId: string, songId: number) {
  const playlists = await readPlaylists();
  const nextPlaylists = playlists.map((playlist) => {
    if (playlist.id !== playlistId) return playlist;

    return {
      ...playlist,
      songs: playlist.songs.filter((song) => song.id !== songId),
    };
  });

  await writePlaylists(nextPlaylists);
  return nextPlaylists;
}
