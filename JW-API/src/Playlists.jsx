import { useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
import { createPlaylist, deletePlaylist, listPlaylists } from "./playlistStore";

export default function Playlists() {
  const [playlists, setPlaylists] = useState(() => listPlaylists());
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [error, setError] = useState("");

  function handleCreatePlaylist(event) {
    event.preventDefault();

    if (!newPlaylistName.trim()) {
      setError("Enter a playlist name before creating it.");
      return;
    }

    const playlist = createPlaylist({
      name: newPlaylistName,
    });

    setPlaylists((currentPlaylists) => [playlist, ...currentPlaylists]);
    setNewPlaylistName("");
    setError("");
  }

  function handleDeletePlaylist(id) {
    if (!window.confirm("Delete this playlist?")) return;

    deletePlaylist(id);
    setPlaylists((currentPlaylists) =>
      currentPlaylists.filter((playlist) => playlist.id !== id),
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
          <p className="eyebrow">Your Playlists</p>
          <h2>Personal collections</h2>
          <p className="detail-description">
            Playlists are saved in your browser so you can build your own Juice WRLD
            collections without depending on unsupported API endpoints.
          </p>
        </div>

        <div className="meta-block">
          <p className="block-label">Create a new playlist</p>
          <form
            onSubmit={handleCreatePlaylist}
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <input
              type="text"
              value={newPlaylistName}
              onChange={(event) => setNewPlaylistName(event.target.value)}
              placeholder="Playlist name"
              style={{
                flex: "1 1 280px",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--control-border)",
                background: "var(--bg-soft)",
                color: "var(--text-primary)",
              }}
            />
            <button type="submit" className="chip">
              Create
            </button>
          </form>
        </div>

        {error && (
          <div className="status-banner" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <div className="meta-block" style={{ marginTop: 24 }}>
          <p className="block-label">All playlists</p>
          {playlists.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>
              No playlists yet. Create your first one above or use the shared playlist
              builder.
            </p>
          ) : (
            <ul className="detail-list">
              {playlists.map((playlist) => (
                <li
                  key={playlist.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    to={`/playlist/${playlist.id}`}
                    style={{
                      color: "var(--text-primary)",
                      textDecoration: "none",
                    }}
                  >
                    <strong>{playlist.name}</strong> ({playlist.song_count || 0} songs)
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeletePlaylist(playlist.id)}
                    className="chip"
                    style={{ background: "rgba(255, 79, 163, 0.16)" }}
                  >
                    Delete
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
