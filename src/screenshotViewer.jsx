import { useState } from "react";
import { API_URL } from "./config";

// Shows the screenshot for one viewport, with or without the numbered highlight boxes.
function ScreenshotViewer({ result }) {
  const [showHighlights, setShowHighlights] = useState(true);
  const shots = result.screenshots;

  if (!shots) {
    return (
      <div className="panel image-area">
        <p>No screenshot was captured for this scan.</p>
      </div>
    );
  }

  const issueCount = result.violations.reduce((n, v) => n + v.nodes.length, 0);
  const src = API_URL + (showHighlights ? shots.highlighted : shots.clean);

  return (
    <section className="panel" aria-labelledby="shot-heading">
      <div className="panel-head">
        <h2 id="shot-heading">Where the problems are</h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showHighlights}
            onChange={(e) => setShowHighlights(e.target.checked)}
          />
          Show highlights
        </label>
      </div>

      <div className="image-scroll" tabIndex={0} aria-label="Page screenshot, scrollable">
        <img
          src={src}
          alt={
            showHighlights
              ? `Screenshot of ${result.final_url} with numbered boxes around ${issueCount} problem areas. The numbers match the list of issues.`
              : `Screenshot of ${result.final_url}`
          }
        />
      </div>

      {shots.truncated && (
        <p className="hint">This page is very long, so only the top part is shown.</p>
      )}
    </section>
  );
}

export default ScreenshotViewer;