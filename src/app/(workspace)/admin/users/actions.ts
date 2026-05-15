"use server";

import { db } from "@/server/db/client";
import { requireRole } from "@/server/auth/session";
import { hashPassword } from "@/server/auth/password";
import { revalidatePath } from "next/cache";
import type { Role } from "@/lib/auth/roles";

export async function createUser(data: { email: string; name: string; password?: string; role: Role }) {
  await requireRole("admin");

  const normalizedEmail = data.email.trim().toLowerCase();
  
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = data.password ? await hashPassword(data.password) : null;

  await db.user.create({
    data: {
      email: normalizedEmail,
      name: data.name,
      role: data.role === "admin" ? "ADMIN" : "MEMBER",
      passwordHash,
    }
  });

  revalidatePath("/admin/users");
}

export async function updateUserRole(userId: string, role: Role) {
  const session = await requireRole("admin");

  if (session.user.id === userId) {
    throw new Error("You cannot change your own role");
  }

  await db.user.update({
    where: { id: userId },
    data: { role: role === "admin" ? "ADMIN" : "MEMBER" }
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const session = await requireRole("admin");

  if (session.user.id === userId) {
    throw new Error("You cannot delete your own account");
  }

  await db.user.delete({
    where: { id: userId }
  });

  revalidatePath("/admin/users");
}
