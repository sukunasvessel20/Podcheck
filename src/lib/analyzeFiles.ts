import { parseBlob } from "music-metadata-browser";
import type {
  CompatibilityStatus,
  CoverArtClass,
  CoverArtFormat,
  FileAnalysis,
  IssueType,
  TagField,
} from "./types";

interface CoverDimensions {
  width: number | null;
  height: number | null;
  dimensionsKnown: boolean;
}

const FEAT_PATTERN = /\b(feat\.?|ft\.?|featuring)\b/i;
const PENALTY = {
  flac: 40,
  drm: 7,
  unknownCodecOrContainer: 20,
  sampleRateNot44100: 18,
  hiResBitDepth: 7,
  longTrack: 3,
  missingTag: 7,
  coverMissing: 6,
  coverLarge: 3,
  coverVeryLarge: 6,
  multipleEmbeddedImages: 3,
  unreadable: 20,
  featArtist: 3,
} as const;

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function parseBitDepth(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }

  return null;
}

function detectCoverArtFormat(picture: { format?: string; data: Uint8Array }): CoverArtFormat {
  const format = picture.format?.toLowerCase();

  if (format?.includes("jpeg") || format?.includes("jpg")) {
    return "JPG";
  }

  if (format?.includes("png")) {
    return "PNG";
  }

  if (picture.data.length >= 4) {
    const [b0, b1, b2, b3] = picture.data;

    if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) {
      return "JPG";
    }

    if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) {
      return "PNG";
    }
  }

  return "UNKNOWN";
}

async function getCoverDimensions(data: Uint8Array, format?: string): Promise<CoverDimensions> {
  if (typeof createImageBitmap !== "function") {
    return { width: null, height: null, dimensionsKnown: false };
  }

  try {
    const buffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(buffer).set(data);
    const blob = new Blob([buffer], { type: format || "image/jpeg" });
    const bitmap = await createImageBitmap(blob);
    const dimensions = {
      width: bitmap.width,
      height: bitmap.height,
      dimensionsKnown: true,
    };

    bitmap.close();
    return dimensions;
  } catch {
    return { width: null, height: null, dimensionsKnown: false };
  }
}

function getStatus(params: {
  isFlac: boolean;
  unreadable: boolean;
  score: number;
}): CompatibilityStatus {
  const { isFlac, unreadable, score } = params;

  if (isFlac) {
    return "NOT_IPOD_FRIENDLY";
  }

  if (unreadable || score < 50) {
    return "HIGH_RISK";
  }

  if (score < 70) {
    return "WARNING";
  }

  if (score < 80) {
    return "CAUTION";
  }

  return "OK";
}

