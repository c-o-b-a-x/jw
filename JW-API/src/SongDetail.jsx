import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAudioPlayer } from "./audio-player";
import {
  buildAudioUrl,
  buildImageUrl,
  fetchSong,
  fetchSongs,
  formatCategoryLabel,
} from "./api";
import "./App.css";

function createMetaRows(song) {
  return [
    {
      label: "Artists",
      value: song.credited_artists || "Juice WRLD",
    },
    {
      label: "Era",
      value: song.era?.name || "Unknown",
    },
    {
      label: "Producers",
      value: song.producers || "Unknown",
    },
    {
      label: "Length",
      value: song.length || "Unknown",
    },
    {
      label: "Catalog ID",
      value: `#${song.public_id || song.id}`,
    },
    {
      label: "Category",
      value: formatCategoryLabel(song.category),
    },
  ];
}

function createSessionNotes(song) {
  return [
    { label: "Recorded", value: song.record_dates || "Record date not listed" },
    {
      label: "Location",
      value: song.recording_locations || "Recording location not listed",
    },
    { label: "Previewed", value: song.preview_date || "Preview date not listed" },
    { label: "Leak status", value: song.date_leaked || "Leak status not listed" },
  ];
}

export default function SongDetail() {
  const { id } = useParams();
  const location = useLocation();
  const seedSong = location.state?.song || null;
  const { currentSong, isPlaying, playSong, togglePlayPause } = useAudioPlayer();
  const [song, setSong] = useState(seedSong);
  const [relatedSongs, setRelatedSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [error, setError] = useState("");
  const [lyricsExpanded, setLyricsExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSong() {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchSong(id, {
          signal: controller.signal,
          useCache: true,
        });
        setSong(data);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError("Could not load song details. Please try again later.");
          setSong(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadSong();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!song) return;

    const controller = new AbortController();

    async function loadRelatedSongs() {
      setRelatedLoading(true);

      try {
        const eraSearch = song.era?.name || "";
        const categorySearch = song.category || "";
        const primarySearch = eraSearch || categorySearch || song.credited_artists || "";

        if (!primarySearch) {
          setRelatedSongs([]);
          return;
        }

        const data = await fetchSongs(
          {
            page: 1,
            pageSize: 8,
            search: primarySearch,
            category: categorySearch,
          },
          { signal: controller.signal },
        );

        const nextSongs = (data.results ?? [])
          .filter((entry) => entry.id !== song.id)
          .slice(0, 4);

        setRelatedSongs(nextSongs);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setRelatedSongs([]);
        }
      } finally {
        setRelatedLoading(false);
      }
    }

    loadRelatedSongs();
    return () => controller.abort();
  }, [song]);

  const songImage = buildImageUrl(song?.image_url);
  const downloadUrl = buildAudioUrl(song?.path);
  const isCurrentSong = currentSong?.id === song?.id;
  const metaRows = useMemo(() => (song ? createMetaRows(song) : []), [song]);
  const sessionNotes = useMemo(() => (song ? createSessionNotes(song) : []), [song]);

  function handlePlaySong() {
    if (!song) return;

    if (isCurrentSong) {
      togglePlayPause();
      return;
    }

    playSong(song);
  }

  if (isLoading && !song) {
    return (
      <div className="app-shell">
        <Link
          to="/"
          className="chip"
          style={{ marginBottom: 24, display: "inline-block" }}
        >
          Back to catalog
        </Link>
        <div className="detail-panel detail-panel--page">
          <div className="skeleton-card" style={{ height: 300 }} />
          <div className="skeleton-card" style={{ height: 100, marginTop: 20 }} />
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="app-shell">
        <div className="status-banner" role="alert">
          {error || "Song not found."}
        </div>
        <Link
          to="/"
          className="chip"
          style={{ display: "inline-block", marginTop: 20 }}
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Link
        to="/"
        className="chip"
        style={{ marginBottom: 24, display: "inline-block" }}
      >
        Back to catalog
      </Link>

      <div className="detail-layout detail-layout--page">
        <div className="detail-panel detail-panel--page">
          <div className="detail-artwork">
            {songImage ? (
              <img src={songImage} alt={song.name} />
            ) : (
              <div className="artwork-fallback">
                <span>999</span>
              </div>
            )}
          </div>

          <div className="detail-copy">
            <p className="eyebrow">Song details</p>
            <h2>{song.name}</h2>
            <p className="detail-description">
              {song.additional_information ||
                "A focused snapshot from the Juice WRLD archive with available session metadata."}
            </p>
            <div className="pill-wrap">
              {song.era?.name ? <span className="meta-pill">{song.era.name}</span> : null}
              {song.category ? (
                <span className="meta-pill">{formatCategoryLabel(song.category)}</span>
              ) : null}
              {song.length ? <span className="meta-pill">{song.length}</span> : null}
            </div>
          </div>

          <div className="detail-meta">
            {metaRows.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="player-panel">
            <div className="mobile-player-actions">
              <button type="button" className="chip is-active" onClick={handlePlaySong}>
                {isCurrentSong && isPlaying ? "Pause in player" : "Play in player"}
              </button>
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  className="chip"
                  download={`${song.name || "juice-wrld-track"}.mp3`}
                >
                  Download MP3
                </a>
              ) : null}
              <Link to="/radio" className="chip">
                Open radio
              </Link>
            </div>
            <p className="player-note">
              The shared player stays active while you move between songs, playlists,
              and radio.
            </p>
          </div>

          {song.track_titles?.length > 0 && (
            <div className="meta-block">
              <div className="block-header">
                <p className="block-label">Track titles</p>
                <span className="block-hint">{song.track_titles.length} versions listed</span>
              </div>
              <div className="pill-wrap">
                {song.track_titles.map((title) => (
                  <span key={title} className="meta-pill">
                    {title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {song.lyrics && (
            <div className="meta-block">
              <div className="block-header">
                <p className="block-label">Lyrics preview</p>
                <button type="button" onClick={() => setLyricsExpanded((open) => !open)}>
                  {lyricsExpanded ? "Collapse" : "Expand"}
                </button>
              </div>
              <pre className={`lyrics-block ${lyricsExpanded ? "is-expanded" : ""}`}>
                {song.lyrics}
              </pre>
            </div>
          )}
        </div>

        <aside className="detail-sidebar">
          <section className="detail-sidecard">
            <div className="block-header">
              <p className="block-label">Session notes</p>
              <span className="block-hint">Archive context</span>
            </div>
            <div className="session-grid">
              {sessionNotes.map((item) => (
                <article key={item.label} className="session-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="detail-sidecard">
            <div className="block-header">
              <p className="block-label">Related songs</p>
              <span className="block-hint">
                {relatedLoading ? "Loading..." : `${relatedSongs.length} found`}
              </span>
            </div>

            {relatedSongs.length > 0 ? (
              <div className="related-song-list">
                {relatedSongs.map((relatedSong) => (
                  <article key={relatedSong.id} className="related-song-card">
                    <div>
                      <strong>{relatedSong.name}</strong>
                      <span>
                        {relatedSong.credited_artists || "Juice WRLD"} ·{" "}
                        {relatedSong.era?.name || formatCategoryLabel(relatedSong.category)}
                      </span>
                    </div>
                    <div className="mini-action-row">
                      <button
                        type="button"
                        className="chip is-active"
                        onClick={() => playSong(relatedSong)}
                      >
                        Play
                      </button>
                      <Link
                        to={`/song/${relatedSong.id}`}
                        state={{ song: relatedSong }}
                        className="chip"
                      >
                        Open
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="section-subtitle">
                {relatedLoading
                  ? "Finding nearby tracks from the archive..."
                  : "No nearby matches were returned for this song yet."}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
