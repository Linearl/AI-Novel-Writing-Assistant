/**
 * Stub factory for electron-updater's autoUpdater.
 *
 * Creates a minimal EventEmitter-based mock that simulates the
 * autoUpdater interface for testing updater.ts logic.
 *
 * Usage:
 *   import { createAutoUpdaterStub } from "./helpers/updaterMock.js";
 *   const stub = createAutoUpdaterStub();
 *   // Register event listeners, then trigger them:
 *   stub._emit("update-available", { version: "1.2.3" });
 */

import { EventEmitter } from "node:events";

export function createAutoUpdaterStub() {
  const emitter = new EventEmitter();

  const stub = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowDowngrade: true,
    allowPrerelease: false,

    on: (event: string, listener: (...args: unknown[]) => void) => {
      emitter.on(event, listener);
      return stub;
    },

    downloadUpdate: async (): Promise<string[]> => {
      return [];
    },

    checkForUpdates: async (): Promise<unknown> => {
      return {};
    },

    quitAndInstall: (_isSilent?: boolean, _isForceRunAfter?: boolean): void => {},

    _emit: (event: string, ...args: unknown[]): void => {
      emitter.emit(event, ...args);
    },
  };

  return stub;
}
