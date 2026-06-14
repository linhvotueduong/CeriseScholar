import SettingsPanel from "@/components/app-ui/SettingsPanel";
import { SettingsRow, ToggleSwitch } from "@/components/app-ui/SettingsControls";
import { AppIcon } from "@/components/app-shell/AppIcons";

export default function PrivacySecuritySettingsPage() {
  return (
    <SettingsPanel
      className="h-[800px] min-h-[800px] max-h-[800px] pb-10"
      title="Privacy & Security"
      description="Keep your files private, local, and under your control."
    >
      <div className="flex h-[674px] flex-col">
        <section className="grid gap-0 rounded-[12px] border border-[#e5e1dc] bg-white md:grid-cols-4">
          <SummaryItem icon="laptop" label="Local by default" body="Files stay on your device" />
          <SummaryItem icon="shield" label="Private & secure" body="Your data stays private" />
          <SummaryItem icon="user" label="User controlled" body="You decide what's shared" />
          <SummaryItem icon="globe" label="Sync status" body="Synced" status />
        </section>

        <section className="mt-3 rounded-[12px] border border-[#e5e1dc] bg-white p-3">
          <h3 className="text-[13px] font-bold text-[#17120d]">Local Files & Access</h3>
          <div className="mt-2 grid gap-2.5 md:grid-cols-3">
            <InfoBlock icon="folder" label="Research files stay on your device" body="All research files and indexes are stored locally and are never uploaded." />
            <InfoBlock icon="lock" label="Folder access can be changed anytime" body="You control which folders Cerise Scholar can access or index." />
            <InfoBlock icon="refresh" label="Sync only applies to preferences" body="Only lightweight preferences and learning progress are synced across devices." />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <ActionButton icon="folder">Manage Folder</ActionButton>
            <ActionButton icon="shield">View Permissions</ActionButton>
            <ActionButton icon="play">Pause Access</ActionButton>
          </div>
        </section>

        <section className="mt-3 grid flex-1 gap-3 lg:grid-cols-2">
          <MiniPanel title="Permissions">
            <CompactRow label="Research folder access" value="User controlled" />
            <CompactRow label="Local AI access check" value="Enabled" />
            <CompactRow label="File index visibility" value="Private" />
            <CompactRow label="Knowledge base sync" value="Off / local only" />
          </MiniPanel>
          <MiniPanel title="Privacy Controls">
            <SettingsRow className="min-h-[43px] py-2" label="Store files locally by default" body="Keep research files on this device." action={<ToggleSwitch defaultOn />} />
            <SettingsRow className="min-h-[43px] py-2" label="Ask before granting new folder access" body="You'll be asked before any new folder is indexed." action={<ToggleSwitch defaultOn />} />
            <SettingsRow className="min-h-[43px] py-2" label="Allow progress sync across devices" body="Sync learning progress and preferences only." action={<ToggleSwitch defaultOn />} />
            <SettingsRow className="min-h-[43px] py-2" label="Receive security alerts" body="Get notified about important security events." action={<ToggleSwitch defaultOn />} />
          </MiniPanel>
        </section>

        <section className="mt-3 rounded-[12px] border border-[#e5e1dc] bg-white p-4">
          <h3 className="text-[13px] font-bold text-[#17120d]">Security & Data Actions</h3>
          <p className="mt-1 text-[10px] text-[#6f6760]">Manage your data and security settings.</p>
          <div className="mt-3 grid gap-2.5 md:grid-cols-4">
            <ActionButton icon="upload">Export My Data</ActionButton>
            <ActionButton icon="laptop">Review Connected Devices</ActionButton>
            <ActionButton icon="trash">Clear Cached Sync Data</ActionButton>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#f0c7c2] px-3 text-[11px] font-bold text-[#d92d20]" type="button">
              <AppIcon className="h-4 w-4" name="shield" />
              Revoke Local Folder Access
            </button>
          </div>
        </section>

        <section className="mt-3 flex min-h-[50px] items-center justify-between rounded-[12px] border border-[#e5e1dc] bg-white px-3 py-2">
          <div className="flex items-center gap-2.5">
            <AppIcon className="h-5 w-5 text-[#17120d]" name="shield" />
            <div>
              <p className="text-[13px] font-bold text-[#17120d]">Cerise Scholar is local-first and privacy-aware.</p>
              <p className="text-[10px] text-[#6f6760]">Your data stays on your device. We never upload your research files or local indexes.</p>
            </div>
          </div>
          <button className="h-8 rounded-[8px] border border-[#d8d3ce] px-4 text-[11px] font-bold" type="button">Learn More</button>
        </section>
      </div>
    </SettingsPanel>
  );
}

function SummaryItem({ body, icon, label, status = false }: { body: string; icon: "laptop" | "shield" | "user" | "globe"; label: string; status?: boolean }) {
  return (
    <div className="flex min-h-[66px] items-center gap-3 border-[#e5e1dc] px-4 py-3 md:border-r md:last:border-r-0">
      <AppIcon className="h-7 w-7 text-[#17120d]" name={icon} />
      <div>
        <p className="text-[12px] font-bold text-[#17120d]">{label}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#6f6760]">
          {status ? <span className="h-2 w-2 rounded-full bg-[#1f8a3b]" /> : null}
          {body}
        </p>
      </div>
    </div>
  );
}

function InfoBlock({ body, icon, label }: { body: string; icon: "folder" | "lock" | "refresh"; label: string }) {
  return (
    <div className="grid min-h-[56px] grid-cols-[24px_1fr] gap-2 border-[#e5e1dc] md:border-r md:pr-3 md:last:border-r-0">
      <AppIcon className="h-5 w-5 text-[#17120d]" name={icon} />
      <div>
        <p className="text-[11px] font-bold text-[#17120d]">{label}</p>
        <p className="mt-0.5 text-[10px] leading-3.5 text-[#6f6760]">{body}</p>
      </div>
    </div>
  );
}

function MiniPanel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <article className="flex min-h-[190px] flex-col rounded-[12px] border border-[#e5e1dc] p-4">
      <h3 className="text-[13px] font-bold text-[#111111]">{title}</h3>
      <div className="mt-2 flex-1">{children}</div>
    </article>
  );
}

function CompactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[39px] items-center justify-between border-t border-[#eeeae5] py-2 first:border-t-0">
      <span className="text-[11px] font-bold text-[#17120d]">{label}</span>
      <span className="text-[11px] font-semibold text-[#4f4842]">{value} &gt;</span>
    </div>
  );
}

function ActionButton({ children, icon }: { children: React.ReactNode; icon: "folder" | "shield" | "play" | "upload" | "laptop" | "trash" }) {
  return (
    <button className="inline-flex h-8 items-center justify-center gap-2 rounded-[8px] border border-[#d8d3ce] px-3 text-[11px] font-bold text-[#17120d]" type="button">
      <AppIcon className="h-4 w-4" name={icon} />
      {children}
    </button>
  );
}
