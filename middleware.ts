import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/sign-in", "/sign-up", "/"],
  ignoredRoutes: ["/api/webhooks/clerk"],
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};

