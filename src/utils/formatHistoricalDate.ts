function getEra(year: number): "BCE" | "CE" {
  return year < 0 ? "BCE" : "CE";
}

function getDisplayYear(year: number): number {
  return Math.abs(year);
}

export function formatHistoricalYear(year: number): string {
  return `${getDisplayYear(year)} ${getEra(year)}`;
}

export function formatHistoricalYearRange(
  startYear?: number,
  endYear?: number,
): string | null {
  if (startYear === undefined && endYear === undefined) {
    return null;
  }

  if (startYear === undefined) {
    return `Until ${formatHistoricalYear(endYear!)}`;
  }

  if (endYear === undefined) {
    return formatHistoricalYear(startYear);
  }

  const startEra = getEra(startYear);
  const endEra = getEra(endYear);

  if (startEra === endEra) {
    return `${getDisplayYear(startYear)}–${getDisplayYear(endYear)} ${endEra}`;
  }

  return `${formatHistoricalYear(startYear)}–${formatHistoricalYear(endYear)}`;
}