import Link from "next/link";
import AppShell from "@/components/app-shell/AppShell";
import { AppPageFrame, SettingsLayoutGrid } from "@/components/app-ui/LayoutGrids";
import SettingsHeader from "@/components/app-ui/SettingsHeader";
import SettingsSubnav from "@/components/app-ui/SettingsSubnav";
import styles from "./layout.module.css";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell contentClassName={styles.settingsMain}>
      <AppPageFrame className={`${styles.settingsFrame} max-w-[1440px]`}>
        <SettingsHeader />
        <SettingsLayoutGrid className={`${styles.settingsGrid} px-1 pb-7 pt-3`}>
          <SettingsSubnav />
          <div className={`${styles.settingsContent} min-w-0`}>{children}</div>
        </SettingsLayoutGrid>
        <footer className={`${styles.settingsFooter} flex flex-wrap items-center justify-between gap-3 text-[12px] font-[550] text-[#7a7168]`}>
          <p>© 2025 Cerise Scholar. All rights reserved.</p>
          <nav className="flex items-center gap-[36px]" aria-label="Settings footer">
            <Link className="text-[#4f4842] no-underline hover:text-[#111111]" href="/help/terms">
              Terms
            </Link>
            <Link className="text-[#4f4842] no-underline hover:text-[#111111]" href="/help/privacy">
              Privacy
            </Link>
            <Link className="text-[#4f4842] no-underline hover:text-[#111111]" href="/help">
              Help
            </Link>
          </nav>
        </footer>
      </AppPageFrame>
    </AppShell>
  );
}
