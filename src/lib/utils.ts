import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "unknown";
  }
}

export function getDomain(url: string | null): string {
  if (!url) return "";
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch {
    return "";
  }
}
