import type { Viewport } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      mode="login"
      subtitle="Choose a new password for your Cerise Scholar account."
      title="Set a new password"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
