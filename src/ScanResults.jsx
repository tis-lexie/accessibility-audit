const SEVERITY_ORDER = ["Critical", "Serious", "Moderate", "Minor", "Unknown"];

function severityRank(severity) {
  const rank = SEVERITY_ORDER.indexOf(severity);
  return rank === -1 ? SEVERITY_ORDER.length : rank;
}

// Strips noise from axe selectors so they're easier to read.
function cleanTarget(target) {
  const raw = Array.isArray(target) ? target.join(" > ") : target || "";
  const cleaned = raw
    .replace(/#\\[0-9a-f]+(?:\s+[0-9a-f]+)?(?=\s*>)/gi, "")
    .replace(/\s*>\s*\.installment\b/g, "")
    .replace(/^\s*>\s*/, "")
    .replace(/\s*>\s*>/g, " > ")
    .trim();
  return cleaned || "Element not identified";
}

function SeverityBadge({ severity }) {
  return (
    <span className={`badge badge-${severity.toLowerCase()}`}>{severity}</span>
  );
}

function SummaryCounts({ issues, manualCount }) {
  const counts = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0]));
  issues.forEach((issue) => {
    counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
  });

  return (
    <ul className="summary-counts" aria-label="Issue counts by severity">
      {SEVERITY_ORDER.filter((s) => s !== "Unknown").map(
        (s) => (
          <li key={s} className={`count count-${s.toLowerCase()}`}>
            <span className="count-number">{counts[s]}</span>
            <span className="count-label">{s}</span>
          </li>
        ),
      )}
      <li className="count count-review">
        <span className="count-number">{manualCount}</span>
        <span className="count-label">Needs review</span>
      </li>
    </ul>
  );
}

function IssueCard({ issue }) {
  const elements = issue.affected_elements ?? [];
  // Show the fix once when every element shares it, instead of repeating it.
  const fixes = new Set(elements.map((e) => e.suggested_fix).filter(Boolean));
  const sharedFix = fixes.size === 1 ? [...fixes][0] : null;

  return (
    <li className="issue-card">
      <div className="issue-header">
        <h4>{issue.title || issue.rule}</h4>
        <SeverityBadge severity={issue.severity} />
      </div>
      {issue.wcag?.length > 0 && (
        <p className="issue-wcag">
          WCAG {issue.wcag.join(", ")}
          {issue.wcag_level && ` · Level ${issue.wcag_level}`}
        </p>
      )}
      {issue.description && <p>{issue.description}</p>}

      {elements.length > 0 && (
        <details>
          <summary>
            {elements.length} affected{" "}
            {elements.length === 1 ? "element" : "elements"}
          </summary>
          {sharedFix && <p className="element-fix">{sharedFix}</p>}
          <ul className="element-list">
            {elements.map((element, i) => (
              <li key={element.id ?? i}>
                {element.id != null && (
                  <span className="element-number">
                    <span className="visually-hidden">Screenshot number </span>
                    {element.id}
                  </span>
                )}
                <code>{cleanTarget(element.target)}</code>
                {!sharedFix && element.suggested_fix && (
                  <p className="element-fix">{element.suggested_fix}</p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {issue.learn_more && (
        <a href={issue.learn_more} target="_blank" rel="noopener noreferrer">
          How to fix: {issue.title || issue.rule}
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      )}
    </li>
  );
}

export default function ScanResults({ result }) {
  if (!result) {
    return (
      <p className="empty-state">
        The problems found on the page will be listed here after a scan.
      </p>
    );
  }

  const issues = [...result.issues].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );

  return (
    <div className="scan-results">
      <SummaryCounts issues={issues} manualCount={result.manual_review.length} />

      {issues.length === 0 ? (
        <p className="empty-state">
          No automated issues found at {result.viewport} width. Automated tools
          catch only some problems, so still check the items that need manual
          review.
        </p>
      ) : (
        <ol className="issue-list">
          {issues.map((issue) => (
            <IssueCard key={issue.rule} issue={issue} />
          ))}
        </ol>
      )}

      {result.manual_review.length > 0 && (
        <details className="manual-review">
          <summary>
            Needs manual review ({result.manual_review.length})
          </summary>
          <p>
            The scanner couldn't decide on these. A person needs to check them.
          </p>
          <ul>
            {result.manual_review.map((item) => (
              <li key={item.rule}>
                {item.learn_more ? (
                  <a
                    href={item.learn_more}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title || item.rule}
                    <span className="visually-hidden">
                      {" "}
                      (opens in a new tab)
                    </span>
                  </a>
                ) : (
                  <strong>{item.title || item.rule}</strong>
                )}
                {item.description && <p>{item.description}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
