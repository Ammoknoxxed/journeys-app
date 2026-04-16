// src/lib/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// --- HILFSFUNKTION: SECURITY CHECK ---
async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert: Zugriff verweigert.");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User in der Datenbank nicht gefunden.");
  return { session, user };
}

// --- BILDER UPLOAD (INTERN FÜR SCHWARZES BRETT) ---
export async function uploadImage(formData: FormData) {
  await requireAuth();
  const file = formData.get("file") as File;
  if (!file) throw new Error("Kein Bild gefunden");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
  const uploadDir = join(process.cwd(), "public/uploads");
  const filepath = join(uploadDir, filename);
  
  await mkdir(uploadDir, { recursive: true });
  await writeFile(filepath, buffer);
  
  return `/uploads/${filename}`;
}

// --- NUTZER & EINKOMMEN ---
export async function updateNetIncome(amount: number) {
  const { user } = await requireAuth();
  await prisma.user.update({
    where: { id: user.id },
    data: { netIncome: Math.abs(amount) },
  });
  revalidatePath("/");
}

// --- BUCKETLIST & SINKING FUNDS ---
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

export async function deleteBucketItem(itemId: string) {
  await requireAuth();
  await prisma.bucketItem.delete({ where: { id: itemId } });
  revalidatePath("/");
}

export async function addFundsToItem(itemId: string, amount: number) {
  await requireAuth();
  const item = await prisma.bucketItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item nicht gefunden");

  await prisma.bucketItem.update({
    where: { id: itemId },
    data: { savedAmount: item.savedAmount + Math.abs(amount) },
  });
  revalidatePath("/");
}

export async function markItemCompleted(itemId: string) {
  await requireAuth();
  await prisma.bucketItem.update({
    where: { id: itemId },
    data: { isCompleted: true },
  });
  revalidatePath("/");
}

// --- FIXKOSTEN & ABOS ---
export async function addObligation(title: string, amount: number) {
  await requireAuth();
  await prisma.financialObligation.create({
    data: { title, amount: Math.abs(amount), type: "FIXKOSTEN" }
  });
  revalidatePath("/");
}

export async function deleteObligation(id: string) {
  await requireAuth();
  await prisma.financialObligation.delete({ where: { id } });
  revalidatePath("/");
}

export async function addSubscription(title: string, amount: number, cycle: string) {
  await requireAuth();
  await prisma.subscription.create({ data: { title, amount: Math.abs(amount), cycle } });
  
  await prisma.financialObligation.create({
    data: { 
      title: `Abo: ${title}`, 
      amount: cycle === "YEARLY" ? Math.abs(amount) / 12 : Math.abs(amount), 
      type: "FIXKOSTEN" 
    }
  });
  revalidatePath("/");
}

export async function deleteSubscription(id: string) {
  await requireAuth();
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (sub) {
    await prisma.financialObligation.deleteMany({
      where: { title: `Abo: ${sub.title}` }
    });
  }
  await prisma.subscription.delete({ where: { id } });
  revalidatePath("/");
}

// --- VARIABLE AUSGABEN (DAILY SYNC) ---
export async function addExpense(title: string, amount: number) {
  const { user } = await requireAuth();
  await prisma.expense.create({
    data: { title, amount: Math.abs(amount), userId: user.id }
  });
  revalidatePath("/");
}

export async function deleteExpense(id: string) {
  await requireAuth();
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/");
}

// --- EINKAUFSLISTE ---
export async function addShoppingItem(title: string) {
  await requireAuth();
  await prisma.shoppingItem.create({ data: { title } });
  revalidatePath("/shopping");
}

export async function toggleShoppingItem(id: string, checked: boolean) {
  await requireAuth();
  await prisma.shoppingItem.update({ where: { id }, data: { checked } });
  revalidatePath("/shopping");
}

export async function clearShoppingList() {
  await requireAuth();
  await prisma.shoppingItem.deleteMany({ where: { checked: true } });
  revalidatePath("/shopping");
}

