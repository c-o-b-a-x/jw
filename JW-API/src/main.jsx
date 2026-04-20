// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import SongDetail from "./SongDetail";
import About from "./About";
import Radio from "./Radio"; // <-- Import the new component
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/song/:id" element={<SongDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/radio" element={<Radio />} /> {/* <-- New route */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
