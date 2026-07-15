import { TaskScheduler } from "../TaskScheduler";

/**
 * Global TaskScheduler instance used by HTTP routes.
 * The onExecuteChapter callback is injected by the consumer
 * (e.g., the novel pipeline executor).
 */
export const taskScheduler = new TaskScheduler();
