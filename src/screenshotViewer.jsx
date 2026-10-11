import { useState } from "react";
import { API_URL } from "./config";

function ScreenshotViewer({ result, siteName, cacheKey }) {
  const [mode, setMode] = useState("highlighted");
  const shots = result?.screenshots;

  if (!shots) {
    return (
      <>
        <div className="column-header">
          <h3>Screenshot</h3>
        </div>
        <div className="image-area empty">
          <p className="empty-state">Your scan screenshots will appear here.</p>
        </div>
      </>
    );
  }

  const elementCount = result.issues.reduce(
    (total, issue) => total + issue.affected_elements.length,
    0,
  );
  const alt =
    mode === "highlighted"
      ? `Full-page screenshot of ${siteName} at ${result.viewport} width, with ${elementCount} problem ${elementCount === 1 ? "element" : "elements"} outlined and numbered.`
      : `Full-page screenshot of ${siteName} at ${result.viewport} width.`;

  return (
    <>
      <div className="column-header">
        <h3>Screenshot</h3>
        <div className="toggle-group" role="group" aria-label="Screenshot style">
        {[
          ["highlighted", "Highlighted"],
          ["clean", "Clean"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="toggle"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
        </div>
      </div>
      {/* Focusable so keyboard users can scroll a tall screenshot. */}
      <div
        className="image-area"
        tabIndex={0}
        role="region"
        aria-label={`${result.viewport} screenshot, scrollable`}
      >
        <img src={`${API_URL}${shots[mode]}?v=${cacheKey}`} alt={alt} />
      </div>
      {shots.truncated && (
        <p className="note">
          This page is very long, so the screenshot only shows the top part.
        </p>
      )}
    </>
  );
}

export default ScreenshotViewer;
