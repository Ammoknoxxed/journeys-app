// src/lib/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// --- AUTH & SECURITY HELPER ---
async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert.");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User nicht gefunden.");
  return { session, user };
}

// --- 1. CORE & USER ---
export async function updateNetIncome(amount: number) {
  const { user } = await requireAuth();
  await prisma.user.update({
    where: { id: user.id },
    data: { netIncome: Math.abs(amount) },
  });
  revalidatePath("/");
}

// --- 2. FINANZEN (BUCKETLIST, FIXED, SUBS) ---
export async function addBucketItem(title: string, price: number, isSurprise: boolean = false) {
  const { user } = await requireAuth();
  await prisma.bucketItem.create({
    data: { title, price: Math.abs(price), isSurprise, creatorId: user.id },
  });
  revalidatePath("/");
}

export async function approveBucketItem(itemId: string) {
  const { user } = await requireAuth();
  await prisma.bucketItem.update({
    where: { id: itemId },
    data: { approverId: user.id },
  });
  revalidatePath("/");
}

export async function addFundsToItem(itemId: string, amount: number) {
  await requireAuth();
  const item = await prisma.bucketItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  await prisma.bucketItem.update({
    where: { id: itemId },
    data: { savedAmount: item.savedAmount + Math.abs(amount) },
  });
  revalidatePath("/");
}

export async function addSubscription(title: string, amount: number, cycle: "MONTHLY" | "YEARLY") {
  await requireAuth();
  await prisma.subscription.create({ data: { title, amount, cycle } });
  
  const monthlyCost = cycle === "YEARLY" ? amount / 12 : amount;
  await prisma.financialObligation.create({
    data: { title: `Abo: ${title}`, amount: monthlyCost, type: "FIXKOSTEN" }
  });
  revalidatePath("/");
}

export async function addExpense(title: string, amount: number) {
  const { user } = await requireAuth();
  await prisma.expense.create({
    data: { title, amount: Math.abs(amount), userId: user.id }
  });
  revalidatePath("/");
}

// --- 3. PÜPPI (CAT CARE) ---
export async function consumePetFood() {
  await requireAuth();
  const food = await prisma.petFood.findFirst();
  if (food && food.cans > 0) {
    const newCount = food.cans - 1;
    await prisma.petFood.update({ where: { id: food.id }, data: { cans: newCount } });
    
    if (newCount <= 3) {
      await prisma.shoppingItem.create({ data: { title: "🚨 Katzenfutter kaufen (Bestand niedrig!)" } });
    }
  }
  revalidatePath("/");
}

export async function cleanLitterBox(boxId: number) {
  const { user } = await requireAuth();
  await prisma.litterBoxLog.create({
    data: { boxId, cleanedBy: user.name || "System" }
  });
  revalidatePath("/");
}

// --- 4. SMART HOME & DEVICES ---
export async function toggleSmartDevice(id: string, currentState: boolean) {
  await requireAuth();
  const device = await prisma.smartDevice.findUnique({ where: { id } });
  if (!device) return;

  const newState = !currentState;
  // Hier würde die API-Anbindung (Govee/SmartThings) sitzen
  await prisma.smartDevice.update({
    where: { id },
    data: { isActive: newState }
  });
  revalidatePath("/smarthome");
}

// --- 5. LOGISTIK (SHOPPING, PANTRY, MEALPREP) ---
export async function addShoppingItem(title: string) {
  await requireAuth();
  await prisma.shoppingItem.create({ data: { title } });
  revalidatePath("/shopping");
}

export async function updatePantryCount(id: string, change: number) {
  const item = await prisma.pantryItem.findUnique({ where: { id } });
  if (!item) return;
  const newCount = Math.max(0, item.count + change);
  await prisma.pantryItem.update({ where: { id }, data: { count: newCount } });

  if (newCount <= item.minCount) {
    await prisma.shoppingItem.create({ data: { title: `Vorrat: ${item.name}` } });
  }
  revalidatePath("/");
}

// --- 6. SOCIAL & WIKI (STICKY NOTES, WIKI, CHORES) ---
export async function addStickyNote(formData: FormData) {
  const { user } = await requireAuth();
  const text = formData.get("text") as string;
  const file = formData.get("file") as File;
  let imageUrl = null;

  if (file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name}`;
    const uploadDir = join(process.cwd(), "public/uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);
    imageUrl = `/uploads/${filename}`;
  }

  await prisma.stickyNote.create({
    data: { text, imageUrl, author: user.name || "Unbekannt" }
  });
  revalidatePath("/");
}

export async function completeChore(choreId: string, points: number) {
  const { user } = await requireAuth();
  await prisma.chore.update({
    where: { id: choreId },
    data: { lastDoneBy: user.name, lastDoneAt: new Date() }
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { chorePoints: { increment: points } }
  });
  revalidatePath("/chores");
}

// --- 7. TRAVEL & DATES ---
export async function addTravelPoint(name: string, type: string) {
  await requireAuth();
  await prisma.travelPoint.create({ data: { name, type } });
  revalidatePath("/map");
}

export async function addDateIdea(title: string) {
  const { user } = await requireAuth();
  await prisma.dateIdea.create({ data: { title, creatorId: user.id } });
  revalidatePath("/roulette");
}

// Lösch-Funktionen (Generisch für alle Module)
export async function deleteGeneral(id: string, model: string) {
  await requireAuth();
  // @ts-ignore - Dynamischer Zugriff für Master Coder Zwecke
  await prisma[model].delete({ where: { id } });
  revalidatePath("/");
}