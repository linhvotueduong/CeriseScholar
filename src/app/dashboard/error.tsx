"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-57px)] px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        We couldn&apos;t load this page. This might be a temporary issue — try refreshing.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-[#DE3163] text-white font-medium rounded-lg hover:bg-[#c4294f] transition-colors"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
