import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAudioPlayer } from "./audio-player";
import SiteNav from "./SiteNav";
import { buildImageUrl, fetchRandomRadioSong, formatCategoryLabel } from "./api";
import "./App.css";

function normalizeRadioSong(payload) {
  return payload?.song || payload?.data?.song || payload;
}

async function loadUniqueRandomSongs(count, signal, existingIds = new Set()) {
  const songs = [];
  const seenIds = new Set(existingIds);
  let attempts = 0;
  const maxAttempts = Math.max(count * 6, 12);

  while (songs.length < count && attempts < maxAttempts) {
    attempts += 1;
    const payload = await fetchRandomRadioSong({ signal });
    const song = normalizeRadioSong(payload);
    if (!song?.id || seenIds.has(song.id) || !song.path) {
      continue;
    }

    seenIds.add(song.id);
    songs.push(song);
  }

  return songs;
}

export default function Radio() {
  const [playlist, setPlaylist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQueueRefreshing, setIsQueueRefreshing] = useState(false);
  const [error, setError] = useState("");
  const loadingMoreRef = useRef(false);
  const {
    currentSong,
    queue,
    isPlaying,
    playNext,
    playPrevious,
    playQueue,
    togglePlayPause,
  } = useAudioPlayer();

  const isStationQueue = useMemo(() => {
    if (!playlist.length || queue.length !== playlist.length) {
      return false;
    }

    return queue.every((song, index) => song.id === playlist[index]?.id);
  }, [playlist, queue]);

  const radioIndex = useMemo(() => {
    if (!playlist.length || !currentSong) return 0;
    const songIndex = playlist.findIndex((song) => song.id === currentSong.id);
    return songIndex >= 0 ? songIndex : 0;
  }, [currentSong, playlist]);

  const extendStation = useCallback(async () => {
    if (loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setIsQueueRefreshing(true);
    const controller = new AbortController();

    try {
      const nextSongs = await loadUniqueRandomSongs(
        8,
        controller.signal,
        new Set(playlist.map((song) => song.id)),
      );

      if (!nextSongs.length) {
        return;
      }

      setPlaylist((currentPlaylist) => {
        const expandedPlaylist = [...currentPlaylist, ...nextSongs];

        if (isStationQueue) {
          const safeIndex = currentSong
            ? expandedPlaylist.findIndex((song) => song.id === currentSong.id)
            : 0;
          playQueue(expandedPlaylist, safeIndex >= 0 ? safeIndex : 0, false);
        }

        return expandedPlaylist;
      });
    } catch {
      setError("The radio queue could not be refreshed right now.");
    } finally {
      loadingMoreRef.current = false;
      setIsQueueRefreshing(false);
      controller.abort();
    }
  }, [currentSong, isStationQueue, playQueue, playlist]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialPlaylist() {
      setIsLoading(true);
      setError("");

      try {
        const songs = await loadUniqueRandomSongs(12, controller.signal);

        if (!songs.length) {
          setError("No playable songs were returned for the radio station.");
          setPlaylist([]);
          return;
        }

        setPlaylist(songs);
        if (!queue.length) {
          playQueue(songs, 0, true);
        }
      } catch {
        setError("Could not start the radio. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialPlaylist();
    return () => controller.abort();
  }, [playQueue, queue.length]);

  useEffect(() => {
    if (!playlist.length) return;
    const remainingSongs = playlist.length - radioIndex - 1;
    if (remainingSongs > 4) return;

    const timeoutId = window.setTimeout(() => {
      void extendStation();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [extendStation, playlist, radioIndex]);

  function handleStartRadio() {
    if (!playlist.length) return;
    playQueue(playlist, radioIndex >= 0 ? radioIndex : 0, true);
  }

  async function handleRefreshStation() {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    try {
      const songs = await loadUniqueRandomSongs(12, controller.signal);

      if (!songs.length) {
        setError("No playable songs were returned for the radio station.");
        return;
      }

      setPlaylist(songs);
      playQueue(songs, 0, true);
    } catch {
      setError("Could not refresh the radio station.");
    } finally {
      setIsLoading(false);
      controller.abort();
    }
  }

  if (isLoading) {
    return (
      <>
        <SiteNav />
        <div className="app-shell">
          <div className="detail-panel detail-panel--page page-shell page-shell--narrow">
            <div className="skeleton-stack">
              <div className="skeleton-card skeleton-card--artwork" />
              <div className="skeleton-card skeleton-card--meta" />
              <div className="skeleton-card skeleton-card--player" />
              <div className="skeleton-card skeleton-card--list" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !playlist.length) {
    return (
      <>
        <SiteNav />
        <div className="app-shell">
          <div className="utility-empty utility-empty--panel" role="alert">
            <strong>{error || "The radio station is currently offline."}</strong>
            <span>Head back to the catalog, open a playlist, or retry the station after the next refresh.</span>
            <div className="utility-empty__actions">
              <Link to="/" className="chip is-active">
                Browse catalog
              </Link>
              <button type="button" className="chip" onClick={handleRefreshStation}>
                Retry station
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const queueContainsCurrentSong = currentSong
    ? playlist.some((song) => song.id === currentSong.id)
    : false;
  const activeSong = queueContainsCurrentSong ? currentSong : playlist[radioIndex];
  const imageUrl = buildImageUrl(activeSong?.image_url);

  return (
    <>
      <SiteNav />
      <div className="app-shell">
        <div className="detail-panel detail-panel--page">
          <div className="detail-artwork">
            {imageUrl ? (
              <img src={imageUrl} alt={activeSong.name} />
            ) : (
              <div className="artwork-fallback">
                <span>999</span>
              </div>
            )}
          </div>

          <div className="detail-copy radio-copy">
            <p className="eyebrow">Now Playing</p>
            <h2>{activeSong?.name || "Unknown Track"}</h2>
            <p>{activeSong?.credited_artists || "Juice WRLD"}</p>
            <p className="detail-description">
              {activeSong?.era?.name || "Unknown era"} -{" "}
              {formatCategoryLabel(activeSong?.category)}
            </p>
          </div>

          <div className="player-panel">
            <div className="mobile-player-actions">
              <button type="button" className="chip" onClick={playPrevious}>
                Prev
              </button>
              <button type="button" className="chip is-active" onClick={handleStartRadio}>
                Start radio
              </button>
              <button type="button" className="chip is-active" onClick={togglePlayPause}>
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button type="button" className="chip" onClick={playNext}>
                Next
              </button>
            </div>
            <div className="mobile-player-actions mobile-player-actions--secondary">
              <button type="button" className="chip" onClick={handleRefreshStation}>
                Refresh station
              </button>
            </div>
            <p className="player-note">
              Powered by the API&apos;s dedicated random radio endpoint, with the queue
              refilling as you get close to the end.
            </p>
          </div>

          <div className="meta-block">
            <p className="block-label">Coming up next</p>
            <div className="radio-queue">
              {playlist.slice(radioIndex + 1, radioIndex + 6).map((song) => (
                <div key={song.id} className="radio-queue__item">
                  <strong>{song.name}</strong> - {song.credited_artists || "Juice WRLD"}
                </div>
              ))}
              {isQueueRefreshing ? (
                <p className="field-hint">Refreshing with more random songs...</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
