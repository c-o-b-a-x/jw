import { useCallback, useEffect, useRef, useState } from "react";
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

function shuffleArray(array) {
  const shuffled = [...array];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export default function Radio() {
  const [playlist, setPlaylist] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(true);
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
    } catch (fetchError) {
      if (fetchError.name !== "AbortError") {
        setError("Failed to load radio station. Please refresh the page.");
      }
      return [];
    }
  }, []);

  useEffect(() => {
    async function loadInitialPlaylist() {
      setIsLoading(true);
      setError("");

      try {
        const [firstBatch, secondBatch, thirdBatch] = await Promise.all([
          fetchSongsBatch(1),
          fetchSongsBatch(2),
          fetchSongsBatch(3),
        ]);
        const allSongs = [...firstBatch, ...secondBatch, ...thirdBatch];

        if (allSongs.length === 0) {
          setError("No songs available for the radio station.");
        } else {
          setPlaylist(shuffleArray(allSongs));
        }
      } catch {
        setError("Could not start the radio. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialPlaylist();
  }, [fetchSongsBatch]);

  const playSong = useCallback(
    (newIndex) => {
      if (!audioRef.current || !playlist[newIndex]) return;

      const newSong = playlist[newIndex];
      audioRef.current.src = buildAudioUrl(newSong.path);
      audioRef.current.play().catch((playError) => {
        console.error("Auto-play prevented:", playError);
      });
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
            setPlaylist((currentPlaylist) => [...currentPlaylist, ...newSongs]);
            nextIndex = currentSongIndex + 1;
            playSong(nextIndex);
          } else {
            playSong(0);
          }
        },
      );
      return;
    }

    playSong(nextIndex);
  }, [currentSongIndex, fetchSongsBatch, playSong, playlist.length]);

  const handlePrevious = useCallback(() => {
    if (playlist.length === 0) return;

    let previousIndex = currentSongIndex - 1;
    if (previousIndex < 0) previousIndex = playlist.length - 1;
    playSong(previousIndex);
  }, [currentSongIndex, playSong, playlist.length]);

  const handleShuffle = useCallback(() => {
    if (playlist.length === 0) return;

    setIsShuffled((currentValue) => !currentValue);
    if (!isShuffled) {
      const currentSong = playlist[currentSongIndex];
      const remainingSongs = playlist.slice(currentSongIndex + 1);
      setPlaylist([currentSong, ...shuffleArray(remainingSongs)]);
      setCurrentSongIndex(0);
    }
  }, [currentSongIndex, isShuffled, playlist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

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
  }, [handleNext, isRepeating]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((playError) => console.error("Play failed:", playError));
    } else {
      audio.pause();
    }
  }, [currentSongIndex, isPlaying]);

  if (isLoading) {
    return (
      <div className="app-shell">
        <Link
          to="/"
          className="chip"
          style={{ marginBottom: 24, display: "inline-block" }}
        >
          Back to catalog
        </Link>
        <div
          className="detail-panel"
          style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", padding: "48px" }}
        >
          <div className="vinyl-ring" style={{ margin: "0 auto 32px", width: 200 }} />
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
          Back to catalog
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
        Back to catalog
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
            {currentSong?.era?.name || "Unknown era"} -{" "}
            {formatCategoryLabel(currentSong?.category)}
          </p>
        </div>

        <div className="player-panel" style={{ marginTop: 24 }}>
          <audio ref={audioRef} preload="auto" />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <button type="button" onClick={handlePrevious} className="chip">
              Prev
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((playing) => !playing)}
              className="chip is-active"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={handleNext} className="chip">
              Next
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleShuffle}
              className={`chip ${isShuffled ? "is-active" : ""}`}
            >
              Shuffle
            </button>
            <button
              type="button"
              onClick={() => setIsRepeating((repeating) => !repeating)}
              className={`chip ${isRepeating ? "is-active" : ""}`}
            >
              Repeat
            </button>
          </div>
        </div>

        <div className="meta-block" style={{ marginTop: 24 }}>
          <p className="block-label">Coming up next</p>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {playlist
              .slice(currentSongIndex + 1, currentSongIndex + 6)
              .map((song) => (
                <div
                  key={song.id}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid var(--panel-border)",
                  }}
                >
                  <strong>{song.name}</strong> - {song.credited_artists || "Juice WRLD"}
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
