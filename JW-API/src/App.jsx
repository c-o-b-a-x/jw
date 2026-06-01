import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAudioPlayer } from "./audio-player";
import {
  SONGS_PER_PAGE,
  fetchSongs,
  fetchCategories,
  fetchStats,
  formatCategoryLabel,
  formatCount,
} from "./api";
import {
  addSongToPlaylist,
  createPlaylist,
  listPlaylists,
} from "./playlistStore";
import SiteNav from "./SiteNav";
import "./App.css";
import { useToast } from "./toast";

const SORT_OPTIONS = [
  {
    value: "default",
    label: "Default order",
    description: "Keep the API's natural order for the current page.",
  },
  {
    value: "latest_surfaced",
    label: "Latest surfaced",
    description: "Show the most recently surfaced or released songs first.",
  },
  {
    value: "date_recorded",
    label: "Date recorded",
    description: "Sort by the newest recorded sessions first.",
  },
  {
    value: "length",
    label: "Length",
    description: "Push longer tracks ahead of shorter ones.",
  },
];

function parseLooseDate(value) {
  if (!value) return null;

  const text = String(value).replace(/\r/g, " ").replace(/\n/g, " ");
  const parsedCandidates = [];
  const fullDateMatches = text.match(
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/gi,
  );

  fullDateMatches?.forEach((match) => {
    const parsed = Date.parse(match);
    if (!Number.isNaN(parsed)) {
      parsedCandidates.push(parsed);
    }
  });

  const isoDateMatches = text.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  isoDateMatches?.forEach((match) => {
    const parsed = Date.parse(match);
    if (!Number.isNaN(parsed)) {
      parsedCandidates.push(parsed);
    }
  });

  if (parsedCandidates.length) {
    return Math.max(...parsedCandidates);
  }

  const yearMatches = text.match(/\b(19|20)\d{2}\b/g);
  if (yearMatches?.length) {
    return Math.max(
      ...yearMatches
        .map((year) => Date.parse(`${year}-01-01`))
        .filter((parsed) => !Number.isNaN(parsed)),
    );
  }

  return null;
}

