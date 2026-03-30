"use client";

const styles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700 animate-pulse",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const labels: Record<string, string> = {
  pending: "OCR Pending",
  processing: "OCR Processing...",
  completed: "OCR Ready",
  failed: "OCR Failed",
};

export default function OcrStatusBadge({ status }: { status: string }) {
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