// --- HOME WIKI ---
export async function addWikiEntry(title: string, content: string, category: string) {
  const { user } = await requireAuth();
  await prisma.wikiEntry.create({
    data: { title, content, category, addedBy: user.name || "Unbekannt" }
  });
  revalidatePath("/wiki");
}

export async function deleteWikiEntry(id: string) {
  await requireAuth();
  await prisma.wikiEntry.delete({ where: { id } });
  revalidatePath("/wiki");
}

// --- PUTZPLAN (CHORES) ---
export async function addChore(title: string, points: number) {
  await requireAuth();
  await prisma.chore.create({
    data: { title, points: Math.abs(points) }
  });
  revalidatePath("/chores");
}

export async function completeChore(choreId: string, points: number) {
  const { user } = await requireAuth();
  await prisma.chore.update({
    where: { id: choreId },
    data: { lastDoneBy: user.name, lastDoneAt: new Date() }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { chorePoints: user.chorePoints + Math.abs(points) }
  });
  revalidatePath("/chores");
}

// --- DATE NIGHT ROULETTE ---
export async function addDateIdea(title: string) {
  const { user } = await requireAuth();
  await prisma.dateIdea.create({
    data: { title, creatorId: user.id }
  });
  revalidatePath("/roulette");
}

export async function markDateUsed(id: string) {
  await requireAuth();
  await prisma.dateIdea.update({
    where: { id },
    data: { isUsed: true }
  });
  revalidatePath("/roulette");
}

// --- MEAL PREP ---
export async function addMealPlan(dayOfWeek: number, mealType: string, recipe: string, ingredientsInput: string) {
  await requireAuth();
  const ingredients = ingredientsInput.split(',').map(i => i.trim()).filter(i => i.length > 0);
  await prisma.mealPlan.create({
    data: { dayOfWeek, mealType, recipe, ingredients }
  });
  revalidatePath("/mealprep");
}

export async function deleteMealPlan(id: string) {
  await requireAuth();
  await prisma.mealPlan.delete({ where: { id } });
  revalidatePath("/mealprep");
}

export async function syncIngredientsToShoppingList(mealId: string) {
  await requireAuth();
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
  const { user } = await requireAuth();
  await prisma.vaultItem.create({
    data: { title, url, addedBy: user.name }
  });
  revalidatePath("/vault");
}

export async function deleteVaultItem(id: string) {
  await requireAuth();
  await prisma.vaultItem.delete({ where: { id } });
  revalidatePath("/vault");
}

// --- SECRET GIFTS ---
export async function addGiftIdea(title: string, priceStr: string, url: string) {
  const { user } = await requireAuth();
  const price = priceStr ? Math.abs(parseFloat(priceStr)) : null;
  await prisma.giftIdea.create({
    data: { title, price, url, userId: user.id }
  });
  revalidatePath("/gifts");
}

export async function toggleGiftPurchased(id: string, isPurchased: boolean) {
  await requireAuth();
  await prisma.giftIdea.update({ where: { id }, data: { isPurchased } });
  revalidatePath("/gifts");
}

export async function deleteGiftIdea(id: string) {
  await requireAuth();
  await prisma.giftIdea.delete({ where: { id } });
  revalidatePath("/gifts");
}

// --- KALENDER (TIMELINE) ---
export async function addTimelineEvent(title: string, dateStr: string, type: string) {
  const { user } = await requireAuth();
  await prisma.timelineEvent.create({
    data: { title, date: new Date(dateStr), type, creatorId: user.id }
  });
  revalidatePath("/timeline");
}

export async function deleteTimelineEvent(id: string) {
  await requireAuth();
  await prisma.timelineEvent.delete({ where: { id } });
  revalidatePath("/timeline");
}

// --- WEEKLY SYNC (CHECK-IN) ---
export async function submitCheckIn(weekYear: string, highlight: string, stress: string, nextWeek: string) {
  const { user } = await requireAuth();
  await prisma.checkInAnswer.create({
    data: { weekYear, highlight, stress, nextWeek, userId: user.id }
  });
  revalidatePath("/checkin");
}

