#!/usr/bin/env python3
"""
Single-page WCAG scanner: Playwright + axe-core.

Usage:
    python scanner.py https://example.com
    python scanner.py https://example.com -o report.json --screenshot

This reports *automated* findings only. A clean result does NOT mean a site is
"ADA compliant"; automated tools catch roughly 30-40% of real issues.
"""

import argparse
import ipaddress
import json
import os
import shutil
import socket
import sys
import uuid
from datetime import datetime, timezone
from urllib.parse import urlparse

from axe_playwright_python.sync_playwright import Axe
from playwright.sync_api import sync_playwright

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from playwright.sync_api import Error as PlaywrightError

from chat import router as chat_router

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rule sets to run: WCAG 2.0/2.1/2.2 levels A and AA.
WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

VIEWPORTS = {
    "desktop": {"width": 1280, "height": 800},
    "mobile": {"width": 375, "height": 812},
}

# Each scan gets its own folder in here, served to the frontend at /scan-output/...
OUTPUT_DIR = "scan-output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Things automation cannot verify. Surface these in every report.
MANUAL_CHECKS = [
    "Alt text is meaningful, not just present",
    "Keyboard-only navigation works; no keyboard traps; focus order is logical",
    "Visible focus indicator on all interactive elements",
    "Captions/transcripts are accurate for audio and video",
    "Link and button text makes sense out of context",
    "Complex widgets (menus, modals, tabs) work with a screen reader",
    "Content reflows at 400% zoom without loss of information",
    "Error messages in forms are clear and programmatically associated",
]

def assert_public_url(url: str) -> None:
    """Basic SSRF guard: only http(s), and reject private/internal addresses.

    Note: this checks DNS at one moment. A production scanner should also
    validate every redirect and request (e.g. via page.route) and run workers
    in a network with no access to internal services or cloud metadata.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https URLs are allowed.")
    if not parsed.hostname:
        raise ValueError("URL has no hostname.")

    try:
        infos = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve {parsed.hostname}: {exc}") from exc

    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise ValueError(
                f"Refusing to scan {parsed.hostname}: resolves to non-public address {ip}."
            )


def simplify_violation(v: dict) -> dict:
    return {
        "id": v["id"],
        "impact": v.get("impact"),
        "description": v.get("description"),
        "help": v.get("help"),
        "help_url": v.get("helpUrl"),
        "tags": v.get("tags", []),
        "nodes": [
            {
                "target": n.get("target"),
                "html": (n.get("html") or "")[:500],
                "fix": n.get("failureSummary"),
            }
            for n in v.get("nodes", [])
        ],
    }


MAX_SHOT_HEIGHT = 12_000  # cap very tall pages so screenshots stay manageable
IMPACT_COLORS = {
    "critical": "#d00000",
    "serious": "#e67300",
    "moderate": "#c9a400",
    "minor": "#0066cc",
}


def scroll_to_load(page) -> None:
    """Scroll through the page so lazy-loaded content renders, then return to top."""
    page.evaluate(
        """async () => {
            const step = window.innerHeight;
            for (let i = 0, y = 0; i < 40 && y < document.documentElement.scrollHeight; i++, y += step) {
                window.scrollTo(0, y);
                await new Promise(r => setTimeout(r, 150));
            }
            window.scrollTo(0, 0);
        }"""
    )
    page.wait_for_load_state("networkidle")


def get_box(page, selector: str):
    """Element position in *document* coordinates, or None if not visible."""
    return page.evaluate(
        """(sel) => {
            let el;
            try { el = document.querySelector(sel); } catch (e) { return null; }
            if (!el) return null;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return null;
            return {x: r.left + window.scrollX, y: r.top + window.scrollY,
                    width: r.width, height: r.height};
        }""",
        selector,
    )


def number_and_locate(page, violations: list) -> None:
    """Give every failing element a sequential id and its page coordinates."""
    n = 0
    for v in violations:
        for node in v["nodes"]:
            n += 1
            node["id"] = n
            target = node["target"]
            # Multi-part targets (iframes / shadow DOM) are skipped for now.
            if target and len(target) == 1 and isinstance(target[0], str):
                node["box"] = get_box(page, target[0])
            else:
                node["box"] = None


def draw_highlights(page, violations: list) -> None:
    """Overlay numbered outlines without modifying the page's own elements."""
    items = [
        [node["id"], node["box"], IMPACT_COLORS.get(v["impact"], "#d00000")]
        for v in violations
        for node in v["nodes"]
        if node["box"]
    ]
    page.evaluate(
        """(items) => {
            const layer = document.createElement('div');
            layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;'
                + 'z-index:2147483647;pointer-events:none;';
            items.forEach(([id, b, color]) => {
                const box = document.createElement('div');
                box.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;`
                    + `width:${b.width}px;height:${b.height}px;box-sizing:border-box;`
                    + `outline:3px solid ${color};outline-offset:2px;`;
                const tag = document.createElement('span');
                tag.textContent = id;
                tag.style.cssText = `position:absolute;left:0;top:-12px;background:${color};`
                    + 'color:#fff;font:bold 12px sans-serif;padding:1px 6px;border-radius:10px;';
                box.appendChild(tag);
                layer.appendChild(box);
            });
            document.documentElement.appendChild(layer);
        }""",
        items,
    )


