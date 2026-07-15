import type { Request, Response } from "express";
import type { TaskEvent } from "./types.js";

export interface SSEClient {
  id: string;
  write(event: string, data: string): void;
  end(): void;
  onClose(handler: () => void): void;
}

class SSEClientImpl implements SSEClient {
  public readonly id: string;
  private res: Response;
  private closed: boolean = false;
  private closeHandlers: Array<() => void> = [];

  constructor(id: string, res: Response) {
    this.id = id;
    this.res = res;

    res.on("close", () => {
      this.closed = true;
      for (const handler of this.closeHandlers) {
        handler();
      }
    });
  }

  write(event: string, data: string): void {
    if (this.closed) return;
    this.res.write(`event: ${event}\ndata: ${data}\n\n`);
  }

  end(): void {
    if (this.closed) return;
    this.closed = true;
    this.res.end();
  }

  onClose(handler: () => void): void {
    this.closeHandlers.push(handler);
  }
}

export function createSSEClient(id: string, req: Request, res: Response): SSEClient {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Send initial connection event
  res.write(`event: connected\ndata: {"clientId":"${id}"}\n\n`);

  return new SSEClientImpl(id, res);
}

/**
 * Manages SSE connections for real-time task status push.
 * Handles per-task and per-novel subscriptions with cleanup on disconnect.
 */
export class TaskSSEManager {
  private taskConnections: Map<string, Set<SSEClient>> = new Map();
  private novelConnections: Map<string, Set<SSEClient>> = new Map();
  private clientTaskMap: Map<string, Set<string>> = new Map();

  private getOrCreate(map: Map<string, Set<SSEClient>>, key: string): Set<SSEClient> {
    const existing = map.get(key);
    if (existing) return existing;
    const set = new Set<SSEClient>();
    map.set(key, set);
    return set;
  }

  subscribeToTask(taskId: string, client: SSEClient): void {
    const clients = this.getOrCreate(this.taskConnections, taskId);
    clients.add(client);

    const tasks = this.getOrCreateClientTasks(client.id);
    tasks.add(taskId);

    client.onClose(() => {
      this.unsubscribeFromTask(taskId, client);
    });
  }

  subscribeToNovel(novelId: string, client: SSEClient): void {
    const clients = this.getOrCreate(this.novelConnections, novelId);
    clients.add(client);

    client.onClose(() => {
      this.unsubscribeFromNovel(novelId, client);
    });
  }

  private getOrCreateClientTasks(clientId: string): Set<string> {
    const existing = this.clientTaskMap.get(clientId);
    if (existing) return existing;
    const set = new Set<string>();
    this.clientTaskMap.set(clientId, set);
    return set;
  }

  private unsubscribeFromTask(taskId: string, client: SSEClient): void {
    const clients = this.taskConnections.get(taskId);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) {
        this.taskConnections.delete(taskId);
      }
    }
  }

  private unsubscribeFromNovel(novelId: string, client: SSEClient): void {
    const clients = this.novelConnections.get(novelId);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) {
        this.novelConnections.delete(novelId);
      }
    }
  }

  broadcastToTask(taskId: string, event: TaskEvent): void {
    const clients = this.taskConnections.get(taskId);
    if (!clients) return;

    const data = JSON.stringify(event);
    for (const client of clients) {
      client.write("task_update", data);
    }
  }

  broadcastToNovel(novelId: string, event: TaskEvent): void {
    const clients = this.novelConnections.get(novelId);
    if (!clients) return;

    const data = JSON.stringify(event);
    for (const client of clients) {
      client.write("task_update", data);
    }
  }

  getConnectionCount(taskId?: string): number {
    if (taskId) {
      return this.taskConnections.get(taskId)?.size ?? 0;
    }
    let total = 0;
    for (const clients of this.taskConnections.values()) {
      total += clients.size;
    }
    return total;
  }
}

export const taskSSEManager = new TaskSSEManager();
