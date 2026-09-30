export type WinnerCandidate = {
  token: string;
  label: string;
  detail?: string;
  email?: string;
  region?: string;
  comuna?: string;
  participantNumber?: number | string;
  selected?: boolean;
};

export type WinnerSelectionPanelProps = {
  action: (formData: FormData) => void | Promise<void>;
  candidates: WinnerCandidate[];
  currentPage: number;
  initialRegionFilter?: string;
  itemsPerPage: number;
  pageSizeValue?: string;
  winnerSelection?: string;
  winnerError?: string;
};