function getFileId(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

function finalizeRecommendation(
  recommendationSet: Set<string>,
  status: CompatibilityStatus,
  unreadable: boolean,
): string {
  if (recommendationSet.size > 0) {
    return Array.from(recommendationSet).join(" ");
  }

  if (unreadable) {
    return "File could not be parsed. Re-export it from source and analyze again.";
  }

  if (status === "OK") {
    return "Looks iPod-friendly.";
  }

  return "Review warnings and normalize files for iPod-friendly playback.";
}

export async function analyzeFile(file: File): Promise<FileAnalysis> {
  let score = 100;
  const issues: string[] = [];
  const issueTypeSet = new Set<IssueType>();
  const recommendationSet = new Set<string>();

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  let unreadable = false;
  let parseError: string | null = null;
  let metadata: Awaited<ReturnType<typeof parseBlob>> | null = null;

  try {
    metadata = await parseBlob(file, { duration: true });
  } catch (error: unknown) {
    unreadable = true;
    parseError = error instanceof Error ? error.message : "Unknown parse error";
  }

  const container = normalizeText(metadata?.format?.container);
  const codec = normalizeText(metadata?.format?.codec);
  const sampleRate = metadata?.format?.sampleRate ?? null;
  const channels = metadata?.format?.numberOfChannels ?? null;
  const bitrate = metadata?.format?.bitrate ?? null;
  const duration = metadata?.format?.duration ?? null;
  const bitDepth = parseBitDepth(metadata?.format?.bitsPerSample);

  const title = normalizeText(metadata?.common?.title);
  const artist = normalizeText(metadata?.common?.artist);
  const album = normalizeText(metadata?.common?.album);
  const albumArtist = normalizeText(metadata?.common?.albumartist);
  const trackNo = metadata?.common?.track?.no;
  const track = typeof trackNo === "number" && trackNo > 0 ? String(trackNo) : null;

  const formatValues = [container, codec]
    .filter((value): value is string => value !== null)
    .map((value) => value.toLowerCase());

  const isFlac = extension === "flac" || formatValues.some((value) => value.includes("flac"));
  const unknownCodecOrContainer = !container && !codec;
  const sampleRateIssue = sampleRate !== null && sampleRate !== 44100;
  const sampleRateUnknown = sampleRate === null;
  const hiResSampleRateFlag = sampleRate !== null && sampleRate > 44100;
  const hiResBitDepthFlag = bitDepth !== null && bitDepth > 16;
  const hiResFlag = hiResSampleRateFlag || hiResBitDepthFlag;

  const protectedTokens = ["protected", "drm", "fairplay", "encrypted"];
  const drmFlag =
    extension === "m4p" ||
    formatValues.some((value) => protectedTokens.some((token) => value.includes(token)));

  const featArtistFlag = artist !== null && FEAT_PATTERN.test(artist);
  const longTrackFlag = duration !== null && duration >= 1800;

  const missingTags: TagField[] = [];
  if (!unreadable) {
    if (!title) {
      missingTags.push("Title");
    }
    if (!artist) {
      missingTags.push("Artist");
    }
    if (!album) {
      missingTags.push("Album");
    }
    if (!track) {
      missingTags.push("Track#");
    }
  }

  const embeddedImageCount = metadata?.common?.picture?.length ?? 0;
  const picture = metadata?.common?.picture?.[0];

  let coverPresent = false;
  let coverWidth: number | null = null;
  let coverHeight: number | null = null;
  let coverDimensionsKnown = false;
  let coverFormat: CoverArtFormat | null = null;

  if (!unreadable && picture?.data?.length) {
    coverPresent = true;
    coverFormat = detectCoverArtFormat(picture);
    const dimensions = await getCoverDimensions(picture.data, picture.format);
    coverWidth = dimensions.width;
    coverHeight = dimensions.height;
    coverDimensionsKnown = dimensions.dimensionsKnown;
  }

  const maxCoverDimension = Math.max(coverWidth ?? 0, coverHeight ?? 0);

  let coverClass: CoverArtClass = "UNKNOWN";
  if (coverPresent && coverDimensionsKnown) {
    if (maxCoverDimension <= 1000) {
      coverClass = "OK";
    } else if (maxCoverDimension <= 1500) {
      coverClass = "LARGE";
    } else {
      coverClass = "VERY_LARGE";
    }
  }

  const coverLargeFlag = coverClass === "LARGE";
  const coverVeryLargeFlag = coverClass === "VERY_LARGE";
  const coverMissing = !unreadable && !coverPresent;
  const coverDimensionsUnknown = coverPresent && !coverDimensionsKnown;
  const multipleImagesFlag = !unreadable && embeddedImageCount > 1;
  const pngCoverArtFlag = !unreadable && coverPresent && coverFormat === "PNG";

  function addIssue(
    label: string,
    issueType: IssueType,
    penalty = 0,
    recommendation?: string,
  ): void {
    if (issues.includes(label)) {
      return;
    }

    issues.push(label);
    issueTypeSet.add(issueType);
    score -= penalty;

    if (recommendation) {
      recommendationSet.add(recommendation);
    }
  }

  if (isFlac) {
    addIssue(
      "FLAC is not iPod-friendly",
      "PLAYBACK",
      PENALTY.flac,
      "Convert FLAC to AAC or MP3 at 44.1kHz for iPod compatibility.",
    );
  }

  if (drmFlag) {
    addIssue(
      "Protected/DRM file (may not behave as expected)",
      "PLAYBACK",
      PENALTY.drm,
      "Replace with a non-protected version if possible.",
    );
  }

  if (unknownCodecOrContainer) {
    addIssue("Unknown codec/container", "PLAYBACK", PENALTY.unknownCodecOrContainer);
  }

  if (sampleRateIssue) {
    const label = hiResSampleRateFlag
      ? "Hi-res sample rate (not 44.1kHz)"
      : "Sample rate is not 44.1kHz";

    addIssue(
      label,
      "PLAYBACK",
      PENALTY.sampleRateNot44100,
      "Export to 16-bit/44.1 kHz for best iPod stability.",
    );
  }

  if (sampleRateUnknown) {
    addIssue("Sample rate unavailable", "PLAYBACK");
  }

  if (hiResBitDepthFlag) {
    addIssue(
      "Hi-res bit depth (24-bit+)",
      "PLAYBACK",
      PENALTY.hiResBitDepth,
      "Export to 16-bit/44.1 kHz for best iPod stability.",
    );
  }

  if (longTrackFlag) {
    addIssue(
      "Long track (30+ min)",
      "PLAYBACK",
      PENALTY.longTrack,
      "If you experience skipping, re-encode with a modern encoder or split the track.",
    );
  }

  if (missingTags.length > 0) {
    for (const tag of missingTags) {
      addIssue(`Missing ${tag} tag`, "TAGS", PENALTY.missingTag);
    }
  }

  if (featArtistFlag) {
    addIssue(
      "Artist contains feat./ft. (may split artists)",
      "TAGS",
      PENALTY.featArtist,
      "Keep Artist as primary artist; move 'feat. X' into the Title field.",
    );
  }

  if (coverMissing) {
    addIssue("Missing cover art", "COVER", PENALTY.coverMissing);
  }

  if (coverLargeFlag) {
    addIssue(
      `Large cover (${maxCoverDimension}px)`,
      "COVER",
      PENALTY.coverLarge,
      "Resize cover art to ~600–1000px (JPG recommended) to reduce iPod UI lag.",
    );
  }

  if (coverVeryLargeFlag) {
    addIssue(
      `Very large cover (${maxCoverDimension}px)`,
      "COVER",
      PENALTY.coverVeryLarge,
      "Resize cover art to ~600–1000px (JPG recommended) to reduce iPod UI lag.",
    );
  }

  if (pngCoverArtFlag) {
    addIssue(
      "PNG cover art (prefer JPG)",
      "COVER",
      0,
      "Resize cover art to ~600–1000px (JPG recommended) to reduce iPod UI lag.",
    );
  }

  if (multipleImagesFlag) {
    addIssue(
      "Multiple embedded images (can bloat files)",
      "COVER",
      PENALTY.multipleEmbeddedImages,
      "Keep only the front cover image to reduce size/odd behavior.",
    );
  }

  if (coverDimensionsUnknown) {
    addIssue("Cover art dimensions unavailable", "COVER");
  }

  if (unreadable) {
    addIssue(
      "Unreadable metadata (parse failure)",
      "PLAYBACK",
      PENALTY.unreadable,
      "File could not be parsed. Re-export it from source and analyze again.",
    );
  }

  const hasPlaybackIssue =
    unreadable ||
    unknownCodecOrContainer ||
    sampleRateIssue ||
    sampleRateUnknown ||
    hiResBitDepthFlag ||
    longTrackFlag ||
    drmFlag;

  const hasTagIssue = missingTags.length > 0 || featArtistFlag;

  const hasCoverIssue =
    coverMissing ||
    coverLargeFlag ||
    coverVeryLargeFlag ||
    coverDimensionsUnknown ||
    pngCoverArtFlag ||
    multipleImagesFlag;

  const finalScore = clampScore(score);
  const status = getStatus({
    isFlac,
    unreadable,
    score: finalScore,
  });

  return {
    id: getFileId(file),
    fileName: file.name,
    status,
    score: finalScore,
    recommendation: finalizeRecommendation(recommendationSet, status, unreadable),
    format: {
      container,
      codec,
      sampleRate,
      channels,
      bitrate,
      duration,
      bitDepth,
    },
    tags: {
      title,
      artist,
      album,
      albumArtist,
      track,
      missing: missingTags,
    },
    coverArt: {
      present: coverPresent,
      width: coverWidth,
      height: coverHeight,
      dimensionsKnown: coverDimensionsKnown,
      class: coverClass,
      format: coverFormat,
      embeddedImageCount,
    },
    issues,
    issueTypes: Array.from(issueTypeSet),
    unreadable,
    parseError,
    isFlac,
    unknownCodecOrContainer,
    sampleRateIssue,
    sampleRateUnknown,
    hiResBitDepthFlag,
    hiResSampleRateFlag,
    hiResFlag,
    featArtistFlag,
    longTrackFlag,
    drmFlag,
    albumArtistMissingFlag: false,
    multipleImagesFlag,
    pngCoverArtFlag,
    coverLargeFlag,
    coverVeryLargeFlag,
    hasPlaybackIssue,
    hasTagIssue,
    hasCoverIssue,
  };
}

function appendIssue(result: FileAnalysis, label: string, issueType: IssueType): void {
  if (!result.issues.includes(label)) {
    result.issues.push(label);
  }

  if (!result.issueTypes.includes(issueType)) {
    result.issueTypes.push(issueType);
  }
}

function appendRecommendation(result: FileAnalysis, text: string): void {
  if (result.recommendation.includes(text)) {
    return;
  }

  if (result.recommendation === "Looks iPod-friendly.") {
    result.recommendation = text;
    return;
  }

  result.recommendation = result.recommendation.endsWith(".")
    ? `${result.recommendation} ${text}`
    : `${result.recommendation}. ${text}`;
}

function applyAlbumArtistConsistencyWarnings(results: FileAnalysis[]): void {
  const byAlbum = new Map<string, FileAnalysis[]>();

  for (const result of results) {
    if (result.unreadable || !result.tags.album) {
      continue;
    }

    const albumKey = normalizeKey(result.tags.album);
    if (!byAlbum.has(albumKey)) {
      byAlbum.set(albumKey, []);
    }

    byAlbum.get(albumKey)?.push(result);
  }

  for (const albumResults of byAlbum.values()) {
    const artistSet = new Set<string>();

    for (const item of albumResults) {
      if (item.tags.artist) {
        artistSet.add(normalizeKey(item.tags.artist));
      }
    }

    if (artistSet.size <= 1) {
      continue;
    }

    for (const item of albumResults) {
      if (item.tags.albumArtist) {
        continue;
      }

      item.albumArtistMissingFlag = true;
      item.hasTagIssue = true;

      appendIssue(item, "Missing Album Artist (may split album)", "TAGS");
      appendRecommendation(
        item,
        "Set Album Artist (e.g., 'Various Artists' or main artist) for consistent album grouping.",
      );

      if (item.status === "OK") {
        item.status = "CAUTION";
      }

      item.score = clampScore(item.score);
    }
  }
}

export async function analyzeFiles(
  files: File[],
  onProgress?: (completed: number, total: number) => void,
): Promise<FileAnalysis[]> {
  const total = files.length;
  const results: FileAnalysis[] = [];

  onProgress?.(0, total);

  for (let i = 0; i < files.length; i += 1) {
    const result = await analyzeFile(files[i]);
    results.push(result);
    onProgress?.(i + 1, total);
  }

  applyAlbumArtistConsistencyWarnings(results);
  return results;
}
