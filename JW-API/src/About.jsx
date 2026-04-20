import { Link } from "react-router-dom";
import "./App.css";

export default function About() {
  return (
    <div className="app-shell">
      <Link
        to="/"
        className="chip"
        style={{ marginBottom: 24, display: "inline-block" }}
      >
        ← Back to home
      </Link>

      <div className="detail-panel" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="detail-artwork">
          <div className="artwork-fallback">
            <span>999</span>
          </div>
        </div>

        <div className="detail-copy">
          <p className="eyebrow">About this project</p>
          <h2>Juice WRLD API Explorer</h2>
          <p className="detail-description">
            A fan‑made web app that lets you search, browse, and stream songs
            from the Juice WRLD discography. All data is provided by the{" "}
            <a
              href="https://juicewrldapi.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Juice WRLD API
            </a>
            .
          </p>
        </div>

        <div className="detail-meta">
          <div>
            <span>Built with</span>
            <strong>React + Vite</strong>
          </div>
          <div>
            <span>Styling</span>
            <strong>Dark Grunge / SoundCloud 2018</strong>
          </div>
          <div>
            <span>Developer</span>
            <strong>Coby Hughes</strong>
          </div>
          <div>
            <span>GitHub</span>
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
          <p className="block-label">Features</p>
          <ul className="detail-list">
            <li>Live search and category filtering</li>
            <li>Individual song pages with full details</li>
            <li>In‑page audio player for each track</li>
            <li>Lyrics preview with expand/collapse</li>
            <li>Responsive dark grunge design</li>
          </ul>
        </div>

        <div className="meta-block">
          <p className="block-label">API Credits</p>
          <ul className="detail-list">
            <li>
              All song metadata, artwork, and audio files are served by the
              Juice WRLD API.
            </li>
            <li>
              Special thanks to the API maintainers and the Juice WRLD
              community.
            </li>
            <li>LLJW 🕊️</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
