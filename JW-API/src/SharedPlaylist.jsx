import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import "./App.css";
import { useAudioPlayer } from "./audio-player";
import { fetchSharedPlaylist, fetchSong } from "./api";
import { parseShareToken } from "./playlistStore";
import SiteNav from "./SiteNav";
import { useToast } from "./toast";

export default function SharedPlaylist() {
  const { shareId } = useParams();
  const [searchParams] = useSearchParams();
  const [playlist, setPlaylist] = useState(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { playQueue } = useAudioPlayer();
  const { pushToast } = useToast();
  const playableSongs = useMemo(
    () => (playlist?.songs || []).filter((song) => song?.path),
    [playlist],
  );

  useEffect(() => {
    const controller = new AbortController();
    const resolvedShareToken = shareId || searchParams.get("playlist") || "";

    async function loadLegacyTokenPlaylist(sharedPayload) {
      const songs = await Promise.all(
        sharedPayload.songIds.map((songId) =>
          fetchSong(songId, { signal: controller.signal }),
        ),
      );

      setPlaylist({
        name: sharedPayload.name,
        description: sharedPayload.description,
        songs,
        song_count: songs.length,
      });
      setSourceLabel("Compatibility token");
    }

    async function loadSharedPlaylist() {
      if (!resolvedShareToken) {
        setError("This shared playlist link is invalid.");
        setIsLoading(false);
        return;
      }

      try {
        const sharedPlaylist = await fetchSharedPlaylist(resolvedShareToken, {
          signal: controller.signal,
        });

        if (sharedPlaylist.songs.length > 0) {
          setPlaylist({
            name: sharedPlaylist.name,
            description: sharedPlaylist.description,
            songs: sharedPlaylist.songs,
            song_count: sharedPlaylist.songCount,
          });
          setSourceLabel("Official API share");
          return;
        }

        if (sharedPlaylist.songIds.length > 0) {
          const songs = await Promise.all(
            sharedPlaylist.songIds.map((songId) =>
              fetchSong(songId, { signal: controller.signal }),
            ),
          );

          setPlaylist({
            name: sharedPlaylist.name,
            description: sharedPlaylist.description,
            songs,
            song_count: songs.length,
          });
          setSourceLabel("Official API share");
          return;
        }

        throw new Error("Empty API share");
      } catch (apiError) {
        const sharedPayload = parseShareToken(resolvedShareToken);
        if (sharedPayload) {
          try {
            await loadLegacyTokenPlaylist(sharedPayload);
            return;
          } catch (legacyError) {
            if (legacyError.name !== "AbortError") {
              setError("This shared playlist could not be loaded from the API.");
            }
            return;
          }
        }

        if (apiError.name !== "AbortError") {
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
      <>
        <SiteNav />
        <div className="app-shell">
          <div className="detail-panel page-shell page-shell--narrow">
            <div className="skeleton-stack">
              <div className="skeleton-card skeleton-card--hero" />
              <div className="skeleton-card skeleton-card--meta" />
              <div className="skeleton-card skeleton-card--list" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !playlist) {
    return (
      <>
        <SiteNav />
        <div className="app-shell">
          <div className="status-banner" role="alert">
            {error || "Playlist not found."}
          </div>
        </div>
      </>
    );
  }

  function handlePlayPlaylist(startIndex = 0) {
    if (!playableSongs.length) {
      pushToast({
        title: "Nothing to play",
        message: "This shared playlist does not have any playable songs.",
        tone: "warning",
      });
      return;
    }

    playQueue(playableSongs, startIndex, true);
  }

  return (
    <>
      <SiteNav />
      <div className="app-shell">
        <div className="detail-panel page-shell page-shell--narrow">
          <div className="detail-copy">
            <p className="eyebrow">Shared Playlist</p>
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
            </div>
          </div>

          <div className="detail-meta">
            <div>
              <span>Songs</span>
              <strong>{playlist.song_count || 0}</strong>
            </div>
            <div>
              <span>Source</span>
              <strong>{sourceLabel || "Shared link"}</strong>
            </div>
          </div>

          <div className="meta-block">
            <p className="block-label">Songs</p>
            {playlist.songs?.length > 0 ? (
              <ul className="detail-list detail-list--stacked">
                {(playlist.songs || []).map((song) => {
                  const queueIndex = playableSongs.findIndex(
                    (playableSong) => playableSong.id === song.id,
                  );
                  const isPlayable = queueIndex !== -1;

                  return (
                    <li key={song.id} className="detail-list__row">
                      <Link to={`/song/${song.id}`} className="detail-list__link">
                        {song.name} - {song.credited_artists || "Juice WRLD"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handlePlayPlaylist(queueIndex)}
                        className="chip"
                        disabled={!isPlayable}
                      >
                        {isPlayable ? "Play" : "Unavailable"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="utility-empty">
                <strong>No songs were included</strong>
                <span>This shared link opened correctly, but it does not contain any playable songs yet.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
