import type { MaskedTypeformResponse } from "../services/typeform.service";

export type WinnerRevealGrant = { flowToken: string; expiresAt: string };
export type WinnerSelectionResult =
  | { status: "confirmed"; winnerCount: number; grant: WinnerRevealGrant | null }
  | { status: "denied"; message: string };
export type WinnerDetailResult =
  | { status: "revealed"; expiresAt: string; response: MaskedTypeformResponse; contact?: string }
  | { status: "denied"; message: string };
export type WinnerViewParticipant = { token: string; label: string };
export type WinnerConsultationResult =
  | { status: "ready"; grant: WinnerRevealGrant; participants: WinnerViewParticipant[] }
  | { status: "denied"; message: string };
export type BeginWinnerData = () => Promise<WinnerConsultationResult>;
export type ReadWinnerData = (flowToken: string, responseToken: string) => Promise<WinnerDetailResult>;
export type FinishWinnerData = (flowToken: string) => Promise<void>;