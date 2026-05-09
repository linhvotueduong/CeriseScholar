import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      mode="login"
      subtitle="Sign in to continue your scholar journey with Cerise Scholar."
      title="Sign in to Cerise Scholar"
    >
      <LoginForm />
    </AuthShell>
  );
}