// --- WELTKARTE & REISEKOFFER ---
export async function addTravelPoint(name: string, type: string) {
  await requireAuth();
  await prisma.travelPoint.create({ data: { name, type } });
  revalidatePath("/map");
}

export async function deleteTrip(id: string) {
  await requireAuth();
  await prisma.trip.delete({ where: { id } });
  revalidatePath("/trips");
}

export async function addTrip(title: string, destination: string, dateStr: string) {
  await requireAuth();
  await prisma.trip.create({
    data: { title, destination, date: new Date(dateStr) }
  });
  revalidatePath("/trips");
}

// --- SMART HOME LOGIK ---
export async function addSmartDevice(name: string, type: string, room: string, externalId?: string, modelCode?: string) {
  const { user } = await requireAuth();
  await prisma.smartDevice.create({
    data: { 
      name, 
      type, 
      room, 
      externalId, 
      modelCode,
      addedBy: user.name 
    }
  });
  revalidatePath("/smarthome");
}

export async function toggleSmartDevice(id: string, currentState: boolean) {
  await requireAuth();
  const device = await prisma.smartDevice.findUnique({ where: { id } });
  if (!device) return;

  const newState = !currentState;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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
          }),
          signal: controller.signal
        });
      }
    }

    if (device.type === 'TV' && device.externalId) {
      const ST_TOKEN = process.env.SMARTTHINGS_TOKEN;
      if (ST_TOKEN) {
        await fetch(`https://api.smartthings.com/v1/devices/${device.externalId}/commands`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${ST_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commands: [{ component: "main", capability: "switch", command: newState ? "on" : "off" }]
          }),
          signal: controller.signal
        });
      }
    }
    
    clearTimeout(timeoutId);

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
  await requireAuth();
  await prisma.smartDevice.delete({ where: { id } });
  revalidatePath("/smarthome");
}

