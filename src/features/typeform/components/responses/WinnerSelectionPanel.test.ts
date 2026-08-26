import { describe, expect, it } from "vitest";

import { deduplicateWinnerCandidates } from "./WinnerSelectionPanel";

describe("deduplicateWinnerCandidates", () => {
  it("removes duplicate candidates that share the same token and metadata", () => {
    const candidates = [
      { token: "winner-123", label: "Ana", detail: "#1", participantNumber: 1 },
      { token: "winner-123", label: "Ana", detail: "#1", participantNumber: 1 },
      { token: "winner-456", label: "Luis", detail: "#2", participantNumber: 2 },
    ];

    expect(deduplicateWinnerCandidates(candidates)).toHaveLength(2);
    expect(deduplicateWinnerCandidates(candidates).map((candidate) => candidate.token)).toEqual([
      "winner-123",
      "winner-456",
    ]);
  });
});
