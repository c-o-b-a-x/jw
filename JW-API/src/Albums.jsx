import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAudioPlayer } from "./audio-player";
import SiteNav from "./SiteNav";
import { fetchSongs, formatCount } from "./api";
import {
  findAlbumBySlug,
  getTrackAliases,
  normalizeTrackTitle,
  releasedAlbums,
} from "./albums";
import "./App.css";

function buildTrackSearchVariants(album, trackTitle) {
  return [
    trackTitle,
    ...getTrackAliases(trackTitle),
    `${album.title} ${trackTitle}`,
    `${trackTitle} Juice WRLD`,
  ].filter(Boolean);
}

function rankTrackMatch(candidate, trackTitle, aliases = []) {
  const candidateNames = [
    candidate?.name,
    ...(Array.isArray(candidate?.track_titles) ? candidate.track_titles : []),
  ]
    .map((value) => normalizeTrackTitle(value))
    .filter(Boolean);
  const normalizedTargets = [trackTitle, ...aliases]
    .map((value) => normalizeTrackTitle(value))
    .filter(Boolean);

  if (!candidateNames.length || normalizedTargets.length === 0) return -1;

  if (candidateNames.some((name) => normalizedTargets.includes(name))) return 7;

  if (
    candidateNames.some((name) =>
      normalizedTargets.some(
        (target) => name.startsWith(target) || target.startsWith(name),
      ),
    )
  ) {
    return 6;
  }

  if (
    candidateNames.some((name) =>
      normalizedTargets.some((target) => name.includes(target)),
    )
  ) {
    return 5;
  }

  if (
    candidateNames.some((name) =>
      normalizedTargets.some((target) => target.includes(name)),
    )
  ) {
    return 4;
  }

  return 1;
}

function chooseBestTrackMatch(results, trackTitle, aliases = []) {
  return [...results]
    .map((candidate) => ({
      candidate,
      score:
        rankTrackMatch(candidate, trackTitle, aliases) +
        (candidate?.category === "released" ? 2 : 0),
    }))
    .sort((left, right) => right.score - left.score)[0]?.candidate;
}

async function fetchSearchResults(params, options) {
  const resultSets = await Promise.all([
    fetchSongs(
      {
        ...params,
        page: 1,
        pageSize: 100,
        category: "released",
      },
      options,
    ),
    fetchSongs(
      {
        ...params,
        page: 1,
        pageSize: 100,
        category: "released",
        search: "",
        searchAll: params.search,
      },
      options,
    ),
    fetchSongs(
      {
        ...params,
        page: 1,
        pageSize: 100,
      },
      options,
    ),
  ]);

  return resultSets.flatMap((resultSet) => resultSet.results ?? []);
}

