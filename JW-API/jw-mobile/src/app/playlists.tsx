import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { fetchSongs, type Song } from "@/lib/api";
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  listPlaylists,
  removeSongFromPlaylist,
  type Playlist,
} from "@/lib/playlist-store";

export default function PlaylistsScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listPlaylists().then((storedPlaylists) => {
      setPlaylists(storedPlaylists);
      if (storedPlaylists[0]) {
        setSelectedPlaylistId(storedPlaylists[0].id);
      }
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    if (!searchTerm.trim()) {
      setSearchResults([]);
      return () => controller.abort();
    }

    const timeoutId = setTimeout(() => {
      fetchSongs({
        search: searchTerm.trim(),
        signal: controller.signal,
      })
        .then((data) => setSearchResults(data.results ?? []))
        .catch(() => setError("Failed to search songs."));
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchTerm]);

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null,
    [playlists, selectedPlaylistId],
  );

  async function handleCreatePlaylist() {
    const playlist = await createPlaylist(newPlaylistName);
    const nextPlaylists = await listPlaylists();
    setPlaylists(nextPlaylists);
    setSelectedPlaylistId(playlist.id);
    setNewPlaylistName("");
    setError("");
  }

  async function handleDeletePlaylist(playlistId: string) {
    const nextPlaylists = await deletePlaylist(playlistId);
    setPlaylists(nextPlaylists);
    setSelectedPlaylistId(nextPlaylists[0]?.id ?? "");
  }

  async function handleAddSong(song: Song) {
    if (!selectedPlaylistId) {
      setError("Create or select a playlist first.");
      return;
    }

    const nextPlaylists = await addSongToPlaylist(selectedPlaylistId, song);
    setPlaylists(nextPlaylists);
    setError("");
  }

  async function handleRemoveSong(songId: number) {
    if (!selectedPlaylistId) return;

    const nextPlaylists = await removeSongFromPlaylist(selectedPlaylistId, songId);
    setPlaylists(nextPlaylists);
  }

  async function handleSharePlaylist() {
    if (!selectedPlaylist) return;

    const songLines = selectedPlaylist.songs.map((song) => `- ${song.name}`).join("\n");
    await Share.share({
      message: `${selectedPlaylist.name}\n\n${songLines || "No songs yet."}`,
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <View style={styles.panel}>
          <Text style={styles.eyebrow}>Playlists</Text>
          <Text style={styles.title}>Save songs locally on the device.</Text>

          <View style={styles.createRow}>
            <TextInput
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="New playlist name"
              placeholderTextColor="#746d65"
              style={styles.input}
            />
            <Pressable style={styles.primaryButton} onPress={handleCreatePlaylist}>
              <Text style={styles.primaryButtonText}>Create</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {playlists.map((playlist) => (
              <Pressable
                key={playlist.id}
                style={[
                  styles.chip,
                  selectedPlaylistId === playlist.id && styles.chipActive,
                ]}
                onPress={() => setSelectedPlaylistId(playlist.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedPlaylistId === playlist.id && styles.chipTextActive,
                  ]}
                >
                  {playlist.name} ({playlist.songs.length})
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {selectedPlaylist ? (
            <View style={styles.playlistSection}>
              <View style={styles.playlistHeader}>
                <Text style={styles.playlistTitle}>{selectedPlaylist.name}</Text>
                <View style={styles.actionRow}>
                  <Pressable style={styles.ghostButton} onPress={handleSharePlaylist}>
                    <Text style={styles.ghostButtonText}>Share</Text>
                  </Pressable>
                  <Pressable
                    style={styles.ghostButton}
                    onPress={() => handleDeletePlaylist(selectedPlaylist.id)}
                  >
                    <Text style={styles.ghostButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>

              {selectedPlaylist.songs.map((song) => (
                <View key={song.id} style={styles.songRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.songTitle}>{song.name}</Text>
                    <Text style={styles.songMeta}>{song.credited_artists || "Juice WRLD"}</Text>
                  </View>
                  <Pressable style={styles.ghostButton} onPress={() => handleRemoveSong(song.id)}>
                    <Text style={styles.ghostButtonText}>Remove</Text>
                  </Pressable>
                </View>
              ))}

              {selectedPlaylist.songs.length === 0 ? (
                <Text style={styles.emptyText}>No songs in this playlist yet.</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.emptyText}>Create a playlist to get started.</Text>
          )}

          <Text style={[styles.eyebrow, { marginTop: 24 }]}>Add songs</Text>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search songs to add"
            placeholderTextColor="#746d65"
            style={styles.input}
          />

          {searchResults.map((song) => (
            <View key={song.id} style={styles.songRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.songTitle}>{song.name}</Text>
                <Text style={styles.songMeta}>{song.credited_artists || "Juice WRLD"}</Text>
              </View>
              <Pressable style={styles.primaryButtonSmall} onPress={() => handleAddSong(song)}>
                <Text style={styles.primaryButtonText}>Add</Text>
              </Pressable>
            </View>
          ))}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#070809",
  },
  content: {
    padding: 18,
    paddingBottom: 140,
  },
  backButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },
  backButtonText: {
    color: "#f4eee5",
    fontWeight: "700",
  },
  panel: {
    backgroundColor: "#11141a",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  eyebrow: {
    color: "#ff914d",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
  },
  title: {
    color: "#f4eee5",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
  },
  createRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#f4eee5",
  },
  primaryButton: {
    borderRadius: 16,
    paddingHorizontal: 18,
    justifyContent: "center",
    backgroundColor: "#f36b21",
  },
  primaryButtonSmall: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    backgroundColor: "#f36b21",
  },
  primaryButtonText: {
    color: "#1c130d",
    fontWeight: "800",
  },
  chipRow: {
    gap: 10,
    paddingRight: 8,
    marginTop: 16,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipActive: {
    backgroundColor: "#f36b21",
  },
  chipText: {
    color: "#c9c2b7",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#1a120d",
  },
  playlistSection: {
    marginTop: 20,
  },
  playlistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  playlistTitle: {
    color: "#f4eee5",
    fontSize: 22,
    fontWeight: "800",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  songTitle: {
    color: "#f4eee5",
    fontWeight: "700",
  },
  songMeta: {
    color: "#a9a095",
    marginTop: 4,
  },
  ghostButton: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ghostButtonText: {
    color: "#f4eee5",
    fontWeight: "700",
  },
  emptyText: {
    color: "#a9a095",
    marginTop: 8,
  },
  errorText: {
    color: "#ffb07a",
    marginTop: 14,
  },
});
