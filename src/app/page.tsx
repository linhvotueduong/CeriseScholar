import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-[#DE3163]">Cerise Scholar</h1>
        <p className="text-lg text-gray-600 max-w-md">
          Your research companion. Upload PDFs, highlight key passages, and build
          synthesized literature reviews effortlessly.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-[#DE3163] text-white font-medium rounded-lg hover:bg-[#c4294f] transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 border border-[#DE3163] text-[#DE3163] font-medium rounded-lg hover:bg-[#DE3163] hover:text-white transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
