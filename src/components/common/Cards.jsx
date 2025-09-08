import React from "react";
import "./common.css";

export default function Cards() {
  return (
    <section className="cards">
      <article className="card">
        <div className="icon">✏️</div>
        <h3>Design in 3D</h3>
        <p>Sketch spheres, cones and more—see your crochet form instantly.</p>
      </article>

      <article className="card">
        <div className="icon">🧵</div>
        <h3>Generate Patterns</h3>
        <p>Create stitch guides and counts from your model—automatically.</p>
      </article>

      <article className="card">
        <div className="icon">📚</div>
        <h3>Save & Share</h3>
        <p>Keep projects organized and share with your crochet friends.</p>
      </article>
    </section>
  );
}
