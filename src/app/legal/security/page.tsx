import { redirect } from "next/navigation";

export default function LegacySecurityPage() {
  redirect("/about/privacy-security");
}
