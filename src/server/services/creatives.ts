import type { CreativeLabelKey, LifecycleStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { getGoogleDriveAdminStatus, listDriveFolders } from "@/server/integrations/google-drive/service";

function mapGoogleDriveFormStatus(googleDriveStatus: Awaited<ReturnType<typeof getGoogleDriveAdminStatus>>) {
  return {
    connected: googleDriveStatus.connected,
    oauthConfigured: googleDriveStatus.config.oauthConfigured,
    folderConfigured: googleDriveStatus.config.folderConfigured,
    accountEmail: googleDriveStatus.integration?.googleAccountEmail ?? null,
    accountName: googleDriveStatus.integration?.googleAccountName ?? null,
    folderId: googleDriveStatus.integration?.driveFolderId ?? googleDriveStatus.config.folderId ?? null,
    folderName: googleDriveStatus.integration?.driveFolderName ?? null,
    lastErrorMessage: googleDriveStatus.integration?.lastErrorMessage ?? null
  };
}

export type CreativeFilters = {
  query?: string;
  approachId?: string;
  status?: LifecycleStatus;
  label?: CreativeLabelKey;
};

export async function listCreatives(filters: CreativeFilters) {
  const where: Prisma.CreativeWhereInput = {};

  if (filters.query) {
    where.OR = [
      {
        name: {
          contains: filters.query,
          mode: "insensitive"
        }
      },
      {
        type: {
          contains: filters.query,
          mode: "insensitive"
        }
      },
      {
        notes: {
          contains: filters.query,
          mode: "insensitive"
        }
      }
    ];
  }

  if (filters.approachId !== undefined) {
    if (filters.approachId === "unassigned") {
      where.approachId = null;
    } else if (filters.approachId !== "") {
      where.approachId = filters.approachId;
    }
  }

  if (filters.status) {
    where.currentStatus = filters.status;
  }

  if (filters.label) {
    where.labelAssignments = {
      some: {
        creativeLabel: {
          key: filters.label
        }
      }
    };
  }

  return db.creative.findMany({
    where,
    orderBy: [
      {
        updatedAt: "desc"
      },
      {
        createdAt: "desc"
      }
    ],
    include: {
      approach: {
        select: {
          id: true,
          name: true
        }
      },
      labelAssignments: {
        include: {
          creativeLabel: {
            select: {
              id: true,
              key: true,
              name: true
            }
          }
        },
        orderBy: {
          creativeLabel: {
            name: "asc"
          }
        }
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
      },
      _count: {
        select: {
          launches: true
        }
      }
    }
  });
}

export async function getCreativeListSummary(filters: CreativeFilters) {
  const where: Prisma.CreativeWhereInput = {};

  if (filters.query) {
    where.OR = [
      {
        name: {
          contains: filters.query,
          mode: "insensitive"
        }
      },
      {
        type: {
          contains: filters.query,
          mode: "insensitive"
        }
      },
      {
        notes: {
          contains: filters.query,
          mode: "insensitive"
        }
      }
    ];
  }

  if (filters.approachId !== undefined) {
    if (filters.approachId === "unassigned") {
      where.approachId = null;
    } else if (filters.approachId !== "") {
      where.approachId = filters.approachId;
    }
  }

  if (filters.status) {
    where.currentStatus = filters.status;
  }

  if (filters.label) {
    where.labelAssignments = {
      some: {
        creativeLabel: {
          key: filters.label
        }
      }
    };
  }

  const [count, approachCount] = await Promise.all([
    db.creative.count({ where }),
    db.approach.count()
  ]);

  return {
    count,
    approachCount
  };
}

export async function getCreativeFormContext() {
  const [approaches, labels, googleDriveStatus] = await Promise.all([
    db.approach.findMany({
      orderBy: {
        name: "asc"
      },
      select: {
        id: true,
        name: true
      }
    }),
    db.creativeLabel.findMany({
      orderBy: {
        name: "asc"
      },
      select: {
        id: true,
        key: true,
        name: true
      }
    }),
    getGoogleDriveAdminStatus()
  ]);

  return {
    approaches,
    labels,
    googleDrive: mapGoogleDriveFormStatus(googleDriveStatus)
  };
}

export async function getCreativeBulkUploadContext() {
  const [approaches, googleDriveStatus] = await Promise.all([
    db.approach.findMany({
      orderBy: {
        name: "asc"
      },
      select: {
        id: true,
        name: true
      }
    }),
    getGoogleDriveAdminStatus()
  ]);

  const driveFolders = googleDriveStatus.connected
    ? await listDriveFolders().catch(() => [])
    : [];

  return {
    approaches,
    googleDrive: mapGoogleDriveFormStatus(googleDriveStatus),
    driveFolders
  };
}

export type GalleryCreative = {
  id: string;
  name: string;
  sourceFilename: string | null;
  currentStatus: LifecycleStatus;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  assetUrl: string | null;
  sourceUrl: string | null;
  driveFileId: string | null;
  driveWebViewLink: string | null;
  driveDownloadUrl: string | null;
  driveFolderId: string | null;
  driveFolderName: string | null;
  sourceMimeType: string | null;
  approach: { id: string; name: string } | null;
};

export type GalleryCreativeFilters = {
  query?: string;
  approachId?: string;
  status?: LifecycleStatus;
  driveFolderId?: string | null; // undefined = no filter, null = no folder, string = specific folder
};

export type FolderSummary = {
  folderId: string | null;
  folderName: string | null;
  count: number;
};

export async function listCreativeFolders(): Promise<FolderSummary[]> {
  const groups = await db.creative.groupBy({
    by: ["driveFolderId", "driveFolderName"],
    _count: { id: true }
  });

  return groups
    .map((g) => ({
      folderId: g.driveFolderId,
      folderName: g.driveFolderName,
      count: g._count.id
    }))
    .sort((a, b) => {
      if (!a.folderName && !b.folderName) return 0;
      if (!a.folderName) return 1;
      if (!b.folderName) return -1;
      return a.folderName.localeCompare(b.folderName, "ru");
    });
}

export async function listCreativesForGallery(filters: GalleryCreativeFilters = {}): Promise<GalleryCreative[]> {
  const where: Prisma.CreativeWhereInput = {};

  if (filters.query) {
    where.OR = [
      {
        name: {
          contains: filters.query,
          mode: "insensitive"
        }
      },
      {
        type: {
          contains: filters.query,
          mode: "insensitive"
        }
      },
      {
        notes: {
          contains: filters.query,
          mode: "insensitive"
        }
      }
    ];
  }

  if (filters.approachId !== undefined) {
    if (filters.approachId === "unassigned") {
      where.approachId = null;
    } else if (filters.approachId !== "") {
      where.approachId = filters.approachId;
    }
  }

  if (filters.status) {
    where.currentStatus = filters.status;
  }

  if (filters.driveFolderId !== undefined) {
    where.driveFolderId = filters.driveFolderId;
  }

  return db.creative.findMany({
    where,
    orderBy: [{ approach: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sourceFilename: true,
      currentStatus: true,
      thumbnailUrl: true,
      previewUrl: true,
      assetUrl: true,
      sourceUrl: true,
      driveFileId: true,
      driveWebViewLink: true,
      driveDownloadUrl: true,
      driveFolderId: true,
      driveFolderName: true,
      sourceMimeType: true,
      approach: {
        select: { id: true, name: true }
      }
    }
  });
}

export async function getCreativeDetail(creativeId: string) {
  return db.creative.findUnique({
    where: {
      id: creativeId
    },
    include: {
      approach: {
        select: {
          id: true,
          name: true
        }
      },
      labelAssignments: {
        include: {
          creativeLabel: {
            select: {
              id: true,
              key: true,
              name: true
            }
          }
        },
        orderBy: {
          creativeLabel: {
            name: "asc"
          }
        }
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
      },
      launches: {
        orderBy: {
          createdAt: "desc"
        },
        take: 5,
        select: {
          id: true,
          setupName: true,
          lifecycleStatus: true,
          createdAt: true
        }
      },
      _count: {
        select: {
          launches: true
        }
      }
    }
  });
}
