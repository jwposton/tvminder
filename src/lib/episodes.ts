import { isAfter, startOfDay } from "date-fns";

export function isEpisodeAired(
  airDate: Date | string | null,
  referenceDate = startOfDay(new Date())
): boolean {
  if (!airDate) return false;
  const date = typeof airDate === "string" ? new Date(airDate) : airDate;
  return !isAfter(date, referenceDate) || date.getTime() === referenceDate.getTime();
}
