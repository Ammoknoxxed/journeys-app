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

export async function addFundsToItem(itemId: string, amount: number) {
  const item = await prisma.bucketItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item nicht gefunden");

  await prisma.bucketItem.update({
    where: { id: itemId },
    data: { savedAmount: item.savedAmount + amount },
  });
  revalidatePath("/");
}

export async function markItemCompleted(itemId: string) {
  await prisma.bucketItem.update({
    where: { id: itemId },
    data: { isCompleted: true },
  });
  revalidatePath("/");
}

// --- FIXKOSTEN & ABOS ---
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

export async function addSubscription(title: string, amount: number, cycle: string) {
  await prisma.subscription.create({ data: { title, amount, cycle } });
  
  // Kopplung: Erstellt automatisch eine Fixkosten-Verpflichtung
  await prisma.financialObligation.create({
    data: { 
      title: `Abo: ${title}`, 
      amount: cycle === "YEARLY" ? amount / 12 : amount, 
      type: "FIXKOSTEN" 
    }
  });
  revalidatePath("/subscriptions");
  revalidatePath("/");
}

export async function deleteSubscription(id: string) {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (sub) {
    // Löscht auch die gekoppelte Fixkosten-Verpflichtung
    await prisma.financialObligation.deleteMany({
      where: { title: `Abo: ${sub.title}` }
    });
  }
  await prisma.subscription.delete({ where: { id } });
  revalidatePath("/subscriptions");
  revalidatePath("/");
}

// --- VARIABLE AUSGABEN (DAILY SYNC) ---
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

// --- EINKAUFSLISTE ---
export async function addShoppingItem(title: string) {
  await prisma.shoppingItem.create({ data: { title } });
  revalidatePath("/shopping");
  revalidatePath("/");
}

export async function toggleShoppingItem(id: string, checked: boolean) {
  await prisma.shoppingItem.update({ where: { id }, data: { checked } });
  revalidatePath("/shopping");
}

export async function clearShoppingList() {
  await prisma.shoppingItem.deleteMany({ where: { checked: true } });
  revalidatePath("/shopping");
}

// --- HOME WIKI ---
export async function addWikiEntry(title: string, content: string, category: string) {
  const session = await getServerSession(authOptions);
  await prisma.wikiEntry.create({
    data: { title, content, category, addedBy: session?.user?.name || "Unbekannt" }
  });
  revalidatePath("/wiki");
}

export async function deleteWikiEntry(id: string) {
  await prisma.wikiEntry.delete({ where: { id } });
  revalidatePath("/wiki");
}

// --- PUTZPLAN (CHORES) ---
export async function addChore(title: string, points: number) {
  await prisma.chore.create({
    data: { title, points }
  });
  revalidatePath("/chores");
}

export async function completeChore(choreId: string, points: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User nicht gefunden");

  await prisma.chore.update({
    where: { id: choreId },
    data: { lastDoneBy: user.name, lastDoneAt: new Date() }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { chorePoints: user.chorePoints + points }
  });
  revalidatePath("/chores");
}

// --- DATE NIGHT ROULETTE ---
export async function addDateIdea(title: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User nicht gefunden");

  await prisma.dateIdea.create({
    data: { title, creatorId: user.id }
  });
  revalidatePath("/roulette");
}

export async function markDateUsed(id: string) {
  await prisma.dateIdea.update({
    where: { id },
    data: { isUsed: true }
  });
  revalidatePath("/roulette");
}

// --- MEAL PREP ---
export async function addMealPlan(dayOfWeek: number, mealType: string, recipe: string, ingredientsInput: string) {
  const ingredients = ingredientsInput.split(',').map(i => i.trim()).filter(i => i.length > 0);
  await prisma.mealPlan.create({
    data: { dayOfWeek, mealType, recipe, ingredients }
  });
  revalidatePath("/mealprep");
}

export async function deleteMealPlan(id: string) {
  await prisma.mealPlan.delete({ where: { id } });
  revalidatePath("/mealprep");
}

export async function syncIngredientsToShoppingList(mealId: string) {
  const meal = await prisma.mealPlan.findUnique({ where: { id: mealId } });
  if (!meal || meal.ingredients.length === 0) return;

  for (const ingredient of meal.ingredients) {
    await prisma.shoppingItem.create({
      data: { title: `${ingredient} (für ${meal.recipe})` }
    });
  }
  revalidatePath("/shopping");
}

