import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
import { buildShareToken, createPlaylist } from "./playlistStore";
import { fetchSongs } from "./api";
import { useToast } from "./toast";

export default function CreatePlaylist() {
  const [playlistName, setPlaylistName] = useState("");
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSongs, setAvailableSongs] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [error, setError] = useState("");
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
          setError("Failed to search songs. Please try again.");
        }
      }
    }

    const timeoutId = window.setTimeout(loadSongs, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchTerm]);

  function addSong(song) {
    if (selectedSongs.some((selectedSong) => selectedSong.id === song.id)) {
      pushToast({
        title: "Already added",
        message: `${song.name} is already in this playlist draft.`,
        tone: "warning",
      });
      return;
    }

    setSelectedSongs((currentSongs) => [...currentSongs, song]);
    setError("");
    pushToast({
      title: "Song selected",
      message: `${song.name} is ready to be saved in your playlist.`,
      tone: "success",
    });
  }

  function removeSong(songId) {
    const removedSong = selectedSongs.find((song) => song.id === songId);
    setSelectedSongs((currentSongs) =>
      currentSongs.filter((song) => song.id !== songId),
    );
    pushToast({
      title: "Song removed",
      message: removedSong?.name || "The track was removed from this draft.",
      tone: "info",
    });
  }

  function copyShareLink() {
    if (!shareLink) return;

    navigator.clipboard
      .writeText(shareLink)
      .then(() =>
        pushToast({
          title: "Copied to clipboard",
          message: "Your shared playlist link is ready to send.",
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
      setShareLink(
        `${window.location.origin}/shared?playlist=${encodeURIComponent(shareToken)}`,
      );
      pushToast({
        title: "Playlist created",
        message: `${playlist.name} is ready to share.`,
        tone: "success",
      });
    } catch {
      setError("Failed to save the playlist. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <Link to="/" className="chip panel-back-link">
        Back to home
      </Link>

      <div className="detail-panel page-shell page-shell--narrow">
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
            className="playlist-form-input"
          />
        </div>

        <div className="meta-block">
          <p className="block-label">Selected songs ({selectedSongs.length})</p>
          {selectedSongs.length === 0 ? (
            <div className="utility-empty">
              <strong>No songs added yet</strong>
              <span>Search the catalog below and build the playlist before you generate a share link.</span>
            </div>
          ) : (
            <ul className="detail-list detail-list--stacked">
              {selectedSongs.map((song) => (
                <li key={song.id} className="detail-list__row">
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
            className="playlist-form-input"
          />
          <div className="song-picker-results">
            {availableSongs.map((song) => (
              <div key={song.id} className="song-picker-row">
                <span className="song-picker-row__copy">
                  <strong>{song.name}</strong> - {song.credited_artists || "Juice WRLD"}
                </span>
                <button type="button" onClick={() => addSong(song)} className="chip">
                  Add
                </button>
              </div>
            ))}
            {searchTerm && availableSongs.length === 0 && (
              <div className="utility-empty utility-empty--compact">
                <strong>No songs found</strong>
                <span>Try a broader title, artist, or keyword from the archive.</span>
              </div>
            )}
            {!searchTerm && (
              <div className="utility-empty utility-empty--compact">
                <strong>Start with a search</strong>
                <span>Type a track name or artist and matching songs will appear here.</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="status-banner status-banner--spaced">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          className="chip primary-action"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Generate shareable link"}
        </button>

        {shareLink && (
          <div className="meta-block">
            <p className="block-label">Your shareable link</p>
            <div className="inline-field-row">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="playlist-form-input"
              />
              <button type="button" onClick={copyShareLink} className="chip">
                Copy
              </button>
            </div>
            <p className="field-hint">
              Anyone with this link can open the playlist and load the songs from the
              Juice WRLD API.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
