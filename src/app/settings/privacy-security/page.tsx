import Link from "next/link";
import SettingsPanel from "@/components/app-ui/SettingsPanel";
import { AppIcon } from "@/components/app-shell/AppIcons";

export default function PrivacySecuritySettingsPage() {
  return (
    <SettingsPanel
      title="Privacy & Security"
      description="Where your data lives, how your AI key is protected, and where to manage both."
    >
      <div className="flex flex-col gap-3">
        <section className="grid gap-0 rounded-[12px] border border-[#e5e1dc] bg-white md:grid-cols-3">
          <SummaryItem icon="globe" label="Cloud-hosted" body="Your account and data live in Supabase" />
          <SummaryItem icon="lock" label="Encrypted" body="Protected in transit and at rest" />
          <SummaryItem icon="shield" label="Yours alone" body="Only you can access your data" />
        </section>

        <section className="rounded-[12px] border border-[#e5e1dc] bg-white p-4">
          <h3 className="text-[13px] font-bold text-[#17120d]">Where your data lives</h3>
          <p className="mt-1 text-[10px] leading-4 text-[#6f6760]">
            Cerise Scholar is a fully hosted app. Your account, projects, notes, and saved evidence
            are stored in Supabase, our cloud database and authentication provider —
            not on any single device. Traffic between your browser and Cerise Scholar is
            encrypted (HTTPS/TLS), and your data is encrypted at rest by Supabase.
          </p>
        </section>

        <section className="rounded-[12px] border border-[#e5e1dc] bg-white p-4">
          <h3 className="text-[13px] font-bold text-[#17120d]">Your AI key</h3>
          <p className="mt-1 text-[10px] leading-4 text-[#6f6760]">
            If you connect your own OpenRouter key, it is encrypted with AES-256-GCM before it is
            stored. We only ever display the last four characters of your key — the full key is
            never shown again after you paste it, including to Cerise Scholar staff.
          </p>
          <Link
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#d8d3ce] px-4 text-[11px] font-bold text-[#17120d]"
            href="/settings/ai"
          >
            <AppIcon className="h-4 w-4" name="lock" />
            Manage AI key
          </Link>
        </section>

        <section className="rounded-[12px] border border-[#e5e1dc] bg-white p-4">
          <h3 className="text-[13px] font-bold text-[#17120d]">Password & account</h3>
          <p className="mt-1 text-[10px] leading-4 text-[#6f6760]">
            Password resets and other account details live in Settings → Account.
          </p>
          <Link
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#d8d3ce] px-4 text-[11px] font-bold text-[#17120d]"
            href="/settings/account"
          >
            <AppIcon className="h-4 w-4" name="user" />
            Go to Account settings
          </Link>
        </section>

        <section className="rounded-[12px] border border-[#e5e1dc] bg-white p-4">
          <h3 className="text-[13px] font-bold text-[#17120d]">Policies</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Link
              className="flex items-center justify-between gap-2 rounded-[8px] border border-[#d8d3ce] px-4 py-2.5 text-[11px] font-bold text-[#17120d]"
              href="/help/privacy"
            >
              Privacy Policy
              <AppIcon className="h-4 w-4 text-[#7b7168]" name="external-link" />
            </Link>
            <Link
              className="flex items-center justify-between gap-2 rounded-[8px] border border-[#d8d3ce] px-4 py-2.5 text-[11px] font-bold text-[#17120d]"
              href="/help/terms"
            >
              Terms of Use
              <AppIcon className="h-4 w-4 text-[#7b7168]" name="external-link" />
            </Link>
          </div>
        </section>
      </div>
    </SettingsPanel>
  );
}

function SummaryItem({
  body,
  icon,
  label,
}: {
  body: string;
  icon: "globe" | "lock" | "shield";
  label: string;
}) {
  return (
    <div className="flex min-h-[66px] items-center gap-3 border-[#e5e1dc] px-4 py-3 md:border-r md:last:border-r-0">
      <AppIcon className="h-7 w-7 text-[#17120d]" name={icon} />
      <div>
        <p className="text-[12px] font-bold text-[#17120d]">{label}</p>
        <p className="mt-0.5 text-[10px] text-[#6f6760]">{body}</p>
      </div>
    </div>
  );
}