// --- TRESOR (VAULT) ---
export async function addVaultItem(title: string, url: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User nicht gefunden");

  await prisma.vaultItem.create({
    data: { title, url, addedBy: user.name }
  });
  revalidatePath("/vault");
}

export async function deleteVaultItem(id: string) {
  await prisma.vaultItem.delete({ where: { id } });
  revalidatePath("/vault");
}

// --- SECRET GIFTS ---
export async function addGiftIdea(title: string, priceStr: string, url: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User nicht gefunden");

  const price = priceStr ? parseFloat(priceStr) : null;
  await prisma.giftIdea.create({
    data: { title, price, url, userId: user.id }
  });
  revalidatePath("/gifts");
}

export async function toggleGiftPurchased(id: string, isPurchased: boolean) {
  await prisma.giftIdea.update({ where: { id }, data: { isPurchased } });
  revalidatePath("/gifts");
}

export async function deleteGiftIdea(id: string) {
  await prisma.giftIdea.delete({ where: { id } });
  revalidatePath("/gifts");
}

// --- KALENDER (TIMELINE) ---
export async function addTimelineEvent(title: string, dateStr: string, type: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User nicht gefunden");

  await prisma.timelineEvent.create({
    data: { title, date: new Date(dateStr), type, creatorId: user.id }
  });
  revalidatePath("/timeline");
}

export async function deleteTimelineEvent(id: string) {
  await prisma.timelineEvent.delete({ where: { id } });
  revalidatePath("/timeline");
}

// --- WEEKLY SYNC (CHECK-IN) ---
export async function submitCheckIn(weekYear: string, highlight: string, stress: string, nextWeek: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User nicht gefunden");

  await prisma.checkInAnswer.create({
    data: { weekYear, highlight, stress, nextWeek, userId: user.id }
  });
  revalidatePath("/checkin");
}

// --- WELTKARTE & REISEKOFFER ---
export async function addTravelPoint(name: string, type: string) {
  await prisma.travelPoint.create({ data: { name, type } });
  revalidatePath("/map");
}

export async function deleteTrip(id: string) {
  await prisma.trip.delete({ where: { id } });
  revalidatePath("/trips");
}

export async function addTrip(title: string, destination: string, dateStr: string) {
  await prisma.trip.create({
    data: { title, destination, date: new Date(dateStr) }
  });
  revalidatePath("/trips");
}

// --- SMART HOME LOGIK ---
export async function addSmartDevice(name: string, type: string, room: string, externalId?: string, modelCode?: string) {
  const session = await getServerSession(authOptions);
  await prisma.smartDevice.create({
    data: { 
      name, 
      type, 
      room, 
      externalId, 
      modelCode,
      addedBy: session?.user?.name || "System" 
    }
  });
  revalidatePath("/smarthome");
}

export async function toggleSmartDevice(id: string, currentState: boolean) {
  const device = await prisma.smartDevice.findUnique({ where: { id } });
  if (!device) return;

  const newState = !currentState;

  try {
    // 1. Govee Steuerung
    if (device.type === 'LIGHT' && device.externalId && device.modelCode) {
      const GOVEE_KEY = process.env.GOVEE_API_KEY;
      if (GOVEE_KEY) {
        await fetch('https://developer-api.govee.com/v1/devices/control', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Govee-API-Key': GOVEE_KEY },
          body: JSON.stringify({
            device: device.externalId,
            model: device.modelCode,
            cmd: { name: "turn", value: newState ? "on" : "off" }
          })
        });
      }
    }

    // 2. Samsung SmartThings Steuerung
    if (device.type === 'TV' && device.externalId) {
      const ST_TOKEN = process.env.SMARTTHINGS_TOKEN;
      if (ST_TOKEN) {
        await fetch(`https://api.smartthings.com/v1/devices/${device.externalId}/commands`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${ST_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commands: [{ component: "main", capability: "switch", command: newState ? "on" : "off" }]
          })
        });
      }
    }

    // 3. Status in Datenbank aktualisieren
    await prisma.smartDevice.update({
      where: { id },
      data: { isActive: newState }
    });

    revalidatePath("/smarthome");
  } catch (error) {
    console.error("Smart Home API Error:", error);
  }
}

export async function deleteSmartDevice(id: string) {
  await prisma.smartDevice.delete({ where: { id } });
  revalidatePath("/smarthome");
}