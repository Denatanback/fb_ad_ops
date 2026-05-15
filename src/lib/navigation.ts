export type WorkspaceNavigationSectionId = "core" | "settings";

export type WorkspaceNavigationItem = {
  href: string;
  title: string;
  description: string;
  sectionId: WorkspaceNavigationSectionId;
  showInSidebar?: boolean;
  adminOnly?: boolean;
  matchPrefixes?: string[];
};

type WorkspaceNavigationSection = {
  id: WorkspaceNavigationSectionId;
  label: string;
  items: WorkspaceNavigationItem[];
};

const workspaceNavigationItems: WorkspaceNavigationItem[] = [
  {
    href: "/",
    title: "Дашборд",
    description: "Сводка по подходам, кампаниям и рабочим сигналам.",
    sectionId: "core",
    showInSidebar: true
  },
  {
    href: "/creatives/gallery",
    title: "Креативы",
    description: "Галерея, список и быстрый доступ к карточкам креативов.",
    sectionId: "core",
    showInSidebar: true,
    matchPrefixes: ["/creatives"]
  },
  {
    href: "/approaches",
    title: "Воронки",
    description: "Подходы, гипотезы и распределение креативов по воронкам.",
    sectionId: "core",
    showInSidebar: true,
    matchPrefixes: ["/approaches"]
  },
  {
    href: "/launch-plans",
    title: "План запусков",
    description: "Планы запусков, выбор креативов и генерация неймингов.",
    sectionId: "core",
    showInSidebar: true,
    matchPrefixes: ["/launch-plans"]
  },
  {
    href: "/ad-accounts",
    title: "Ad Accounts",
    description: "Рекламные кабинеты, загрузка CSV и история импортов.",
    sectionId: "core",
    showInSidebar: true,
    matchPrefixes: ["/ad-accounts"]
  },
  {
    href: "/imports",
    title: "Анализатор",
    description: "Сигналы, рекомендации и результаты анализа по импортам.",
    sectionId: "core",
    showInSidebar: true,
    matchPrefixes: ["/imports"]
  },
  {
    href: "/admin/users",
    title: "Пользователи",
    description: "Добавление пользователей, роли и доступ к системе.",
    sectionId: "settings",
    showInSidebar: true,
    adminOnly: true,
    matchPrefixes: ["/admin/users"]
  },
  {
    href: "/admin/bulk-imports",
    title: "Bulk CSV",
    description: "Historical Meta Ads CSV imports with date-level replacement.",
    sectionId: "settings",
    showInSidebar: true,
    adminOnly: true,
    matchPrefixes: ["/admin/bulk-imports"]
  },
  {
    href: "/admin/notifications",
    title: "Телеграм",
    description: "Digest-очередь, routing по topics и диагностика доставки.",
    sectionId: "settings",
    showInSidebar: true,
    adminOnly: true,
    matchPrefixes: ["/admin/notifications"]
  },
  {
    href: "/admin/analyzer-rules",
    title: "Настройки анализатора",
    description: "Правила, target cost и рабочие пороги.",
    sectionId: "settings",
    showInSidebar: true,
    adminOnly: true,
    matchPrefixes: ["/admin/analyzer-rules", "/admin/target-costs"]
  },
  {
    href: "/settings",
    title: "Настройки",
    description: "Google Drive, системные параметры и служебные разделы.",
    sectionId: "settings",
    showInSidebar: true,
    matchPrefixes: ["/settings", "/admin/google-drive", "/guide"]
  },
  {
    href: "/queue",
    title: "Очередь",
    description: "Креативы и элементы, ожидающие следующего рабочего шага.",
    sectionId: "core",
    showInSidebar: false
  },
  {
    href: "/active",
    title: "Активные",
    description: "Текущая рабочая фаза с последними запусками и метриками.",
    sectionId: "core",
    showInSidebar: false
  },
  {
    href: "/scaling",
    title: "Скалинг",
    description: "Рост, сильные креативы и развитие активных запусков.",
    sectionId: "core",
    showInSidebar: false
  },
  {
    href: "/launches",
    title: "Запуски",
    description: "Детали конкретных запусков, лендингов и setup-контекста.",
    sectionId: "core",
    showInSidebar: false,
    matchPrefixes: ["/launches"]
  },
  {
    href: "/landers",
    title: "Лендинги",
    description: "Справочник лендингов и их связей с запусками.",
    sectionId: "settings",
    showInSidebar: false
  }
];

const sectionLabels: Record<WorkspaceNavigationSectionId, string> = {
  core: "Работа",
  settings: "Система"
};

const sectionIds = ["core", "settings"] as const;

function matchesNavigationItem(pathname: string, item: WorkspaceNavigationItem) {
  if (item.href === "/") {
    return pathname === "/";
  }

  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }

  return (item.matchPrefixes ?? []).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function getWorkspaceNavigationSectionsForRole(role: "admin" | "member"): WorkspaceNavigationSection[] {
  return sectionIds
    .map((sectionId) => ({
      id: sectionId,
      label: sectionLabels[sectionId],
      items: workspaceNavigationItems.filter(
        (item) => item.sectionId === sectionId && item.showInSidebar !== false && (!item.adminOnly || role === "admin")
      )
    }))
    .filter((section) => section.items.length > 0);
}

export function isWorkspaceNavigationActive(pathname: string, href: string) {
  const item = workspaceNavigationItems.find((candidate) => candidate.href === href);

  if (!item) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return matchesNavigationItem(pathname, item);
}

export function getWorkspaceNavigationItem(pathname: string) {
  return workspaceNavigationItems.find((item) => matchesNavigationItem(pathname, item)) ?? null;
}
