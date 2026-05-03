// src/lib/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht autorisiert: Zugriff verweigert.");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User in der Datenbank nicht gefunden.");
  return { session, user };
}

// --- NEUE HILFSFUNKTION FÜR SICHERE DATEI-UPLOADS ---
async function uploadFileToDisk(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  // Entfernt Sonderzeichen und Leerzeichen für sichere URLs
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${Date.now()}-${safeName}`;
  
  // Neuer sicherer Pfad im Root-Verzeichnis
  const uploadDir = join(process.cwd(), "data", "uploads");
  const filepath = join(uploadDir, filename);
  
  await mkdir(uploadDir, { recursive: true });
  await writeFile(filepath, buffer);
  
  // Gibt den Pfad zur neuen API-Route zurück
  return `/api/uploads/${filename}`;
}

export async function uploadImage(formData: FormData) {
  await requireAuth();
  const file = formData.get("file") as File;
  if (!file) throw new Error("Kein Bild gefunden");
  
  return await uploadFileToDisk(file);
}

export async function updateNetIncome(amount: number) {
  const { user } = await requireAuth();
  await prisma.user.update({
    where: { id: user.id },
    data: { netIncome: Math.abs(amount) },
  });
  revalidatePath("/");
}

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

export async function addExpense(title: string, amount: number, category: string = "Allgemein") {
  const { user } = await requireAuth();
  await prisma.expense.create({
    data: { title, amount: Math.abs(amount), category, userId: user.id }
  });
  revalidatePath("/");
  revalidatePath("/statistics");
}

export async function deleteExpense(id: string) {
  await requireAuth();
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/statistics");
}

export async function addIncome(title: string, amount: number) {
  const { user } = await requireAuth();
  await prisma.income.create({
    data: { title, amount: Math.abs(amount), userId: user.id }
  });
  revalidatePath("/");
  revalidatePath("/statistics");
}

export async function deleteIncome(id: string) {
  await requireAuth();
  await prisma.income.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/statistics");
}

export async function addShoppingItem(title: string, amount?: number, unit?: string) {
  await requireAuth();
  const pantryItem = await prisma.pantryItem.findFirst({
    where: { name: { equals: title, mode: 'insensitive' } }
  });
  await prisma.shoppingItem.create({ 
    data: { 
      title,
      amount: amount || null,
      unit: unit || pantryItem?.unit || null,
      pantryItemId: pantryItem?.id || null 
    } 
  });
  revalidatePath("/shopping");
}

export async function toggleShoppingItem(id: string, checked: boolean, amount?: number) {
  await requireAuth();
  await prisma.shoppingItem.update({ 
    where: { id }, 
    data: { 
      checked,
      ...(amount !== undefined && !isNaN(amount) ? { amount } : {})
    } 
  });
  revalidatePath("/shopping");
}

export async function clearShoppingList() {
  await requireAuth();
  const completed = await prisma.shoppingItem.findMany({ where: { checked: true } });
  
  for (const item of completed) {
    if (item.pantryItemId && item.amount) {
      const pantryItem = await prisma.pantryItem.findUnique({ where: { id: item.pantryItemId } });
      if (pantryItem) {
        await prisma.pantryItem.update({
          where: { id: pantryItem.id },
          data: { count: pantryItem.count + item.amount }
        });
      }
    }
  }

  await prisma.shoppingItem.deleteMany({ where: { checked: true } });
  revalidatePath("/shopping");
  revalidatePath("/"); 
}

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

// --- MEAL PREP 2.0 (Smart Match Version) ---
export async function addMealPlan(dayOfWeek: number, mealType: string, recipeInput: string, ingredientsInput: string, recipeNotes: string = "", recipeId?: string) {
  await requireAuth();
  
  if (recipeId) {
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId }, include: { ingredients: true } });
    if (recipe) {
      await prisma.mealPlan.create({
        data: { 
          dayOfWeek, 
          mealType, 
          recipe: recipe.title, 
          recipeId: recipe.id, 
          ingredients: recipe.ingredients.map(i => `${i.amount} ${i.unit} ${i.name}`), 
          recipeNotes: recipe.instructions 
        }
      });

      // Wir laden ALLE Vorratsartikel in den Speicher für den smarten Abgleich
      const allPantryItems = await prisma.pantryItem.findMany();

      for (const ing of recipe.ingredients) {
        // SMART MATCH: Guckt, ob die Wörter sich überschneiden (z.B. "Nudel" vs "Nudeln")
        const pantryItem = allPantryItems.find(p => 
          p.name.toLowerCase() === ing.name.toLowerCase() ||
          ing.name.toLowerCase().includes(p.name.toLowerCase()) ||
          p.name.toLowerCase().includes(ing.name.toLowerCase())
        );

        let missingAmount = ing.amount;
        let pItemId = null;
        
        if (pantryItem) {
           pItemId = pantryItem.id;
           if (pantryItem.count >= ing.amount) missingAmount = 0; 
           else missingAmount = ing.amount - pantryItem.count; 
        }
        
        if (missingAmount > 0) {
           // Wir gucken auch hier mit Smart Match, ob es schon auf der Liste steht
           const existingShopItem = await prisma.shoppingItem.findFirst({ 
             where: { title: { contains: ing.name, mode: 'insensitive' }, checked: false } 
           });

           if (!existingShopItem) {
              await prisma.shoppingItem.create({ data: { title: `${ing.name} (für ${recipe.title})`, amount: missingAmount, unit: ing.unit, pantryItemId: pItemId } });
           } else {
              await prisma.shoppingItem.update({ where: { id: existingShopItem.id }, data: { amount: (existingShopItem.amount || 0) + missingAmount } });
           }
        }
      }
    }
  } else {
    const ingredients = ingredientsInput.split(',').map(i => i.trim()).filter(i => i.length > 0);
    await prisma.mealPlan.create({
      data: { dayOfWeek, mealType, recipe: recipeInput, ingredients, recipeNotes }
    });
  }
  
  revalidatePath("/mealprep");
  revalidatePath("/shopping");
}

export async function markMealCooked(mealId: string) {
  await requireAuth();
  const meal = await prisma.mealPlan.findUnique({ where: { id: mealId } });
  if (!meal || meal.isCooked) return;

  if (meal.recipeId) {
    const recipe = await prisma.recipe.findUnique({ where: { id: meal.recipeId }, include: { ingredients: true } });
    if (recipe) {
      // Auch hier laden wir alle Vorratsartikel für den smarten Abgleich
      const allPantryItems = await prisma.pantryItem.findMany();

      for (const ing of recipe.ingredients) {
        const pantryItem = allPantryItems.find(p => 
          p.name.toLowerCase() === ing.name.toLowerCase() ||
          ing.name.toLowerCase().includes(p.name.toLowerCase()) ||
          p.name.toLowerCase().includes(ing.name.toLowerCase())
        );

        if (pantryItem) {
          const newCount = Math.max(0, pantryItem.count - ing.amount);
          await prisma.pantryItem.update({ where: { id: pantryItem.id }, data: { count: newCount } });
          
          if (newCount < pantryItem.minCount) {
            const existingShop = await prisma.shoppingItem.findFirst({ where: { pantryItemId: pantryItem.id, checked: false } });
            if (!existingShop) {
              await prisma.shoppingItem.create({ data: { title: pantryItem.name, pantryItemId: pantryItem.id, unit: pantryItem.unit } });
            }
          }
        }
      }
    }
  }

  await prisma.mealPlan.update({ where: { id: mealId }, data: { isCooked: true } });
  revalidatePath("/mealprep");
  revalidatePath("/");
}

export async function addRecipe(title: string, instructions: string, ingredientsJson: string) {
  await requireAuth();
  const parsedIngredients = JSON.parse(ingredientsJson).map((ing: any) => ({
     amount: parseFloat(ing.amount) || 1,
     unit: ing.unit || "Stück",
     name: ing.name
  }));

  await prisma.recipe.create({
    data: {
      title,
      instructions,
      ingredients: { create: parsedIngredients }
    }
  });
  revalidatePath("/mealprep");
}

export async function deleteRecipe(id: string) {
  await requireAuth();
  await prisma.recipe.delete({ where: { id } });
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

export async function addVaultItem(formData: FormData) {
  const { user } = await requireAuth();
  const title = formData.get("title") as string;
  const url = formData.get("url") as string;
  const file = formData.get("file") as File;
  
  let fileData = null;
  let fileType = null;

  if (file && file.size > 0) {
    fileData = await uploadFileToDisk(file);
    fileType = file.type;
  }

  if (!url && !fileData) return;

  await prisma.vaultItem.create({
    data: { title, url: url || null, fileData, fileType, addedBy: user.name || "System" }
  });
  revalidatePath("/vault");
}

export async function deleteVaultItem(id: string) {
  await requireAuth();
  await prisma.vaultItem.delete({ where: { id } });
  revalidatePath("/vault");
}

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

export async function addTimelineEvent(title: string, dateStr: string, type: string) {
  const { user } = await requireAuth();
  await prisma.timelineEvent.create({
    data: { title, date: new Date(dateStr), type, creatorId: user.id }
  });
  revalidatePath("/timeline");
  revalidatePath("/"); 
}

export async function deleteTimelineEvent(id: string) {
  await requireAuth();
  await prisma.timelineEvent.delete({ where: { id } });
  revalidatePath("/timeline");
  revalidatePath("/"); 
}

export async function submitCheckIn(weekYear: string, highlight: string, stress: string, nextWeek: string) {
  const { user } = await requireAuth();
  await prisma.checkInAnswer.create({
    data: { weekYear, highlight, stress, nextWeek, userId: user.id }
  });
  revalidatePath("/checkin");
}

export async function addTravelPoint(name: string, type: string) {
  await requireAuth();
  await prisma.travelPoint.create({ data: { name, type } });
  revalidatePath("/map");
}

export async function deleteTravelPoint(id: string) {
  await requireAuth();
  await prisma.travelPoint.delete({ where: { id } });
  revalidatePath("/map");
}

export async function deleteTrip(id: string) {
  await requireAuth();
  await prisma.trip.delete({ where: { id } });
  revalidatePath("/trips");
  revalidatePath("/map");
  revalidatePath("/");
}

export async function addTrip(title: string, destination: string, dateStr: string, savedAmount: number = 0) {
  await requireAuth();
  await prisma.trip.create({
    data: { title, destination, date: new Date(dateStr), savedAmount: Math.abs(savedAmount) }
  });
  revalidatePath("/trips");
  revalidatePath("/map");
  revalidatePath("/");
}

export async function addSmartDevice(name: string, type: string, room: string, externalId?: string, modelCode?: string) {
  const { user } = await requireAuth();
  await prisma.smartDevice.create({
    data: { name, type, room, externalId, modelCode, addedBy: user.name }
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

export async function addStickyNote(formData: FormData) {
  const { user } = await requireAuth();
  const text = formData.get("text") as string;
  const file = formData.get("file") as File;
  let imageUrl = null;

  if (file && file.size > 0) {
    imageUrl = await uploadFileToDisk(file);
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

export async function consumePetFood(formData: FormData) {
  await requireAuth();
  
  // Liest aus, ob wir 1 oder 2 Dosen abziehen
  const amountStr = formData.get("amount") as string;
  const amount = amountStr ? parseInt(amountStr) : 1;

  const petFood = await prisma.petFood.findFirst();
  if (petFood && petFood.cans > 0) {
    const newAmount = Math.max(0, petFood.cans - amount);
    await prisma.petFood.update({ where: { id: petFood.id }, data: { cans: newAmount } });
    
    // WARNUNG GEÄNDERT: Löst jetzt schon bei 6 Dosen aus (da 2 Katzen)
    if (newAmount <= 6) {
      const existing = await prisma.shoppingItem.findFirst({ where: { title: { contains: "Mäusschen läuft leer" }, checked: false } });
      if (!existing) {
        await prisma.shoppingItem.create({ data: { title: "🚨 Katzenfutter (Mäusschen läuft leer!)" } });
      }
    }
  }
  revalidatePath("/");
}

// NIMMT JETZT DEN KATZENNAMEN MIT AUF
export async function addHealthEvent(title: string, dateStr: string, petName: string = "Beide") {
  await requireAuth();
  await prisma.petHealthEvent.create({
    data: { title, dueDate: new Date(dateStr), petName }
  });
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

export async function setPantryCount(id: string, count: number) {
  const item = await prisma.pantryItem.findUnique({ where: { id } });
  if (!item) return;

  const newCount = Math.max(0, count);
  await prisma.pantryItem.update({
    where: { id },
    data: { count: newCount }
  });

  if (newCount < item.minCount) {
    const existing = await prisma.shoppingItem.findFirst({ where: { pantryItemId: item.id, checked: false } });
    if (!existing) {
      await prisma.shoppingItem.create({ 
        data: { title: item.name, pantryItemId: item.id, unit: item.unit } 
      });
    }
  }
  revalidatePath("/");
}

export async function addPantryItem(name: string, unit: string, minCount: number) {
  await requireAuth();
  await prisma.pantryItem.create({ 
    data: { name, unit, minCount: Math.max(0, minCount), count: 0 } 
  });
  revalidatePath("/");
}

export async function deletePantryItem(id: string) {
  await requireAuth();
  await prisma.pantryItem.delete({ where: { id } });
  revalidatePath("/");
}

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