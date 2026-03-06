import type { CompatibilityStatus, FileAnalysis } from "@/lib/types";

interface ResultsTableProps {
  results: FileAnalysis[];
}

function getStatusClass(status: CompatibilityStatus): string {
  if (status === "OK") {
    return "results-status--ok";
  }

  if (status === "CAUTION") {
    return "results-status--caution";
  }

  if (status === "WARNING") {
    return "results-status--warning";
  }

  if (status === "HIGH_RISK") {
    return "results-status--high-risk";
  }

  return "results-status--bad";
}

function getStatusLabel(status: CompatibilityStatus): string {
  if (status === "NOT_IPOD_FRIENDLY") {
    return "Not iPod-friendly";
  }

  if (status === "HIGH_RISK") {
    return "High risk";
  }

  if (status === "CAUTION") {
    return "Caution";
  }

  return status;
}

function formatDuration(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatBitrate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value / 1000)} kbps`;
}

function formatBitDepth(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value)}-bit`;
}

export default function ResultsTable({ results }: ResultsTableProps) {
  if (results.length === 0) {
    return (
      <div className="results-empty">
        <div>Drop files above and click Analyze.</div>
        <div className="results-empty-sub">Tip: PodCheck runs locally — nothing uploads.</div>
      </div>
    );
  }

  return (
    <div className="results-wrap">
      <table className="results-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Status</th>
            <th>Format</th>
            <th>Sample Rate</th>
            <th>Issues</th>
            <th>Recommendation</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item) => {
            const format = `${item.format.container ?? "Unknown"} / ${item.format.codec ?? "Unknown"}`;
            const sampleRate = item.format.sampleRate ? `${item.format.sampleRate} Hz` : "—";

            return (
              <tr key={item.id}>
                <td>
                  <div className="results-file">{item.fileName}</div>
                  <div className="results-meta">
                    Duration: {formatDuration(item.format.duration)} | Bitrate: {formatBitrate(item.format.bitrate)} |
                    Bit depth: {formatBitDepth(item.format.bitDepth)}
                  </div>
                </td>
                <td>
                  <span className={`results-status ${getStatusClass(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                <td>{format}</td>
                <td>{sampleRate}</td>
                <td>
                  <div className="results-issues">
                    {item.issues.length === 0 ? (
                      <span className="results-no-issue">No issues</span>
                    ) : (
                      item.issues.map((issue) => (
                        <span key={`${item.id}-${issue}`} className="results-issue-chip">
                          {issue}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td>{item.recommendation}</td>
                <td className="results-score">{item.score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
