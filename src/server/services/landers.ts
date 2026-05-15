import { db } from "@/server/db/client";

export async function listLanders() {
  return db.lander.findMany({
    orderBy: [
      {
        name: "asc"
      }
    ],
    include: {
      approach: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          launches: true
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

export async function listLanderOptions() {
  return db.lander.findMany({
    orderBy: {
      name: "asc"
    },
    select: {
      id: true,
      name: true,
      url: true
    }
  });
}
