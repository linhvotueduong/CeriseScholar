import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-6xl font-bold text-[#111111]">404</h1>
      <p className="text-xl text-gray-600 mt-4">Page not found</p>
      <Link
        href="/"
        className="mt-6 px-6 py-2 bg-[#111111] text-white rounded-lg hover:bg-[#000000] transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
