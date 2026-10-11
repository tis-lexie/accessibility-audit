import { useState } from "react";
import "./App.css";
import ScreenshotViewer from "./screenshotViewer";
import { API_URL } from "./config";
import ChatPanel from "./ChatPanel";

function formatIssues(report) {
  if (typeof report === "string") return report;
  if (report?.error) return `Error: ${report.error}`;
  if (!report?.results) return "Issues will go here";

  const lines = [
    `Scan: ${report.url}`,
    "",
    "Summary",
    `Viewports scanned: ${report.summary?.viewport_count ?? report.results.length}`,
    `Issue types: ${report.summary?.violation_type_count ?? 0}`,
    `Affected elements: ${report.summary?.affected_element_count ?? 0}`,
    `Manual reviews: ${report.summary?.manual_review_count ?? 0}`,
  ];
  const seenIssueTypes = new Set();

  for (const result of report.results) {
    lines.push("", `${result.viewport} results`, "=".repeat(30));

    const displayedIssues = result.issues.filter((issue) => {
      const issueType = issue.rule || issue.title;
      if (seenIssueTypes.has(issueType)) return false;
      seenIssueTypes.add(issueType);
      return true;
    });

    if (displayedIssues.length === 0) {
      lines.push(
        result.issues.length === 0
          ? "No automated issues found."
          : "Repeated issue types omitted.",
      );
    }

    displayedIssues.forEach((issue, index) => {
      lines.push(
        "",
        `  ${index + 1}. ${issue.title || issue.rule}`,
        `     Severity: ${issue.severity}`,
        `     Description: ${issue.description || "Not provided"}`,
      );

      const displayedTargets = new Set();
      issue.affected_elements.forEach((element) => {
        const rawTarget = Array.isArray(element.target)
          ? element.target.join(", ")
          : element.target || "Not identified";
        const target = rawTarget
          .replace(/#\\[0-9a-f]+(?:\s+[0-9a-f]+)?(?=\s*>)/gi, "")
          .replace(/\s*>\s*\.installment\b/g, "")
          .replace(/^\s*>\s*/, "")
          .replace(/\s*>\s*>/g, " > ")
          .trim();
        if (displayedTargets.has(target)) return;
        displayedTargets.add(target);
        lines.push(
          `     ${target}`,
        );
      });

      const suggestedFix = issue.affected_elements.find(
        (element) => element.suggested_fix,
      )?.suggested_fix;
      lines.push(`     Suggested fix: ${suggestedFix || "Not provided"}`);

      if (issue.learn_more) lines.push(`     Learn more: ${issue.learn_more}`);
      lines.push("");
    });

    if (result.manual_review.length > 0) {
      lines.push("", "Needs manual review");
      result.manual_review.forEach((item, index) => {
        lines.push(
          `  ${index + 1}. ${item.title || item.rule}`,
          `     ${item.description || "Review this item manually."}`,
          "",
        );
      });
    }
  }

  return lines.join("\n");
}

function App() {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [images, setImages] = useState([]);
  const [issues, setIssues] = useState("Issues will go here");
  const [report, setReport] = useState(null);

  async function handleClick() {
    if (!input.trim()) return; // catches empty strings

    const scanId = Date.now();
    setLoading(true);
    setImages([]);
    setReport(null);
    setIssues("Issues will go here");
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
      setReport(data);
      console.log(data);
      setImages(
        data.results.flatMap((scan, index) => [
          {
            id: `${index}`,
            url: `${API_URL}${scan.screenshots.highlighted}?v=${scanId}`,
            label: `${scan.viewport}`,
            alt: `${scan.viewport} highlighted screenshot`,
          },
        ]),
      );
    } catch (error) {
      setReport(null);
      setIssues({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

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
            <pre id="problem-output">
              {formatIssues(issues)}
            </pre>
          </div>
        </div>
        <ChatPanel report = {report} />
      </div>
    </div>
  );
}

export default App;
