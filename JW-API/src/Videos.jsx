import { useEffect, useMemo, useState } from "react";
import { browseFiles, buildFileUrl } from "./api";
import SiteNav from "./SiteNav";
import "./App.css";

const VIDEO_PAGE_SIZE = 12;
const VIDEO_DEFAULT_TERMS = [".mp4", ".mov"];

function isVideoFile(item) {
  const candidatePath =
    item?.path || item?.relative_path || item?.name || item?.id || "";
  return /\.(mp4|mov)$/i.test(candidatePath);
}

function getVideoPath(item) {
  return item?.path || item?.relative_path || item?.id || "";
}

function getVideoName(item) {
  return item?.name || getVideoPath(item).split("/").pop() || "Untitled video";
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function dedupeVideos(items) {
  const seenPaths = new Set();

  return items.filter((item) => {
    const path = getVideoPath(item);
    if (!path || seenPaths.has(path)) return false;
    seenPaths.add(path);
    return true;
  });
}

export default function Videos() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [videos, setVideos] = useState([]);
  const [selectedVideoPath, setSelectedVideoPath] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadVideos() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const searchTerms = searchTerm ? [searchTerm] : VIDEO_DEFAULT_TERMS;
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

        const nextVideos = dedupeVideos(
          settled
            .filter((result) => result.status === "fulfilled")
            .flatMap((result) => result.value?.items || [])
            .filter(isVideoFile),
        ).sort((left, right) => {
          const rightDate = Date.parse(right.modified || "") || 0;
          const leftDate = Date.parse(left.modified || "") || 0;

          if (rightDate !== leftDate) {
            return rightDate - leftDate;
          }

          return getVideoName(left).localeCompare(getVideoName(right));
        });

        setVideos(nextVideos);
        setSelectedVideoPath((currentPath) => {
          if (currentPath && nextVideos.some((video) => getVideoPath(video) === currentPath)) {
            return currentPath;
          }

          return getVideoPath(nextVideos[0]) || "";
        });

        if (!nextVideos.length) {
          setErrorMessage(
            searchTerm
              ? "No archive videos matched that search yet."
              : "No archive videos were returned by the file browser.",
          );
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setVideos([]);
          setSelectedVideoPath("");
          setErrorMessage("The video archive could not be loaded right now.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadVideos();
    return () => controller.abort();
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(videos.length / VIDEO_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * VIDEO_PAGE_SIZE;
    return videos.slice(startIndex, startIndex + VIDEO_PAGE_SIZE);
  }, [currentPage, videos]);
  const selectedVideo = useMemo(
    () => videos.find((video) => getVideoPath(video) === selectedVideoPath) || videos[0] || null,
    [selectedVideoPath, videos],
  );
  const selectedVideoUrl = buildFileUrl(getVideoPath(selectedVideo));

  return (
    <>
      <SiteNav />
      <div className="app-shell">

        <section className="hero-panel video-library-hero">
        <div className="hero-copy">
          <p className="eyebrow">Video archive</p>
          <h1>Search through the original video files</h1>
          <p className="hero-text">
            Browse MP4 and MOV uploads from the archive, including clips that are not
            tied to one specific song page.
          </p>
          <div className="hero-stats">
            <article>
              <span>Results</span>
              <strong>{videos.length}</strong>
            </article>
            <article>
              <span>Page</span>
              <strong>{currentPage}</strong>
            </article>
            <article>
              <span>Mode</span>
              <strong>{searchTerm ? "Search" : "All videos"}</strong>
            </article>
          </div>
        </div>

        <div className="hero-spotlight video-library-hero__search">
          <div className="video-library-search-card">
            <p className="spotlight-label">Archive lookup</p>
            <label className="field">
              <span>Search videos</span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by file name, song title, session, or phrase"
              />
            </label>
            <div className="chip-row">
              <button
                type="button"
                className={`chip ${searchTerm === "" ? "is-active" : ""}`}
                onClick={() => setSearchInput("")}
              >
                All videos
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => setSearchInput("studio")}
              >
                Studio
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => setSearchInput("music video")}
              >
                Music videos
              </button>
            </div>
          </div>
        </div>
        </section>

        {errorMessage && !isLoading ? (
          <section className="status-banner" role="status">
            {errorMessage}
          </section>
        ) : null}

        <div className="detail-layout detail-layout--page video-library-layout">
          <div className="detail-panel detail-panel--page">
          <div className="block-header">
            <div>
              <p className="block-label">Featured video</p>
              <h2>{selectedVideo ? getVideoName(selectedVideo) : "No video selected"}</h2>
            </div>
            <div className="pager">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage === totalPages || isLoading}
              >
                Next
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="skeleton-stack">
              <div className="skeleton-card skeleton-card--hero" />
              <div className="skeleton-card skeleton-card--list" />
            </div>
          ) : selectedVideo ? (
            <div className="video-stage">
              <div className="video-stage__player">
                <video
                  key={getVideoPath(selectedVideo)}
                  controls
                  preload="metadata"
                  className="video-stage__video"
                  src={selectedVideoUrl}
                >
                  Your browser does not support embedded video playback.
                </video>
              </div>
              <div className="video-stage__details">
                <strong>{getVideoName(selectedVideo)}</strong>
                <span>{getVideoPath(selectedVideo)}</span>
                <span>
                  {[formatFileSize(selectedVideo?.size), selectedVideo?.modified || "Unknown date"]
                    .filter(Boolean)
                    .join(" / ")}
                </span>
              </div>
            </div>
          ) : (
            <div className="utility-empty utility-empty--panel">
              <strong>No videos to show</strong>
              <span>Try a different phrase or clear the search to scan the wider archive.</span>
            </div>
          )}
          </div>

          <aside className="detail-sidebar">
            <section className="detail-sidecard">
            <div className="block-header">
              <p className="block-label">Video results</p>
              <span className="block-hint">
                {isLoading ? "Loading..." : `${pagedVideos.length} on this page`}
              </span>
            </div>

            {pagedVideos.length > 0 ? (
              <div className="video-list">
                {pagedVideos.map((video, index) => {
                  const path = getVideoPath(video);
                  const isSelected = path === getVideoPath(selectedVideo);

                  return (
                    <button
                      key={path}
                      type="button"
                      className={`video-list__item ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedVideoPath(path)}
                    >
                      <strong>{getVideoName(video)}</strong>
                      <span>
                        {(currentPage - 1) * VIDEO_PAGE_SIZE + index + 1}. {formatFileSize(video?.size)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : !isLoading ? (
              <div className="utility-empty utility-empty--compact">
                <strong>No results on this page</strong>
                <span>Try another search phrase or go back to the full archive list.</span>
              </div>
            ) : null}
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
