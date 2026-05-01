import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
import { buildShareToken, createPlaylist } from "./playlistStore";

const API_BASE_URL = "https://juicewrldapi.com";

async function fetchJson(path, signal) {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
}

export default function CreatePlaylist() {
  const [playlistName, setPlaylistName] = useState("");
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSongs, setAvailableSongs] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [error, setError] = useState("");

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
          setError("Failed to search songs. Please try again.");
        }
      }
    }

    const timeoutId = window.setTimeout(fetchSongs, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchTerm]);

  function addSong(song) {
    if (selectedSongs.some((selectedSong) => selectedSong.id === song.id)) {
      return;
    }

    setSelectedSongs((currentSongs) => [...currentSongs, song]);
    setError("");
  }

  function removeSong(songId) {
    setSelectedSongs((currentSongs) =>
      currentSongs.filter((song) => song.id !== songId),
    );
  }

  function copyShareLink() {
    if (!shareLink) return;

    navigator.clipboard
      .writeText(shareLink)
      .then(() => window.alert("Copied!"))
      .catch(() => window.alert("Copy failed. You can still copy the link manually."));
  }

  function handleCreate() {
    if (selectedSongs.length === 0) {
      setError("Please add at least one song.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const playlist = createPlaylist({
        name: playlistName || "Untitled Playlist",
        songs: selectedSongs,
      });

      const shareToken = buildShareToken(playlist);
      setShareLink(`${window.location.origin}/shared/${shareToken}`);
    } catch {
      setError("Failed to save the playlist. Please try again.");
    } finally {
      setIsSaving(false);
    }
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
          <p className="eyebrow">Create a Shared Playlist</p>
          <h2>Build and share your own collection</h2>
          <p className="detail-description">
            Search for songs, add them to a playlist, save it locally, and generate a
            shareable link based on the song IDs in the public API.
          </p>
        </div>

        <div className="meta-block">
          <p className="block-label">Playlist name</p>
          <input
            type="text"
            value={playlistName}
            onChange={(event) => setPlaylistName(event.target.value)}
            placeholder="My Juice WRLD favorites"
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "var(--control-bg)",
              border: "1px solid var(--control-border)",
              borderRadius: 12,
              color: "var(--heading)",
            }}
          />
        </div>

        <div className="meta-block">
          <p className="block-label">Selected songs ({selectedSongs.length})</p>
          {selectedSongs.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No songs added yet. Search below.</p>
          ) : (
            <ul className="detail-list">
              {selectedSongs.map((song) => (
                <li
                  key={song.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    <strong>{song.name}</strong> - {song.credited_artists || "Juice WRLD"}
                  </span>
                  <button type="button" onClick={() => removeSong(song.id)} className="chip">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="meta-block">
          <p className="block-label">Add songs</p>
          <input
            type="search"
            placeholder="Search for songs..."
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
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {availableSongs.map((song) => (
              <div
                key={song.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--panel-border)",
                }}
              >
                <span>
                  <strong>{song.name}</strong> - {song.credited_artists || "Juice WRLD"}
                </span>
                <button type="button" onClick={() => addSong(song)} className="chip">
                  Add
                </button>
              </div>
            ))}
            {searchTerm && availableSongs.length === 0 && (
              <p style={{ color: "var(--muted)" }}>No songs found.</p>
            )}
          </div>
        </div>

        {error && (
          <div className="status-banner" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          className="chip"
          disabled={isSaving}
          style={{ marginTop: 24, width: "100%" }}
        >
          {isSaving ? "Saving..." : "Generate shareable link"}
        </button>

        {shareLink && (
          <div className="meta-block" style={{ marginTop: 24 }}>
            <p className="block-label">Your shareable link</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              <button type="button" onClick={copyShareLink} className="chip">
                Copy
              </button>
            </div>
            <p style={{ marginTop: 8, color: "var(--muted)" }}>
              Anyone with this link can open the playlist and load the songs from the
              Juice WRLD API.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
