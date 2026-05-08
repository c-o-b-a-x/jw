import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import SongDetail from "./SongDetail";
import About from "./About";
import Radio from "./Radio";
import Playlists from "./Playlists";
import CreatePlaylist from "./CreatePlaylist";
import PlaylistDetail from "./PlaylistDetail";
import SharedPlaylist from "./SharedPlaylist";
import { AudioPlayerProvider } from "./audio-player";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AudioPlayerProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/song/:id" element={<SongDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/radio" element={<Radio />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/playlist/:id" element={<PlaylistDetail />} />
          <Route path="/create-playlist" element={<CreatePlaylist />} />
          <Route path="/shared" element={<SharedPlaylist />} />
          <Route path="/shared/:shareId" element={<SharedPlaylist />} />
        </Routes>
      </AudioPlayerProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
