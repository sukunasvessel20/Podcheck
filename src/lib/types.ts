export type CompatibilityStatus =
  | "OK"
  | "CAUTION"
  | "WARNING"
  | "HIGH_RISK"
  | "NOT_IPOD_FRIENDLY";

export type IssueType = "PLAYBACK" | "TAGS" | "COVER";

export type FilterStatus = "ALL" | CompatibilityStatus;

export type FilterIssueType = "ALL" | IssueType;

export type TagField = "Title" | "Artist" | "Album" | "Track#";

export type CoverArtClass = "OK" | "LARGE" | "VERY_LARGE" | "UNKNOWN";

export type CoverArtFormat = "JPG" | "PNG" | "UNKNOWN";

export interface AudioFormatInfo {
  container: string | null;
  codec: string | null;
  sampleRate: number | null;
  channels: number | null;
  bitrate: number | null;
  duration: number | null;
  bitDepth: number | null;
}

export interface TagInfo {
  title: string | null;
  artist: string | null;
  album: string | null;
  albumArtist: string | null;
  track: string | null;
  missing: TagField[];
}

export interface CoverArtInfo {
  present: boolean;
  width: number | null;
  height: number | null;
  dimensionsKnown: boolean;
  class: CoverArtClass;
  format: CoverArtFormat | null;
  embeddedImageCount: number;
}

export interface FileAnalysis {
  id: string;
  fileName: string;
  status: CompatibilityStatus;
  score: number;
  recommendation: string;
  format: AudioFormatInfo;
  tags: TagInfo;
  coverArt: CoverArtInfo;
  issues: string[];
  issueTypes: IssueType[];
  unreadable: boolean;
  parseError: string | null;
  isFlac: boolean;
  unknownCodecOrContainer: boolean;
  sampleRateIssue: boolean;
  sampleRateUnknown: boolean;
  hiResBitDepthFlag: boolean;
  hiResSampleRateFlag: boolean;
  hiResFlag: boolean;
  featArtistFlag: boolean;
  longTrackFlag: boolean;
  drmFlag: boolean;
  albumArtistMissingFlag: boolean;
  multipleImagesFlag: boolean;
  pngCoverArtFlag: boolean;
  coverLargeFlag: boolean;
  coverVeryLargeFlag: boolean;
  hasPlaybackIssue: boolean;
  hasTagIssue: boolean;
  hasCoverIssue: boolean;
}

export interface SummaryMetrics {
  averageScore: number;
  filesScanned: number;
  notIpodFriendlyCount: number;
  warningCount: number;
  playbackIssuesCount: number;
  tagIssuesCount: number;
  coverArtIssuesCount: number;
  flacCount: number;
  non44100Count: number;
  missingTagFieldCount: number;
  missingCoverArtCount: number;
  oversizedCoverArtCount: number;
  hiResBitDepthCount: number;
  longTrackCount: number;
  featArtistCount: number;
  multipleImagesCount: number;
  largeCoverCount: number;
  veryLargeCoverCount: number;
  drmProtectedCount: number;
  albumArtistMissingCount: number;
}