def take_screenshots(page, viewport_name: str, out_dir: str, violations: list) -> dict:
    """Save a clean full-page JPEG and a copy with numbered highlights."""
    width = VIEWPORTS[viewport_name]["width"]
    full_height = page.evaluate("() => document.documentElement.scrollHeight")
    height = min(full_height, MAX_SHOT_HEIGHT)
    shot_opts = dict(
        type="jpeg",
        quality=80,
        full_page=True,
        clip={"x": 0, "y": 0, "width": width, "height": height},
    )

    clean = f"clean-{viewport_name}.jpg"
    highlighted = f"highlighted-{viewport_name}.jpg"

    page.screenshot(path=os.path.join(out_dir, clean), **shot_opts)
    draw_highlights(page, violations)
    page.screenshot(path=os.path.join(out_dir, highlighted), **shot_opts)

    return {
        "clean": clean,
        "highlighted": highlighted,
        "width": width,
        "height": height,
        "truncated": full_height > MAX_SHOT_HEIGHT,
    }


def scan_page(
    browser, url: str, viewport_name: str, out_dir: str, screenshots: bool
) -> dict:
    context = browser.new_context(viewport=VIEWPORTS[viewport_name])
    page = context.new_page()
    try:
        response = page.goto(url, wait_until="networkidle", timeout=45_000)
        status = response.status if response else None

        # Re-check after redirects so we don't end up scanning an internal host.
        assert_public_url(page.url)

        scroll_to_load(page)

        axe = Axe()
        results = axe.run(
            page, options={"runOnly": {"type": "tag", "values": WCAG_TAGS}}
        ).response

        violations = [simplify_violation(v) for v in results["violations"]]
        number_and_locate(page, violations)

        shots = None
        if screenshots:
            shots = take_screenshots(page, viewport_name, out_dir, violations)

        return {
            "viewport": viewport_name,
            "final_url": page.url,
            "http_status": status,
            "screenshots": shots,
            "violations": violations,
            # "incomplete" = axe couldn't decide; needs a human.
            "needs_review": [simplify_violation(v) for v in results["incomplete"]],
            "passes_count": len(results["passes"]),
        }
    finally:
        context.close()

@app.post("/scanner")
def scan(url: str) -> dict:
    """Scan a URL and return the report directly as an API response."""
    try:
        assert_public_url(url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # A new folder per scan, so screenshots never overwrite each other
    # and the browser never shows a cached image from an older scan.
    scan_id = uuid.uuid4().hex[:12]
    out_dir = os.path.join(OUTPUT_DIR, scan_id)
    os.makedirs(out_dir, exist_ok=True)

    report = {
        "scan_id": scan_id,
        "url": url,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "standard": "WCAG 2.2 A/AA (automated rules only)",
        "disclaimer": (
            "Automated results only. Not a legal determination or certification "
            "of ADA compliance."
        ),
        "results": [],
        "manual_checks_required": MANUAL_CHECKS,
    }

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                for name in VIEWPORTS:
                    print(f"Scanning {url} ({name})...")
                    report["results"].append(scan_page(browser, url, name, out_dir, True))
            finally:
                browser.close()
    except ValueError as exc:  # e.g. the site redirected to a private address
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PlaywrightError as exc:  # timeouts, site down, etc.
        raise HTTPException(status_code=502, detail=f"Could not load the page: {exc}") from exc

    # Turn screenshot filenames into URLs the frontend can load.
    for r in report["results"]:
        shots = r.get("screenshots")
        if shots:
            for key in ("clean", "highlighted"):
                shots[key] = f"/{OUTPUT_DIR}/{scan_id}/{shots[key]}"

    return report


app.include_router(chat_router)  # POST /api/chat

# Serves the screenshots. Mounted after the routes so it doesn't shadow them.
app.mount(f"/{OUTPUT_DIR}", StaticFiles(directory=OUTPUT_DIR), name="scan-output")

def main() -> int:
    parser = argparse.ArgumentParser(description="Scan a URL for WCAG issues.")
    parser.add_argument("url")
    parser.add_argument("-o", "--output", default="report.json")
    parser.add_argument("--out-dir", default="scan-output")
    parser.add_argument("--no-screenshots", action="store_true")
    args = parser.parse_args()

    try:
        assert_public_url(args.url)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    os.makedirs(args.out_dir, exist_ok=True)

    report = {
        "url": args.url,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "standard": "WCAG 2.2 A/AA (automated rules only)",
        "disclaimer": (
            "Automated results only. Not a legal determination or certification "
            "of ADA compliance."
        ),
        "results": [],
        "manual_checks_required": MANUAL_CHECKS,
    }

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for name in VIEWPORTS:
                print(f"Scanning {args.url} ({name})...")
                report["results"].append(
                    scan_page(
                        browser, args.url, name, args.out_dir, not args.no_screenshots
                    )
                )
        finally:
            browser.close()

    report_path = os.path.join(args.out_dir, args.output)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # report.js lets viewer.html work when opened straight from disk (file://),
    # where fetch() of a local JSON file would be blocked.
    with open(os.path.join(args.out_dir, "report.js"), "w", encoding="utf-8") as f:
        f.write("window.REPORT = " + json.dumps(report).replace("</", "<\\/") + ";")

    viewer_src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "viewer.html")
    if os.path.exists(viewer_src):
        shutil.copy(viewer_src, args.out_dir)

    # Console summary
    print("\n=== Summary ===")
    for r in report["results"]:
        by_impact: dict = {}
        for v in r["violations"]:
            by_impact[v["impact"]] = by_impact.get(v["impact"], 0) + 1
        print(
            f"[{r['viewport']}] {len(r['violations'])} violation types "
            f"{by_impact or ''}, {len(r['needs_review'])} need manual review"
        )
    print(f"\nFull report: {report_path}")
    print(f"Open {os.path.join(args.out_dir, 'viewer.html')} in a browser to explore it.")

    # Non-zero exit if anything was found, handy for CI.
    return 1 if any(r["violations"] for r in report["results"]) else 0


if __name__ == "__main__":
    sys.exit(main())