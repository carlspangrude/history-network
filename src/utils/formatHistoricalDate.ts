import type { KnowledgeNode } from "../types/graph";

function getEra(year: number): "BCE" | "CE" {
  return year < 0 ? "BCE" : "CE";
}

function getDisplayYear(year: number): number {
  return Math.abs(year);
}

export function formatHistoricalYear(
  year: number,
  isApprox?: boolean,
): string {
  const formatted = `${getDisplayYear(year)} ${getEra(year)}`;
  return isApprox ? `c. ${formatted}` : formatted;
}

type YearRangeNode = Pick<
  KnowledgeNode,
  | "startYear"
  | "endYear"
  | "startYearApprox"
  | "endYearApprox"
  | "isOngoing"
>;

export function formatHistoricalYearRange(
  node: YearRangeNode,
): string | null {
  const { startYear, endYear, startYearApprox, endYearApprox, isOngoing } =
    node;

  if (startYear === undefined && endYear === undefined) {
    return null;
  }

  if (startYear === undefined) {
    return `Until ${formatHistoricalYear(endYear!, endYearApprox)}`;
  }

  if (endYear === undefined) {
    const startLabel = formatHistoricalYear(startYear, startYearApprox);
    return isOngoing ? `${startLabel} – present` : startLabel;
  }

  const startEra = getEra(startYear);
  const endEra = getEra(endYear);

  if (startEra === endEra) {
    const startLabel = `${startYearApprox ? "c. " : ""}${getDisplayYear(startYear)}`;
    const endLabel = `${endYearApprox ? "c. " : ""}${getDisplayYear(endYear)}`;
    return `${startLabel}–${endLabel} ${endEra}`;
  }

  return `${formatHistoricalYear(startYear, startYearApprox)}–${formatHistoricalYear(endYear, endYearApprox)}`;
}