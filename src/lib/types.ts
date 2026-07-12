export type ScanMode = "landing" | "signup" | "dashboard" | "chaos";
export type ScanTier = "free" | "deep";
export type ScanStatus =
  | "queued"
  | "claiming"
  | "running"
  | "finalizing"
  | "completed"
  | "failed"
  | "cancelled";
export type ScanResult = "dead" | "survived";

export interface AppRecord {
  _id?: string;
  url: string;
  normalizedUrl: string;
  title?: string;
}

export interface ScanRunRecord {
  _id: string;
  appId?: string;
  mode: ScanMode;
  tier: ScanTier;
  status: ScanStatus;
  result?: ScanResult;
  publicSlug?: string;
  survivedUsers: number;
  maxUsers: number;
  score?: number;
  causeOfDeath?: string;
  fatalRoute?: string;
  severity?: "minor" | "embarrassing" | "critical" | "apocalyptic";
  currentStage?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface PersonaRunRecord {
  personaName: string;
  task: string;
  status: "queued" | "running" | "success" | "failed" | "skipped";
  summary?: string;
  failureReason?: string;
  route?: string;
  artifactUrls?: string[];
  consoleErrorCount?: number;
}

export interface DeathCertificateRecord {
  publicSlug: string;
  verdictText: string;
  roastText: string;
  fixSuggestions: string[];
  audioUrl?: string;
  shareImageUrl?: string;
}

export interface ScanBundle {
  run: ScanRunRecord;
  app: AppRecord | null;
  personas: PersonaRunRecord[];
  certificate?: DeathCertificateRecord | null;
}

export interface SubmitScanInput {
  url: string;
  mode: ScanMode;
  tier: ScanTier;
}
