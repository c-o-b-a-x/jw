import SiteNav from "./SiteNav";
import "./App.css";
import logo from "./assets/logo999.png";

export default function About() {
  const coreFeatures = [
    "Search, filter, and sort through the Juice archive by category, surfaced date, and track length.",
    "Open detailed song pages with archive notes, alternate titles, downloads, related songs, and attached video matches.",
    "Use the persistent player to keep music going while moving between catalog, playlists, radio, albums, and videos.",
    "Create local playlists, edit them, share them, and jump straight back into saved listening sessions.",
  ];

  const sections = [
    {
      title: "What this site is",
      body: "This project is a fan-built listening interface for the Juice WRLD API. Instead of just exposing raw endpoints, it turns the archive into something you can actually browse like a music product: song discovery, albums, radio, playlists, and original video files all in one place.",
    },
    {
      title: "What makes it useful",
      body: "The goal is to make deep archive browsing feel fast and focused. You can move from surfaced unreleased tracks to official albums, open a song page, play it instantly, check related versions, and keep the player running while you keep exploring.",
    },
    {
      title: "How the data works",
      body: "Song metadata, artwork, audio files, and file-browser results all come from the Juice WRLD API. The site layers UI, playback flow, local playlist storage, and archive-friendly navigation on top of that data.",
    },
  ];

  const credits = [
    "Song metadata, artwork, audio, and file-browser results are powered by the Juice WRLD API.",
    "This is a fan project built to make the archive easier to explore, stream, and organize.",
    "Shoutout to the API maintainers and the broader Juice community for preserving and surfacing the catalog.",
  ];

  return (
    <>
      <SiteNav />
      <div className="app-shell">
        <div className="detail-panel page-shell page-shell--narrow detail-panel--feature">
          <section className="detail-stage detail-stage--editorial">
            <div className="detail-stage__media">
              <div className="detail-artwork detail-artwork--brand">
                <div className="artwork-fallback">
                  <span>
                    <img src={logo} alt="" />
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-stage__content">
              <div className="detail-copy detail-copy--feature">
                <p className="eyebrow">About this project</p>
                <h2>Built to explore the archive like a real listening app</h2>
                <p className="detail-description">
                  A fan-made Juice WRLD archive site focused on discovery,
                  playback, playlists, albums, radio, and original media files.
                  The catalog data is provided by the{" "}
                  <a
                    href="https://juicewrldapi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Juice WRLD API
                  </a>
                  , while the site experience is designed to feel more curated
                  and usable than a raw data browser.
                </p>
                <div className="pill-wrap">
                  <span className="meta-pill">Songs</span>
                  <span className="meta-pill">Albums</span>
                  <span className="meta-pill">Videos</span>
                  <span className="meta-pill">Playlists</span>
                  <span className="meta-pill">Radio</span>
                </div>
              </div>
            </div>
          </section>

          <div className="detail-meta">
            <div>
              <span>Built with</span>
              <strong>React + Vite</strong>
            </div>
            <div>
              <span>Focus</span>
              <strong>Archive browsing + playback</strong>
            </div>
            <div>
              <span>Developer</span>
              <strong>Coby Hughes</strong>
            </div>
            <div>
              <span>Stack highlight</span>
              <strong>Persistent player + local playlists</strong>
            </div>
            <div>
              <span>Source</span>
              <strong>
                <a
                  href="https://github.com/c-o-b-a-x"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @c-o-b-a-x
                </a>
              </strong>
            </div>
          </div>

          <div className="meta-block">
            <p className="block-label">Core features</p>
            <ul className="detail-list">
              {coreFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>

          <div className="meta-block">
            <p className="block-label">Project overview</p>
            <div className="session-grid">
              {sections.map((section) => (
                <article key={section.title} className="session-card">
                  <span>{section.title}</span>
                  <strong>{section.body}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="meta-block">
            <p className="block-label">Credits</p>
            <ul className="detail-list">
              {credits.map((credit) => (
                <li key={credit}>{credit}</li>
              ))}
              <li>LLJW.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
