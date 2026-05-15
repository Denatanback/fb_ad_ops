import Link from "next/link";
import { FlashMessage } from "@/components/workspace/flash-message";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { ManualImportUploadForm } from "@/components/imports/manual-import-upload-form";
import { CsvHintCard } from "@/components/imports/csv-hint-card";
import {
  uploadImportCsvFromAdAccountsAction,
  createAdAccountAction,
  updateAdAccountAction,
  activateAdAccountAction,
  deactivateAdAccountAction,
} from "@/app/(workspace)/ad-accounts/actions";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { requireAuthSession } from "@/server/auth/session";
import { getAnalyzerWorkspaceSnapshot } from "@/server/services/import-runs";
import { canManageAdAccount, listAdAccounts } from "@/server/services/ad-accounts";

type AdAccountsPageProps = {
  searchParams?: {
    tab?: string;
    status?: string;
    reason?: string;
    error?: string;
    created?: string;
    updated?: string;
    edit?: string;
  };
};

const importRunStatusLabels: Record<string, string> = {
  RECEIVED: "Получен",
  PARSING: "Парсинг",
  NORMALIZING: "Нормализация",
  ANALYZING: "Анализ",
  COMPLETED: "Готово",
  FAILED: "Ошибка",
};

function formatReportingWindow(start: Date | null, end: Date | null) {
  if (!start && !end) return "—";
  if (start && end) return `${formatDate(start)} — ${formatDate(end)}`;
  return formatDate(start ?? end);
}

function getImportStatusTone(status: string) {
  if (status === "COMPLETED") return "pill--ready";
  if (status === "FAILED") return "pill--warning";
  return "pill--pending";
}

type RecentRun = Awaited<ReturnType<typeof getAnalyzerWorkspaceSnapshot>>["recentRuns"][number];

const tabs = [
  { id: "cabinets", label: "Cabinets" },
  { id: "upload", label: "CSV Upload" },
  { id: "history", label: "Import History" },
] as const;

type TabId = (typeof tabs)[number]["id"];

// ---------------------------------------------------------------------------
// Sub-components (server-renderable)
// ---------------------------------------------------------------------------

type AdAccount = Awaited<ReturnType<typeof listAdAccounts>>[number];

