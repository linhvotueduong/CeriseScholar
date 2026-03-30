import Navbar from "@/components/layout/Navbar";

/**
 * Layout for all /dashboard pages.
 * Includes the top navigation bar and wraps the page content.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
