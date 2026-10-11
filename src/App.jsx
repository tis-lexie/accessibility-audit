import { useEffect, useState } from "react";
import "./App.css";
import ScreenshotViewer from "./screenshotViewer";
import ScanResults from "./ScanResults";
import { API_URL } from "./config";
import ChatPanel from "./ChatPanel";

const RECENT_KEY = "recent-scans";
const MAX_RECENT = 5;

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecent(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Storage can be blocked (private mode); recent scans are just a convenience.
  }
}

function siteNameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function downloadReport(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `accessibility-report-${siteNameOf(report.url)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function App() {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [scanError, setScanError] = useState("");
  const [status, setStatus] = useState("");
  const [report, setReport] = useState(null);
  const [scanId, setScanId] = useState(0);
  const [viewport, setViewport] = useState(0);
  const [recent, setRecent] = useState(loadRecent);

  // Collapsed sections don't print, so open them all for printing.
  useEffect(() => {
    function openAllDetails() {
      document.querySelectorAll("details").forEach((d) => (d.open = true));
    }
    window.addEventListener("beforeprint", openAllDetails);
    return () => window.removeEventListener("beforeprint", openAllDetails);
  }, []);

  async function runScan(url) {
    const target = url.trim();
    if (loading) return;
    if (!target) {
      setInputError("Enter a website address, for example google.com.");
      return;
    }

    setInputError("");
    setScanError("");
    setLoading(true);
    setReport(null);
    setStatus(`Scanning ${target}. This can take up to a minute.`);
    try {
      const res = await fetch(
        `${API_URL}/scanner?url=${encodeURIComponent(target)}`,
        { method: "POST" },
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "The scan could not be started.");
      }

      const { violation_type_count = 0, manual_review_count = 0 } =
        data.summary ?? {};
      setReport(data);
      setScanId(Date.now());
      setViewport(0);
      setStatus(
        `Scan of ${siteNameOf(data.url)} complete. ${violation_type_count} ${violation_type_count === 1 ? "issue type" : "issue types"} found, ${manual_review_count} ${manual_review_count === 1 ? "item needs" : "items need"} manual review.`,
      );

      const next = [data.url, ...recent.filter((u) => u !== data.url)].slice(
        0,
        MAX_RECENT,
      );
      setRecent(next);
      saveRecent(next);
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "Couldn't reach the scanner. Check that the backend server is running."
          : error.message;
      setScanError(message);
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  const result = report?.results[viewport];
  const siteName = report ? siteNameOf(report.url) : "";

  return (
    <div className="root">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="top-bar">
        <p className="site-name">Accessibility Audit</p>
        <a
          href="https://github.com/tis-lexie/accessibility-audit"
          target="_blank"
          rel="noopener noreferrer"
          className="logo-link"
        >
          <img
            src="/GitHub_Invertocat_Black.png"
            alt="View the project on GitHub (opens in a new tab)"
            className="logo"
          />
        </a>
      </header>

      <main id="main" className="main-container">
        <div className="top-wrapper">
          <div className="catch-phrase">
            <h1>Audit That Website.</h1>
            {/* Decorative, so empty alt keeps screen readers from announcing it. */}
            <img
              className="hero-graphic"
              src="/hero-graphic.svg"
              alt=""
              width="480"
              height="320"
            />
          </div>
          <section className="url-container" aria-labelledby="scan-heading">
            <h2 id="scan-heading">Paste Your URL Here</h2>
            <p className="desc-text">
              Enter any website below to check it for accessibility problems.
            </p>
            <form
              className="input-wrapper"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                runScan(input);
              }}
            >
              <label htmlFor="url">Website address</label>
              <p id="url-hint" className="hint">
                You can leave off https:// and www.
              </p>
              <div className="input-row">
                <input
                  id="url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="google.com"
                  aria-invalid={inputError ? true : undefined}
                  aria-describedby={
                    inputError ? "url-hint url-error" : "url-hint"
                  }
                />
                {/* aria-disabled instead of disabled so focus isn't lost mid-scan. */}
                <button
                  id="button1"
                  className="button-primary"
                  type="submit"
                  aria-disabled={loading}
                >
                  {loading && <span className="spinner" aria-hidden="true" />}
                  {loading ? "Scanning…" : "Scan website"}
                </button>
              </div>
              {inputError && (
                <p id="url-error" className="field-error">
                  {inputError}
                </p>
              )}
            </form>

            {recent.length > 0 && (
              <div className="recent">
                <h3 id="recent-heading">Recent scans</h3>
                <ul aria-labelledby="recent-heading">
                  {recent.map((url) => (
                    <li key={url}>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => {
                          setInput(url);
                          runScan(url);
                        }}
                      >
                        <span className="visually-hidden">Scan again: </span>
                        {siteNameOf(url)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <div className="status" role="status">
          {status}
        </div>
        {scanError && (
          <div className="scan-error" role="alert">
            <strong>The scan didn't finish.</strong> {scanError}
          </div>
        )}

        <section className="output-section" aria-labelledby="results-heading">
          <div className="results-bar">
            <h2 id="results-heading">
              {report ? `Results for ${siteName}` : "Your Results"}
            </h2>
            {report && (
              <>
                <div
                  className="toggle-group"
                  role="group"
                  aria-label="Screen size"
                >
                  {report.results.map((r, i) => (
                    <button
                      key={r.viewport}
                      type="button"
                      className="toggle"
                      aria-pressed={i === viewport}
                      onClick={() => setViewport(i)}
                    >
                      {capitalize(r.viewport)}
                    </button>
                  ))}
                </div>
                <div className="report-actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => downloadReport(report)}
                  >
                    Download JSON
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => window.print()}
                  >
                    Print or save PDF
                  </button>
                </div>
              </>
            )}
          </div>
          {report?.disclaimer && <p className="note">{report.disclaimer}</p>}

          <div className="output-columns">
            <div className="output-column">
              <ScreenshotViewer
                result={result}
                siteName={siteName}
                cacheKey={scanId}
              />
            </div>
            <div className="output-column">
              <div className="column-header">
                <h3>
                  List of Problems
                  {result && (
                    <span className="visually-hidden">
                      {" "}
                      ({result.viewport})
                    </span>
                  )}
                </h3>
              </div>
              <div className="problems-text">
                <ScanResults result={result} />
              </div>
            </div>
          </div>
        </section>

        <ChatPanel report={report} viewport={result?.viewport} />
      </main>
    </div>
  );
}

export default App;
