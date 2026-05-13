import { useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
import {
  createPlaylist,
  deletePlaylist,
  listPlaylists,
  updatePlaylist,
} from "./playlistStore";
import { useToast } from "./toast";

export default function Playlists() {
  const [playlists, setPlaylists] = useState(() => listPlaylists());
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [error, setError] = useState("");
  const [editingPlaylistId, setEditingPlaylistId] = useState("");
  const [editingName, setEditingName] = useState("");
  const { pushToast } = useToast();

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
    pushToast({
      title: "Playlist created",
      message: `${playlist.name} is ready for songs.`,
      tone: "success",
    });
  }

  function handleDeletePlaylist(id) {
    if (!window.confirm("Delete this playlist?")) return;

    const deletedPlaylist = playlists.find((playlist) => playlist.id === id);
    deletePlaylist(id);
    setPlaylists((currentPlaylists) =>
      currentPlaylists.filter((playlist) => playlist.id !== id),
    );
    pushToast({
      title: "Playlist deleted",
      message: deletedPlaylist?.name || "The playlist was removed.",
      tone: "info",
    });
  }

  function startEditing(playlist) {
    setEditingPlaylistId(playlist.id);
    setEditingName(playlist.name);
  }

  function savePlaylistName(playlist) {
    const nextName = editingName.trim();
    if (!nextName) {
      setError("Playlist names cannot be empty.");
      return;
    }

    const updatedPlaylist = updatePlaylist({
      ...playlist,
      name: nextName,
    });

    setPlaylists((currentPlaylists) =>
      currentPlaylists.map((currentPlaylist) =>
        currentPlaylist.id === playlist.id ? updatedPlaylist : currentPlaylist,
      ),
    );
    setEditingPlaylistId("");
    setEditingName("");
    setError("");
    pushToast({
      title: "Playlist renamed",
      message: `${updatedPlaylist.name} has been updated.`,
      tone: "success",
    });
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
                  {editingPlaylistId === playlist.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        className="playlist-inline-input"
                      />
                      <div className="playlist-inline-actions">
                        <button
                          type="button"
                          onClick={() => savePlaylistName(playlist)}
                          className="chip is-active"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlaylistId("");
                            setEditingName("");
                          }}
                          className="chip"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link
                        to={`/playlist/${playlist.id}`}
                        style={{
                          color: "var(--text-primary)",
                          textDecoration: "none",
                        }}
                      >
                        <strong>{playlist.name}</strong> ({playlist.song_count || 0} songs)
                      </Link>
                      <div className="playlist-inline-actions">
                        <button
                          type="button"
                          onClick={() => startEditing(playlist)}
                          className="chip"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlaylist(playlist.id)}
                          className="chip"
                          style={{ background: "rgba(255, 79, 163, 0.16)" }}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
