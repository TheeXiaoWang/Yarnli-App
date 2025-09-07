import React from "react";
import "./common.css";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-logo">
        <div className="yarn-ball" />
        <span>Yarnli</span>
      </div>

      <div className="nav-links">
        <a href="#/library">Library</a>
        <a href="#/tutorials">Tutorials</a>
        <button className="btn ghost">Sign Up</button>
        <button className="btn primary">Login</button>
      </div>
    </nav>
  );
}
