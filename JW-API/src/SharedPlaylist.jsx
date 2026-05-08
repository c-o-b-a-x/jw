import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import "./App.css";
import { parseShareToken } from "./playlistStore";

const API_BASE_URL = "https://juicewrldapi.com";

async function fetchSong(songId, signal) {
  const response = await fetch(`${API_BASE_URL}/juicewrld/songs/${songId}/`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
}

export default function SharedPlaylist() {
  const { shareId } = useParams();
  const [searchParams] = useSearchParams();
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const resolvedShareToken = shareId || searchParams.get("playlist") || "";
    const sharedPayload = parseShareToken(resolvedShareToken);

    async function loadSharedPlaylist() {
      if (!sharedPayload) {
        setError("This shared playlist link is invalid.");
        setIsLoading(false);
        return;
      }

      try {
        const songs = await Promise.all(
          sharedPayload.songIds.map((songId) => fetchSong(songId, controller.signal)),
        );

        setPlaylist({
          name: sharedPayload.name,
          description: sharedPayload.description,
          songs,
          song_count: songs.length,
        });
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError("This shared playlist could not be loaded from the API.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadSharedPlaylist();

    return () => controller.abort();
  }, [searchParams, shareId]);

  if (isLoading) {
    return (
      <div className="app-shell">
        <div
          className="detail-panel"
          style={{ maxWidth: 800, margin: "0 auto" }}
        >
          <div className="skeleton-card" style={{ height: 200 }} />
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="app-shell">
        <div className="status-banner" role="alert">
          {error || "Playlist not found."}
        </div>
        <Link
          to="/"
          className="chip"
          style={{ marginTop: 20, display: "inline-block" }}
        >
          Back to home
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
        Back to home
      </Link>

      <div className="detail-panel" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="detail-copy">
          <p className="eyebrow">Shared Playlist</p>
          <h2>{playlist.name}</h2>
          <p className="detail-description">
            {playlist.description || "No description."}
          </p>
        </div>

        <div className="detail-meta">
          <div>
            <span>Songs</span>
            <strong>{playlist.song_count || 0}</strong>
          </div>
          <div>
            <span>Source</span>
            <strong>URL share token</strong>
          </div>
        </div>

        <div className="meta-block">
          <p className="block-label">Songs</p>
          <ul className="detail-list">
            {(playlist.songs || []).map((song) => (
              <li key={song.id}>
                <Link
                  to={`/song/${song.id}`}
                  style={{
                    color: "var(--text-primary)",
                    textDecoration: "none",
                  }}
                >
                  {song.name} - {song.credited_artists || "Juice WRLD"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
