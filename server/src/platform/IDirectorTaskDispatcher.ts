/**
 * Abstract interface for task dispatch notifications.
 *
 * Defined in platform/ to break the circular dependency between
 * services/novel/director/commands/ and workers/.
 *
 * Concrete implementation lives in workers/TaskDispatcher.ts;
 * DI wiring happens at the startup entry point (workers/ or app.ts).
 */
export interface IDirectorTaskDispatcher {
  notify(hint?: { commandType?: string; taskId?: string }): void;
}
