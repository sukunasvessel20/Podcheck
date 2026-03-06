"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Dropzone from "@/components/Dropzone";
import ResultsTable from "@/components/ResultsTable";
import SummaryCards from "@/components/SummaryCards";
import { analyzeFiles } from "@/lib/analyzeFiles";
import { copyTextToClipboard, downloadCsv } from "@/lib/export";
import { createRedditSummary, computeSummaryMetrics } from "@/lib/summary";
import type { FileAnalysis, FilterIssueType, FilterStatus } from "@/lib/types";

const BMAC_URL = "https://buymeacoffee.com/podcheck";

function getFileKey(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

export default function HomePage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState("0/0");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [issueFilter, setIssueFilter] = useState<FilterIssueType>("ALL");
  const [search, setSearch] = useState("");

  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("podcheck-theme");
    const nextTheme = saved === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, []);

  const summaryMetrics = useMemo(() => computeSummaryMetrics(results), [results]);

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    return results.filter((item) => {
      const statusMatches = statusFilter === "ALL" || item.status === statusFilter;
      const issueMatches = issueFilter === "ALL" || item.issueTypes.includes(issueFilter);

      const searchableText = [item.fileName, item.tags.artist, item.tags.album, item.tags.title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const queryMatches = query.length === 0 || searchableText.includes(query);
      return statusMatches && issueMatches && queryMatches;
    });
  }, [results, search, statusFilter, issueFilter]);

  function handleAddFiles(newFiles: File[]) {
    setSelectedFiles((current) => {
      const deduped = new Map<string, File>();

      for (const file of current) {
        deduped.set(getFileKey(file), file);
      }

      for (const file of newFiles) {
        deduped.set(getFileKey(file), file);
      }

      return Array.from(deduped.values());
    });
  }

  async function handleAnalyze() {
    if (selectedFiles.length === 0 || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    setResults([]);
    setProgressPercent(0);
    setProgressText(`0/${selectedFiles.length}`);

    try {
      const analyzed = await analyzeFiles(selectedFiles, (completed, total) => {
        const nextPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
        setProgressPercent(nextPercent);
        setProgressText(`${completed}/${total}`);
      });

      setResults(analyzed);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleClear() {
    setSelectedFiles([]);
    setResults([]);
    setProgressPercent(0);
    setProgressText("0/0");
    setSearch("");
    setStatusFilter("ALL");
    setIssueFilter("ALL");
    setCopyMessage("");
  }

  function handleDownloadCsv() {
    if (results.length === 0) {
      return;
    }

    downloadCsv(results);
  }

  async function handleCopyRedditSummary() {
    if (results.length === 0) {
      return;
    }

    const text = createRedditSummary(results);
    const success = await copyTextToClipboard(text);
    const message = success ? "Reddit summary copied." : "Clipboard unavailable. Check browser permissions.";
    setCopyMessage(message);
    window.setTimeout(() => setCopyMessage(""), 2500);
  }

  function handleToggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem("podcheck-theme", nextTheme);
  }

  return (
    <main className="page-root">
      <div className="theme-toggle">
        <label className="switch" aria-label="Toggle light and dark mode">
          <input
            type="checkbox"
            className="chk"
            checked={theme === "dark"}
            onChange={handleToggleTheme}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="ui-card">
        <div className="ui-card-inner">
          <div className="ui-shell">
            <section className="ui-header-block">
              <div className="ui-title-row">
                <Image
                  src="/podcheck-logo-v2.png"
                  alt="PodCheck logo"
                  className="ui-logo"
                  width={128}
                  height={128}
                />
                <h1 className="ui-title">PodCheck</h1>
              </div>
              <p className="ui-subtitle">
                iPod-focused compatibility checker. All analysis runs locally in your browser.
              </p>
            </section>

            <section className="ui-block">
              <Dropzone onFilesAdded={handleAddFiles} disabled={isAnalyzing} selectedCount={selectedFiles.length} />
            </section>

            {selectedFiles.length > 0 && (
              <section className="ui-panel">
                <div className="ui-panel-title">Selected files</div>
                <div className="ui-chip-list">
                  {selectedFiles.map((file) => (
                    <span key={getFileKey(file)} className="ui-chip">
                      {file.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="ui-actions">
              <div
                className={`voltage-button ${
                  selectedFiles.length === 0 || isAnalyzing ? "is-disabled" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={selectedFiles.length === 0 || isAnalyzing}
                >
                  Analyze
                </button>
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  x="0px"
                  y="0px"
                  viewBox="0 0 234.6 61.3"
                  preserveAspectRatio="none"
                  xmlSpace="preserve"
                >
                  <filter id="voltage-glow-filter">
                    <feGaussianBlur className="blur" result="coloredBlur" stdDeviation="2"></feGaussianBlur>
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.075"
                      numOctaves="0.3"
                      result="turbulence"
                    ></feTurbulence>
                    <feDisplacementMap
                      in="SourceGraphic"
                      in2="turbulence"
                      scale="30"
                      xChannelSelector="R"
                      yChannelSelector="G"
                      result="displace"
                    ></feDisplacementMap>
                    <feMerge>
                      <feMergeNode in="coloredBlur"></feMergeNode>
                      <feMergeNode in="coloredBlur"></feMergeNode>
                      <feMergeNode in="coloredBlur"></feMergeNode>
                      <feMergeNode in="displace"></feMergeNode>
                      <feMergeNode in="SourceGraphic"></feMergeNode>
                    </feMerge>
                  </filter>
                  <path
                    className="voltage line-1"
                    d="m216.3 51.2c-3.7 0-3.7-1.1-7.3-1.1-3.7 0-3.7 6.8-7.3 6.8-3.7 0-3.7-4.6-7.3-4.6-3.7 0-3.7 3.6-7.3 3.6-3.7 0-3.7-0.9-7.3-0.9-3.7 0-3.7-2.7-7.3-2.7-3.7 0-3.7 7.8-7.3 7.8-3.7 0-3.7-4.9-7.3-4.9-3.7 0-3.7-7.8-7.3-7.8-3.7 0-3.7-1.1-7.3-1.1-3.7 0-3.7 3.1-7.3 3.1-3.7 0-3.7 10.9-7.3 10.9-3.7 0-3.7-12.5-7.3-12.5-3.7 0-3.7 4.6-7.3 4.6-3.7 0-3.7 4.5-7.3 4.5-3.7 0-3.7 3.6-7.3 3.6-3.7 0-3.7-10-7.3-10-3.7 0-3.7-0.4-7.3-0.4-3.7 0-3.7 2.3-7.3 2.3-3.7 0-3.7 7.1-7.3 7.1-3.7 0-3.7-11.2-7.3-11.2-3.7 0-3.7 3.5-7.3 3.5-3.7 0-3.7 3.6-7.3 3.6-3.7 0-3.7-2.9-7.3-2.9-3.7 0-3.7 8.4-7.3 8.4-3.7 0-3.7-14.6-7.3-14.6-3.7 0-3.7 5.8-7.3 5.8-2.2 0-3.8-0.4-5.5-1.5-1.8-1.1-1.8-2.9-2.9-4.8-1-1.8 1.9-2.7 1.9-4.8 0-3.4-2.1-3.4-2.1-6.8s-9.9-3.4-9.9-6.8 8-3.4 8-6.8c0-2.2 2.1-2.4 3.1-4.2 1.1-1.8 0.2-3.9 2-5 1.8-1 3.1-7.9 5.3-7.9 3.7 0 3.7 0.9 7.3 0.9 3.7 0 3.7 6.7 7.3 6.7 3.7 0 3.7-1.8 7.3-1.8 3.7 0 3.7-0.6 7.3-0.6 3.7 0 3.7-7.8 7.3-7.8h7.3c3.7 0 3.7 4.7 7.3 4.7 3.7 0 3.7-1.1 7.3-1.1 3.7 0 3.7 11.6 7.3 11.6 3.7 0 3.7-2.6 7.3-2.6 3.7 0 3.7-12.9 7.3-12.9 3.7 0 3.7 10.9 7.3 10.9 3.7 0 3.7 1.3 7.3 1.3 3.7 0 3.7-8.7 7.3-8.7 3.7 0 3.7 11.5 7.3 11.5 3.7 0 3.7-1.4 7.3-1.4 3.7 0 3.7-2.6 7.3-2.6 3.7 0 3.7-5.8 7.3-5.8 3.7 0 3.7-1.3 7.3-1.3 3.7 0 3.7 6.6 7.3 6.6s3.7-9.3 7.3-9.3c3.7 0 3.7 0.2 7.3 0.2 3.7 0 3.7 8.5 7.3 8.5 3.7 0 3.7 0.2 7.3 0.2 3.7 0 3.7-1.5 7.3-1.5 3.7 0 3.7 1.6 7.3 1.6s3.7-5.1 7.3-5.1c2.2 0 0.6 9.6 2.4 10.7s4.1-2 5.1-0.1c1 1.8 10.3 2.2 10.3 4.3 0 3.4-10.7 3.4-10.7 6.8s1.2 3.4 1.2 6.8 1.9 3.4 1.9 6.8c0 2.2 7.2 7.7 6.2 9.5-1.1 1.8-12.3-6.5-14.1-5.5-1.7 0.9-0.1 6.2-2.2 6.2z"
                    fill="transparent"
                    stroke="#fff"
                  ></path>
                  <path
                    className="voltage line-2"
                    d="m216.3 52.1c-3 0-3-0.5-6-0.5s-3 3-6 3-3-2-6-2-3 1.6-6 1.6-3-0.4-6-0.4-3-1.2-6-1.2-3 3.4-6 3.4-3-2.2-6-2.2-3-3.4-6-3.4-3-0.5-6-0.5-3 1.4-6 1.4-3 4.8-6 4.8-3-5.5-6-5.5-3 2-6 2-3 2-6 2-3 1.6-6 1.6-3-4.4-6-4.4-3-0.2-6-0.2-3 1-6 1-3 3.1-6 3.1-3-4.9-6-4.9-3 1.5-6 1.5-3 1.6-6 1.6-3-1.3-6-1.3-3 3.7-6 3.7-3-6.4-6-6.4-3 2.5-6 2.5h-6c-3 0-3-0.6-6-0.6s-3-1.4-6-1.4-3 0.9-6 0.9-3 4.3-6 4.3-3-3.5-6-3.5c-2.2 0-3.4-1.3-5.2-2.3-1.8-1.1-3.6-1.5-4.6-3.3s-4.4-3.5-4.4-5.7c0-3.4 0.4-3.4 0.4-6.8s2.9-3.4 2.9-6.8-0.8-3.4-0.8-6.8c0-2.2 0.3-4.2 1.3-5.9 1.1-1.8 0.8-6.2 2.6-7.3 1.8-1 5.5-2 7.7-2 3 0 3 2 6 2s3-0.5 6-0.5 3 5.1 6 5.1 3-1.1 6-1.1 3-5.6 6-5.6 3 4.8 6 4.8 3 0.6 6 0.6 3-3.8 6-3.8 3 5.1 6 5.1 3-0.6 6-0.6 3-1.2 6-1.2 3-2.6 6-2.6 3-0.6 6-0.6 3 2.9 6 2.9 3-4.1 6-4.1 3 0.1 6 0.1 3 3.7 6 3.7 3 0.1 6 0.1 3-0.6 6-0.6 3 0.7 6 0.7 3-2.2 6-2.2 3 4.4 6 4.4 3-1.7 6-1.7 3-4 6-4 3 4.7 6 4.7 3-0.5 6-0.5 3-0.8 6-0.8 3-3.8 6-3.8 3 6.3 6 6.3 3-4.8 6-4.8 3 1.9 6 1.9 3-1.9 6-1.9 3 1.3 6 1.3c2.2 0 5-0.5 6.7 0.5 1.8 1.1 2.4 4 3.5 5.8 1 1.8 0.3 3.7 0.3 5.9 0 3.4 3.4 3.4 3.4 6.8s-3.3 3.4-3.3 6.8 4 3.4 4 6.8c0 2.2-6 2.7-7 4.4-1.1 1.8 1.1 6.7-0.7 7.7-1.6 0.8-4.7-1.1-6.8-1.1z"
                    fill="transparent"
                    stroke="#fff"
                  ></path>
                </svg>
                <div className="voltage-dots">
                  <div className="voltage-dot voltage-dot-1"></div>
                  <div className="voltage-dot voltage-dot-2"></div>
                  <div className="voltage-dot voltage-dot-3"></div>
                  <div className="voltage-dot voltage-dot-4"></div>
                  <div className="voltage-dot voltage-dot-5"></div>
                </div>
              </div>

              <button type="button" onClick={handleClear} className="ui-action ui-action--ghost">
                Clear
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={results.length === 0}
                className="ui-action ui-action--secondary"
              >
                Download CSV
              </button>

              <button
                type="button"
                onClick={handleCopyRedditSummary}
                disabled={results.length === 0}
                className="ui-action ui-action--secondary"
              >
                Copy Reddit Summary
              </button>

              {copyMessage && <span className="ui-copy-message">{copyMessage}</span>}
            </section>

            {isAnalyzing && (
              <section className="ui-progress-wrap">
                <div className="ui-progress-label">
                  Analyzing {progressText} ({progressPercent}%)
                </div>
                <div className="ui-progress-track">
                  <div
                    className="ui-progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </section>
            )}

            <section className="ui-block">
              <SummaryCards metrics={summaryMetrics} hasResults={results.length > 0} />
            </section>

            <section className="ui-filters">
              <label className="ui-field">
                <span>Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
                  className="ui-control"
                >
                  <option value="ALL">All</option>
                  <option value="OK">OK</option>
                  <option value="CAUTION">Caution</option>
                  <option value="WARNING">Warning</option>
                  <option value="HIGH_RISK">High risk</option>
                  <option value="NOT_IPOD_FRIENDLY">Not iPod-friendly</option>
                </select>
              </label>

              <label className="ui-field">
                <span>Issue Type</span>
                <select
                  value={issueFilter}
                  onChange={(event) => setIssueFilter(event.target.value as FilterIssueType)}
                  className="ui-control"
                >
                  <option value="ALL">All</option>
                  <option value="PLAYBACK">Playback</option>
                  <option value="TAGS">Tags</option>
                  <option value="COVER">Cover</option>
                </select>
              </label>

              <label className="ui-field">
                <span>Search</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="filename / artist / album / title"
                  className="ui-control"
                />
              </label>
            </section>

            {results.length > 0 && !isAnalyzing && (
              <section className="tip-banner" aria-label="Support PodCheck">
                <div>
                  <div className="tip-banner-title">Saved you time?</div>
                  <div className="tip-banner-text">
                    Fuel PodCheck ☕ to keep it online and improve new features.
                  </div>
                </div>
                <a
                  className="btn tip-banner-btn"
                  href={BMAC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Buy me a coffee"
                  title="Buy me a coffee"
                >
                  <strong>BUY ME A COFFEE</strong>
                  <div id="container-stars">
                    <div id="stars"></div>
                  </div>
                  <div id="glow">
                    <div className="circle"></div>
                    <div className="circle"></div>
                  </div>
                </a>
              </section>
            )}

            <details className="ui-checks">
              <summary>What PodCheck checks</summary>
              <ul>
                <li>
                  Playback: FLAC, DRM/protected files, non-44.1kHz sample rates, hi-res bit depth (24-bit+), and long
                  tracks (30+ min)
                </li>
                <li>
                  Sorting: missing Title/Artist/Album/Track#, artist feat/ft patterns, and missing Album Artist
                  on multi-artist albums
                </li>
                <li>
                  Browsing: missing cover art, large/very large cover art, PNG cover art, and multiple embedded images
                </li>
              </ul>
            </details>

            <section className="ui-block">
              <ResultsTable results={filteredResults} />
            </section>
          </div>
        </div>
      </div>

    </main>
  );
}
