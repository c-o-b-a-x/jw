// src/Radio.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import "./App.css";

const API_BASE_URL = "https://juicewrldapi.com";
const SONGS_PER_PAGE = 12;

function buildImageUrl(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

function buildAudioUrl(path) {
  if (!path) return "";
  return `${API_BASE_URL}/juicewrld/files/download/?path=${encodeURIComponent(path)}`;
}

async function fetchJson(path, signal) {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
}

function formatCategoryLabel(value) {
  if (!value) return "All songs";
  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function Radio() {
  const [playlist, setPlaylist] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(true); // DEFAULT TRUE
  const [isRepeating, setIsRepeating] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef(null);

  const fetchSongsBatch = useCallback(async (page = 1) => {
    const controller = new AbortController();
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(SONGS_PER_PAGE),
      });
      const data = await fetchJson(
        `/juicewrld/songs/?${params.toString()}`,
        controller.signal,
      );
      return data.results || [];
    } catch (err) {
      if (err.name !== "AbortError") {
        setError("Failed to load radio station. Please refresh the page.");
      }
      return [];
    }
  }, []);

  useEffect(() => {
    const loadInitialPlaylist = async () => {
      setIsLoading(true);
      setError("");
      try {
        const firstBatch = await fetchSongsBatch(1);
        const secondBatch = await fetchSongsBatch(2);
        const thirdBatch = await fetchSongsBatch(3);
        const allSongs = [...firstBatch, ...secondBatch, ...thirdBatch];
        if (allSongs.length === 0) {
          setError("No songs available for the radio station.");
        } else {
          setPlaylist(shuffleArray(allSongs));
        }
      } catch (err) {
        setError("Could not start the radio. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialPlaylist();
  }, [fetchSongsBatch]);

  const playSong = useCallback(
    (newIndex) => {
      if (!audioRef.current || !playlist[newIndex]) return;
      const newSong = playlist[newIndex];
      const audioUrl = buildAudioUrl(newSong.path);
      audioRef.current.src = audioUrl;
      audioRef.current
        .play()
        .catch((e) => console.error("Auto-play prevented:", e));
      setCurrentSongIndex(newIndex);
      setIsPlaying(true);
    },
    [playlist],
  );

  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;
    let nextIndex = currentSongIndex + 1;
    if (nextIndex >= playlist.length) {
      fetchSongsBatch(Math.floor(playlist.length / SONGS_PER_PAGE) + 1).then(
        (newSongs) => {
          if (newSongs.length > 0) {
            setPlaylist((prev) => [...prev, ...newSongs]);
            nextIndex = currentSongIndex + 1;
            playSong(nextIndex);
          } else {
            playSong(0);
          }
        },
      );
    } else {
      playSong(nextIndex);
    }
  }, [currentSongIndex, playlist, fetchSongsBatch, playSong]);

  const handlePrevious = useCallback(() => {
    if (playlist.length === 0) return;
    let prevIndex = currentSongIndex - 1;
    if (prevIndex < 0) prevIndex = playlist.length - 1;
    playSong(prevIndex);
  }, [currentSongIndex, playlist, playSong]);

  const handleShuffle = useCallback(() => {
    if (playlist.length === 0) return;
    setIsShuffled((prev) => !prev);
    if (!isShuffled) {
      // If turning shuffle ON, shuffle the remaining songs (from current +1 to end)
      const currentSong = playlist[currentSongIndex];
      const remaining = playlist.slice(currentSongIndex + 1);
      const shuffledRemaining = shuffleArray(remaining);
      const newPlaylist = [currentSong, ...shuffledRemaining];
      setPlaylist(newPlaylist);
      setCurrentSongIndex(0);
    } else {
      // Turning shuffle OFF: we could optionally restore original order, but not needed.
      // Keep current order but mark shuffle false.
    }
  }, [isShuffled, playlist, currentSongIndex]);

  const handleRepeat = useCallback(() => {
    setIsRepeating((prev) => !prev);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => {
      if (isRepeating) {
        audio.currentTime = 0;
        audio.play();
      } else {
        handleNext();
      }
    };
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [isRepeating, handleNext]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch((e) => console.error("Play failed:", e));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSongIndex]);

  if (isLoading) {
    return (
      <div className="app-shell">
        <Link
          to="/"
          className="chip"
          style={{ marginBottom: 24, display: "inline-block" }}
        >
          ← Back to catalog
        </Link>
        <div
          className="detail-panel"
          style={{
            maxWidth: 800,
            margin: "0 auto",
            textAlign: "center",
            padding: "48px",
          }}
        >
          <div
            className="vinyl-ring"
            style={{ margin: "0 auto 32px", width: 200 }}
          />
          <h2>Tuning into the station...</h2>
          <p>Loading the playlist, just a moment.</p>
        </div>
      </div>
    );
  }

  if (error || !playlist.length) {
    return (
      <div className="app-shell">
        <Link
          to="/"
          className="chip"
          style={{ marginBottom: 24, display: "inline-block" }}
        >
          ← Back to catalog
        </Link>
        <div className="status-banner" role="alert">
          {error || "The radio station is currently offline."}
        </div>
      </div>
    );
  }

  const currentSong = playlist[currentSongIndex];
  const imageUrl = buildImageUrl(currentSong?.image_url);

  return (
    <div className="app-shell">
      <Link
        to="/"
        className="chip"
        style={{ marginBottom: 24, display: "inline-block" }}
      >
        ← Back to catalog
      </Link>

      <div className="detail-panel" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="detail-artwork">
          {imageUrl ? (
            <img src={imageUrl} alt={currentSong.name} />
          ) : (
            <div className="artwork-fallback">
              <span>999</span>
            </div>
          )}
        </div>

        <div className="detail-copy" style={{ textAlign: "center" }}>
          <p className="eyebrow">Now Playing</p>
          <h2>{currentSong?.name || "Unknown Track"}</h2>
          <p>{currentSong?.credited_artists || "Juice WRLD"}</p>
          <p className="detail-description" style={{ marginTop: 8 }}>
            {currentSong?.era?.name || "Unknown era"} •{" "}
            {formatCategoryLabel(currentSong?.category)}
          </p>
        </div>

        <div className="player-panel" style={{ marginTop: 24 }}>
          <audio ref={audioRef} preload="auto" />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              marginBottom: 16,
            }}
          >
            <button
              onClick={handlePrevious}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
            >
              ⏮️
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: "none",
                border: "none",
                color: "var(--sc-orange)",
                fontSize: "2rem",
                cursor: "pointer",
              }}
            >
              {isPlaying ? "⏸️" : "▶️"}
            </button>
            <button
              onClick={handleNext}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
            >
              ⏭️
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
            <button
              onClick={handleShuffle}
              className={`chip ${isShuffled ? "is-active" : ""}`}
              style={{
                background: isShuffled
                  ? "var(--sc-orange)"
                  : "var(--control-bg)",
              }}
            >
              🔀 Shuffle
            </button>
            <button
              onClick={handleRepeat}
              className={`chip ${isRepeating ? "is-active" : ""}`}
              style={{
                background: isRepeating
                  ? "var(--sc-orange)"
                  : "var(--control-bg)",
              }}
            >
              🔁 Repeat
            </button>
          </div>
        </div>

        <div className="meta-block" style={{ marginTop: 24 }}>
          <p className="block-label">Coming up next</p>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {playlist
              .slice(currentSongIndex + 1, currentSongIndex + 6)
              .map((song, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid var(--panel-border)",
                  }}
                >
                  <strong>{song.name}</strong> •{" "}
                  {song.credited_artists || "Juice WRLD"}
                </div>
              ))}
            {playlist.length - currentSongIndex - 1 < 5 && (
              <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
                More tracks loading soon...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
