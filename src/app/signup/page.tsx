import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const agreementRequired = process.env.BETA_WAITLIST_REQUIRED !== "false";

  return (
    <AuthShell
      eyebrow="Public beta waitlist"
      mode="signup"
      subtitle="Create your waitlist account and review the Terms and Privacy agreement before joining the beta list."
      title="Create your account"
    >
      <SignupForm agreementRequired={agreementRequired} />
    </AuthShell>
  );
}