export async function setGoveeDeviceState(id: string, cmdName: "color" | "brightness", value: any) {
  await requireAuth();
  const device = await prisma.smartDevice.findUnique({ where: { id } });
  if (!device || !device.externalId || !device.modelCode) return;

  const GOVEE_KEY = process.env.GOVEE_API_KEY;
  if (!GOVEE_KEY) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    await fetch('https://developer-api.govee.com/v1/devices/control', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Govee-API-Key': GOVEE_KEY },
      body: JSON.stringify({
        device: device.externalId,
        model: device.modelCode,
        cmd: { name: cmdName, value: value }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    revalidatePath("/smarthome");
  } catch (error) {
    console.error("Govee Control Error:", error);
  }
}

export async function sendTvCommand(id: string, capability: string, command: string, args: any[] = []) {
  await requireAuth();
  const device = await prisma.smartDevice.findUnique({ where: { id } });
  if (!device || !device.externalId) return;

  const ST_TOKEN = process.env.SMARTTHINGS_TOKEN;
  if (!ST_TOKEN) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    await fetch(`https://api.smartthings.com/v1/devices/${device.externalId}/commands`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [{ component: "main", capability: capability, command: command, arguments: args }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    revalidatePath("/smarthome");
  } catch (error) {
    console.error("Samsung Control Error:", error);
  }
}

// --- SCHWARZES BRETT (STICKY NOTES MIT BASE64 BILDER-HACK FÜR RAILWAY) ---
export async function addStickyNote(formData: FormData) {
  const { user } = await requireAuth();
  const text = formData.get("text") as string;
  const file = formData.get("file") as File;
  let imageUrl = null;

  if (file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    imageUrl = `data:${file.type};base64,${base64}`;
  }

  if (!text && !imageUrl) return;

  await prisma.stickyNote.create({
    data: { text, imageUrl, author: user.name || "Unbekannt" }
  });
  revalidatePath("/");
}

export async function deleteStickyNote(id: string) {
  await requireAuth();
  await prisma.stickyNote.delete({ where: { id } });
  revalidatePath("/");
}

// --- PÜPPI'S HYGIENE, HEALTH & FOOD ---
export async function consumePetFood() {
  await requireAuth();
  const petFood = await prisma.petFood.findFirst();
  if (petFood && petFood.cans > 0) {
    const newAmount = petFood.cans - 1;
    await prisma.petFood.update({ where: { id: petFood.id }, data: { cans: newAmount } });
    
    if (newAmount <= 3) {
      const existing = await prisma.shoppingItem.findFirst({ where: { title: { contains: "Mäusschen läuft leer" }, checked: false } });
      if (!existing) {
        await prisma.shoppingItem.create({ data: { title: "🚨 Katzenfutter (Mäusschen läuft leer!)" } });
      }
    }
  }
  revalidatePath("/");
}

export async function addPetFood(amount: number) {
  await requireAuth();
  let petFood = await prisma.petFood.findFirst();
  if (!petFood) {
    petFood = await prisma.petFood.create({ data: { cans: 10 } });
  }
  await prisma.petFood.update({ where: { id: petFood.id }, data: { cans: petFood.cans + amount } });
  revalidatePath("/");
}

export async function cleanLitterBox(boxId: number) {
  const { user } = await requireAuth();
  await prisma.litterBoxLog.create({
    data: { boxId, cleanedBy: user.name || "Unbekannt" }
  });
  revalidatePath("/");
}

export async function addHealthEvent(title: string, dateStr: string) {
  await requireAuth();
  await prisma.petHealthEvent.create({
    data: { title, dueDate: new Date(dateStr) }
  });
  revalidatePath("/");
}

export async function deleteHealthEvent(id: string) {
  await requireAuth();
  await prisma.petHealthEvent.delete({ where: { id } });
  revalidatePath("/");
}

// --- VORRATSSCHRANK (PANTRY) ---
export async function updatePantryCount(id: string, change: number) {
  const item = await prisma.pantryItem.findUnique({ where: { id } });
  if (!item) return;

  const newCount = Math.max(0, item.count + change);
  await prisma.pantryItem.update({
    where: { id },
    data: { count: newCount }
  });

  if (newCount <= item.minCount) {
    const existing = await prisma.shoppingItem.findFirst({ where: { title: { contains: item.name }, checked: false } });
    if (!existing) {
      await prisma.shoppingItem.create({ data: { title: `🛒 Vorrat leer: ${item.name}` } });
    }
  }
  revalidatePath("/");
}

export async function addPantryItem(name: string) {
  await requireAuth();
  await prisma.pantryItem.create({ data: { name, minCount: 1, count: 0 } });
  revalidatePath("/");
}

export async function deletePantryItem(id: string) {
  await requireAuth();
  await prisma.pantryItem.delete({ where: { id } });
  revalidatePath("/");
}

// --- ENERGY RADAR ---
export async function addEnergyReading(type: string, value: number) {
  await requireAuth();
  await prisma.energyReading.create({ data: { type, value: Math.abs(value) } });
  revalidatePath("/");
}

export async function deleteEnergyReading(id: string) {
  await requireAuth();
  await prisma.energyReading.delete({ where: { id } });
  revalidatePath("/");
}

export async function updateEnergySettings(kwhPrice: number, monthlyPrepayment: number) {
  await requireAuth();
  let settings = await prisma.energySettings.findFirst();
  if (settings) {
    await prisma.energySettings.update({ where: { id: settings.id }, data: { kwhPrice, monthlyPrepayment } });
  } else {
    await prisma.energySettings.create({ data: { kwhPrice, monthlyPrepayment } });
  }
  revalidatePath("/");
}

// --- SHARED CONTACTS ---
export async function addSharedContact(name: string, role: string, phone?: string, email?: string) {
  await requireAuth();
  await prisma.sharedContact.create({ data: { name, role, phone, email } });
  revalidatePath("/");
}

export async function deleteSharedContact(id: string) {
  await requireAuth();
  await prisma.sharedContact.delete({ where: { id } });
  revalidatePath("/");
}