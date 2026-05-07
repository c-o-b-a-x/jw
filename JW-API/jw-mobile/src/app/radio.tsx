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
import { router } from "expo-router";

import { buildImageUrl, fetchSongs, type Song } from "@/lib/api";
import { useAudioPlayerContext } from "@/lib/audio-player";

function shuffleSongs(songs: Song[]) {
  const copy = [...songs];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export default function RadioScreen() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const { currentSong, isPlaying, isBuffering, playQueue, playNext, playPrevious } =
    useAudioPlayerContext();

  useEffect(() => {
    const controller = new AbortController();

    async function loadRadio() {
      try {
        const [firstBatch, secondBatch, thirdBatch] = await Promise.all([
          fetchSongs({ page: 1, signal: controller.signal }),
          fetchSongs({ page: 2, signal: controller.signal }),
          fetchSongs({ page: 3, signal: controller.signal }),
        ]);

        setSongs(shuffleSongs([
          ...(firstBatch.results ?? []),
          ...(secondBatch.results ?? []),
          ...(thirdBatch.results ?? []),
        ]));
      } catch {
        setError("Could not load the radio station.");
      }
    }

    loadRadio();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!songs.length || !currentSong) return;

    const activeIndex = songs.findIndex((song) => song.id === currentSong.id);
    if (activeIndex >= 0 && activeIndex !== currentIndex) {
      setCurrentIndex(activeIndex);
    }
  }, [currentIndex, currentSong, songs]);

  const currentRadioSong = songs[currentIndex];

  function handlePlayRadio() {
    if (!songs.length || !currentRadioSong?.path) return;
    playQueue(songs, currentIndex);
  }

  function handlePrevious() {
    if (!songs.length) return;

    if (currentSong?.id === currentRadioSong?.id) {
      playPrevious();
      return;
    }

    const nextIndex = currentIndex > 0 ? currentIndex - 1 : songs.length - 1;
    setCurrentIndex(nextIndex);
    playQueue(songs, nextIndex);
  }

  function handleNext() {
    if (!songs.length) return;

    if (currentSong?.id === currentRadioSong?.id) {
      playNext();
      return;
    }

    const nextIndex = currentIndex + 1 < songs.length ? currentIndex + 1 : 0;
    setCurrentIndex(nextIndex);
    playQueue(songs, nextIndex);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <View style={styles.panel}>
          <Text style={styles.eyebrow}>Radio</Text>
          <Text style={styles.title}>A shuffled mobile station for quick listening.</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {currentRadioSong ? (
            <>
              <View style={styles.artwork}>
                {currentRadioSong.image_url ? (
                  <Image
                    source={{ uri: buildImageUrl(currentRadioSong.image_url) }}
                    style={styles.artworkImage}
                  />
                ) : (
                  <View style={styles.fallback}>
                    <Text style={styles.fallbackText}>999</Text>
                  </View>
                )}
              </View>

              <Text style={styles.songTitle}>{currentRadioSong.name}</Text>
              <Text style={styles.songMeta}>
                {currentRadioSong.credited_artists || "Juice WRLD"}
              </Text>

              <View style={styles.controls}>
                <Pressable style={styles.controlButton} onPress={handlePrevious}>
                  <Text style={styles.controlButtonText}>Prev</Text>
                </Pressable>
                <Pressable style={styles.primaryButton} onPress={handlePlayRadio}>
                  <Text style={styles.primaryButtonText}>
                    {currentSong?.id === currentRadioSong.id && isPlaying
                      ? "Playing"
                      : isBuffering
                        ? "Buffering"
                        : "Play"}
                  </Text>
                </Pressable>
                <Pressable style={styles.controlButton} onPress={handleNext}>
                  <Text style={styles.controlButtonText}>Next</Text>
                </Pressable>
              </View>

              <Text style={styles.queueHeading}>Up next</Text>
              {songs.slice(currentIndex + 1, currentIndex + 6).map((song) => (
                <View key={song.id} style={styles.queueCard}>
                  <Text style={styles.queueTitle}>{song.name}</Text>
                  <Text style={styles.queueMeta}>{song.credited_artists || "Juice WRLD"}</Text>
                </View>
              ))}
            </>
          ) : !error ? (
            <Text style={styles.loadingText}>Loading station...</Text>
          ) : null}
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
  errorText: {
    color: "#ffb07a",
    marginTop: 12,
  },
  loadingText: {
    color: "#c9c2b7",
    marginTop: 16,
  },
  artwork: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1b1f26",
    marginTop: 18,
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
  songTitle: {
    color: "#f4eee5",
    fontSize: 28,
    marginTop: 16,
    fontWeight: "800",
  },
  songMeta: {
    color: "#c9c2b7",
    marginTop: 6,
  },
  controls: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  controlButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  controlButtonText: {
    color: "#f4eee5",
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1.4,
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: "#f36b21",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#1c130d",
    fontWeight: "800",
  },
  queueHeading: {
    color: "#f4eee5",
    marginTop: 22,
    marginBottom: 10,
    fontWeight: "800",
    fontSize: 18,
  },
  queueCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  queueTitle: {
    color: "#f4eee5",
    fontWeight: "700",
  },
  queueMeta: {
    color: "#a9a095",
    marginTop: 4,
  },
});