function parseLengthToSeconds(value) {
  if (!value) return null;

  const parts = String(value)
    .split(":")
    .map((segment) => Number.parseInt(segment.trim(), 10));

  if (!parts.length || parts.some((segment) => Number.isNaN(segment))) {
    return null;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

function getSurfacedStatusValue(song) {
  return (
    parseLooseDate(song?.leak_status) ??
    parseLooseDate(song?.leakStatus) ??
    parseLooseDate(song?.date_leaked) ??
    parseLooseDate(song?.preview_date) ??
    0
  );
}

function getSongSortValue(song, sortMode) {
  if (sortMode === "latest_surfaced") {
    if (song.category === "released") {
      return 0;
    }

    if (song.category === "unreleased") {
      return getSurfacedStatusValue(song);
    }

    return (
      parseLooseDate(song.preview_date) ??
      getSurfacedStatusValue(song) ??
      parseLooseDate(song.release_date) ??
      0
    );
  }

  if (sortMode === "date_recorded") {
    if (song.category === "released") {
      return 0;
    }

    return parseLooseDate(song.record_dates) ?? 0;
  }

  if (sortMode === "length") {
    return parseLengthToSeconds(song.length) ?? 0;
  }

  return 0;
}

export default function App() {
  const [songs, setSongs] = useState([]);
  const [totalSongCount, setTotalSongCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [sortMode, setSortMode] = useState("default");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const songsRef = useRef(null);
  const categoryMenuRef = useRef(null);
  const sortMenuRef = useRef(null);
  const hasRestoredCardRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    recentSongs,
    playSong,
  } = useAudioPlayer();
  const [playlistPickerSong, setPlaylistPickerSong] = useState(null);
  const [availablePlaylists, setAvailablePlaylists] = useState([]);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        isCategoryMenuOpen &&
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target)
      ) {
        setIsCategoryMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isCategoryMenuOpen]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        isSortMenuOpen &&
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target)
      ) {
        setIsSortMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isSortMenuOpen]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const nextSearch = searchParams.get("search") ?? "";
    const nextCategory = searchParams.get("category") ?? "";
    const nextSort = searchParams.get("sort") ?? "default";
    const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const nextPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

    const frameId = window.requestAnimationFrame(() => {
      setSearchInput(nextSearch);
      setSearchTerm(nextSearch);
      setActiveCategory(nextCategory);
      setSortMode(
        SORT_OPTIONS.some((option) => option.value === nextSort)
          ? nextSort
          : "default",
      );
      setPage(nextPage);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [searchParams]);

  useEffect(() => {
    hasRestoredCardRef.current = false;
  }, [location.key]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBootstrapData() {
      try {
        const [categoriesData, statsData] = await Promise.all([
          fetchCategories({ signal: controller.signal }),
          fetchStats({ signal: controller.signal }),
        ]);

        setCategories(categoriesData.categories ?? []);
        setStats(statsData);
      } catch (error) {
        if (error.name !== "AbortError") {
          setErrorMessage(
            "Failed to load categories and stats. Song browsing still works.",
          );
        }
      } finally {
        setIsBootstrapping(false);
      }
    }

    loadBootstrapData();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSongs() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        let results = [];
        let totalCount = 0;

        if (sortMode === "default") {
          const data = await fetchSongs(
            {
              page,
              pageSize: SONGS_PER_PAGE,
              category: activeCategory,
              search: searchTerm,
            },
            { signal: controller.signal },
          );

          results = data.results ?? [];
          totalCount = data.count ?? results.length;
        } else {
          const firstPage = await fetchSongs(
            {
              page: 1,
              pageSize: 100,
              category: activeCategory,
              search: searchTerm,
            },
            { signal: controller.signal },
          );

          totalCount = firstPage.count ?? 0;
          results = firstPage.results ?? [];

          const totalPages = Math.ceil(totalCount / 100);

          if (totalPages > 1) {
            const remainingPages = await Promise.all(
              Array.from({ length: totalPages - 1 }, (_, index) =>
                fetchSongs(
                  {
                    page: index + 2,
                    pageSize: 100,
                    category: activeCategory,
                    search: searchTerm,
                  },
                  { signal: controller.signal },
                ),
              ),
            );

            results = [
              ...results,
              ...remainingPages.flatMap((response) => response.results ?? []),
            ];
          }
        }

        setSongs(results);
        setTotalSongCount(totalCount || results.length);
        if (!results.length) {
          setErrorMessage(
            "No songs matched this filter. Try a broader search.",
          );
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setSongs([]);
          setTotalSongCount(0);
          setErrorMessage(
            "The API request failed. Check your network and try again.",
          );
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadSongs();
    return () => controller.abort();
  }, [activeCategory, page, searchTerm, sortMode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!songs.length) {
        setSpotlightIndex(0);
        return;
      }

      const nextIndex = Math.floor(Math.random() * songs.length);
      setSpotlightIndex(nextIndex);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [songs]);

  useEffect(() => {
    if (
      location.pathname !== "/" ||
      isLoading ||
      !songs.length ||
      hasRestoredCardRef.current
    ) {
      return undefined;
    }

    const scrollSongId = location.state?.catalogReturn?.scrollSongId;
    if (!scrollSongId) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      const targetCard = document.getElementById(`song-card-${scrollSongId}`);
      if (!targetCard) return;

      targetCard.scrollIntoView({ behavior: "auto", block: "center" });
      hasRestoredCardRef.current = true;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isLoading, location.pathname, location.state, songs]);

  const totalSongs = stats?.total_songs ?? 2452;
  const categoryStats = stats?.category_stats ?? {};
  const topCategories = Object.entries(categoryStats)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
  const sortedSongs = useMemo(() => {
    if (sortMode === "default") {
      return songs;
    }

    return [...songs].sort((left, right) => {
      const rightValue = getSongSortValue(right, sortMode);
      const leftValue = getSongSortValue(left, sortMode);

      if (rightValue !== leftValue) {
        return rightValue - leftValue;
      }

      return String(left.name || "").localeCompare(String(right.name || ""));
    });
  }, [songs, sortMode]);
  const featuredSongs = useMemo(() => sortedSongs.slice(0, 3), [sortedSongs]);
  const spotlightSong = sortedSongs[spotlightIndex] ?? null;
  const displayedSongs = useMemo(() => {
    if (sortMode === "default") {
      return sortedSongs;
    }

    const startIndex = (page - 1) * SONGS_PER_PAGE;
    return sortedSongs.slice(startIndex, startIndex + SONGS_PER_PAGE);
  }, [page, sortedSongs, sortMode]);
  const currentProgress =
    duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const activeSortOption =
    SORT_OPTIONS.find((option) => option.value === sortMode) ?? SORT_OPTIONS[0];
  const totalPages = Math.max(1, Math.ceil(totalSongCount / SONGS_PER_PAGE));

  function updateCatalogParams({
    search = searchTerm,
    category = activeCategory,
    sort = sortMode,
    nextPage = page,
  } = {}) {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);

      if (search) {
        nextParams.set("search", search);
      } else {
        nextParams.delete("search");
      }

      if (category) {
        nextParams.set("category", category);
      } else {
        nextParams.delete("category");
      }

      if (sort && sort !== "default") {
        nextParams.set("sort", sort);
      } else {
        nextParams.delete("sort");
      }

      if (nextPage > 1) {
        nextParams.set("page", String(nextPage));
      } else {
        nextParams.delete("page");
      }

      return nextParams;
    });
  }

  function createCatalogReturn(songId) {
    return {
      search: searchTerm,
      category: activeCategory,
      sort: sortMode,
      page,
      scrollSongId: songId,
    };
  }

  function handleCategoryChange(event) {
    const nextCategory = event.target.value;
    setActiveCategory(nextCategory);
    setPage(1);
    updateCatalogParams({ category: nextCategory, nextPage: 1 });
  }

  function selectCategory(nextCategory) {
    handleCategoryChange({ target: { value: nextCategory } });
    setIsCategoryMenuOpen(false);
  }

  function selectSort(nextSort) {
    setSortMode(nextSort);
    setPage(1);
    setIsSortMenuOpen(false);
    updateCatalogParams({ sort: nextSort, nextPage: 1 });
  }

  function resetCatalogFilters() {
    setSearchInput("");
    setSearchTerm("");
    setActiveCategory("");
    setSortMode("default");
    setPage(1);
    setIsCategoryMenuOpen(false);
    setIsSortMenuOpen(false);
    updateCatalogParams({
      search: "",
      category: "",
      sort: "default",
      nextPage: 1,
    });
  }

  function openRandomSong() {
    if (!songs.length) return;
    const randomSong = songs[Math.floor(Math.random() * songs.length)];
    navigate(`/song/${randomSong.id}`, {
      state: {
        song: randomSong,
        catalogReturn: createCatalogReturn(randomSong.id),
      },
    });
  }

  function openPlaylistPicker(song) {
    setAvailablePlaylists(listPlaylists());
    setPlaylistPickerSong(song);
  }

  function closePlaylistPicker() {
    setPlaylistPickerSong(null);
  }

  function handleQuickCreatePlaylist() {
    if (!playlistPickerSong) return;

    const playlist = createPlaylist({
      name: `Favorites ${new Date().toLocaleDateString("en-US")}`,
      songs: [playlistPickerSong],
    });

    setAvailablePlaylists(listPlaylists());
    pushToast({
      title: "Playlist created",
      message: `${playlistPickerSong.name} was added to ${playlist.name}.`,
      tone: "success",
    });
  }

  function handleAddSongToPlaylist(playlistId) {
    if (!playlistPickerSong) return;

    const updatedPlaylist = addSongToPlaylist(playlistId, playlistPickerSong);
    if (!updatedPlaylist) {
      pushToast({
        title: "Playlist update failed",
        message: "That playlist could not be updated.",
        tone: "warning",
      });
      return;
    }

    setAvailablePlaylists(listPlaylists());
    pushToast({
      title: "Song saved",
      message: `${playlistPickerSong.name} is now in ${updatedPlaylist.name}.`,
      tone: "success",
    });
  }

  return (
    <>
      <SiteNav />

      <main className="app-shell">
        <section className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">Juice WRLD Discography Explorer</p>

            <p className="hero-text">
              This React site is powered by the Juice WRLD API song catalog,
              with live search, category filters, and individual song pages.
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="cta-button"
                onClick={() =>
                  songsRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
              >
                Browse tracks
              </button>
              <Link className="cta-button cta-button--secondary" to="/radio">
                Start radio
              </Link>
              <button
                type="button"
                className="cta-button cta-button--ghost"
                onClick={openRandomSong}
                disabled={!songs.length}
              >
                Random song
              </button>
            </div>
            <div className="hero-stats">
              <article>
                <span>Total songs</span>
                <strong>{formatCount(totalSongs)}</strong>
              </article>
              <article>
                <span>Results on page</span>
                <strong>{formatCount(displayedSongs.length)}</strong>
              </article>
              <article>
                <span>Current category</span>
                <strong>
                  {formatCategoryLabel(activeCategory || "all songs")}
                </strong>
              </article>
            </div>
          </div>

          <div className="hero-spotlight">
            <div className="vinyl-ring" />
            <div className="spotlight-card">
              <p className="spotlight-label">Now spotlighting</p>
              <h2>{spotlightSong?.name ?? "Loading tracks..."}</h2>
              <p>Tap into the archive and open any song for full details.</p>
              <div className="spotlight-meta">
                <span>999</span>
                <span>LLJW</span>
              </div>
            </div>
          </div>
        </section>

        {(currentSong || recentSongs.length > 0) && (
          <section className="discover-grid" aria-label="Listening shortcuts">
            {currentSong ? (
              <article className="mini-panel">
                <div className="mini-panel__header">
                  <div>
                    <p className="eyebrow">Continue listening</p>
                    <h2>{currentSong.name}</h2>
                  </div>
                  <span className="mini-badge">
                    {isPlaying ? "Playing now" : "Ready to resume"}
                  </span>
                </div>
                <p className="section-subtitle">
                  Keep your current session moving while you browse the archive.
                </p>
                <div className="progress-strip" aria-hidden="true">
                  <span style={{ width: `${currentProgress}%` }} />
                </div>
                <div className="mini-action-row">
                  <button
                    type="button"
                    className="chip is-active"
                    onClick={() => playSong(currentSong)}
                  >
                    Restart track
                  </button>
                  <Link
                    className="chip"
                    to={`/song/${currentSong.id}`}
                    state={{
                      song: currentSong,
                      catalogReturn: createCatalogReturn(currentSong.id),
                    }}
                  >
                    Open details
                  </Link>
                </div>
              </article>
            ) : null}

            <article className="mini-panel">
              <div className="mini-panel__header">
                <div>
                  <p className="eyebrow">Recently played</p>
                  <h2>Pick up where you left off</h2>
                </div>
                <span className="mini-badge">
                  {formatCount(recentSongs.length)}
                </span>
              </div>
              <div className="mini-song-list">
                {recentSongs.length > 0 ? (
                  recentSongs.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      className="mini-song-item"
                      onClick={() => playSong(song)}
                    >
                      <strong>{song.name}</strong>
                      <span>{song.credited_artists || "Juice WRLD"}</span>
                    </button>
                  ))
                ) : (
                  <p className="section-subtitle">
                    Songs you play on the site will show up here for quick
                    access.
                  </p>
                )}
              </div>
            </article>
          </section>
        )}

        <section className="filter-bar">
          <label className="field">
            <span>Search</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSearchInput(nextValue);
                setPage(1);
                updateCatalogParams({
                  search: nextValue.trim(),
                  nextPage: 1,
                });
              }}
              placeholder="Search by title, artist, or phrase"
            />
          </label>
          <label className="field">
            <span>Category</span>
            <div
              className={`custom-select ${isCategoryMenuOpen ? "is-open" : ""}`}
              ref={categoryMenuRef}
            >
              <button
                type="button"
                className="custom-select__trigger"
                aria-haspopup="listbox"
                aria-expanded={isCategoryMenuOpen}
                onClick={() => setIsCategoryMenuOpen((open) => !open)}
              >
                <span>
                  {formatCategoryLabel(activeCategory || "all songs")}
                </span>
                <span className="custom-select__chevron" aria-hidden="true">
                  ▾
                </span>
              </button>
              {isCategoryMenuOpen ? (
                <div className="custom-select__menu" role="listbox">
                  <button
                    type="button"
                    className={`custom-select__option ${
                      activeCategory === "" ? "is-selected" : ""
                    }`}
                    onClick={() => selectCategory("")}
                  >
                    <strong>All songs</strong>
                    <span>Browse the full archive without a category filter.</span>
                  </button>
                  {categories.map((category, index) => {
                    const value = String(
                      category.name ?? category.slug ?? category.value ?? index,
                    );

                    return (
                      <button
                        key={value}
                        type="button"
                        className={`custom-select__option ${
                          activeCategory === value ? "is-selected" : ""
                        }`}
                        onClick={() => selectCategory(value)}
                      >
                        <strong>{formatCategoryLabel(value)}</strong>
                        <span>
                          {category.description || "Filter the page to this song lane."}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </label>
          <label className="field">
            <span>Sort by</span>
            <div
              className={`custom-select ${isSortMenuOpen ? "is-open" : ""}`}
              ref={sortMenuRef}
            >
              <button
                type="button"
                className="custom-select__trigger"
                aria-haspopup="listbox"
                aria-expanded={isSortMenuOpen}
                onClick={() => setIsSortMenuOpen((open) => !open)}
              >
                <span>{activeSortOption.label}</span>
                <span className="custom-select__chevron" aria-hidden="true">
                  â–¾
                </span>
              </button>
              {isSortMenuOpen ? (
                <div className="custom-select__menu" role="listbox">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`custom-select__option ${
                        sortMode === option.value ? "is-selected" : ""
                      }`}
                      onClick={() => selectSort(option.value)}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </label>
          <div className="filter-summary">
            <span>Page {page}</span>
            <span>
              {searchTerm
                ? `Searching for "${searchTerm}"`
                : "Browsing the full catalog"}
            </span>
            <span>Sorted by {activeSortOption.label.toLowerCase()}</span>
          </div>
        </section>

        {topCategories.length > 0 && (
          <section className="chip-row" aria-label="Top categories">
            {topCategories.map(([category, count]) => (
              <button
                key={String(category)}
                type="button"
                className={`chip ${activeCategory === category ? "is-active" : ""}`}
                onClick={() => {
                  setActiveCategory(category);
                  setPage(1);
                  updateCatalogParams({ category, nextPage: 1 });
                  setIsCategoryMenuOpen(false);
                }}
              >
                {formatCategoryLabel(category)} - {formatCount(count)}
              </button>
            ))}
          </section>
        )}

        <section className="mini-panel albums-callout">
          <div className="mini-panel__header">
            <div>
              <p className="eyebrow">Released albums</p>
              <h2>Listen to the official projects in order</h2>
            </div>
            <span className="mini-badge">6 albums</span>
          </div>
          <p className="section-subtitle">
            Jump into the new albums section for front-to-back listening queues built
            from every official release.
          </p>
          <div className="mini-action-row">
            <Link to="/albums" className="chip is-active">
              Open albums
            </Link>
          </div>
        </section>

        {errorMessage && (
          <section className="status-banner" role="status">
            {errorMessage}
          </section>
        )}

        <div className="song-list-panel" ref={songsRef}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Tracks</p>
              <h2>Explore the catalog</h2>
              <p className="section-subtitle">
                Move between search, random discovery, and quick replays without
                losing playback.
              </p>
            </div>
            <div className="pager">
              <button
                type="button"
                onClick={() => {
                  const nextPage = Math.max(1, page - 1);
                  setPage(nextPage);
                  updateCatalogParams({ nextPage });
                }}
                disabled={page === 1 || isLoading}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  updateCatalogParams({ nextPage });
                }}
                disabled={isLoading || page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>

          {featuredSongs.length > 0 && !isLoading && (
            <section className="quick-picks" aria-label="Quick picks">
              {featuredSongs.map((song, index) => (
                <article key={song.id} className="quick-pick-card">
                  <span className="quick-pick-card__index">0{index + 1}</span>
                  <div>
                    <h3>{song.name}</h3>
                    <p>{song.credited_artists || "Juice WRLD"}</p>
                  </div>
                  <div className="mini-action-row">
                    <button
                      type="button"
                      className="chip is-active"
                      onClick={() => playSong(song)}
                    >
                      Play now
                    </button>
                    <Link
                      to={`/song/${song.id}`}
                      state={{
                        song,
                        catalogReturn: createCatalogReturn(song.id),
                      }}
                      className="chip"
                    >
                      Details
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          )}

          <div className="song-grid">
            {isLoading
              ? Array.from({ length: SONGS_PER_PAGE }).map((_, index) => (
                  <article
                    key={index}
                    className="song-card skeleton-card"
                    aria-hidden="true"
                  />
                ))
              : displayedSongs.map((song) => (
                  <article
                    key={song.id}
                    id={`song-card-${song.id}`}
                    data-song-card-id={song.id}
                    className="song-card song-card--interactive"
                  >
                    <button
                      type="button"
                      className="song-card__playlist-button"
                      aria-label={`Add ${song.name} to playlist`}
                      onClick={() => openPlaylistPicker(song)}
                    >
                      +
                    </button>
                    <Link
                      to={`/song/${song.id}`}
                      state={{
                        song,
                        catalogReturn: createCatalogReturn(song.id),
                      }}
                      className="song-card__link"
                    >
                      <div className="song-card-top">
                        <span className="song-tag">
                          {formatCategoryLabel(song.category)}
                        </span>
                        <span className="song-length">
                          {song.length || "Unknown"}
                        </span>
                      </div>
                      <h3>{song.name}</h3>
                      <p>{song.credited_artists || "Juice WRLD"}</p>
                      <div className="song-card-footer">
                        <span>{song.era?.name || "Unknown era"}</span>
                        <span>#{song.public_id || song.id}</span>
                      </div>
                    </Link>
                  </article>
                ))}
          </div>

          {!isLoading && sortedSongs.length === 0 ? (
            <div className="utility-empty utility-empty--panel">
              <strong>No songs matched this page</strong>
              <span>
                Try a broader keyword, switch categories, or clear everything and
                jump back into the full archive.
              </span>
              <div className="utility-empty__actions">
                <button
                  type="button"
                  className="chip is-active"
                  onClick={resetCatalogFilters}
                >
                  Clear filters
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    setPage(1);
                    updateCatalogParams({ nextPage: 1 });
                  }}
                  disabled={page === 1}
                >
                  Go to page 1
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="site-footer">
          <p>Built with React and the Juice WRLD API.</p>
          <div className="footer-content">
            <h3 id="footer-text">Developed by Coby Hughes</h3>
            <a
              href="https://github.com/c-o-b-a-x"
              target="_blank"
              className="github-link"
              rel="noopener noreferrer"
            >
              <img
                src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg"
                alt="GitHub Logo"
                className="github-logo"
              />
            </a>
          </div>
          <p>
            {isBootstrapping
              ? "Loading catalog metadata..."
              : "Ready to browse the archive."}
          </p>
        </footer>
      </main>

      {playlistPickerSong ? (
        <div className="playlist-picker-backdrop" onClick={closePlaylistPicker}>
          <div
            className="playlist-picker"
            role="dialog"
            aria-modal="true"
            aria-label="Add song to playlist"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="playlist-picker__header">
              <div>
                <p className="eyebrow">Quick add</p>
                <h2>{playlistPickerSong.name}</h2>
              </div>
              <button
                type="button"
                className="chip"
                onClick={closePlaylistPicker}
              >
                Close
              </button>
            </div>

            <p className="section-subtitle">
              Choose a playlist or create one instantly without leaving the
              catalog.
            </p>

            <div className="playlist-picker__actions">
              <button
                type="button"
                className="chip is-active"
                onClick={handleQuickCreatePlaylist}
              >
                New playlist
              </button>
            </div>

            <div className="playlist-picker__list">
              {availablePlaylists.length > 0 ? (
                availablePlaylists.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    className="playlist-picker__item"
                    onClick={() => handleAddSongToPlaylist(playlist.id)}
                  >
                    <strong>{playlist.name}</strong>
                    <span>
                      {playlist.song_count || playlist.songs?.length || 0} songs
                    </span>
                  </button>
                ))
              ) : (
                <p className="section-subtitle">
                  No playlists yet. Create one above and this song will be added
                  right away.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
