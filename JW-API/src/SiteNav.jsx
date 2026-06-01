import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "./assets/logo999.png";
import "./App.css";

export default function SiteNav() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHomeRoute = location.pathname === "/";

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <nav className="top-navbar">
      <a href="/" onClick={closeMenu}>
        <img src={logo} alt="999 logo" className="navbar-logo" />
      </a>
      <button
        className="menu-toggle"
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-label="Toggle menu"
      >
        Menu
      </button>
      <ul className={`nav-links ${isMenuOpen ? "open" : ""}`}>
        <li>
          <a href="/" className={isHomeRoute ? "active" : ""} onClick={closeMenu}>
            Home
          </a>
        </li>
        <li>
          <a
            href="/#explore"
            className={isHomeRoute && location.hash === "#explore" ? "active" : ""}
            onClick={closeMenu}
          >
            Explore
          </a>
        </li>
        <li>
          <Link
            to="/albums"
            className={location.pathname.startsWith("/albums") ? "active" : ""}
            onClick={closeMenu}
          >
            Albums
          </Link>
        </li>
        <li>
          <Link
            to="/eras"
            className={location.pathname.startsWith("/eras") ? "active" : ""}
            onClick={closeMenu}
          >
            Eras
          </Link>
        </li>
        <li>
          <Link
            to="/videos"
            className={location.pathname === "/videos" ? "active" : ""}
            onClick={closeMenu}
          >
            Videos
          </Link>
        </li>
        <li>
          <Link
            to="/radio"
            className={location.pathname === "/radio" ? "active" : ""}
            onClick={closeMenu}
          >
            Radio
          </Link>
        </li>
        <li>
          <Link
            to="/playlists"
            className={location.pathname === "/playlists" ? "active" : ""}
            onClick={closeMenu}
          >
            Playlists
          </Link>
        </li>
        <li>
          <Link
            to="/create-playlist"
            className={location.pathname === "/create-playlist" ? "active" : ""}
            onClick={closeMenu}
          >
            Create Playlist
          </Link>
        </li>
        <li>
          <Link
            to="/about"
            className={location.pathname === "/about" ? "active" : ""}
            onClick={closeMenu}
          >
            About
          </Link>
        </li>
      </ul>
    </nav>
  );
}
