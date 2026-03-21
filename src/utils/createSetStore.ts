

export interface CreateSetStoreProps<T> {
  add: (value: T) => void;
  clear: () => void;
  get: () => Set<T>;
}

function createSetStore<T>(): CreateSetStoreProps<T> {
  const set = new Set<T>();

  return {
    add: (value: T) => set.add(value),
    clear: () => set.clear(),
    get: () => set,
  };
}

export default createSetStore;