import type { CSSProperties } from "react";
import type { SummaryMetrics } from "@/lib/types";

interface SummaryCardsProps {
  metrics: SummaryMetrics;
  hasResults: boolean;
}

function getOverallState(metrics: SummaryMetrics): "OK" | "CAUTION" | "WARNING" | "HIGH_RISK" {
  if (metrics.averageScore < 50) {
    return "HIGH_RISK";
  }

  if (metrics.averageScore < 70) {
    return "WARNING";
  }

  if (metrics.averageScore < 80) {
    return "CAUTION";
  }

  return "OK";
}

export default function SummaryCards({ metrics, hasResults }: SummaryCardsProps) {
  const lines: Array<{ label: string; value: string | number }> = [
    { label: "Files scanned", value: metrics.filesScanned },
    { label: "Not iPod-friendly", value: metrics.notIpodFriendlyCount },
    { label: "Warnings", value: metrics.warningCount },
    { label: "Playback issues", value: metrics.playbackIssuesCount },
    { label: "Tag issues", value: metrics.tagIssuesCount },
    { label: "Cover art issues", value: metrics.coverArtIssuesCount },
    { label: "FLAC files", value: metrics.flacCount },
    { label: "Non-44.1kHz files", value: metrics.non44100Count },
    { label: "Hi-res bit depth count", value: metrics.hiResBitDepthCount },
    { label: "Long tracks (30+ min)", value: metrics.longTrackCount },
    { label: "Artist feat./ft. count", value: metrics.featArtistCount },
    { label: "Multiple embedded images count", value: metrics.multipleImagesCount },
    { label: "Large cover count (1001-1500)", value: metrics.largeCoverCount },
    { label: "Very large cover count (>1500)", value: metrics.veryLargeCoverCount },
    { label: "DRM/protected count", value: metrics.drmProtectedCount },
    { label: "Missing Album Artist (multi-artist album) count", value: metrics.albumArtistMissingCount },
  ];

  const overallState = hasResults ? getOverallState(metrics) : "OK";
  const gaugeColor = !hasResults
    ? "transparent"
    : overallState === "HIGH_RISK"
        ? "#f97316"
      : overallState === "WARNING"
        ? "#f59e0b"
        : overallState === "CAUTION"
          ? "#facc15"
          : "#22c55e";

  const gaugeOuterColor = !hasResults
    ? "#d3d1d3"
    : overallState === "HIGH_RISK"
        ? "#fed7aa"
      : overallState === "WARNING"
        ? "#fde2b8"
        : overallState === "CAUTION"
          ? "#fef3c7"
          : "#bbf7d0";

  const score = hasResults ? Math.max(0, Math.min(100, metrics.averageScore)) : 0;
  const arcSpan = 78;
  const arcGap = 100 - arcSpan;
  const progressArc = (arcSpan * score) / 100;
  const outerProgressArc = progressArc;
  const innerStartOffset = 0;
  const outerStartOffset = 0;

  return (
    <div className="summary-layout" aria-label="Analysis summary">
      <div className="summary-average-bar">
        <div className="summary-average-label">Average score</div>

        <div
          className={`score-gauge-shell ${hasResults ? "" : "is-empty"}`.trim()}
          style={
            {
              "--gauge-color": gaugeColor,
              "--gauge-outer-color": gaugeOuterColor,
            } as CSSProperties
          }
        >
          <div className="score-gauge-plate">
            <svg className="score-gauge-outer-svg" viewBox="0 0 220 220" aria-hidden="true">
              <circle
                className="score-gauge-outer-track"
                cx="110"
                cy="110"
                r="99"
                pathLength={100}
                strokeDasharray={`${arcSpan} ${arcGap}`}
                strokeDashoffset={outerStartOffset}
              />
              <circle
                className="score-gauge-outer-progress"
                cx="110"
                cy="110"
                r="99"
                pathLength={100}
                strokeDasharray={`${outerProgressArc} 100`}
                strokeDashoffset={outerStartOffset}
              />
            </svg>

            <div className="score-gauge-face">
              <svg className="score-gauge-svg" viewBox="0 0 120 120" aria-hidden="true">
                <circle
                  className="score-gauge-track"
                  cx="60"
                  cy="60"
                  r="37"
                  pathLength={100}
                  strokeDasharray={`${arcSpan} ${arcGap}`}
                  strokeDashoffset={innerStartOffset}
                />
                <circle
                  className="score-gauge-progress"
                  cx="60"
                  cy="60"
                  r="37"
                  pathLength={100}
                  strokeDasharray={`${progressArc} 100`}
                  strokeDashoffset={innerStartOffset}
                />
              </svg>

              <div className="score-gauge-value">{hasResults ? `${Math.round(metrics.averageScore)}%` : "—"}</div>
            </div>
          </div>
        </div>

        <div className="score-key-menu">
          <div className="score-key-item">
            <button type="button" className="score-key-link" aria-label="Score key">
              <span>KEY</span>
              <svg viewBox="0 0 360 360" xmlSpace="preserve" aria-hidden="true">
                <path
                  d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393
                  c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150
                  c2.813,2.813,6.628,4.393,10.606,4.393s7.794-1.581,10.606-4.394l149.996-150
                  C331.465,94.749,331.465,85.251,325.607,79.393z"
                ></path>
              </svg>
            </button>

            <div className="score-key-submenu">
              <div className="score-key-submenu-item">
                <span className="score-key-submenu-link score-key-ok">OK (80-100): GREEN</span>
              </div>
              <div className="score-key-submenu-item">
                <span className="score-key-submenu-link score-key-caution">CAUTION (70-79): YELLOW</span>
              </div>
              <div className="score-key-submenu-item">
                <span className="score-key-submenu-link score-key-warning">WARNING (50-69): AMBER</span>
              </div>
              <div className="score-key-submenu-item">
                <span className="score-key-submenu-link score-key-high-risk">HIGH_RISK (&lt;50): ORANGE-RED</span>
              </div>
              <div className="score-key-submenu-item">
                <span className="score-key-submenu-link score-key-not-ipod">
                  NOT_IPOD_FRIENDLY (file status): DEEP RED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="summary-list-bar">
        {lines.map((item) => (
          <div key={item.label} className="summary-list-line">
            <span>{item.label}:</span> <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
