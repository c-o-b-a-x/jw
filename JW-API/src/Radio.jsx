import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAudioPlayer } from "./audio-player";
import {
  SONGS_PER_PAGE,
  buildImageUrl,
  fetchSongs,
  formatCategoryLabel,
} from "./api";
import "./App.css";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isShuffled, setIsShuffled] = useState(true);
  const [error, setError] = useState("");
  const {
    currentSong,
    queue,
    isPlaying,
    playNext,
    playPrevious,
    playQueue,
    togglePlayPause,
  } = useAudioPlayer();

  const fetchSongsBatch = useCallback(async (page = 1) => {
    const controller = new AbortController();

    try {
      const data = await fetchSongs(
        {
          page,
          pageSize: SONGS_PER_PAGE,
        },
        { signal: controller.signal },
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
          const shuffledSongs = shuffleArray(allSongs);
          setPlaylist(shuffledSongs);
          if (!queue.length) {
            playQueue(shuffledSongs, 0);
          }
        }
      } catch {
        setError("Could not start the radio. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialPlaylist();
  }, [fetchSongsBatch, playQueue, queue.length]);

  const radioIndex = useMemo(() => {
    if (!playlist.length || !currentSong) return 0;
    const songIndex = playlist.findIndex((song) => song.id === currentSong.id);
    return songIndex >= 0 ? songIndex : 0;
  }, [currentSong, playlist]);

  function handleStartRadio() {
    if (!playlist.length) return;
    playQueue(playlist, radioIndex >= 0 ? radioIndex : 0);
  }

  function handleShuffle() {
    if (!playlist.length) return;

    if (!isShuffled) {
      const currentRadioSong = playlist[radioIndex] ?? playlist[0];
      const remainingSongs = playlist.filter((song) => song.id !== currentRadioSong?.id);
      const shuffledSongs = [currentRadioSong, ...shuffleArray(remainingSongs)];
      setPlaylist(shuffledSongs);
      playQueue(shuffledSongs, 0);
    }

    setIsShuffled((currentValue) => !currentValue);
  }

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
        <div className="detail-panel detail-panel--page detail-panel--centered">
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

  const queueContainsCurrentSong = currentSong
    ? playlist.some((song) => song.id === currentSong.id)
    : false;
  const activeSong = queueContainsCurrentSong ? currentSong : playlist[radioIndex];
  const imageUrl = buildImageUrl(activeSong?.image_url);

  return (
    <div className="app-shell">
      <Link
        to="/"
        className="chip"
        style={{ marginBottom: 24, display: "inline-block" }}
      >
        Back to catalog
      </Link>

      <div className="detail-panel detail-panel--page">
        <div className="detail-artwork">
          {imageUrl ? (
            <img src={imageUrl} alt={activeSong.name} />
          ) : (
            <div className="artwork-fallback">
              <span>999</span>
            </div>
          )}
        </div>

        <div className="detail-copy radio-copy">
          <p className="eyebrow">Now Playing</p>
          <h2>{activeSong?.name || "Unknown Track"}</h2>
          <p>{activeSong?.credited_artists || "Juice WRLD"}</p>
          <p className="detail-description">
            {activeSong?.era?.name || "Unknown era"} -{" "}
            {formatCategoryLabel(activeSong?.category)}
          </p>
        </div>

        <div className="player-panel">
          <div className="mobile-player-actions">
            <button type="button" className="chip" onClick={playPrevious}>
              Prev
            </button>
            <button type="button" className="chip is-active" onClick={handleStartRadio}>
              Start radio
            </button>
            <button type="button" className="chip is-active" onClick={togglePlayPause}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button type="button" className="chip" onClick={playNext}>
              Next
            </button>
          </div>
          <div className="mobile-player-actions mobile-player-actions--secondary">
            <button
              type="button"
              onClick={handleShuffle}
              className={`chip ${isShuffled ? "is-active" : ""}`}
            >
              Shuffle
            </button>
          </div>
          <p className="player-note">
            The shared player stays mounted so playback can continue while you browse
            other pages or background your phone browser.
          </p>
        </div>

        <div className="meta-block">
          <p className="block-label">Coming up next</p>
          <div className="radio-queue">
            {playlist.slice(radioIndex + 1, radioIndex + 6).map((song) => (
              <div key={song.id} className="radio-queue__item">
                <strong>{song.name}</strong> - {song.credited_artists || "Juice WRLD"}
              </div>
            ))}
            {playlist.length - radioIndex - 1 < 5 && (
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
