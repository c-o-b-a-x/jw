import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { buildImageUrl, fetchSong, type Song } from "@/lib/api";
import { useAudioPlayerContext } from "@/lib/audio-player";

export default function SongDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [song, setSong] = useState<Song | null>(null);
  const [error, setError] = useState("");
  const { currentSong, isPlaying, playSong, togglePlayback } = useAudioPlayerContext();

  useEffect(() => {
    const controller = new AbortController();

    if (!id) {
      setError("Song not found.");
      return () => controller.abort();
    }

    fetchSong(id, controller.signal)
      .then((data) => setSong(data))
      .catch(() => setError("Could not load song details."));

    return () => controller.abort();
  }, [id]);

  function handlePlayPress() {
    if (!song?.path) return;

    if (currentSong?.id === song.id) {
      togglePlayback();
      return;
    }

    playSong(song);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {song ? (
          <View style={styles.panel}>
            <View style={styles.artwork}>
              {song.image_url ? (
                <Image source={{ uri: buildImageUrl(song.image_url) }} style={styles.artworkImage} />
              ) : (
                <View style={styles.fallback}>
                  <Text style={styles.fallbackText}>999</Text>
                </View>
              )}
            </View>

            <Text style={styles.eyebrow}>Song details</Text>
            <Text style={styles.title}>{song.name}</Text>
            <Text style={styles.subtitle}>{song.credited_artists || "Juice WRLD"}</Text>

            <View style={styles.metaGrid}>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Era</Text>
                <Text style={styles.metaValue}>{song.era?.name || "Unknown"}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Length</Text>
                <Text style={styles.metaValue}>{song.length || "Unknown"}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Producers</Text>
                <Text style={styles.metaValue}>{song.producers || "Unknown"}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Catalog ID</Text>
                <Text style={styles.metaValue}>#{song.public_id || song.id}</Text>
              </View>
            </View>

            {song.additional_information ? (
              <Text style={styles.description}>{song.additional_information}</Text>
            ) : null}

            <Pressable style={styles.primaryButton} onPress={handlePlayPress}>
              <Text style={styles.primaryButtonText}>
                {currentSong?.id === song.id && isPlaying ? "Pause stream" : "Play stream"}
              </Text>
            </Pressable>

            <View style={styles.notesSection}>
              <Text style={styles.notesHeading}>Session notes</Text>
              <Text style={styles.noteText}>{song.record_dates || "Record date not listed"}</Text>
              <Text style={styles.noteText}>
                {song.recording_locations || "Recording location not listed"}
              </Text>
              <Text style={styles.noteText}>{song.preview_date || "Preview date not listed"}</Text>
              <Text style={styles.noteText}>{song.date_leaked || "Leak status not listed"}</Text>
            </View>
          </View>
        ) : !error ? (
          <Text style={styles.loadingText}>Loading song...</Text>
        ) : null}
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
  errorText: {
    color: "#ffb07a",
  },
  loadingText: {
    color: "#c9c2b7",
  },
  panel: {
    backgroundColor: "#11141a",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  artwork: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1b1f26",
    marginBottom: 18,
  },
  artworkImage: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: {
    color: "#f36b21",
    fontSize: 44,
    fontWeight: "800",
  },
  eyebrow: {
    color: "#ff914d",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
  },
  title: {
    color: "#f4eee5",
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "800",
  },
  subtitle: {
    color: "#c9c2b7",
    marginTop: 8,
    fontSize: 16,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  metaCard: {
    width: "48%",
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  metaLabel: {
    color: "#8e867b",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  metaValue: {
    color: "#f4eee5",
    marginTop: 8,
    fontWeight: "700",
  },
  description: {
    color: "#c9c2b7",
    marginTop: 18,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: "#f36b21",
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#1c130d",
    fontWeight: "800",
    fontSize: 15,
  },
  notesSection: {
    marginTop: 20,
    gap: 8,
  },
  notesHeading: {
    color: "#f4eee5",
    fontSize: 18,
    fontWeight: "800",
  },
  noteText: {
    color: "#c9c2b7",
    lineHeight: 21,
  },
});
