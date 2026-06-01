import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAudioPlayer } from "./audio-player";
import SiteNav from "./SiteNav";
import {
  browseFiles,
  buildAudioUrl,
  buildFileUrl,
  buildImageUrl,
  fetchSong,
  fetchSongs,
  formatCategoryLabel,
} from "./api";
import "./App.css";

function createMetaRows(song) {
  return [
    { label: "Artists", value: song.credited_artists || "Juice WRLD" },
    { label: "Era", value: song.era?.name || "Unknown" },
    { label: "Producers", value: song.producers || "Unknown" },
    { label: "Length", value: song.length || "Unknown" },
    { label: "Catalog ID", value: `#${song.public_id || song.id}` },
    { label: "Category", value: formatCategoryLabel(song.category) },
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

function normalizeSearchTerm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenizeSearchTerm(value) {
  return normalizeSearchTerm(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function isVideoFile(item) {
  const candidatePath =
    item?.path || item?.relative_path || item?.name || item?.id || "";
  return /\.(mp4|mov)$/i.test(candidatePath);
}

function extractVideoPath(item) {
  return item?.path || item?.relative_path || item?.id || "";
}

function extractVideoLabel(item) {
  return item?.name || item?.title || extractVideoPath(item).split("/").pop() || "Untitled video";
}

function scoreVideoMatch(video, terms) {
  const normalizedLabel = normalizeSearchTerm(extractVideoLabel(video));
  const normalizedPath = normalizeSearchTerm(extractVideoPath(video));
  const labelTokens = tokenizeSearchTerm(normalizedLabel);
  const pathTokens = tokenizeSearchTerm(normalizedPath);
  let score = 0;
  let hasStrongMatch = false;

  terms.forEach((term, index) => {
    const normalizedTerm = normalizeSearchTerm(term);
    const termTokens = tokenizeSearchTerm(term);
    if (!normalizedTerm) return;

    const weight = Math.max(14 - index * 2, 4);
    const tokenOverlap = termTokens.filter(
      (token) => labelTokens.includes(token) || pathTokens.includes(token),
    ).length;
    const missingTokens = termTokens.length - tokenOverlap;

    if (termTokens.length >= 2 && tokenOverlap === 1 && missingTokens >= 1) {
      score -= weight * 3;
      return;
    }

    if (normalizedLabel === normalizedTerm) {
      score += weight * 5;
      hasStrongMatch = true;
    } else if (normalizedPath === normalizedTerm) {
      score += weight * 4;
      hasStrongMatch = true;
    } else if (normalizedLabel.includes(normalizedTerm)) {
      score += weight * 3;
      if (tokenOverlap >= Math.max(2, termTokens.length - 1)) {
        hasStrongMatch = true;
      }
    } else if (normalizedPath.includes(normalizedTerm)) {
      score += weight * 2;
      if (tokenOverlap >= Math.max(2, termTokens.length - 1)) {
        hasStrongMatch = true;
      }
    }

    if (tokenOverlap === termTokens.length && termTokens.length > 0) {
      score += weight * 2;
      hasStrongMatch = true;
    } else if (tokenOverlap >= 2) {
      score += weight;
    }
  });

  if (normalizedLabel.includes("music video")) score += 6;
  if (normalizedPath.includes("music video")) score += 4;
  if (normalizedLabel.includes("official")) score += 3;

  if (!hasStrongMatch) {
    return -1;
  }

  return score;
}

function dedupeVideos(items) {
  const seenPaths = new Set();

  return items.filter((item) => {
    const path = extractVideoPath(item);
    if (!path || seenPaths.has(path)) return false;
    seenPaths.add(path);
    return true;
  });
}

export default function SongDetail() {
  const { id } = useParams();
  const location = useLocation();
  const seedSong = location.state?.song || null;
  const catalogReturn = location.state?.catalogReturn ?? null;
  const { currentSong, isPlaying, playSong, togglePlayPause } = useAudioPlayer();
  const [song, setSong] = useState(seedSong);
  const [relatedSongs, setRelatedSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [videosLoading, setVideosLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [videos, setVideos] = useState([]);
  const [selectedVideoPath, setSelectedVideoPath] = useState("");
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

  useEffect(() => {
    if (!song) return;

    const controller = new AbortController();
    const searchTerms = dedupeVideos(
      [
        { path: song.name, name: song.name },
        ...(song.track_titles || []).map((title) => ({ path: title, name: title })),
      ],
    )
      .map((entry) => entry.name)
      .filter(Boolean);

    async function loadVideos() {
      setVideosLoading(true);
      setVideoError("");

      try {
        const settled = await Promise.allSettled(
          searchTerms.map((term) =>
            browseFiles(
              {
                search: term,
              },
              { signal: controller.signal },
            ),
          ),
        );

        const matchedVideos = settled
          .filter((result) => result.status === "fulfilled")
          .flatMap((result) => result.value?.items || [])
          .filter(isVideoFile);

        const rankedVideos = dedupeVideos(matchedVideos)
          .map((video) => ({
            ...video,
            matchScore: scoreVideoMatch(video, [
              song.name,
              ...(song.track_titles || []),
              song.credited_artists,
            ]),
          }))
          .filter((video) => video.matchScore > 0)
          .sort((left, right) => right.matchScore - left.matchScore);

        setVideos(rankedVideos);
        setSelectedVideoPath((currentPath) => {
          if (currentPath && rankedVideos.some((video) => extractVideoPath(video) === currentPath)) {
            return currentPath;
          }

          return extractVideoPath(rankedVideos[0]) || "";
        });
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setVideos([]);
          setSelectedVideoPath("");
          setVideoError("Video files could not be loaded right now.");
        }
      } finally {
        setVideosLoading(false);
      }
    }

    loadVideos();
    return () => controller.abort();
  }, [song]);

  const songImage = buildImageUrl(song?.image_url);
  const downloadUrl = buildAudioUrl(song?.path);
  const isCurrentSong = currentSong?.id === song?.id;
  const metaRows = useMemo(() => (song ? createMetaRows(song) : []), [song]);
  const sessionNotes = useMemo(() => (song ? createSessionNotes(song) : []), [song]);
  const selectedVideo = useMemo(
    () => videos.find((video) => extractVideoPath(video) === selectedVideoPath) || videos[0] || null,
    [selectedVideoPath, videos],
  );
  const selectedVideoUrl = buildFileUrl(extractVideoPath(selectedVideo));
  const eraLink = song?.era?.name ? `/?search=${encodeURIComponent(song.era.name)}` : null;
  const producerLink = song?.producers
    ? `/?search=${encodeURIComponent(song.producers)}`
    : null;
  const categoryLink = song?.category
    ? `/?category=${encodeURIComponent(song.category)}`
    : null;
  const backToCatalog = useMemo(() => {
    if (!catalogReturn) {
      return "/";
    }

    const nextParams = new URLSearchParams();

    if (catalogReturn.search) {
      nextParams.set("search", catalogReturn.search);
    }

    if (catalogReturn.category) {
      nextParams.set("category", catalogReturn.category);
    }

    if (catalogReturn.sort && catalogReturn.sort !== "default") {
      nextParams.set("sort", catalogReturn.sort);
    }

    if (catalogReturn.page && catalogReturn.page > 1) {
      nextParams.set("page", String(catalogReturn.page));
    }

    const queryString = nextParams.toString();
    return queryString ? `/?${queryString}` : "/";
  }, [catalogReturn]);

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
      <>
        <SiteNav />
        <div className="app-shell">
          <div className="detail-panel detail-panel--page">
            <div className="skeleton-card" style={{ height: 300 }} />
            <div className="skeleton-card" style={{ height: 100, marginTop: 20 }} />
          </div>
        </div>
      </>
    );
  }

  if (error || !song) {
    return (
      <>
        <SiteNav />
        <div className="app-shell">
          <div className="status-banner" role="alert">
            {error || "Song not found."}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <div className="app-shell">
        <Link
          to={backToCatalog}
          state={catalogReturn ? { catalogReturn } : undefined}
          className="chip panel-back-link"
        >
          Back to catalog
        </Link>

        <div className="detail-layout detail-layout--page">
        <div className="detail-panel detail-panel--page detail-panel--feature">
          <section className="detail-stage">
            <div className="detail-stage__media">
              <div className="detail-artwork">
                {songImage ? (
                  <img src={songImage} alt={song.name} />
                ) : (
                  <div className="artwork-fallback">
                    <span>999</span>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-stage__content">
              <div className="detail-copy detail-copy--feature">
                <p className="eyebrow">Song details</p>
                <h2>{song.name}</h2>
                <p className="detail-description">
                  {song.additional_information ||
                    "A focused snapshot from the Juice WRLD archive with available session metadata."}
                </p>
                <div className="pill-wrap">
                  {song.era?.name ? (
                    <Link to={eraLink} className="meta-pill meta-pill--link">
                      {song.era.name}
                    </Link>
                  ) : null}
                  {song.category ? (
                    <Link to={categoryLink} className="meta-pill meta-pill--link">
                      {formatCategoryLabel(song.category)}
                    </Link>
                  ) : null}
                  {song.producers ? (
                    <Link to={producerLink} className="meta-pill meta-pill--link">
                      {song.producers}
                    </Link>
                  ) : null}
                  {song.length ? <span className="meta-pill">{song.length}</span> : null}
                </div>
              </div>

              <div className="detail-meta detail-meta--feature">
                {metaRows.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

                <div className="player-panel player-panel--feature">
                  <div className="mobile-player-actions">
                    <button type="button" className="chip is-active" onClick={handlePlaySong}>
                      {isCurrentSong && isPlaying ? "Pause in player" : "Play in player"}
                    </button>
                    <Link to="/videos" className="chip">
                      Open video archive
                    </Link>
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
            </div>
          </section>

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

          <div className="meta-block">
            <div className="block-header">
              <p className="block-label">Video archive</p>
              <span className="block-hint">
                {videosLoading ? "Searching MP4 files..." : `${videos.length} videos found`}
              </span>
            </div>

            {selectedVideo ? (
              <div className="video-stage">
                <div className="video-stage__player">
                  <video
                    key={extractVideoPath(selectedVideo)}
                    controls
                    preload="metadata"
                    poster={songImage || undefined}
                    className="video-stage__video"
                    src={selectedVideoUrl}
                  >
                    Your browser does not support embedded video playback.
                  </video>
                </div>
                <div className="video-stage__details">
                  <strong>{extractVideoLabel(selectedVideo)}</strong>
                  <span>{extractVideoPath(selectedVideo)}</span>
                </div>
              </div>
            ) : null}

            {videoError ? (
              <div className="utility-empty utility-empty--compact">
                <strong>Video lookup failed</strong>
                <span>{videoError}</span>
              </div>
            ) : null}

            {!videosLoading && !selectedVideo && !videoError ? (
              <div className="utility-empty utility-empty--compact">
                <strong>No MP4 matches yet</strong>
                <span>
                  The archive search did not return any MP4 files matching this song title or its alternate names.
                </span>
              </div>
            ) : null}
          </div>
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
              <p className="block-label">Video list</p>
              <span className="block-hint">Swap the showcase</span>
            </div>

            {videos.length > 0 ? (
              <div className="video-list">
                {videos.map((video, index) => {
                  const videoPath = extractVideoPath(video);
                  const isSelected = videoPath === extractVideoPath(selectedVideo);

                  return (
                    <button
                      key={videoPath}
                      type="button"
                      className={`video-list__item ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedVideoPath(videoPath)}
                    >
                      <strong>{extractVideoLabel(video)}</strong>
                      <span>{index + 1}. MP4 archive file</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="section-subtitle">
                {videosLoading
                  ? "Looking through the original files section for MP4 matches..."
                  : "When archive videos exist for this song, they will appear here for quick swapping."}
              </p>
            )}
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
                        {[
                          relatedSong.credited_artists || "Juice WRLD",
                          relatedSong.era?.name ||
                            formatCategoryLabel(relatedSong.category),
                        ].join(" / ")}
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
                        state={{ song: relatedSong, catalogReturn }}
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
    </>
  );
}
