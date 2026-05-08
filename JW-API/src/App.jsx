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
import "./App.css";
import logo from "./assets/logo999.png";

export default function App() {
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("home");
  const heroRef = useRef(null);
  const songsRef = useRef(null);
  const footerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentSong, isPlaying, currentTime, duration, recentSongs, playSong } =
    useAudioPlayer();
  const [playlistPickerSong, setPlaylistPickerSong] = useState(null);
  const [availablePlaylists, setAvailablePlaylists] = useState([]);
  const [playlistNotice, setPlaylistNotice] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 120;
      const heroSection = heroRef.current;
      const songsSection = songsRef.current;
      const footerSection = footerRef.current;

      if (
        heroSection &&
        scrollPos < heroSection.offsetTop + heroSection.offsetHeight
      ) {
        setActiveNav("home");
      } else if (
        songsSection &&
        scrollPos < songsSection.offsetTop + songsSection.offsetHeight
      ) {
        setActiveNav("explore");
      } else if (footerSection) {
        setActiveNav("about");
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToSection(section, navName) {
    setActiveNav(navName);
    setIsMenuOpen(false);

    let element = null;
    if (section === "home") element = heroRef.current;
    if (section === "explore") element = songsRef.current;
    if (section === "about") element = footerRef.current;

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMenuOpen]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const nextSearch = searchParams.get("search") ?? "";
    const nextCategory = searchParams.get("category") ?? "";

    const frameId = window.requestAnimationFrame(() => {
      setSearchInput(nextSearch);
      setSearchTerm(nextSearch);
      setActiveCategory(nextCategory);
      setPage(1);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [searchParams]);

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
        const data = await fetchSongs(
          {
            page,
            pageSize: SONGS_PER_PAGE,
            category: activeCategory,
            search: searchTerm,
          },
          { signal: controller.signal },
        );
        const results = data.results ?? [];

        setSongs(results);
        if (!results.length) {
          setErrorMessage(
            "No songs matched this filter. Try a broader search.",
          );
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setSongs([]);
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
  }, [activeCategory, page, searchTerm]);

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

  const totalSongs = stats?.total_songs ?? 2452;
  const categoryStats = stats?.category_stats ?? {};
  const topCategories = Object.entries(categoryStats)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
  const featuredSongs = useMemo(() => songs.slice(0, 3), [songs]);
  const spotlightSong = songs[spotlightIndex] ?? null;
  const currentProgress =
    duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  function handleCategoryChange(event) {
    const nextCategory = event.target.value;
    setActiveCategory(nextCategory);
    setPage(1);
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      if (nextCategory) {
        nextParams.set("category", nextCategory);
      } else {
        nextParams.delete("category");
      }
      return nextParams;
    });
  }

  function openRandomSong() {
    if (!songs.length) return;
    const randomSong = songs[Math.floor(Math.random() * songs.length)];
    navigate(`/song/${randomSong.id}`, { state: { song: randomSong } });
  }

  function openPlaylistPicker(song) {
    setAvailablePlaylists(listPlaylists());
    setPlaylistNotice("");
    setPlaylistPickerSong(song);
  }

  function closePlaylistPicker() {
    setPlaylistPickerSong(null);
    setPlaylistNotice("");
  }

  function handleQuickCreatePlaylist() {
    if (!playlistPickerSong) return;

    const playlist = createPlaylist({
      name: `Favorites ${new Date().toLocaleDateString("en-US")}`,
      songs: [playlistPickerSong],
    });

    setAvailablePlaylists(listPlaylists());
    setPlaylistNotice(`Added to new playlist "${playlist.name}".`);
  }

  function handleAddSongToPlaylist(playlistId) {
    if (!playlistPickerSong) return;

    const updatedPlaylist = addSongToPlaylist(playlistId, playlistPickerSong);
    if (!updatedPlaylist) {
      setPlaylistNotice("That playlist could not be updated.");
      return;
    }

    setAvailablePlaylists(listPlaylists());
    setPlaylistNotice(`Saved in "${updatedPlaylist.name}".`);
  }

  return (
    <>
      <nav className="top-navbar">
        <img
          src={logo}
          alt="999 logo"
          className="navbar-logo"
          onClick={() => scrollToSection("home", "home")}
          style={{ cursor: "pointer" }}
        />
        <button
          className="menu-toggle"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          Menu
        </button>
        <ul className={`nav-links ${isMenuOpen ? "open" : ""}`}>
          <li>
            <a
              href="#home"
              className={
                activeNav === "home" && location.pathname === "/"
                  ? "active"
                  : ""
              }
              onClick={(event) => {
                event.preventDefault();
                if (location.pathname !== "/") {
                  window.location.href = "/";
                  return;
                }
                scrollToSection("home", "home");
              }}
            >
              Home
            </a>
          </li>
          <li>
            <a
              href="#explore"
              className={
                activeNav === "explore" && location.pathname === "/"
                  ? "active"
                  : ""
              }
              onClick={(event) => {
                event.preventDefault();
                if (location.pathname !== "/") {
                  window.location.href = "/#explore";
                  return;
                }
                scrollToSection("explore", "explore");
              }}
            >
              Explore
            </a>
          </li>
          <li>
            <Link
              to="/radio"
              className={location.pathname === "/radio" ? "active" : ""}
              onClick={() => setIsMenuOpen(false)}
            >
              Radio
            </Link>
          </li>
          <li>
            <Link
              to="/playlists"
              className={location.pathname === "/playlists" ? "active" : ""}
              onClick={() => setIsMenuOpen(false)}
            >
              Playlists
            </Link>
          </li>
          <li>
            <Link
              to="/create-playlist"
              className={
                location.pathname === "/create-playlist" ? "active" : ""
              }
              onClick={() => setIsMenuOpen(false)}
            >
              Create Playlist
            </Link>
          </li>
          <li>
            <Link
              to="/about"
              className={location.pathname === "/about" ? "active" : ""}
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
          </li>
        </ul>
      </nav>

      <main className="app-shell">
        <section className="hero-panel" ref={heroRef}>
          <div className="hero-copy">
            <p className="eyebrow">Juice WRLD Discography Explorer</p>
            <h1>
              Search the archive, jump between eras, and play songs straight
              from the API.
            </h1>
            <p className="hero-text">
              This React site is powered by the Juice WRLD API song catalog,
              with live search, category filters, and individual song pages.
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="cta-button"
                onClick={() => scrollToSection("explore", "explore")}
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
                <strong>{formatCount(songs.length)}</strong>
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
                    state={{ song: currentSong }}
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
                <span className="mini-badge">{formatCount(recentSongs.length)}</span>
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
                    Songs you play on the site will show up here for quick access.
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
                setSearchParams((currentParams) => {
                  const nextParams = new URLSearchParams(currentParams);
                  if (nextValue.trim()) {
                    nextParams.set("search", nextValue.trim());
                  } else {
                    nextParams.delete("search");
                  }
                  return nextParams;
                });
              }}
              placeholder="Search by title, artist, or phrase"
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select
              id="select"
              value={activeCategory}
              onChange={handleCategoryChange}
            >
              <option value="">All songs</option>
              {categories.map((category, index) => {
                const value = String(
                  category.name ?? category.slug ?? category.value ?? index,
                );
                const description = category.description
                  ? ` - ${category.description}`
                  : "";

                return (
                  <option key={value} value={value}>
                    {formatCategoryLabel(value)}
                    {description}
                  </option>
                );
              })}
            </select>
          </label>
          <div className="filter-summary">
            <span>Page {page}</span>
            <span>
              {searchTerm
                ? `Searching for "${searchTerm}"`
                : "Browsing the full catalog"}
            </span>
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
                }}
              >
                {formatCategoryLabel(category)} - {formatCount(count)}
              </button>
            ))}
          </section>
        )}

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
                onClick={() =>
                  setPage((currentPage) => Math.max(1, currentPage - 1))
                }
                disabled={page === 1 || isLoading}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={isLoading || songs.length < SONGS_PER_PAGE}
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
                      state={{ song }}
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
              : songs.map((song) => (
                  <article key={song.id} className="song-card song-card--interactive">
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
                      state={{ song }}
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
        </div>

        <footer className="site-footer" ref={footerRef}>
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
              <button type="button" className="chip" onClick={closePlaylistPicker}>
                Close
              </button>
            </div>

            <p className="section-subtitle">
              Choose a playlist or create one instantly without leaving the catalog.
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

            {playlistNotice ? (
              <div className="status-banner playlist-picker__notice">{playlistNotice}</div>
            ) : null}

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
                    <span>{playlist.song_count || playlist.songs?.length || 0} songs</span>
                  </button>
                ))
              ) : (
                <p className="section-subtitle">
                  No playlists yet. Create one above and this song will be added right away.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
