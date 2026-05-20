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
      <Link to="/" className="chip panel-back-link">
        Back to home
      </Link>

      <div className="detail-panel page-shell page-shell--narrow">
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
          <form onSubmit={handleCreatePlaylist} className="inline-field-row">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(event) => setNewPlaylistName(event.target.value)}
              placeholder="Playlist name"
              className="playlist-form-input"
            />
            <button type="submit" className="chip">
              Create
            </button>
          </form>
        </div>

        {error && (
          <div className="status-banner status-banner--spaced">
            {error}
          </div>
        )}

        <div className="meta-block">
          <p className="block-label">All playlists</p>
          {playlists.length === 0 ? (
            <div className="utility-empty">
              <strong>No playlists yet</strong>
              <span>
                Create your first playlist above or open the shared playlist builder
                to start from a curated draft.
              </span>
              <div className="utility-empty__actions">
                <Link to="/create-playlist" className="chip is-active">
                  Shared builder
                </Link>
              </div>
            </div>
          ) : (
            <ul className="detail-list detail-list--stacked">
              {playlists.map((playlist) => (
                <li key={playlist.id} className="detail-list__row">
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
                        className="detail-list__link"
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
                          className="chip chip--danger"
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
