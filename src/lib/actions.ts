// src/lib/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// --- NUTZER & EINKOMMEN ---
export async function updateNetIncome(amount: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert");
  await prisma.user.update({
    where: { email: session.user.email },
    data: { netIncome: amount },
  });
  revalidatePath("/");
}

// --- BUCKETLIST & SINKING FUNDS ---
// UPDATE: Unterstützt jetzt das isSurprise Flag
export async function addBucketItem(title: string, price: number, isSurprise: boolean = false) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User nicht gefunden");

  await prisma.bucketItem.create({
    data: { title, price, isSurprise, creatorId: user.id },
  });
  revalidatePath("/");
}

export async function approveBucketItem(itemId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User nicht gefunden");

  await prisma.bucketItem.update({
    where: { id: itemId },
    data: { approverId: user.id },
  });
  revalidatePath("/");
}

export async function deleteBucketItem(itemId: string) {
  await prisma.bucketItem.delete({ where: { id: itemId } });
  revalidatePath("/");
}

// NEU: Geld in einen Traum einzahlen (Sparschwein)
export async function addFundsToItem(itemId: string, amount: number) {
  const item = await prisma.bucketItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item nicht gefunden");

  await prisma.bucketItem.update({
    where: { id: itemId },
    data: { savedAmount: item.savedAmount + amount },
  });
  revalidatePath("/");
}

// NEU: Traum als erfüllt markieren (Memory Archive Vorbereitung)
export async function markItemCompleted(itemId: string) {
  await prisma.bucketItem.update({
    where: { id: itemId },
    data: { isCompleted: true },
  });
  revalidatePath("/");
}

// --- FIXKOSTEN ---
export async function addObligation(title: string, amount: number) {
  await prisma.financialObligation.create({
    data: { title, amount, type: "FIXKOSTEN" }
  });
  revalidatePath("/");
}

export async function deleteObligation(id: string) {
  await prisma.financialObligation.delete({ where: { id } });
  revalidatePath("/");
}

// --- NEU: VARIABLE AUSGABEN (DAILY SYNC) ---
export async function addExpense(title: string, amount: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User nicht gefunden");

  await prisma.expense.create({
    data: { title, amount, userId: user.id }
  });
  revalidatePath("/");
}

export async function deleteExpense(id: string) {
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/");
}