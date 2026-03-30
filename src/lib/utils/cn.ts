import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names together smartly.
 * Example: cn("text-red-500", "text-blue-500") => "text-blue-500"
 * (the second one wins instead of both being applied)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
