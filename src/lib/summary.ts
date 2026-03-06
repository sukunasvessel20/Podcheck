import type { FileAnalysis, SummaryMetrics } from "./types";

export function computeSummaryMetrics(results: FileAnalysis[]): SummaryMetrics {
  const filesScanned = results.length;

  if (filesScanned === 0) {
    return {
      averageScore: 0,
      filesScanned: 0,
      notIpodFriendlyCount: 0,
      warningCount: 0,
      playbackIssuesCount: 0,
      tagIssuesCount: 0,
      coverArtIssuesCount: 0,
      flacCount: 0,
      non44100Count: 0,
      missingTagFieldCount: 0,
      missingCoverArtCount: 0,
      oversizedCoverArtCount: 0,
      hiResBitDepthCount: 0,
      longTrackCount: 0,
      featArtistCount: 0,
      multipleImagesCount: 0,
      largeCoverCount: 0,
      veryLargeCoverCount: 0,
      drmProtectedCount: 0,
      albumArtistMissingCount: 0,
    };
  }

  const totalScore = results.reduce((sum, item) => sum + item.score, 0);
  const averageScore = Number((totalScore / filesScanned).toFixed(1));

  const notIpodFriendlyCount = results.filter((item) => item.status === "NOT_IPOD_FRIENDLY").length;
  const warningCount = results.filter(
    (item) => item.status === "CAUTION" || item.status === "WARNING" || item.status === "HIGH_RISK",
  ).length;
  const playbackIssuesCount = results.filter((item) => item.hasPlaybackIssue).length;
  const tagIssuesCount = results.filter((item) => item.hasTagIssue).length;
  const coverArtIssuesCount = results.filter((item) => item.hasCoverIssue).length;

  const flacCount = results.filter((item) => item.isFlac).length;
  const non44100Count = results.filter((item) => item.sampleRateIssue).length;
  const missingTagFieldCount = results.reduce((sum, item) => sum + item.tags.missing.length, 0);
  const missingCoverArtCount = results.filter((item) => !item.unreadable && !item.coverArt.present).length;
  const largeCoverCount = results.filter((item) => item.coverLargeFlag).length;
  const veryLargeCoverCount = results.filter((item) => item.coverVeryLargeFlag).length;
  const oversizedCoverArtCount = veryLargeCoverCount;

  const hiResBitDepthCount = results.filter((item) => item.hiResBitDepthFlag).length;
  const longTrackCount = results.filter((item) => item.longTrackFlag).length;
  const featArtistCount = results.filter((item) => item.featArtistFlag).length;
  const multipleImagesCount = results.filter((item) => item.multipleImagesFlag).length;
  const drmProtectedCount = results.filter((item) => item.drmFlag).length;
  const albumArtistMissingCount = results.filter((item) => item.albumArtistMissingFlag).length;

  return {
    averageScore,
    filesScanned,
    notIpodFriendlyCount,
    warningCount,
    playbackIssuesCount,
    tagIssuesCount,
    coverArtIssuesCount,
    flacCount,
    non44100Count,
    missingTagFieldCount,
    missingCoverArtCount,
    oversizedCoverArtCount,
    hiResBitDepthCount,
    longTrackCount,
    featArtistCount,
    multipleImagesCount,
    largeCoverCount,
    veryLargeCoverCount,
    drmProtectedCount,
    albumArtistMissingCount,
  };
}

export function createRedditSummary(results: FileAnalysis[]): string {
  const metrics = computeSummaryMetrics(results);

  if (metrics.filesScanned === 0) {
    return "PodCheck v1\nNo files were analyzed.";
  }

  const lines = [
    "PodCheck v1",
    `Files scanned: ${metrics.filesScanned}`,
    `Average score: ${metrics.averageScore}/100`,
    `FLAC files: ${metrics.flacCount}`,
    `Non-44.1kHz files: ${metrics.non44100Count}`,
    `Hi-res bit depth count: ${metrics.hiResBitDepthCount}`,
    `Long tracks (30+ min): ${metrics.longTrackCount}`,
    `Artist feat./ft. count: ${metrics.featArtistCount}`,
    `Multiple embedded images count: ${metrics.multipleImagesCount}`,
    `Large cover count (1001-1500): ${metrics.largeCoverCount}`,
    `Very large cover count (>1500): ${metrics.veryLargeCoverCount}`,
    `DRM/protected count: ${metrics.drmProtectedCount}`,
    `Missing Album Artist (multi-artist album) count: ${metrics.albumArtistMissingCount}`,
    `Missing tag fields: ${metrics.missingTagFieldCount}`,
    `Missing cover art: ${metrics.missingCoverArtCount}`,
    `Not iPod-friendly: ${metrics.notIpodFriendlyCount}`,
    `Warnings: ${metrics.warningCount}`,
  ];

  return lines.join("\n");
}
