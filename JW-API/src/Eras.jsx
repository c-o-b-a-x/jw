import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import SiteNav from "./SiteNav";
import {
  SONGS_PER_PAGE,
  fetchEras,
  fetchSongs,
  fetchStats,
  formatCategoryLabel,
  formatCount,
} from "./api";
import { useAudioPlayer } from "./audio-player";
import "./App.css";

function EraListView() {
  const [eras, setEras] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadEras() {
      setIsLoading(true);
      setError("");

      try {
        const [erasData, statsData] = await Promise.all([
          fetchEras({ signal: controller.signal }),
          fetchStats({ signal: controller.signal }),
        ]);

        setEras(Array.isArray(erasData) ? erasData : erasData?.results || []);
        setStats(statsData);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError("The era archive could not be loaded right now.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadEras();
    return () => controller.abort();
  }, []);

  return (
    <>
      <SiteNav />
      <div className="app-shell">
        <div className="detail-panel page-shell">
          <div className="detail-copy">
            <p className="eyebrow">Eras</p>
            <h2>Browse the archive by era</h2>
            <p className="detail-description">
              Move through Juice WRLD&apos;s timeline with dedicated era pages,
              then jump into filtered song results and play the visible set from each phase.
            </p>
          </div>

          {isLoading ? (
            <div className="album-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton-card" />
              ))}
            </div>
          ) : error ? (
            <div className="utility-empty utility-empty--panel" role="alert">
              <strong>{error}</strong>
              <span>Try refreshing the page or head back to the catalog while the API recovers.</span>
            </div>
          ) : (
            <div className="album-grid">
              {eras.map((era) => {
                const count = stats?.era_stats?.[era.name] ?? 0;

                return (
                  <article key={era.id || era.name} className="album-card">
                    <div className="album-card__eyebrow">
                      <span>Era</span>
                      <span>{formatCount(count)} songs</span>
                    </div>
                    <h3>{era.name}</h3>
                    <p>{era.description || "Explore songs, sessions, and surfaced material from this era."}</p>
                    <div className="album-card__meta">
                      <span>{era.time_frame || "Timeline not listed"}</span>
                    </div>
                    <div className="mini-action-row">
                      <Link
                        to={`/eras/${encodeURIComponent(era.name)}`}
                        className="chip is-active"
                      >
                        Open era
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function EraDetailView() {
  const { eraName = "" } = useParams();
  const resolvedEraName = decodeURIComponent(eraName);
  const [searchParams, setSearchParams] = useSearchParams();
  const [era, setEra] = useState(null);
  const [songs, setSongs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const { playQueue } = useAudioPlayer();

  useEffect(() => {
    const controller = new AbortController();

    async function loadEraData() {
      setIsLoading(true);
      setError("");

      try {
        const [erasData, songsData] = await Promise.all([
          fetchEras({ signal: controller.signal }),
          fetchSongs(
            {
              era: resolvedEraName,
              page,
              pageSize: SONGS_PER_PAGE * 2,
            },
            { signal: controller.signal },
          ),
        ]);

        const eraResults = Array.isArray(erasData) ? erasData : erasData?.results || [];
        setEra(
          eraResults.find((entry) => entry.name === resolvedEraName) || {
            name: resolvedEraName,
            description: "",
            time_frame: "",
          },
        );
        setSongs(songsData.results || []);
        setTotalCount(songsData.count || 0);

        if (!(songsData.results || []).length) {
          setError("No songs were returned for this era on the current page.");
        }
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError("This era could not be loaded from the API right now.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadEraData();
    return () => controller.abort();
  }, [page, resolvedEraName]);

  const playableSongs = useMemo(
    () => songs.filter((song) => Boolean(song?.path)),
    [songs],
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / (SONGS_PER_PAGE * 2)));

  function updatePage(nextPage) {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      if (nextPage > 1) {
        nextParams.set("page", String(nextPage));
      } else {
        nextParams.delete("page");
      }
      return nextParams;
    });
  }

  function handlePlayVisible() {
    if (!playableSongs.length) return;
    playQueue(playableSongs, 0, true);
  }

  return (
    <>
      <SiteNav />
      <div className="app-shell">
        <div className="detail-panel page-shell">
          <div className="album-hero">
            <div className="album-hero__art">
              <span>{resolvedEraName}</span>
            </div>
            <div className="album-hero__copy">
              <p className="eyebrow">Era view</p>
              <h2>{era?.name || resolvedEraName}</h2>
              <p className="detail-description">
                {era?.description || "A focused archive slice built from the API&apos;s era filter."}
              </p>
              <div className="pill-wrap">
                <span className="meta-pill">{era?.time_frame || "Timeline not listed"}</span>
                <span className="meta-pill">{formatCount(totalCount)} matches</span>
              </div>
              <div className="mini-action-row">
                <button
                  type="button"
                  className="chip is-active"
                  onClick={handlePlayVisible}
                  disabled={!playableSongs.length}
                >
                  Play visible songs
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
          ) : (
            <>
              {error ? (
                <div className="status-banner status-banner--spaced" role="status">
                  {error}
                </div>
              ) : null}

              <div className="section-heading">
                <div>
                  <p className="eyebrow">Era songs</p>
                  <h2>Current page results</h2>
                </div>
                <div className="pager">
                  <button
                    type="button"
                    onClick={() => updatePage(Math.max(1, page - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePage(page + 1)}
                    disabled={isLoading || page >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="song-grid">
                {songs.map((song) => (
                  <article key={song.id} className="song-card">
                    <Link to={`/song/${song.id}`} state={{ song }} className="song-card__link">
                      <div className="song-card-top">
                        <span className="song-tag">
                          {formatCategoryLabel(song.category)}
                        </span>
                        <span className="song-length">{song.length || "Unknown"}</span>
                      </div>
                      <h3>{song.name}</h3>
                      <p>{song.credited_artists || "Juice WRLD"}</p>
                      <div className="song-card-footer">
                        <span>{song.producers || "Producer not listed"}</span>
                        <span>#{song.public_id || song.id}</span>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Eras() {
  const { eraName } = useParams();

  if (eraName) {
    return <EraDetailView />;
  }

  return <EraListView />;
}
