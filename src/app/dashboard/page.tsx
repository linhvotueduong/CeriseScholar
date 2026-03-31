import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Pdf } from "@/types/pdf";
import PdfCard from "@/components/pdf/PdfCard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: pdfs } = await supabase
    .from("pdfs")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Pdf[]>();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My PDFs</h1>
        <Link
          href="/dashboard/upload"
          className="px-4 py-2 bg-[#DE3163] text-white text-sm font-medium rounded-lg hover:bg-[#c4294f] transition-colors"
        >
          + Upload PDF
        </Link>
      </div>

      {!pdfs || pdfs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 text-lg">No PDFs uploaded yet</p>
          <p className="text-gray-400 mt-1">
            Upload your first PDF to get started
          </p>
          <Link
            href="/dashboard/upload"
            className="mt-4 inline-block px-6 py-2 bg-[#DE3163] text-white text-sm font-medium rounded-lg hover:bg-[#c4294f] transition-colors"
          >
            Upload PDF
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pdfs.map((pdf) => (
            <PdfCard key={pdf.id} pdf={pdf} />
          ))}
        </div>
      )}
    </div>
  );
}
