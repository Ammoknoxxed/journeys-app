// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { DashboardData } from "@/lib/dashboard";

// HIER IST DER FIX: Großes 'D' bei Dashboards
import DashboardClassic from "@/components/Dashboards/DashboardClassic";
import DashboardModern from "@/components/Dashboards/DashboardModern";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const todayZero = new Date(new Date().setHours(0,0,0,0));
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Wir laden ALLE Daten zentral, wie bisher...
  const [
    currentUser, allUsers, openShoppingItemsCount, pantryItems,
    energyReadings, energySettingsResult, contacts, nextTrip,
    upcomingEvents, weeklyExpensesAgg, choresDoneThisWeek
  ] = await Promise.all([
    prisma.user.findUnique({ where: { email: session.user.email } }),
    prisma.user.findMany(),
    prisma.shoppingItem.count({ where: { checked: false } }),
    prisma.pantryItem.findMany({ orderBy: { name: 'asc' } }),
    prisma.energyReading.findMany({ orderBy: { date: 'asc' } }),
    prisma.energySettings.findFirst(),
    prisma.sharedContact.findMany({ orderBy: { role: 'asc' } }),
    prisma.trip.findFirst({ where: { date: { gte: todayZero } }, orderBy: { date: 'asc' } }),
    prisma.timelineEvent.findMany({ where: { date: { gte: todayZero } }, orderBy: { date: 'asc' }, take: 3 }),
    prisma.expense.aggregate({ where: { date: { gte: sevenDaysAgo } }, _sum: { amount: true } }),
    prisma.chore.count({ where: { lastDoneAt: { gte: sevenDaysAgo } } })
  ]);

  // Wir packen alle Daten in ein großes Objekt
  const dashboardData: DashboardData = {
    currentUser, allUsers, openShoppingItemsCount, pantryItems,
    energyReadings, energySettingsResult, contacts, nextTrip,
    upcomingEvents, weeklyExpensesAgg, choresDoneThisWeek
  };

  // DER MAGISCHE SWITCH:
  if (currentUser?.uiLayout === "MODERN") {
    return <DashboardModern data={dashboardData} currentUser={currentUser} />;
  }

  // Für Sophie (und als Standard)
  return <DashboardClassic data={dashboardData} currentUser={currentUser} />;
}