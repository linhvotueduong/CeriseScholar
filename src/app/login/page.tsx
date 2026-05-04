import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Log in"
      mode="login"
      subtitle="Welcome back. Enter your details to continue your research workspace."
      title="Log in to your account"
    >
      <LoginForm />
    </AuthShell>
  );
}
