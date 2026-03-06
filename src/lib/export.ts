import type { FileAnalysis } from "./types";

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
}

export function createCsvContent(results: FileAnalysis[]): string {
  const headers = [
    "File Name",
    "Status",
    "Score",
    "Container",
    "Codec",
    "Sample Rate",
    "Channels",
    "Bitrate",
    "Duration",
    "bitDepth",
    "Title",
    "Artist",
    "Album",
    "Album Artist",
    "Track#",
    "Cover Present",
    "Cover Width",
    "Cover Height",
    "coverArtClass",
    "coverArtFormat",
    "embeddedImageCount",
    "hiResFlag",
    "featArtistFlag",
    "longTrackFlag",
    "drmFlag",
    "albumArtistMissingFlag",
    "Issues",
    "Recommendation",
    "Unreadable",
  ];

  const rows = results.map((item) => {
    const row = [
      item.fileName,
      item.status,
      item.score,
      item.format.container,
      item.format.codec,
      item.format.sampleRate,
      item.format.channels,
      item.format.bitrate,
      item.format.duration,
      item.format.bitDepth,
      item.tags.title,
      item.tags.artist,
      item.tags.album,
      item.tags.albumArtist,
      item.tags.track,
      item.coverArt.present,
      item.coverArt.width,
      item.coverArt.height,
      item.coverArt.class,
      item.coverArt.format,
      item.coverArt.embeddedImageCount,
      item.hiResFlag,
      item.featArtistFlag,
      item.longTrackFlag,
      item.drmFlag,
      item.albumArtistMissingFlag,
      item.issues.join("; "),
      item.recommendation,
      item.unreadable,
    ];

    return row.map((field) => escapeCsv(field)).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(results: FileAnalysis[], filename = "podcheck-results.csv"): void {
  if (typeof window === "undefined") {
    return;
  }

  const csv = createCsvContent(results);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
