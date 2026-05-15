import Link from "next/link";

type SettingsNavigationItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const settingsNavigationItems: SettingsNavigationItem[] = [
  {
    href: "/settings",
    label: "Общие"
  },
  {
    href: "/admin/users",
    label: "Пользователи",
    adminOnly: true
  },
  {
    href: "/admin/notifications",
    label: "Телеграм",
    adminOnly: true
  },
  {
    href: "/admin/analyzer-rules",
    label: "Правила",
    adminOnly: true
  },
  {
    href: "/admin/target-costs",
    label: "Целевой CPA",
    adminOnly: true
  },
  {
    href: "/admin/bulk-imports",
    label: "Bulk CSV",
    adminOnly: true
  },
  {
    href: "/admin/google-drive",
    label: "Google Drive",
    adminOnly: true
  },
  {
    href: "/guide",
    label: "Гид"
  }
];

export function SettingsSectionNav({
  activeHref,
  isAdmin = false
}: Readonly<{
  activeHref: string;
  isAdmin?: boolean;
}>) {
  const items = settingsNavigationItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav aria-label="Навигация настроек" className="workspace-toolbar workspace-toolbar--stacked">
      <div className="workspace-toolbar__row">
        <div className="workspace-toolbar__group">
          {items.map((item) => (
            <Link
              className={`toolbar-chip ${activeHref === item.href ? "toolbar-chip--active" : ""}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
