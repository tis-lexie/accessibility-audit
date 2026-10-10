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

  async function handleSubmit(event) {
    event.preventDefault();
    let url = input.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`; // allow "google.com"

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/scanner?url=${encodeURIComponent(url)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "The scan could not be completed.");
      setReport(data);
      setViewport(0);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Can't reach the scanner. Is the backend running on port 8000?"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  const result = report?.results[viewport];
  const counts = result ? tally(result) : null;

  return (
    <>
      <header className="hero">
        <h1>Audit That Website.</h1>
        <p className="lede">
          Paste any web address to check it for common accessibility problems, see exactly
          where they are, and ask how to fix them.
        </p>

        <form className="url-form" onSubmit={handleSubmit}>
          <label htmlFor="url">Website URL</label>
          <div className="url-row">
            <input
              id="url"
              type="text"
              inputMode="url"
              autoComplete="url"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://www.example.com"
              aria-describedby="url-hint"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? "Scanning…" : "Scan site"}
            </button>
          </div>
          <p id="url-hint" className="hint">
            We check the desktop and mobile layouts. Scans take about 20–60 seconds.
          </p>
        </form>

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
      </header>

      <main>
        {!report && !loading && (
          <p className="empty">Your results will appear here after a scan.</p>
        )}

        {report && result && (
          <>
            <section className="summary" aria-labelledby="summary-heading">
              <div className="summary-head">
                <h2 id="summary-heading">
                  Results for <span className="scanned-url">{report.url}</span>
                </h2>
                <div className="viewport-tabs" role="group" aria-label="Choose layout">
                  {report.results.map((r, i) => (
                    <button
                      key={r.viewport}
                      type="button"
                      aria-pressed={i === viewport}
                      onClick={() => setViewport(i)}
                    >
                      {r.viewport === "desktop" ? "Desktop" : "Mobile"}
                    </button>
                  ))}
                </div>
              </div>

              <ul className="stats">
                <li className="stat score">
                  <span className="stat-num">{scoreFrom(counts)}</span>
                  <span className="stat-label">Automated score</span>
                </li>
                {SEVERITIES.map((s) => (
                  <li key={s} className={`stat sev-${s}`}>
                    <span className="stat-num">{counts[s]}</span>
                    <span className="stat-label">{s}</span>
                  </li>
                ))}
              </ul>

              <p className="disclaimer">
                {report.disclaimer} Automated tools find roughly a third of real-world issues,
                so a human check is still needed.
              </p>
            </section>

            <div className="results-grid">
              <ScreenshotViewer result={result} />
              <IssueList result={result} manualChecks={report.manual_checks_required} />
            </div>

            <ChatPanel report={report} />
          </>
        )}
      </main>
    </>
  );
}

export default App;