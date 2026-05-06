import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Heart,
  LayoutDashboard,
  Lock,
  Map,
  PieChart,
  Plane,
  ShoppingCart,
  Shield,
  TrendingUp,
  Utensils,
  Wifi,
} from "lucide-react";

export type AppLink = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type AppSection = {
  title: string;
  links: AppLink[];
};

export const APP_SECTIONS: AppSection[] = [
  {
    title: "Heute",
    links: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Shopping", href: "/shopping", icon: ShoppingCart },
      { title: "Putzplan", href: "/chores", icon: CheckCircle2 },
      { title: "Timeline", href: "/timeline", icon: Calendar },
    ],
  },
  {
    title: "Planung",
    links: [
      { title: "Meal Prep", href: "/mealprep", icon: Utensils },
      { title: "Weltkarte", href: "/map", icon: Map },
      { title: "Trips", href: "/trips", icon: Plane },
      { title: "Date-Ideen", href: "/roulette", icon: Heart },
      { title: "Statistik", href: "/statistics", icon: PieChart },
    ],
  },
  {
    title: "Mehr",
    links: [
      { title: "Abos", href: "/subscriptions", icon: TrendingUp },
      { title: "Gäste", href: "/guests", icon: Wifi },
      { title: "Geschenke", href: "/gifts", icon: Lock },
      { title: "Tresor", href: "/vault", icon: Shield },
      { title: "Wiki", href: "/wiki", icon: BookOpen },
    ],
  },
];
