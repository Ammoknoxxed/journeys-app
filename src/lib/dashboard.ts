import type {
  EnergyReading,
  EnergySettings,
  PantryItem,
  SharedContact,
  TimelineEvent,
  Trip,
  User,
} from "@prisma/client";

export type DashboardData = {
  currentUser: User | null;
  allUsers: User[];
  openShoppingItemsCount: number;
  pantryItems: PantryItem[];
  energyReadings: EnergyReading[];
  energySettingsResult: EnergySettings | null;
  contacts: SharedContact[];
  nextTrip: Trip | null;
  upcomingEvents: TimelineEvent[];
  weeklyExpensesAgg: { _sum: { amount: number | null } };
  choresDoneThisWeek: number;
};

export type DashboardProps = {
  currentUser: User | null;
  data: DashboardData;
};
