/**
 * Stub factories for Electron modules used in desktop tests.
 *
 * These stubs implement the minimal interface needed by production code.
 * They are designed for dependency-injection testing — do NOT import actual
 * `electron` modules in test files. Instead, create stubs here and pass
 * them as constructor arguments or function parameters.
 *
 * Usage:
 *   import { createBrowserWindowStub } from "./helpers/electronStubs.js";
 *   const win = createBrowserWindowStub();
 */

/** Create a stub that satisfies the BrowserWindow shape used in production code. */
export function createBrowserWindowStub(overrides = {}) {
  const listeners = {};

  const window = {
    webContents: {
      send: () => {},
      on: (event, listener) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(listener);
        return window.webContents;
      },
      once: (event, listener) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(listener);
        return window.webContents;
      },
    },
    loadURL: async () => {},
    loadFile: async () => {},
    show: () => {},
    hide: () => {},
    close: () => {},
    destroy: () => {},
    focus: () => {},
    restore: () => {},
    isDestroyed: () => false,
    isMinimized: () => false,
    on: (event, listener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(listener);
      return window;
    },
    once: (event, listener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(listener);
      return window;
    },
    _emit: (event, ...args) => {
      for (const fn of listeners[event] || []) fn(...args);
    },
    ...overrides,
  };

  return window;
}

/** Create a stub that satisfies the App shape used in production code. */
export function createAppStub(overrides = {}) {
  const listeners = {};

  return {
    isPackaged: false,
    quit: () => {},
    exit: () => {},
    relaunch: () => {},
    setPath: () => {},
    setAppUserModelId: () => {},
    requestSingleInstanceLock: () => true,
    getVersion: () => "0.0.0-test",
    whenReady: async () => {},
    on: (event, listener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(listener);
      return app;
    },
    _emit: (event, ...args) => {
      for (const fn of listeners[event] || []) fn(...args);
    },
    ...overrides,
  };
}

const app = createAppStub();
