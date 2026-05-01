import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./App.css";
import {
  addSongToPlaylist,
  buildShareToken,
  getPlaylistById,
  removeSongFromPlaylist,
} from "./playlistStore";

const API_BASE_URL = "https://juicewrldapi.com";

async function fetchJson(path, signal) {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
}

export default function PlaylistDetail() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(() => getPlaylistById(id));
  const [error, setError] = useState(() =>
    getPlaylistById(id) ? "" : "Playlist not found.",
  );
  const [shareLink, setShareLink] = useState("");
  const [availableSongs, setAvailableSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSongs() {
      if (!searchTerm.trim()) {
        setAvailableSongs([]);
        return;
      }

      try {
        const params = new URLSearchParams({
          search: searchTerm.trim(),
          page_size: "20",
        });

        const data = await fetchJson(
          `/juicewrld/songs/?${params.toString()}`,
          controller.signal,
        );
        setAvailableSongs(data.results || []);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError("Failed to search songs.");
        }
      }
    }

    const timeoutId = window.setTimeout(fetchSongs, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchTerm]);

  function handleAddSong(song) {
    const updatedPlaylist = addSongToPlaylist(id, song);

    if (!updatedPlaylist) {
      setError("Failed to add song.");
      return;
    }

    setPlaylist(updatedPlaylist);
    setError("");
  }

  function handleRemoveSong(songId) {
    const updatedPlaylist = removeSongFromPlaylist(id, songId);

    if (!updatedPlaylist) {
      setError("Failed to remove song.");
      return;
    }

    setPlaylist(updatedPlaylist);
    setError("");
  }

  function handleShare() {
    if (!playlist) return;

    const shareToken = buildShareToken(playlist);
    setShareLink(`${window.location.origin}/shared/${shareToken}`);
  }

  function copyToClipboard() {
    if (!shareLink) return;

    navigator.clipboard
      .writeText(shareLink)
      .then(() => window.alert("Share link copied to clipboard!"))
      .catch(() => window.alert("Copy failed. You can still copy the link manually."));
  }

  if (error && !playlist) {
    return (
      <div className="app-shell">
        <div className="status-banner">{error}</div>
        <Link to="/playlists" className="chip" style={{ marginTop: 20 }}>
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Link
        to="/playlists"
        className="chip"
        style={{ marginBottom: 24, display: "inline-block" }}
      >
        Back to playlists
      </Link>

      <div className="detail-panel" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="detail-copy">
          <p className="eyebrow">Playlist</p>
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
            <span>Created</span>
            <strong>{new Date(playlist.created_at).toLocaleDateString()}</strong>
          </div>
        </div>

        <div className="meta-block">
          <button type="button" onClick={handleShare} className="chip">
            Share this playlist
          </button>
          {shareLink && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                value={shareLink}
                readOnly
                style={{
                  flex: "1 1 280px",
                  background: "var(--control-bg)",
                  border: "1px solid var(--control-border)",
                  padding: "12px 14px",
                  borderRadius: 12,
                  color: "var(--heading)",
                }}
              />
              <button type="button" onClick={copyToClipboard} className="chip">
                Copy
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="status-banner" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <div className="meta-block">
          <p className="block-label">Add songs</p>
          <input
            type="search"
            placeholder="Search songs..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              marginBottom: 12,
              background: "var(--control-bg)",
              border: "1px solid var(--control-border)",
              borderRadius: 12,
              color: "var(--heading)",
            }}
          />
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {availableSongs.map((song) => {
              const isAlreadyAdded = playlist.songs?.some(
                (playlistSong) => playlistSong.id === song.id,
              );

              return (
                <div
                  key={song.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--panel-border)",
                  }}
                >
                  <span>
                    <strong>{song.name}</strong> - {song.credited_artists || "Juice WRLD"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddSong(song)}
                    className="chip"
                    disabled={isAlreadyAdded}
                  >
                    {isAlreadyAdded ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="meta-block">
          <p className="block-label">Songs in this playlist</p>
          {playlist.songs?.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>
              No songs yet. Use the search above to add some.
            </p>
          ) : (
            <ul className="detail-list">
              {playlist.songs?.map((song) => (
                <li
                  key={song.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    to={`/song/${song.id}`}
                    style={{
                      color: "var(--heading)",
                      textDecoration: "none",
                    }}
                  >
                    {song.name} - {song.credited_artists || "Juice WRLD"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemoveSong(song.id)}
                    className="chip"
                    style={{ background: "rgba(224, 90, 26, 0.2)" }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
