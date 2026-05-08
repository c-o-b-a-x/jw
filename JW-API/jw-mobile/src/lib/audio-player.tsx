import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioStatus,
} from "expo-audio";

import { buildAudioUrl, buildImageUrl, type Song } from "@/lib/api";

const player = createAudioPlayer(null, {
  updateInterval: 250,
  downloadFirst: false,
  preferredForwardBufferDuration: 20,
});

type AudioPlayerContextValue = {
  currentSong: Song | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  queueIndex: number;
  queueLength: number;
  playSong: (song: Song) => void;
  playQueue: (songs: Song[], startIndex?: number) => void;
  togglePlayback: () => void;
  pause: () => void;
  playNext: () => void;
  playPrevious: () => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

function getPlayableSongs(songs: Song[]) {
  return songs.filter((song) => Boolean(song.path));
}

function buildLockScreenMetadata(song: Song) {
  return {
    title: song.name,
    artist: song.credited_artists || "Juice WRLD",
    albumTitle: "Juice WRLD API",
    artworkUrl: song.image_url ? buildImageUrl(song.image_url) : undefined,
  };
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function AudioPlayerProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<AudioStatus>(player.currentStatus);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queueIndex, setQueueIndex] = useState(-1);
  const queueRef = useRef<Song[]>([]);
  const queueIndexRef = useRef(-1);
  const lastDidFinishRef = useRef(false);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch(() => {});

    const subscription = player.addListener("playbackStatusUpdate", (nextStatus) => {
      setStatus(nextStatus);

      if (nextStatus.didJustFinish && !lastDidFinishRef.current) {
        lastDidFinishRef.current = true;
        const nextIndex = queueRef.current.length > 0 ? queueIndexRef.current + 1 : -1;
        const nextSong = queueRef.current[nextIndex];

        if (nextSong?.path) {
          queueIndexRef.current = nextIndex;
          setQueueIndex(nextIndex);
          setCurrentSong(nextSong);
          player.replace({
            uri: buildAudioUrl(nextSong.path),
            headers: {
              Accept: "audio/mpeg,audio/*,*/*",
            },
            name: nextSong.name,
          });
          player.setActiveForLockScreen(true, buildLockScreenMetadata(nextSong));
          player.play();
          return;
        }

        player.clearLockScreenControls();
      } else if (!nextStatus.didJustFinish) {
        lastDidFinishRef.current = false;
      }
    });

    return () => {
      subscription.remove();
      player.pause();
      player.clearLockScreenControls();
      player.remove();
    };
  }, []);

  function loadSong(song: Song, shouldPlay: boolean) {
    if (!song.path) return;

    setCurrentSong(song);
    player.replace({
      uri: buildAudioUrl(song.path),
      headers: {
        Accept: "audio/mpeg,audio/*,*/*",
      },
      name: song.name,
    });
    player.setActiveForLockScreen(true, buildLockScreenMetadata(song));

    if (shouldPlay) {
      player.play();
    }
  }

  function playFromQueue(nextIndex: number) {
    const nextSong = queueRef.current[nextIndex];
    if (!nextSong) return;

    queueIndexRef.current = nextIndex;
    setQueueIndex(nextIndex);
    loadSong(nextSong, true);
  }

  function playSong(song: Song) {
    if (!song.path) return;

    queueRef.current = [song];
    queueIndexRef.current = 0;
    setQueueIndex(0);
    loadSong(song, true);
  }

  function playQueue(songs: Song[], startIndex = 0) {
    const playableSongs = getPlayableSongs(songs);
    if (!playableSongs.length) return;

    const requestedSong = songs[startIndex];
    const normalizedIndex = requestedSong?.id
      ? playableSongs.findIndex((song) => song.id === requestedSong.id)
      : -1;

    queueRef.current = playableSongs;
    playFromQueue(normalizedIndex >= 0 ? normalizedIndex : 0);
  }

  function togglePlayback() {
    if (!currentSong) return;

    if (status.playing) {
      player.pause();
      return;
    }

    player.setActiveForLockScreen(true, buildLockScreenMetadata(currentSong));
    player.play();
  }

  function pause() {
    if (!status.playing) return;
    player.pause();
  }

  function playNext() {
    if (!queueRef.current.length) return;
    const nextIndex = queueIndex + 1 >= queueRef.current.length ? 0 : queueIndex + 1;
    playFromQueue(nextIndex);
  }

  function playPrevious() {
    if (!queueRef.current.length) return;
    const previousIndex = queueIndex <= 0 ? queueRef.current.length - 1 : queueIndex - 1;
    playFromQueue(previousIndex);
  }

  const value: AudioPlayerContextValue = {
    currentSong,
    isPlaying: status.playing,
    isBuffering: status.isBuffering,
    currentTime: status.currentTime ?? 0,
    duration: status.duration ?? 0,
    queueIndex,
    queueLength: queueRef.current.length,
    playSong,
    playQueue,
    togglePlayback,
    pause,
    playNext,
    playPrevious,
  };

  const progress = value.duration > 0 ? Math.min(value.currentTime / value.duration, 1) : 0;

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      {currentSong ? (
        <View
          style={[
            styles.playerShell,
            {
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.playerCard}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            <View style={styles.playerRow}>
              <View style={styles.playerArtwork}>
                {currentSong.image_url ? (
                  <Image
                    source={{ uri: buildImageUrl(currentSong.image_url) }}
                    style={styles.playerArtworkImage}
                  />
                ) : (
                  <View style={styles.playerFallback}>
                    <Text style={styles.playerFallbackText}>999</Text>
                  </View>
                )}
              </View>

              <View style={styles.playerInfo}>
                <Text numberOfLines={1} style={styles.playerTitle}>
                  {currentSong.name}
                </Text>
                <Text numberOfLines={1} style={styles.playerMeta}>
                  {currentSong.credited_artists || "Juice WRLD"}
                </Text>
                <Text style={styles.playerTime}>
                  {formatTime(value.currentTime)} / {formatTime(value.duration)}
                </Text>
              </View>

              <View style={styles.playerActions}>
                <Pressable
                  disabled={value.queueIndex <= 0}
                  onPress={playPrevious}
                  style={[
                    styles.playerButton,
                    value.queueIndex <= 0 && styles.playerButtonDisabled,
                  ]}
                >
                  <Text style={styles.playerButtonText}>Prev</Text>
                </Pressable>
                <Pressable onPress={togglePlayback} style={styles.playerButtonPrimary}>
                  <Text style={styles.playerButtonPrimaryText}>
                    {value.isBuffering ? "..." : value.isPlaying ? "Pause" : "Play"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={value.queueIndex + 1 >= value.queueLength}
                  onPress={playNext}
                  style={[
                    styles.playerButton,
                    value.queueIndex + 1 >= value.queueLength && styles.playerButtonDisabled,
                  ]}
                >
                  <Text style={styles.playerButtonText}>Next</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayerContext() {
  const context = useContext(AudioPlayerContext);

  if (!context) {
    throw new Error("useAudioPlayerContext must be used within AudioPlayerProvider");
  }

  return context;
}

const styles = StyleSheet.create({
  playerShell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  playerCard: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10,12,16,0.96)",
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#f36b21",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  playerArtwork: {
    width: 54,
    height: 54,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1b1f26",
  },
  playerArtworkImage: {
    width: "100%",
    height: "100%",
  },
  playerFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playerFallbackText: {
    color: "#f36b21",
    fontWeight: "800",
  },
  playerInfo: {
    flex: 1,
  },
  playerTitle: {
    color: "#f4eee5",
    fontWeight: "800",
    fontSize: 15,
  },
  playerMeta: {
    color: "#b2aaa0",
    marginTop: 3,
  },
  playerTime: {
    color: "#7e766b",
    marginTop: 4,
    fontSize: 12,
  },
  playerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerButton: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  playerButtonDisabled: {
    opacity: 0.4,
  },
  playerButtonPrimary: {
    borderRadius: 14,
    backgroundColor: "#f36b21",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  playerButtonText: {
    color: "#f4eee5",
    fontWeight: "700",
    fontSize: 12,
  },
  playerButtonPrimaryText: {
    color: "#1c130d",
    fontWeight: "800",
    fontSize: 12,
  },
});