function AdAccountRow({
  account,
  isEditing,
  canManage,
  isAdmin,
}: {
  account: AdAccount;
  isEditing: boolean;
  canManage: boolean;
  isAdmin: boolean;
}) {
  if (isEditing && canManage) {
    return (
      <tr key={account.id} className="table-row--editing">
        <td colSpan={5}>
          <form action={updateAdAccountAction} className="inline-edit-form stack">
            <input type="hidden" name="id" value={account.id} />
            <div className="inline-edit-grid">
              <div className="field">
                <label className="field__label" htmlFor={`tag-${account.id}`}>
                  Тег
                </label>
                <input
                  className="auth-input"
                  defaultValue={account.tag}
                  id={`tag-${account.id}`}
                  name="tag"
                  placeholder="e.g. Main Account"
                  required
                  type="text"
                />
              </div>
              {isAdmin ? (
                <div className="field">
                <label className="field__label" htmlFor={`owner-${account.id}`}>
                  Owner ID <span className="field__optional">(необязательно)</span>
                </label>
                <input
                  className="auth-input"
                  defaultValue={account.ownerId ?? ""}
                  id={`owner-${account.id}`}
                  name="ownerId"
                  placeholder="Идентификатор владельца"
                  type="text"
                />
                </div>
              ) : null}
            </div>
            <div className="hero-actions">
              <button className="button button--primary button--compact" type="submit">
                Сохранить
              </button>
              <Link
                className="button button--secondary button--compact"
                href="/ad-accounts?tab=cabinets"
              >
                Отмена
              </Link>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr key={account.id}>
      <td>
        <code className="table-code">{account.accountId}</code>
      </td>
      <td>{account.tag}</td>
      <td>{account.ownerId ?? <span className="table-empty">—</span>}</td>
      <td>
        <span className={`pill ${account.isActive ? "pill--ready" : "pill--neutral"}`}>
          {account.isActive ? "Активен" : "Отключён"}
        </span>
      </td>
      <td className="table-actions">
        {canManage ? (
        <div className="workspace-toolbar__group workspace-toolbar__group--links">
          <Link
            className="button button--secondary button--compact"
            href={`/ad-accounts?tab=cabinets&edit=${account.id}`}
          >
            Изменить
          </Link>
          {account.isActive ? (
            <form action={deactivateAdAccountAction} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={account.id} />
              <button className="button button--secondary button--compact" type="submit">
                Отключить
              </button>
            </form>
          ) : (
            <form action={activateAdAccountAction} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={account.id} />
              <button className="button button--primary button--compact" type="submit">
                Активировать
              </button>
            </form>
          )}
        </div>
        ) : (
          <span className="table-subcopy">Only creator or admin can edit</span>
        )}
      </td>
    </tr>
  );
}

function CreateAdAccountForm({ isAdmin }: { isAdmin: boolean }) {
  return (
    <SectionCard title="Добавить аккаунт" description="Новый рекламный кабинет Facebook Ads.">
      <form action={createAdAccountAction} className="stack">
        <div className="inline-edit-grid">
          <div className="field">
            <label className="field__label" htmlFor="new-account-id">
              Account ID <span className="field__required">*</span>
            </label>
            <input
              autoComplete="off"
              className="auth-input"
              id="new-account-id"
              name="accountId"
              placeholder="act_123456789"
              required
              type="text"
            />
            <p className="field__hint">
              Будет приведён к нижнему регистру. Пробелы → подчёркивания.
              Допустимы только буквы, цифры, _ и -.
            </p>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="new-tag">
              Тег <span className="field__required">*</span>
            </label>
            <input
              className="auth-input"
              id="new-tag"
              name="tag"
              placeholder="e.g. Main US Account"
              required
              type="text"
            />
            <p className="field__hint">Произвольная метка для быстрого распознавания.</p>
          </div>
          {isAdmin ? (
            <div className="field">
            <label className="field__label" htmlFor="new-owner-id">
              Owner ID <span className="field__optional">(необязательно)</span>
            </label>
            <input
              className="auth-input"
              id="new-owner-id"
              name="ownerId"
              placeholder="Идентификатор владельца"
              type="text"
            />
            </div>
          ) : null}
        </div>
        <div className="hero-actions">
          <button className="button button--primary" type="submit">
            Добавить аккаунт
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdAccountsPage({ searchParams }: AdAccountsPageProps) {
  const session = await requireAuthSession();
  const isAdmin = session.user.role === "admin";

  const activeTab: TabId = (searchParams?.tab as TabId) ?? "cabinets";
  const editingId = searchParams?.edit ?? null;

  // Flash message logic
  let flashMessage: { tone: "success" | "error"; message: string } | null = null;
  if (searchParams?.error) {
    flashMessage = { tone: "error", message: searchParams.error };
  } else if (searchParams?.created) {
    flashMessage = {
      tone: "success",
      message: `Аккаунт "${searchParams.created}" добавлен.`,
    };
  } else if (searchParams?.updated) {
    flashMessage = { tone: "success", message: "Данные аккаунта обновлены." };
  } else if (searchParams?.status === "error") {
    flashMessage = {
      tone: "error",
      message: searchParams.reason || "Не удалось выполнить действие.",
    };
  }

  // Data fetching — only load what the active tab needs
  const [adAccounts, snapshot] = await Promise.all([
    activeTab === "cabinets" || activeTab === "upload" ? listAdAccounts() : Promise.resolve([]),
    activeTab === "history" || activeTab === "upload"
      ? getAnalyzerWorkspaceSnapshot()
      : Promise.resolve(null),
  ]);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Данные"
        title="Ad Accounts"
        description="Управление рекламными кабинетами, загрузка статистики и история импортов."
      />

      {flashMessage ? (
        <FlashMessage message={flashMessage.message} tone={flashMessage.tone} />
      ) : null}

      {/* ── Tab navigation ─────────────────────────────────────────────────── */}
      <nav aria-label="Ad Accounts sections" className="workspace-toolbar">
        <div className="workspace-toolbar__row">
          <div className="workspace-toolbar__group">
            {tabs.map((tab) => (
              <Link
                className={`toolbar-chip${activeTab === tab.id ? " toolbar-chip--active" : ""}`}
                href={`/ad-accounts?tab=${tab.id}`}
                key={tab.id}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Cabinets ───────────────────────────────────────────────────────── */}
      {activeTab === "cabinets" && (
        <>
          {adAccounts.length > 0 ? (
            <SectionCard
              title="Рекламные кабинеты"
              description={`${adAccounts.length} кабинет${adAccounts.length === 1 ? "" : adAccounts.length < 5 ? "а" : "ов"} в системе.`}
            >
              <div className="table-shell">
                <table className="data-table data-table--dense">
                  <thead>
                    <tr>
                      <th>Account ID</th>
                      <th>Тег</th>
                      <th>Owner</th>
                      <th>Статус</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {adAccounts.map((account: AdAccount) => (
                      <AdAccountRow
                        account={account}
                        canManage={canManageAdAccount(account, {
                          userId: session.user.id,
                          role: session.user.role,
                        })}
                        isAdmin={isAdmin}
                        isEditing={editingId === account.id}
                        key={account.id}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : null}

          <CreateAdAccountForm isAdmin={isAdmin} />
        </>
      )}

      {/* ── CSV Upload ─────────────────────────────────────────────────────── */}
      {activeTab === "upload" && (
        <SectionCard
          title="Загрузка CSV"
          description="Выберите кабинет и загрузите экспортированные файлы Facebook Ads."
        >
          <div className="upload-with-hint">
            <div className="upload-with-hint__form">
              <ManualImportUploadForm
                action={uploadImportCsvFromAdAccountsAction}
                adAccounts={adAccounts.filter((a: AdAccount) => a.isActive)}
              />
            </div>
            <div className="upload-with-hint__sidebar">
              <CsvHintCard />
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── Import History ─────────────────────────────────────────────────── */}
      {activeTab === "history" && snapshot && (
        <SectionCard
          title="История импортов"
          description="Все загруженные CSV с датой, уровнем и периодом отчётности."
        >
          {snapshot.recentRuns.length ? (
            <div className="table-shell">
              <table className="data-table data-table--dense">
                <thead>
                  <tr>
                    <th>Файл</th>
                    <th>Кабинет</th>
                    <th>Статус</th>
                    <th>Период</th>
                    <th>Строк</th>
                    <th>Загружен</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {snapshot.recentRuns.map((importRun: RecentRun) => (
                    <tr key={importRun.id}>
                      <td>
                        <strong>{importRun.sourceFilename}</strong>
                      </td>
                      <td>
                        {importRun.adAccount ? (
                          <div className="table-primary">
                            <span>{importRun.adAccount.tag}</span>
                            <span className="table-subcopy">{importRun.adAccount.accountId}</span>
                          </div>
                        ) : (
                          <span className="table-empty">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`pill ${getImportStatusTone(String(importRun.processingStatus))}`}
                        >
                          {importRunStatusLabels[String(importRun.processingStatus)]}
                        </span>
                      </td>
                      <td>
                        {formatReportingWindow(
                          importRun.reportingWindowStart,
                          importRun.reportingWindowEnd
                        )}
                      </td>
                      <td>
                        <div className="table-primary">
                          <strong>{importRun.rawRowsCount}</strong>
                          <span className="table-subcopy">
                            Норм.: {importRun.normalizedRowsCount}
                          </span>
                        </div>
                      </td>
                      <td>{formatDateTime(importRun.receivedAt)}</td>
                      <td className="table-actions">
                        <div className="workspace-toolbar__group workspace-toolbar__group--links">
                          <Link
                            className="button button--secondary button--compact"
                            href={`/imports?importRunId=${importRun.id}`}
                          >
                            Анализ
                          </Link>
                          <Link
                            className="button button--secondary button--compact"
                            href={`/imports/${importRun.id}`}
                          >
                            Детали
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-inline">
              <h3>Импортов пока нет</h3>
              <p>
                Загрузите первый CSV через вкладку{" "}
                <Link href="/ad-accounts?tab=upload">CSV Upload</Link> — здесь появится
                история.
              </p>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
