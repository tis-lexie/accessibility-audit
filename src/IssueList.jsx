const ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };

// Lists every failed rule for one viewport, worst first.
// The #numbers match the numbered boxes on the highlighted screenshot.
function IssueList({ result, manualChecks = [] }) {
  const violations = [...result.violations].sort(
    (a, b) => (ORDER[a.impact] ?? 4) - (ORDER[b.impact] ?? 4)
  );

  return (
    <section className="panel issues" aria-labelledby="issues-heading">
      <div className="panel-head">
        <h2 id="issues-heading">Issues found</h2>
        <span className="hint">{violations.length} types</span>
      </div>

      {violations.length === 0 ? (
        <p className="all-clear">
          No automated issues found on this layout. That's a good start, but still check the
          items below by hand.
        </p>
      ) : (
        <ul className="issue-list">
          {violations.map((v) => (
            <li key={v.id}>
              <details>
                <summary>
                  <span className={`badge sev-${v.impact || "minor"}`}>{v.impact || "minor"}</span>
                  <span className="issue-title">{v.help}</span>
                  <span className="issue-count">
                    {v.nodes.length} {v.nodes.length === 1 ? "place" : "places"}:{" "}
                    {v.nodes.map((n) => `#${n.id}`).join(", ")}
                  </span>
                </summary>

                <div className="issue-body">
                  <p>{v.description}</p>
                  {v.nodes.map((n) => (
                    <div key={n.id} className="node">
                      <p className="node-id">
                        #{n.id}
                        {!n.box && <span className="hint"> (not visible on the screenshot)</span>}
                      </p>
                      <pre>
                        <code>{n.html}</code>
                      </pre>
                      {n.fix && <p className="node-fix">{n.fix}</p>}
                    </div>
                  ))}
                  {v.help_url && (
                    <a href={v.help_url} target="_blank" rel="noreferrer">
                      Learn how to fix “{v.help}” (opens in a new tab)
                    </a>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {result.needs_review?.length > 0 && (
        <p className="hint review-note">
          {result.needs_review.length} more checks need a human to decide (for example colour
          contrast over images).
        </p>
      )}

      {manualChecks.length > 0 && (
        <details className="manual">
          <summary>Things a person still needs to check</summary>
          <ul>
            {manualChecks.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export default IssueList;