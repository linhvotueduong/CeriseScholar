import SignupForm from "@/components/auth/SignupForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fefefe", padding: "0 16px" }}>
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <h1 style={{ fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif", fontSize: "24px", fontWeight: 400, color: "#1a1208", margin: "0 0 8px" }}>
            Cerise Scholar
          </h1>
        </Link>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#7a6a5a" }}>
          Create your research account
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
