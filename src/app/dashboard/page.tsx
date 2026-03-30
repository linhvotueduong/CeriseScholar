import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Pdf } from "@/types/pdf";

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
            <Link
              key={pdf.id}
              href={`/dashboard/viewer/${pdf.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[#DE3163] hover:shadow-sm transition-all"
            >
              <h3 className="font-semibold text-gray-900 truncate">
                {pdf.display_name}
              </h3>
              <p className="text-sm text-gray-500 mt-1 truncate">
                {pdf.filename}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">
                  {pdf.file_size
                    ? `${(pdf.file_size / 1024 / 1024).toFixed(1)} MB`
                    : ""}
                </span>
                <OcrBadge status={pdf.ocr_status} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(pdf.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function OcrBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  const labels: Record<string, string> = {
    pending: "OCR Pending",
    processing: "OCR Processing",
    completed: "OCR Ready",
    failed: "OCR Failed",
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        styles[status] || styles.pending
      }`}
    >
      {labels[status] || "Unknown"}
    </span>
  );
}
