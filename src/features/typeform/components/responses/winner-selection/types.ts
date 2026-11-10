import type { BeginWinnerData, ReadWinnerData, FinishWinnerData, WinnerSelectionResult } from "@/features/typeform/types/winner-reveal";

export type WinnerCandidate = {
  token: string;
  label: string;
  detail?: string;
  email?: string;
  region?: string;
  city?: string;
  comuna?: string;
  participantNumber?: number | string;
  selected?: boolean;
  missingResponse?: boolean;
};

export type WinnerSelectionPanelProps = {
  action: (formData: FormData) => void | Promise<void | WinnerSelectionResult>;
  beginWinnerData?: BeginWinnerData;
  readWinnerData?: ReadWinnerData;
  finishWinnerData?: FinishWinnerData;
  exportBaseHref?: string;
  publicFormUrl?: string;
  isFixturePreview?: boolean;
  candidates: WinnerCandidate[];
  currentPage: number;
  initialRegionFilter?: string;
  initialReason?: string;
  itemsPerPage: number;
  pageSizeValue?: string;
  winnerSelection?: string;
  winnerRevision?: string;
  winnerError?: string;
};
