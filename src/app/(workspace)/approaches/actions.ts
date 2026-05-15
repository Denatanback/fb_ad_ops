"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth/session";
import { db } from "@/server/db/client";

function normalizeTextValue(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function redirectWithError(message: string): never {
  redirect(`/approaches?error=${encodeURIComponent(message)}`);
}

export async function createApproachAction(formData: FormData) {
  const session = await requireAuthSession();
  const name = normalizeTextValue(formData.get("name"));
  const notes = normalizeTextValue(formData.get("notes"));

  if (!name) {
    redirectWithError("Укажите название подхода.");
  }

  try {
    await db.approach.create({
      data: {
        name,
        notes,
        createdById: session.user.id,
        updatedById: session.user.id
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirectWithError("Подход с таким названием уже существует.");
    }

    throw error;
  }

  revalidatePath("/approaches");
  redirect("/approaches?created=1");
}

export async function createHypothesisAction(approachId: string, formData: FormData) {
  await requireAuthSession();
  const name = normalizeTextValue(formData.get("name"));

  if (!name) {
    throw new Error("Укажите название гипотезы.");
  }

  await db.hypothesis.create({
    data: {
      approachId,
      name,
    }
  });

  revalidatePath(`/approaches/${approachId}`);
}

export async function updateHypothesisAction(hypothesisId: string, formData: FormData) {
  await requireAuthSession();
  const name = normalizeTextValue(formData.get("name"));
  const description = normalizeTextValue(formData.get("description"));
  const creativeConcept = normalizeTextValue(formData.get("creativeConcept"));
  const results = normalizeTextValue(formData.get("results"));
  const budgetRaw = normalizeTextValue(formData.get("budget"));
  const budget = budgetRaw ? parseFloat(budgetRaw.replace(",", ".")) : null;

  if (!name) {
    throw new Error("Укажите название гипотезы.");
  }

  if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
    throw new Error("Бюджет должен быть числом больше нуля.");
  }

  const hypothesis = await db.hypothesis.update({
    where: { id: hypothesisId },
    data: {
      name,
      description,
      creativeConcept,
      results,
      budget,
    },
    select: { approachId: true }
  });

  revalidatePath(`/approaches/${hypothesis.approachId}`);
}

export async function deleteHypothesisAction(hypothesisId: string) {
  await requireAuthSession();
  
  const hypothesis = await db.hypothesis.delete({
    where: { id: hypothesisId },
    select: { approachId: true }
  });

  revalidatePath(`/approaches/${hypothesis.approachId}`);
}

export async function assignCreativesToApproachAction(approachId: string, formData: FormData) {
  const session = await requireAuthSession();
  const creativeIds = Array.from(
    new Set(
      formData
        .getAll("creativeId")
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );

  if (!creativeIds.length) {
    redirect(`/approaches/${approachId}?error=${encodeURIComponent("Выберите хотя бы один креатив из галереи.")}`);
  }

  const approach = await db.approach.findUnique({
    where: {
      id: approachId
    },
    select: {
      id: true
    }
  });

  if (!approach) {
    redirect(`/approaches?error=${encodeURIComponent("Воронка не найдена.")}`);
  }

  await db.creative.updateMany({
    where: {
      id: {
        in: creativeIds
      }
    },
    data: {
      approachId,
      updatedById: session.user.id
    }
  });

  revalidatePath("/approaches");
  revalidatePath(`/approaches/${approachId}`);
  revalidatePath("/creatives");
  revalidatePath("/creatives/gallery");
  redirect(`/approaches/${approachId}?assigned=${creativeIds.length}`);
}
