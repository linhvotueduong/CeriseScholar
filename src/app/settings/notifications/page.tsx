import SettingsPanel from "@/components/app-ui/SettingsPanel";
import { SettingsRow, ToggleSwitch } from "@/components/app-ui/SettingsControls";
import { AppIcon } from "@/components/app-shell/AppIcons";

export default function NotificationsSettingsPage() {
  return (
    <SettingsPanel
      className="h-[792px] min-h-[792px] max-h-[792px] pb-7"
      title="Notifications"
      description="Manage how and when you receive updates from Cerise Scholar."
    >
      <div className="flex h-[662px] flex-col">
        <section className="grid gap-2.5 md:grid-cols-4">
          <SummaryCard icon="mail" label="Email digest" value="Daily" />
          <SummaryCard icon="bell" label="Research alerts" value="On" />
          <SummaryCard icon="phone" label="Push notifications" value="Important only" />
          <SummaryCard icon="calendar" label="Weekly summary" value="Friday" />
        </section>

        <section className="mt-2.5 grid flex-1 auto-rows-fr gap-2.5 lg:grid-cols-2">
          <MiniPanel title="A. Email Notifications" description="Choose which updates you'd like to receive by email.">
            <CheckRow checked label="Research alerts" body="New papers, datasets, and topic updates." />
            <CheckRow checked label="Publication recommendations" body="Tailored paper and author suggestions." />
            <CheckRow checked label="Citation / evidence updates" body="Citations and evidence added to your work." />
            <CheckRow checked label="Weekly digest" body="A summary of your activity and updates." />
            <CheckRow label="Product updates" body="New features, improvements, and announcements." />
            <CheckRow label="Course reminders" body="Reminders about upcoming lessons and modules." />
          </MiniPanel>
          <MiniPanel title="B. Push Notifications" description="Choose what you receive on your device.">
            <RadioRow label="All notifications" body="Receive all updates including general activity." />
            <RadioRow checked label="Important only" body="Receive important alerts and time-sensitive updates." />
            <RadioRow label="None" body="Turn off all push notifications." />
            <p className="mt-2 border-t border-[#eeeae5] pt-2 text-[10px] leading-3.5 text-[#6f6760]">
              Push notifications are delivered to your registered devices and browser.
            </p>
          </MiniPanel>
          <MiniPanel title="C. Research & Course Reminders" description="Stay on track with timely reminders.">
            <NotifRow label="Reminder time" action={<Select value="9:00 AM" />} />
            <NotifRow label="Deadline reminders" body="Get reminded about upcoming deadlines." action={<ToggleSwitch defaultOn />} />
            <NotifRow label="Resume lesson reminders" body="Remind me to continue interrupted lessons." action={<ToggleSwitch defaultOn />} />
            <NotifRow label="Project check-in reminders" body="Regular nudges to review your projects." action={<ToggleSwitch defaultOn />} />
          </MiniPanel>
          <MiniPanel title="D. Quiet Hours & Frequency" description="Control when you receive notifications.">
            <NotifRow label="Quiet hours start" action={<Select value="10:00 PM" />} />
            <NotifRow label="Quiet hours end" action={<Select value="7:00 AM" />} />
            <NotifRow label="Weekend notifications" body="Allow notifications on Saturday and Sunday." action={<ToggleSwitch defaultOn />} />
            <NotifRow label="Digest frequency" action={<Select value="Daily" />} />
            <NotifRow label="Do not disturb" body="Pause all non-urgent notifications." action={<ToggleSwitch />} />
          </MiniPanel>
        </section>

        <footer className="mt-2 flex items-center justify-between">
          <button className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#d8d3ce] px-5 text-[12px] font-bold text-[#17120d]" type="button">
            <AppIcon className="h-[18px] w-[18px]" name="refresh" />
            Reset preferences
          </button>
          <button className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#111111] px-6 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(17,17,17,0.12)]" type="button">
            Save Settings
          </button>
        </footer>
      </div>
    </SettingsPanel>
  );
}

function NotifRow({ action, body, label }: { action?: React.ReactNode; body?: string; label: string }) {
  return <SettingsRow action={action} body={body} className="min-h-[38px] py-1.5" label={label} />;
}

function SummaryCard({ icon, label, value }: { icon: "mail" | "bell" | "phone" | "calendar"; label: string; value: string }) {
  return (
    <article className="flex min-h-[50px] items-center gap-2.5 rounded-[10px] border border-[#e5e1dc] bg-white px-4 py-1.5">
      <AppIcon className="h-5 w-5 text-[#17120d]" name={icon} />
      <div>
        <p className="text-[11px] font-semibold text-[#6f6760]">{label}</p>
        <p className="mt-0.5 text-[14px] font-bold leading-none text-[#17120d]">{value}</p>
      </div>
    </article>
  );
}

function MiniPanel({ children, description, title }: { children: React.ReactNode; description?: string; title: string }) {
  return (
    <article className="flex min-h-[174px] flex-col rounded-[12px] border border-[#e5e1dc] p-2">
      <h3 className="text-[13px] font-bold text-[#111111]">{title}</h3>
      {description ? <p className="mt-1 text-[10px] leading-3.5 text-[#6f6760]">{description}</p> : null}
      <div className="mt-1 flex-1">{children}</div>
    </article>
  );
}

function CheckRow({ body, checked = false, label }: { body: string; checked?: boolean; label: string }) {
  return (
    <div className="mb-1.5 flex gap-2.5 last:mb-0">
      <span className={checked ? "mt-0.5 h-4 w-4 rounded-[3px] bg-[#111111]" : "mt-0.5 h-4 w-4 rounded-[3px] border border-[#bcb6af]"} />
      <div>
        <p className="text-[11px] font-bold text-[#17120d]">{label}</p>
        <p className="text-[10px] leading-3.5 text-[#6f6760]">{body}</p>
      </div>
    </div>
  );
}

function RadioRow({ body, checked = false, label }: { body: string; checked?: boolean; label: string }) {
  return (
    <div className="mb-2 flex gap-2.5 last:mb-0">
      <span className={checked ? "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#111111]" : "mt-0.5 h-4 w-4 rounded-full border border-[#111111]"}>
        {checked ? <span className="h-2 w-2 rounded-full bg-[#111111]" /> : null}
      </span>
      <div>
        <p className="text-[11px] font-bold text-[#17120d]">{label}</p>
        <p className="text-[10px] leading-3.5 text-[#6f6760]">{body}</p>
      </div>
    </div>
  );
}

function Select({ value }: { value: string }) {
  return (
    <button className="inline-flex h-9 min-w-[136px] items-center justify-between rounded-[8px] border border-[#d8d3ce] px-3 text-left text-[11px] font-bold text-[#17120d]" type="button">
      {value}
      <AppIcon className="h-3.5 w-3.5 text-[#7b7168]" name="chevron-down" />
    </button>
  );
}
