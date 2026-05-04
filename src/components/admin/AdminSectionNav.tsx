import Link from "next/link";

type AdminSection = "home" | "users" | "courses";

type AdminSectionNavProps = {
  active: AdminSection;
};

const p = {
  ink: "#1a1208",
  muted: "#7a6a5a",
  cerise: "#c0392b",
  border: "#d4cdc5",
  warm: "#faf7f0",
};

const sections: Array<{
  href: string;
  id: AdminSection;
  label: string;
  note: string;
}> = [
  {
    href: "/admin",
    id: "home",
    label: "Admin Home",
    note: "Overview",
  },
  {
    href: "/admin/users",
    id: "users",
    label: "User Management",
    note: "Waitlist and beta access",
  },
  {
    href: "/admin/courses",
    id: "courses",
    label: "Course Management",
    note: "Modules and lessons",
  },
];

export default function AdminSectionNav({ active }: AdminSectionNavProps) {
  return (
    <nav
      aria-label="Admin sections"
      style={{
        maxWidth: "1180px",
        margin: "24px auto 0",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          border: `1px solid ${p.border}`,
          borderRadius: "8px",
          background: "#fff",
          display: "grid",
          gap: "0",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          overflow: "hidden",
        }}
      >
        {sections.map((section) => {
          const isActive = section.id === active;

          return (
            <Link
              href={section.href}
              key={section.id}
              style={{
                background: isActive ? p.warm : "#fff",
                borderRight: `1px solid ${p.border}`,
                color: p.ink,
                display: "grid",
                gap: "4px",
                minHeight: "78px",
                padding: "16px 18px",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  color: isActive ? p.cerise : p.ink,
                  fontSize: "15px",
                  fontWeight: 800,
                }}
              >
                {section.label}
              </span>
              <span style={{ color: p.muted, fontSize: "13px", lineHeight: 1.35 }}>{section.note}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
