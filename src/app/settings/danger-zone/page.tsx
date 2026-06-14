import SettingsPanel from "@/components/app-ui/SettingsPanel";
import { AppIcon } from "@/components/app-shell/AppIcons";

const dangerActions = [
  {
    title: "Delete Research Folder",
    body: "Permanently delete your research folder and all its contents.",
    notes: ["All projects, notes, and files will be deleted", "Cannot be recovered after deletion", "Consider exporting your data first"],
    button: "Delete Research Folder",
    primary: false,
  },
  {
    title: "Clear Local Cache",
    body: "Free up storage by clearing temporary files and cached data.",
    notes: ["Temporary files will be removed", "App performance may improve", "Your documents and settings are safe"],
    button: "Clear Cache",
    primary: false,
  },
  {
    title: "Sign Out of All Devices",
    body: "Sign out from all active sessions except this one.",
    notes: ["You will remain signed in on this device", "All other devices will be logged out", "They will need to sign in again"],
    button: "Sign Out All Devices",
    primary: false,
  },
  {
    title: "Delete Account",
    body: "Permanently delete your Cerise Scholar account and all data.",
    notes: ["All your data will be permanently deleted", "This action cannot be undone", "Contact support if you need to recover data"],
    button: "Delete Account",
    primary: true,
  },
];

export default function DangerZoneSettingsPage() {
  return (
    <SettingsPanel
      className="h-[800px] min-h-[800px] max-h-[800px] pb-10"
      title="Danger Zone"
      description="Irreversible and destructive actions. Please proceed with caution."
      danger
    >
      <div className="flex h-[674px] flex-col">
        <div className="flex min-h-[58px] items-center gap-3 rounded-[12px] border border-[#f0c7c2] bg-[#fff1f0] px-3 py-2.5">
          <AppIcon className="h-5 w-5 text-[#d92d20]" name="alert" />
          <div>
            <p className="text-[12px] font-bold text-[#17120d]">Actions in this section cannot be undone.</p>
            <p className="mt-0.5 text-[10px] text-[#7b2f28]">Make sure to back up your data before proceeding.</p>
          </div>
        </div>

        <div className="mt-3 grid flex-1 auto-rows-fr gap-3">
          {dangerActions.map((action) => (
            <article className="flex items-center rounded-[12px] border border-[#e5e1dc] bg-white p-4" key={action.title}>
              <div className="grid w-full gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <h3 className="text-[14px] font-bold text-[#111111]">{action.title}</h3>
                  <p className="mt-1 text-[12px] text-[#625a52]">{action.body}</p>
                  <ul className="mt-2 grid gap-1 text-[11px] text-[#4f4842]">
                    {action.notes.map((note) => (
                      <li className="flex items-center gap-2" key={note}>
                        <AppIcon className="h-3.5 w-3.5" name="check-square" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className={
                    action.primary
                      ? "inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#d92d20] px-4 text-[12px] font-bold text-white"
                      : "inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#e5e1dc] px-4 text-[12px] font-bold text-[#17120d]"
                  }
                  type="button"
                >
                  <AppIcon className="h-4 w-4" name="trash" />
                  {action.button}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </SettingsPanel>
  );
}
