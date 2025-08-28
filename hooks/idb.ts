import { openDB, DBSchema } from 'idb';

interface MyDB extends DBSchema {
  'keyval': {
    key: string;
    value: any;
  };
}

const dbPromise = openDB<MyDB>('ysk-sales-db', 1, {
  upgrade(db) {
    db.createObjectStore('keyval');
  },
});

export async function get<T>(key: string): Promise<T | undefined> {
  return (await dbPromise).get('keyval', key);
}

export async function set(key: string, val: any): Promise<void> {
  await (await dbPromise).put('keyval', val, key);
}

export async function del(key: string): Promise<void> {
  await (await dbPromise).delete('keyval', key);
}

export async function clear(): Promise<void> {
  await (await dbPromise).clear('keyval');
}

export async function keys(): Promise<string[]> {
  const allKeys = await (await dbPromise).getAllKeys('keyval');
  return allKeys.map(key => String(key));
}