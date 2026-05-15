import { db } from "@/server/db/client";

export async function getLaunchFormContext(creativeId: string) {
  const [creative, landers] = await Promise.all([
    db.creative.findUnique({
      where: {
        id: creativeId
      },
      select: {
        id: true,
        name: true,
        approachId: true,
        approach: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    db.lander.findMany({
      orderBy: {
        name: "asc"
      },
      select: {
        id: true,
        name: true,
        url: true,
        approachId: true
      }
    })
  ]);

  return {
    creative,
    landers
  };
}

export async function getLaunchDetail(launchId: string) {
  return db.launch.findUnique({
    where: {
      id: launchId
    },
    include: {
      creative: {
        select: {
          id: true,
          name: true,
          approach: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      lander: {
        select: {
          id: true,
          name: true,
          url: true
        }
      },
      metrics: {
        orderBy: {
          capturedAt: "desc"
        },
        take: 1
      },
      createdBy: {
        select: {
          email: true
        }
      },
      updatedBy: {
        select: {
          email: true
        }
      }
    }
  });
}

export async function getLatestLaunchMetrics(launchId: string) {
  return db.launchMetrics.findFirst({
    where: {
      launchId
    },
    orderBy: {
      capturedAt: "desc"
    }
  });
}

export async function listCreativeLaunchHistory(creativeId: string) {
  return db.launch.findMany({
    where: {
      creativeId
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      lander: {
        select: {
          id: true,
          name: true,
          url: true
        }
      },
      metrics: {
        orderBy: {
          capturedAt: "desc"
        },
        take: 1
      }
    }
  });
}

export async function listLanderUsageSummary() {
  const [count, launchCount] = await Promise.all([db.lander.count(), db.launch.count()]);

  return {
    count,
    launchCount
  };
}

export async function getLaunchMetricSummaryByCreative(creativeId: string) {
  const launches = await db.launch.findMany({
    where: {
      creativeId
    },
    select: {
      id: true
    }
  });

  if (!launches.length) {
    return {
      launchCount: 0,
      latestMetricsCount: 0
    };
  }

  const launchIds = launches.map((launch) => launch.id);
  const metricsCount = await db.launchMetrics.count({
    where: {
      launchId: {
        in: launchIds
      }
    }
  });

  return {
    launchCount: launchIds.length,
    latestMetricsCount: metricsCount
  };
}
