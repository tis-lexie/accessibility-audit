import { useState } from "react";
import "./App.css";
import ScreenshotViewer from "./screenshotViewer";
import IssueList from "./IssueList";
import ChatPanel from "./ChatPanel";

import { API_URL } from "./config";

const SEVERITIES = ["critical", "serious", "moderate", "minor"];
const WEIGHTS = { critical: 10, serious: 5, moderate: 2, minor: 1 };

// Count failing elements per severity for one viewport.
function tally(result) {
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of result.violations) {
    counts[v.impact || "minor"] += v.nodes.length;
  }
  return counts;
}

function scoreFrom(counts) {
  const penalty = SEVERITIES.reduce((sum, s) => sum + counts[s] * WEIGHTS[s], 0);
  return Math.max(0, 100 - penalty);
}

function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [viewport, setViewport] = useState(0);
  const [images, setImages] = useState([]);
  const [issues, setIssues] = useState("Issues");

  async function handleSubmit(event) {
    event.preventDefault();
    let url = input.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`; // allow "google.com"

    const scanId = Date.now();
    setLoading(true);
    setImages([]);
    try {
      const res = await fetch(
        `${API_URL}/scanner?url=${encodeURIComponent(input.trim())}`,
        {
          method: "POST",
        },
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "The scan could not be started.");
      }

      setIssues(data);
      console.log(data);
      setImages([
        {
          id: 1,
          url: `../scan-output/highlighted-desktop.jpg?v=${scanId}`,
          label: "Desktop",
          alt: "Desktop screenshot",
        },
        {
          id: 2,
          url: `../scan-output/highlighted-mobile.jpg?v=${scanId}`,
          label: "Mobile",
          alt: "Mobile screenshot",
        },
      ]);
    } catch (error) {
      setIssues({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  const result = report?.results[viewport];
  const counts = result ? tally(result) : null;

  return (
    <div className="root">
      <div className="main-container">
        <div className="top-bar">
          <h3> Accessibility Audit</h3>

          <a
            href="https://github.com/tis-lexie/accessibility-audit"
            target="_blank"
            rel="noopener noreferrer"
            className="logo-link"
          >
            <img
              src="/GitHub_Invertocat_Black.png"
              alt="View the project on GitHub"
              className="logo"
            />
          </a>
        </div>
        <div className="top-wrapper">
          <div className="catch-phrase">
            <h1>Audit That Website.</h1>
          </div>
          <div className="url-container">
            <h2>Paste Your URL Here</h2>
            <p className="desc-text">
              Copy and paste any website into the text-box below to see if it is
              accessible.
            </p>
            <div className="input-wrapper">
              <input
                id="url"
                type="url"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Enter Website URL here, ex: https://www.google.com"
              />
              <button
                onClick={handleClick}
                id="button1"
                type="button"
                disabled={loading}
              >
                {loading ? "Scanning..." : "Submit URL"}
              </button>
            </div>
          </div>
        </div>

        <div className="output-section">
          <div className="text-image-wrapper">
            <h1>Your Output Here.</h1>
            <ScreenshotViewer images={images} />
          </div>
          <div className="problems-text">
            <h2>List of Problems</h2>
            <label htmlFor="problem-output"></label>
            <textarea
              readOnly
              id="problem-output"
              value={typeof issues === "string" ? issues : JSON.stringify(issues, null, 2)}
            />
          </div>
          <p id="url-hint" className="hint">
            We check the desktop and mobile layouts. Scans take about 20–60 seconds.
          </p>
        </div>

        <div aria-live="polite" className="status-area">
          {loading && (
            <p className="status">
              <span className="spinner" aria-hidden="true" /> Loading the page and running checks…
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
