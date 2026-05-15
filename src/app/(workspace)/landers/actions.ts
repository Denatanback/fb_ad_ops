"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth/session";
import { db } from "@/server/db/client";

function normalizeTextValue(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeOptionalUrl(value: FormDataEntryValue | null) {
  const normalized = normalizeTextValue(value);

  if (!normalized) {
    return null;
  }

  return new URL(normalized).toString();
}

function redirectWithError(message: string): never {
  redirect(`/landers?error=${encodeURIComponent(message)}`);
}

export async function createLanderAction(formData: FormData) {
  const session = await requireAuthSession();
  const name = normalizeTextValue(formData.get("name"));
  const urlValue = formData.get("url");
  const notes = normalizeTextValue(formData.get("notes"));

  if (!name) {
    redirectWithError("Укажите название лендинга.");
  }

  let url: string;

  try {
    url = normalizeOptionalUrl(urlValue) ?? redirectWithError("Укажите корректный URL лендинга.");
  } catch {
    redirectWithError("Укажите корректный URL лендинга.");
  }

  await db.lander.create({
    data: {
      name,
      url,
      notes,
      createdById: session.user.id,
      updatedById: session.user.id
    }
  });

  revalidatePath("/landers");
  redirect("/landers?created=1");
}
