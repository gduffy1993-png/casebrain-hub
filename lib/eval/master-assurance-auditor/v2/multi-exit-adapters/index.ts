/**
 * MAA V2 multi-exit adapter foundation.
 *
 * Owns only adapter-specific schemas, capability checks, receipt validators,
 * and positive/negative/unavailable contracts for:
 *   view | copy | export | api | pdf | composed_prose | authenticated_browser
 *
 * Does not edit the central detector registry, readiness gate, or live application.
 * No freeze / run / merge / deploy / PASS.
 */

export * from "./schemas";
export * from "./registry";
export * from "./capability";
export * from "./receipts";
export * from "./contracts";