function AlbumListView() {
  return (
    <>
      <SiteNav />
      <div className="app-shell">

        <div className="detail-panel page-shell">
          <div className="detail-copy">
            <p className="eyebrow">Albums</p>
            <h2>Released projects in order</h2>
            <p className="detail-description">
              Move through every official Juice WRLD album from earliest release to
              latest, then play each project front to back through the shared player.
            </p>
          </div>

          <div className="album-grid">
            {releasedAlbums.map((album, index) => (
              <article key={album.slug} className="album-card">
                <div className="album-card__art">
                  {album.coverArt ? (
                    <img src={album.coverArt} alt={`${album.title} cover art`} />
                  ) : (
                    <span>{album.title.split(" ").slice(0, 2).join(" ")}</span>
                  )}
                </div>
                <div className="album-card__eyebrow">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{album.type}</span>
                </div>
                <h3>{album.title}</h3>
                <p>{album.description}</p>
                <div className="album-card__meta">
                  <span>{new Date(album.releaseDate).toLocaleDateString()}</span>
                  <span>{formatCount(album.tracks.length)} tracks</span>
                </div>
                <div className="mini-action-row">
                  <Link to={`/albums/${album.slug}`} className="chip is-active">
                    Open album
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AlbumDetailView() {
  const { slug } = useParams();
  const album = useMemo(() => findAlbumBySlug(slug), [slug]);
  const [resolvedTracks, setResolvedTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { currentSong, currentIndex, queue, playQueue } = useAudioPlayer();

  useEffect(() => {
    if (!album) {
      return;
    }

    const controller = new AbortController();

    async function loadAlbumTracks() {
      setIsLoading(true);
      setError("");

      try {
        const trackResults = await Promise.all(
          album.tracks.map(async (trackTitle) => {
            const aliases = getTrackAliases(trackTitle);
            const queries = buildTrackSearchVariants(album, trackTitle);
            const allResults = [];

            for (const query of queries) {
              const queryResults = await fetchSearchResults(
                {
                  search: query,
                },
                { signal: controller.signal },
              );
              allResults.push(...queryResults);
            }

            const uniqueResults = Array.from(
              new Map(allResults.map((song) => [song.id, song])).values(),
            );

            const bestMatch = chooseBestTrackMatch(
              uniqueResults,
              trackTitle,
              aliases,
            );
            return {
              title: trackTitle,
              song: bestMatch ?? null,
            };
          }),
        );

        setResolvedTracks(trackResults);

        if (!trackResults.some((entry) => entry.song)) {
          setError(
            "This album is listed, but its tracks could not be matched against the API right now.",
          );
        }
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setResolvedTracks([]);
          setError("The album tracklist could not be loaded from the API.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadAlbumTracks();
    return () => controller.abort();
  }, [album]);

  const playableTracks = useMemo(
    () => resolvedTracks.filter((entry) => entry.song).map((entry) => entry.song),
    [resolvedTracks],
  );

  function handlePlayAlbum() {
    if (!playableTracks.length) return;
    playQueue(playableTracks, 0, true);
  }

  function handlePlayFromTrack(trackIndex) {
    if (!playableTracks.length) return;
    playQueue(playableTracks, trackIndex, true);
  }

  if (!album) {
    return (
      <>
        <SiteNav />
        <div className="app-shell">
          <div className="utility-empty utility-empty--panel" role="alert">
            <strong>Album not found</strong>
            <span>Head back to the albums index and pick another official release.</span>
            <div className="utility-empty__actions">
              <Link to="/albums" className="chip is-active">
                View albums
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isCurrentAlbumQueue =
    playableTracks.length > 0 &&
    queue.length === playableTracks.length &&
    queue.every((song, index) => song.id === playableTracks[index]?.id);

  return (
    <>
      <SiteNav />
      <div className="app-shell">

        <div className="detail-panel page-shell">
          <div className="album-hero">
            <div className="album-hero__art">
              {album.coverArt ? (
                <img src={album.coverArt} alt={`${album.title} cover art`} />
              ) : (
                <span>{album.title.split(" ").slice(0, 2).join(" ")}</span>
              )}
            </div>
            <div className="album-hero__copy">
              <p className="eyebrow">Released album</p>
              <h2>{album.title}</h2>
              <p className="detail-description">{album.description}</p>
              <div className="pill-wrap">
                <span className="meta-pill">{album.type}</span>
                <span className="meta-pill">
                  {new Date(album.releaseDate).toLocaleDateString()}
                </span>
                <span className="meta-pill">
                  {formatCount(album.tracks.length)} listed tracks
                </span>
              </div>
              <div className="mini-action-row">
                <button
                  type="button"
                  className="chip is-active"
                  onClick={handlePlayAlbum}
                  disabled={!playableTracks.length}
                >
                  Play in order
                </button>
                <Link to="/" className="chip">
                  Open catalog
                </Link>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="skeleton-stack">
              <div className="skeleton-card skeleton-card--meta" />
              <div className="skeleton-card skeleton-card--list" />
            </div>
          ) : error ? (
            <div className="utility-empty utility-empty--panel" role="alert">
              <strong>{error}</strong>
              <span>
                Try another album, browse the catalog manually, or come back once the
                API returns stronger track matches.
              </span>
            </div>
          ) : (
            <>
              <div className="detail-meta">
                <div>
                  <span>Playable tracks</span>
                  <strong>{formatCount(playableTracks.length)}</strong>
                </div>
                <div>
                  <span>Queue status</span>
                  <strong>{isCurrentAlbumQueue ? "Loaded" : "Ready"}</strong>
                </div>
              </div>

              <div className="meta-block">
                <div className="block-header">
                  <p className="block-label">Tracklist</p>
                  <span className="block-hint">
                    Plays front to back through the shared player
                  </span>
                </div>

                <div className="album-tracklist">
                  {resolvedTracks.map((entry, index) => {
                    const playableIndex = playableTracks.findIndex(
                      (song) => song.id === entry.song?.id,
                    );
                    const isCurrentTrack =
                      isCurrentAlbumQueue &&
                      playableIndex >= 0 &&
                      playableIndex === currentIndex &&
                      currentSong?.id === entry.song?.id;

                    return (
                      <article
                        key={`${album.slug}-${entry.title}`}
                        className={`album-track ${
                          isCurrentTrack ? "is-current" : ""
                        } ${entry.song ? "is-playable" : "is-missing"}`}
                      >
                        <div className="album-track__index">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="album-track__copy">
                          <strong>{entry.title}</strong>
                          <span>
                            {entry.song
                              ? entry.song.credited_artists || "Juice WRLD"
                              : "No API match available yet"}
                          </span>
                        </div>
                        <div className="album-track__actions">
                          {entry.song ? (
                            <>
                              <button
                                type="button"
                                className="chip"
                                onClick={() => handlePlayFromTrack(playableIndex)}
                              >
                                Play from here
                              </button>
                              <Link
                                to={`/song/${entry.song.id}`}
                                state={{ song: entry.song }}
                                className="chip"
                              >
                                Open
                              </Link>
                            </>
                          ) : (
                            <span className="album-track__status">Unavailable</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Albums() {
  const { slug } = useParams();
  if (slug) {
    return <AlbumDetailView />;
  }

  return <AlbumListView />;
}
