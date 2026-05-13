import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./App.css";
import {
  addSongToPlaylist,
  buildShareToken,
  getPlaylistById,
  removeSongFromPlaylist,
  updatePlaylist,
} from "./playlistStore";
import { fetchSongs } from "./api";
import { useToast } from "./toast";

export default function PlaylistDetail() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(() => getPlaylistById(id));
  const [error, setError] = useState(() =>
    getPlaylistById(id) ? "" : "Playlist not found.",
  );
  const [shareLink, setShareLink] = useState("");
  const [availableSongs, setAvailableSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [draftName, setDraftName] = useState(() => getPlaylistById(id)?.name || "");
  const [draftDescription, setDraftDescription] = useState(
    () => getPlaylistById(id)?.description || "",
  );
  const { pushToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();

    async function loadSongs() {
      if (!searchTerm.trim()) {
        setAvailableSongs([]);
        return;
      }

      try {
        const data = await fetchSongs(
          {
            search: searchTerm.trim(),
            pageSize: 20,
          },
          { signal: controller.signal },
        );
        setAvailableSongs(data.results || []);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError("Failed to search songs.");
        }
      }
    }

    const timeoutId = window.setTimeout(loadSongs, 300);

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
    pushToast({
      title: "Song added",
      message: `${song.name} was added to ${updatedPlaylist.name}.`,
      tone: "success",
    });
  }

  function handleRemoveSong(songId) {
    const updatedPlaylist = removeSongFromPlaylist(id, songId);

    if (!updatedPlaylist) {
      setError("Failed to remove song.");
      return;
    }

    setPlaylist(updatedPlaylist);
    setError("");
    pushToast({
      title: "Song removed",
      message: "The track was removed from the playlist.",
      tone: "info",
    });
  }

  function handleShare() {
    if (!playlist) return;

    const shareToken = buildShareToken(playlist);
    setShareLink(
      `${window.location.origin}/shared?playlist=${encodeURIComponent(shareToken)}`,
    );
    pushToast({
      title: "Share link ready",
      message: "Copy the new playlist URL and send it anywhere.",
      tone: "success",
    });
  }

  function copyToClipboard() {
    if (!shareLink) return;

    navigator.clipboard
      .writeText(shareLink)
      .then(() =>
        pushToast({
          title: "Copied to clipboard",
          message: "Your playlist link is ready to paste.",
          tone: "success",
        }),
      )
      .catch(() =>
        pushToast({
          title: "Copy failed",
          message: "You can still copy the link manually from the field.",
          tone: "warning",
        }),
      );
  }

  function handleSaveDetails(event) {
    event.preventDefault();
    if (!playlist) return;

    const updatedPlaylist = updatePlaylist({
      ...playlist,
      name: draftName.trim() || "Untitled Playlist",
      description: draftDescription.trim(),
    });

    setPlaylist(updatedPlaylist);
    pushToast({
      title: "Playlist saved",
      message: `${updatedPlaylist.name} has been updated.`,
      tone: "success",
    });
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

        <form className="meta-block playlist-editor" onSubmit={handleSaveDetails}>
          <div className="block-header">
            <p className="block-label">Edit details</p>
            <button type="submit" className="chip is-active">
              Save changes
            </button>
          </div>
          <input
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Playlist name"
            className="playlist-form-input"
          />
          <textarea
            value={draftDescription}
            onChange={(event) => setDraftDescription(event.target.value)}
            placeholder="Description"
            className="playlist-form-textarea"
          />
        </form>

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
                  background: "var(--bg-soft)",
                  border: "1px solid var(--control-border)",
                  padding: "12px 14px",
                  borderRadius: 12,
                  color: "var(--text-primary)",
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
              background: "var(--bg-soft)",
              border: "1px solid var(--control-border)",
              borderRadius: 12,
              color: "var(--text-primary)",
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
            <p style={{ color: "var(--text-muted)" }}>
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
                      color: "var(--text-primary)",
                      textDecoration: "none",
                    }}
                  >
                    {song.name} - {song.credited_artists || "Juice WRLD"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemoveSong(song.id)}
                    className="chip"
                    style={{ background: "rgba(255, 79, 163, 0.16)" }}
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
