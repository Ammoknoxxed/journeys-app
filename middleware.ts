export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/shopping/:path*",
    "/statistics/:path*",
    "/map/:path*",
    "/trips/:path*",
    "/mealprep/:path*",
    "/smarthome/:path*",
    "/subscriptions/:path*",
    "/timeline/:path*",
    "/chores/:path*",
    "/wiki/:path*",
    "/vault/:path*",
    "/gifts/:path*",
    "/roulette/:path*",
    "/checkin/:path*",
    "/profile/:path*",
  ],
};
