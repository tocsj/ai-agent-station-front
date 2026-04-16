export const makeSessionId = (scene: string, bizId: string | number) => `${scene}-${bizId}-${Date.now()}`;

export const readStorageJson = <T,>(key: string, storage: Storage = sessionStorage): T | null => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const writeStorageJson = (key: string, value: unknown, storage: Storage = sessionStorage) => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage write failures
  }
};

export const removeStorageValue = (key: string, storage: Storage = sessionStorage) => {
  try {
    storage.removeItem(key);
  } catch {
    // ignore storage remove failures
  }
};

export const createPollingController = (callback: () => void | Promise<void>, intervalMs = 3000) => {
  let timer: number | null = null;

  return {
    start() {
      if (timer !== null) return;
      timer = window.setInterval(() => {
        void callback();
      }, intervalMs);
    },
    stop() {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
    },
  };
};
