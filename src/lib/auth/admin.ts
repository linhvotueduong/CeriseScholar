import "server-only";
import type { User } from "@supabase/supabase-js";

export const CERISE_ADMIN_EMAIL = (
  process.env.CERISE_ADMIN_EMAIL || "cerisescholar@gmail.com"
).toLowerCase();

export function isCeriseAdmin(user: User | null | undefined) {
  return user?.email?.toLowerCase() === CERISE_ADMIN_EMAIL;
}
