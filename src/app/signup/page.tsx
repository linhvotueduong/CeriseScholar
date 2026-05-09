import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Public laptop beta"
      mode="signup"
      subtitle="Create your account to begin building, organizing, and advancing your research with Cerise Scholar."
      title="Start your scholar journey with Cerise Scholar"
    >
      <SignupForm />
    </AuthShell>
  );
}
