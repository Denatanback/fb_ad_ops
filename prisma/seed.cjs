const { randomBytes, scryptSync } = require("node:crypto");
const {
  AlertSeverity,
  AnalyzerMetricKey,
  AnalyzerRuleKey,
  AnalyzerRuleScope,
  AnalyzerRuleStage,
  CreativeLabelKey,
  NotificationTopicKey,
  PrismaClient,
  Role
} = require("@prisma/client");

const prisma = new PrismaClient();

const defaultApproaches = ["Past Life", "Soulmate", "IQ Test"];

const defaultCreativeLabels = [
  { key: CreativeLabelKey.WINNER, name: "Winner" },
  { key: CreativeLabelKey.LOSER, name: "Loser" },
  { key: CreativeLabelKey.TOP_CTR, name: "Top CTR" }
];

const defaultAnalyzerRuleConfigs = [
  {
    ruleKey: AnalyzerRuleKey.OUTBOUND_CTR,
    metricKey: AnalyzerMetricKey.OUTBOUND_CTR,
    ruleStage: AnalyzerRuleStage.WATCHDOG,
    scope: AnalyzerRuleScope.GLOBAL,
    scopeKey: "global",
    enabled: true,
    severity: AlertSeverity.WARNING,
    destinationTopicKey: NotificationTopicKey.NEEDS_REVIEW,
    reasonCode: "weak_metrics",
    minValue: "1.2000",
    maxValue: null,
    spendThreshold: null,
    maxResults: null,
    notes: "Базовый global guardrail по outbound CTR."
  },
  {
    ruleKey: AnalyzerRuleKey.CPLPV,
    metricKey: AnalyzerMetricKey.CPLPV,
    ruleStage: AnalyzerRuleStage.WATCHDOG,
    scope: AnalyzerRuleScope.GLOBAL,
    scopeKey: "global",
    enabled: true,
    severity: AlertSeverity.WARNING,
    destinationTopicKey: NotificationTopicKey.NEEDS_REVIEW,
    reasonCode: "weak_metrics",
    minValue: null,
    maxValue: "2.5000",
    spendThreshold: null,
    maxResults: null,
    notes: "Базовый global guardrail по CPLPV."
  },
  {
    ruleKey: AnalyzerRuleKey.SPEND_NO_RESULTS_CREATIVE,
    metricKey: AnalyzerMetricKey.SPEND,
    ruleStage: AnalyzerRuleStage.WATCHDOG,
    scope: AnalyzerRuleScope.GLOBAL,
    scopeKey: "global",
    enabled: true,
    severity: AlertSeverity.WARNING,
    destinationTopicKey: NotificationTopicKey.NEEDS_REVIEW,
    reasonCode: "spend_anomaly",
    minValue: null,
    maxValue: null,
    spendThreshold: "50.0000",
    maxResults: 0,
    notes: "Global порог расхода без результатов на уровне creative."
  },
  {
    ruleKey: AnalyzerRuleKey.SPEND_NO_RESULTS_ADSET,
    metricKey: AnalyzerMetricKey.SPEND,
    ruleStage: AnalyzerRuleStage.WATCHDOG,
    scope: AnalyzerRuleScope.GLOBAL,
    scopeKey: "global",
    enabled: true,
    severity: AlertSeverity.WARNING,
    destinationTopicKey: NotificationTopicKey.NEEDS_REVIEW,
    reasonCode: "spend_anomaly",
    minValue: null,
    maxValue: null,
    spendThreshold: "35.0000",
    maxResults: 0,
    notes: "Global порог расхода без результатов на уровне ad set."
  }
];

const defaultTargetCostConfigs = [
  {
    scope: AnalyzerRuleScope.GLOBAL,
    scopeKey: "global",
    approachId: null,
    funnelKey: null,
    targetCostUsd: "60.0000",
    notes: "Базовый target cost по умолчанию для исторических сводок и будущих рекомендаций."
  }
];

const defaultSystemSettings = [
  {
    key: "telegram_digest_interval_minutes",
    value: "30"
  }
];

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);

  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function main() {
  for (const label of defaultCreativeLabels) {
    await prisma.creativeLabel.upsert({
      where: {
        key: label.key
      },
      update: {
        name: label.name
      },
      create: label
    });
  }

  for (const name of defaultApproaches) {
    await prisma.approach.upsert({
      where: {
        name
      },
      update: {},
      create: {
        name
      }
    });
  }

  for (const rule of defaultAnalyzerRuleConfigs) {
    await prisma.analyzerRuleConfig.upsert({
      where: {
        ruleKey_scopeKey: {
          ruleKey: rule.ruleKey,
          scopeKey: rule.scopeKey
        }
      },
      update: {},
      create: rule
    });
  }

  for (const targetCost of defaultTargetCostConfigs) {
    await prisma.targetCostConfig.upsert({
      where: {
        scope_scopeKey: {
          scope: targetCost.scope,
          scopeKey: targetCost.scopeKey
        }
      },
      update: {},
      create: targetCost
    });
  }

  for (const setting of defaultSystemSettings) {
    await prisma.systemSetting.upsert({
      where: {
        key: setting.key
      },
      update: {},
      create: setting
    });
  }

  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL?.trim();
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD?.trim();

  if (!defaultAdminEmail || !defaultAdminPassword) {
    return;
  }

  await prisma.user.upsert({
    where: {
      email: normalizeEmail(defaultAdminEmail)
    },
    update: {
      passwordHash: hashPassword(defaultAdminPassword),
      role: Role.ADMIN
    },
    create: {
      email: normalizeEmail(defaultAdminEmail),
      name: "Default Admin",
      passwordHash: hashPassword(defaultAdminPassword),
      role: Role.ADMIN
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
