/**
 * Facade for novelCoreShared — re-exports everything from split modules.
 *
 * This preserves backward compatibility: all existing imports from
 * "./novelCoreShared" continue to work unchanged.
 */
export * from "./novelCoreSharedTypes";
export * from "./novelCoreSharedSerialization";
export * from "./novelCoreSharedHelpers";
