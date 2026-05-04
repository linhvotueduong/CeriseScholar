export const ADMIN_EMAIL = "cerisescholar@gmail.com";

export function isAdminEmail(email?: string | null) {
  return email?.toLowerCase() === ADMIN_EMAIL;
}
