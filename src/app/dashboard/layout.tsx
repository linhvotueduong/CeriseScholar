import Navbar from "@/components/layout/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#fefefe" }}>
      <Navbar />
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
