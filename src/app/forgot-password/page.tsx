import type { Viewport } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      mode="login"
      subtitle="Enter your email and we'll send you a secure link to reset your password."
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
