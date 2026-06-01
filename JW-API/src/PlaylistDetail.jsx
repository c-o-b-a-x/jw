import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteNav from "./SiteNav";
import "./App.css";
import {
  addSongToPlaylist,
  buildShareToken,
  getPlaylistById,
  removeSongFromPlaylist,
  updatePlaylist,
} from "./playlistStore";
import { fetchSongs } from "./api";
import { useAudioPlayer } from "./audio-player";
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
  const { playQueue } = useAudioPlayer();
  const { pushToast } = useToast();
  const playableSongs = useMemo(
    () => (playlist?.songs || []).filter((song) => song?.path),
    [playlist],
  );

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
    if (playlist.songs?.some((playlistSong) => playlistSong.id === song.id)) {
      pushToast({
        title: "Already in playlist",
        message: `${song.name} is already part of ${playlist.name}.`,
        tone: "warning",
      });
      return;
    }

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

  function handlePlayPlaylist(startIndex = 0) {
    if (!playableSongs.length) {
      pushToast({
        title: "Nothing to play",
        message: "This playlist does not have any playable songs yet.",
        tone: "warning",
      });
      return;
    }

    playQueue(playableSongs, startIndex, true);
    pushToast({
      title: "Playlist playing",
      message: `Now playing ${playlist.name}.`,
      tone: "success",
    });
  }

  function handleShufflePlaylist() {
    if (!playableSongs.length) {
      pushToast({
        title: "Nothing to shuffle",
        message: "Add a few playable tracks first, then try again.",
        tone: "warning",
      });
      return;
    }

    const shuffledSongs = [...playableSongs]
      .map((song) => ({ song, sortKey: Math.random() }))
      .sort((left, right) => left.sortKey - right.sortKey)
      .map(({ song }) => song);

    playQueue(shuffledSongs, 0, true);
    pushToast({
      title: "Shuffle started",
      message: `${playlist.name} is now playing in a shuffled order.`,
      tone: "success",
    });
  }

  function handlePlaySong(songId) {
    const queueIndex = playableSongs.findIndex((song) => song.id === songId);

    if (queueIndex === -1) {
      pushToast({
        title: "Song unavailable",
        message: "That track is not currently playable from the API.",
        tone: "warning",
      });
      return;
    }

    playQueue(playableSongs, queueIndex, true);
  }

  if (error && !playlist) {
    return (
      <>
        <SiteNav />
        <div className="app-shell">
          <div className="status-banner">{error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <div className="app-shell">

        <div className="detail-panel page-shell page-shell--narrow detail-panel--feature">
        <section className="detail-stage detail-stage--compact">
          <div className="detail-stage__content detail-stage__content--full">
            <div className="detail-copy detail-copy--feature">
              <p className="eyebrow">Playlist</p>
              <h2>{playlist.name}</h2>
              <p className="detail-description">
                {playlist.description || "No description."}
              </p>
              <div className="mobile-player-actions mobile-player-actions--secondary">
                <button
                  type="button"
                  onClick={() => handlePlayPlaylist(0)}
                  className="chip is-active"
                  disabled={!playableSongs.length}
                >
                  Play playlist
                </button>
                <button
                  type="button"
                  onClick={handleShufflePlaylist}
                  className="chip"
                  disabled={!playableSongs.length}
                >
                  Shuffle
                </button>
              </div>
            </div>
          </div>
        </section>

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
            <div className="inline-field-row inline-field-row--spaced">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="playlist-form-input"
              />
              <button type="button" onClick={copyToClipboard} className="chip">
                Copy
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="status-banner status-banner--spaced">
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
            className="playlist-form-input"
          />
          <div className="song-picker-results">
            {availableSongs.map((song) => {
              const isAlreadyAdded = playlist.songs?.some(
                (playlistSong) => playlistSong.id === song.id,
              );

              return (
                <div key={song.id} className="song-picker-row">
                  <span className="song-picker-row__copy">
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
            {!searchTerm && (
              <div className="utility-empty utility-empty--compact">
                <strong>Search to add more tracks</strong>
                <span>Type a song title, artist, or keyword and matching archive entries will appear here.</span>
              </div>
            )}
            {searchTerm && availableSongs.length === 0 && (
              <div className="utility-empty utility-empty--compact">
                <strong>No matches right now</strong>
                <span>Try a shorter search or clear the phrase and browse a wider set of songs.</span>
              </div>
            )}
          </div>
        </div>

        <div className="meta-block">
          <p className="block-label">Songs in this playlist</p>
          {playlist.songs?.length === 0 ? (
            <div className="utility-empty">
              <strong>This playlist is empty</strong>
              <span>Use the search above to add songs, then share the finished collection with one link.</span>
            </div>
          ) : (
            <ul className="detail-list detail-list--stacked">
              {playlist.songs?.map((song) => {
                const isPlayable = Boolean(song?.path);

                return (
                  <li key={song.id} className="detail-list__row">
                    <Link
                      to={`/song/${song.id}`}
                      className="detail-list__link"
                    >
                      {song.name} - {song.credited_artists || "Juice WRLD"}
                    </Link>
                    <div className="playlist-inline-actions">
                      <button
                        type="button"
                        onClick={() => handlePlaySong(song.id)}
                        className="chip"
                        disabled={!isPlayable}
                      >
                        {isPlayable ? "Play" : "Unavailable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSong(song.id)}
                        className="chip chip--danger"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
