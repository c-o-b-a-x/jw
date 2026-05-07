/* eslint-disable react-refresh/only-export-components */
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";

const API_BASE_URL = "https://juicewrldapi.com";
const RECENT_SONGS_STORAGE_KEY = "jw_recent_songs";

function buildAudioUrl(path) {
  if (!path) return "";
  return `${API_BASE_URL}/juicewrld/files/download/?path=${encodeURIComponent(path)}`;
}

function buildImageUrl(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

const AudioPlayerContext = createContext(null);

export function AudioPlayerProvider({ children }) {
  const audioRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [recentSongs, setRecentSongs] = useState(() => {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(RECENT_SONGS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;

  const rememberSong = useCallback((song) => {
    if (!song) return;

    setRecentSongs((currentSongs) => {
      const nextSongs = [
        song,
        ...currentSongs.filter((currentEntry) => currentEntry.id !== song.id),
      ].slice(0, 6);

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            RECENT_SONGS_STORAGE_KEY,
            JSON.stringify(nextSongs),
          );
        } catch {
          // Ignore storage failures.
        }
      }

      return nextSongs;
    });
  }, []);

  const syncMediaSession = useCallback((song) => {
    if (!song || typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.name || "Juice WRLD",
        artist: song.credited_artists || "Juice WRLD",
        album: song.era?.name || "Juice WRLD Archive",
        artwork: song.image_url
          ? [
              {
                src: buildImageUrl(song.image_url),
                sizes: "512x512",
                type: "image/png",
              },
            ]
          : [],
      });
    } catch {
      // Ignore unsupported metadata payload issues.
    }
  }, []);

  const playNext = useCallback(() => {
    if (!queue.length) return;
    setCurrentIndex((index) => {
      const nextIndex = index + 1;
      return nextIndex >= queue.length ? 0 : nextIndex;
    });
  }, [queue.length]);

  const playPrevious = useCallback(() => {
    if (!queue.length) return;
    setCurrentIndex((index) => {
      const previousIndex = index - 1;
      return previousIndex < 0 ? queue.length - 1 : previousIndex;
    });
  }, [queue.length]);

  const setMediaSessionHandlers = useCallback(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current?.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      playPrevious();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      playNext();
    });
  }, [playNext, playPrevious]);

  const loadSong = useCallback((song, shouldAutoPlay = true) => {
    const audio = audioRef.current;
    if (!audio || !song?.path) return;

    const nextSource = buildAudioUrl(song.path);
    if (audio.src !== nextSource) {
      audio.src = nextSource;
      audio.load();
    }

    syncMediaSession(song);
    rememberSong(song);
    setError("");
    setCurrentTime(0);

    if (shouldAutoPlay) {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsReady(true);
        })
        .catch(() => {
          setIsPlaying(false);
          setError("Tap play again to start playback on this device.");
        });
    }
  }, [rememberSong, syncMediaSession]);

  const playQueue = useCallback((nextQueue, startIndex = 0, shouldAutoPlay = true) => {
    if (!nextQueue?.length) return;

    setQueue(nextQueue);
    setCurrentIndex(startIndex);
    setIsReady(true);
    if (shouldAutoPlay) {
      const nextSong = nextQueue[startIndex];
      if (nextSong) {
        loadSong(nextSong, true);
      }
    }
  }, [loadSong]);

  const playSong = useCallback((song) => {
    if (!song) return;
    playQueue([song], 0, true);
  }, [playQueue]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (audio.paused) {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setError("");
        })
        .catch(() => {
          setError("Playback needs another tap on this phone.");
        });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentSong]);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setIsReady(false);
    setError("");
  }, []);

  useEffect(() => {
    setMediaSessionHandlers();
  }, [setMediaSessionHandlers]);

  useEffect(() => {
    if (!currentSong) return;
    loadSong(currentSong, true);
  }, [currentSong, loadSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => playNext();
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const handleDurationChange = () => {
      setDuration(audio.duration || 0);
    };
    const handleError = () => {
      setIsPlaying(false);
      setError("This track could not be played on mobile right now.");
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("error", handleError);
    };
  }, [playNext]);

  const value = useMemo(
    () => ({
      currentSong,
      queue,
      currentIndex,
      isPlaying,
      isReady,
      error,
      currentTime,
      duration,
      recentSongs,
      playSong,
      playQueue,
      playNext,
      playPrevious,
      togglePlayPause,
      stopPlayback,
    }),
    [
      currentSong,
      queue,
      currentIndex,
      isPlaying,
      isReady,
      error,
      currentTime,
      duration,
      recentSongs,
      playSong,
      playQueue,
      playNext,
      playPrevious,
      togglePlayPause,
      stopPlayback,
    ],
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" playsInline />
      <PersistentPlayer />
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used inside AudioPlayerProvider");
  }
  return context;
}

function PersistentPlayer() {
  const {
    currentSong,
    isPlaying,
    error,
    currentTime,
    duration,
    playNext,
    playPrevious,
    stopPlayback,
    togglePlayPause,
  } = useAudioPlayer();

  if (!currentSong) return null;

  return (
    <div className="persistent-player" role="region" aria-label="Now playing">
      <div className="persistent-player__meta">
        {currentSong.image_url ? (
          <img
            src={buildImageUrl(currentSong.image_url)}
            alt={currentSong.name}
            className="persistent-player__art"
          />
        ) : (
          <div className="persistent-player__fallback">999</div>
        )}
        <div className="persistent-player__copy">
          <strong>
            <Link to={`/song/${currentSong.id}`} state={{ song: currentSong }}>
              {currentSong.name}
            </Link>
          </strong>
          <span>{currentSong.credited_artists || "Juice WRLD"}</span>
          {duration > 0 ? (
            <small>
              {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
            </small>
          ) : null}
          {error ? <small>{error}</small> : null}
        </div>
      </div>

      <div className="persistent-player__controls">
        <button type="button" className="chip" onClick={playPrevious}>
          Prev
        </button>
        <button type="button" className="chip is-active" onClick={togglePlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button type="button" className="chip" onClick={playNext}>
          Next
        </button>
        <button type="button" className="chip" onClick={stopPlayback}>
          Close
        </button>
      </div>
    </div>
  );
}

function formatPlaybackTime(value) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
