import { TaskScheduler } from "../TaskScheduler";

/**
 * Global TaskScheduler instance used by HTTP routes.
 * The onExecuteChapter callback is injected by the consumer
 * (e.g., the novel pipeline executor).
 */
export const taskScheduler = new TaskScheduler();

/**
 * Configure the execute callback for the global scheduler.
 */
export function configureTaskScheduler(
  onExecuteChapter: (novelId: string, chapterIndex: number) => Promise<void>,
): void {
  (taskScheduler as unknown as Record<string, unknown>).onExecuteChapter = onExecuteChapter;
}
