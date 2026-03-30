import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Welcome to Cerise Scholar
      </h1>
      <p className="text-gray-600">
        Signed in as <strong>{user?.email}</strong>
      </p>
      <p className="text-gray-500 mt-4">
        Your uploaded PDFs will appear here. Upload functionality coming in Phase 2.
      </p>
    </div>
  );
}
