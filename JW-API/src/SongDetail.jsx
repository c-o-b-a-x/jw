import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAudioPlayer } from "./audio-player";
import "./App.css";

const API_BASE_URL = "https://juicewrldapi.com";

function buildImageUrl(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

async function fetchJson(path, signal) {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
}

export default function SongDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { currentSong, isPlaying, playSong, togglePlayPause } = useAudioPlayer();
  const [song, setSong] = useState(location.state?.song || null);
  const [isLoading, setIsLoading] = useState(!song);
  const [error, setError] = useState("");
  const [lyricsExpanded, setLyricsExpanded] = useState(false);

  useEffect(() => {
    if (song) return;

    const controller = new AbortController();

    async function fetchSong() {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchJson(`/juicewrld/songs/${id}/`, controller.signal);
        setSong(data);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError("Could not load song details. Please try again later.");
          setSong(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchSong();
    return () => controller.abort();
  }, [id, song]);

  function handlePlaySong() {
    if (!song) return;

    const isCurrentSong = currentSong?.id === song.id;
    if (isCurrentSong) {
      togglePlayPause();
      return;
    }

    playSong(song);
  }

  const songImage = buildImageUrl(song?.image_url);
  const isCurrentSong = currentSong?.id === song?.id;

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
        <div className="detail-panel detail-panel--page">
          <div className="skeleton-card" style={{ height: 300 }} />
          <div className="skeleton-card" style={{ height: 100, marginTop: 20 }} />
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="app-shell">
        <div className="status-banner" role="alert">
          {error || "Song not found."}
        </div>
        <Link
          to="/"
          className="chip"
          style={{ display: "inline-block", marginTop: 20 }}
        >
          Back to catalog
        </Link>
      </div>
    );
  }

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
          {songImage ? (
            <img src={songImage} alt={song.name} />
          ) : (
            <div className="artwork-fallback">
              <span>999</span>
            </div>
          )}
        </div>

        <div className="detail-copy">
          <p className="eyebrow">Song details</p>
          <h2>{song.name}</h2>
          <p className="detail-description">
            {song.additional_information || "No additional information available."}
          </p>
        </div>

        <div className="detail-meta">
          <div>
            <span>Artists</span>
            <strong>{song.credited_artists || "Juice WRLD"}</strong>
          </div>
          <div>
            <span>Era</span>
            <strong>{song.era?.name || "Unknown"}</strong>
          </div>
          <div>
            <span>Producers</span>
            <strong>{song.producers || "Unknown"}</strong>
          </div>
          <div>
            <span>Length</span>
            <strong>{song.length || "Unknown"}</strong>
          </div>
        </div>

        <div className="player-panel">
          <div className="mobile-player-actions">
            <button type="button" className="chip is-active" onClick={handlePlaySong}>
              {isCurrentSong && isPlaying ? "Pause in player" : "Play in player"}
            </button>
          </div>
          <p className="player-note">
            Use the persistent player to keep audio going while you browse the site or
            lock your phone.
          </p>
        </div>

        {song.track_titles?.length > 0 && (
          <div className="meta-block">
            <p className="block-label">Track titles</p>
            <div className="pill-wrap">
              {song.track_titles.map((title) => (
                <span key={title} className="meta-pill">
                  {title}
                </span>
              ))}
            </div>
          </div>
        )}

        {song.lyrics && (
          <div className="meta-block">
            <div className="block-header">
              <p className="block-label">Lyrics preview</p>
              <button type="button" onClick={() => setLyricsExpanded((open) => !open)}>
                {lyricsExpanded ? "Collapse" : "Expand"}
              </button>
            </div>
            <pre className={`lyrics-block ${lyricsExpanded ? "is-expanded" : ""}`}>
              {song.lyrics}
            </pre>
          </div>
        )}

        <div className="meta-block">
          <p className="block-label">Session notes</p>
          <ul className="detail-list">
            <li>{song.record_dates || "Record date not listed"}</li>
            <li>{song.recording_locations || "Recording location not listed"}</li>
            <li>{song.date_leaked || "Leak status not listed"}</li>
            <li>{song.preview_date || "Preview date not listed"}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
