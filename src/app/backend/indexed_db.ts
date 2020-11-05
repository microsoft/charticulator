// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ItemData, ItemDescription, ItemMetadata } from "./abstract";

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

export function uuid() {
  return (
    s4() +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    s4() +
    s4()
  );
}

/** Responsible to manage saving, loading, storing charts created by user in IndexedDB of the browser */
export class IndexedDBBackend {
  private databaseName: string;
  private database: IDBDatabase;

  constructor(db: string = "charticulator") {
    this.databaseName = db;
    this.database = null;
  }

  public open(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.database) {
        resolve();
      } else {
        const request = indexedDB.open(this.databaseName, 2);
        request.onupgradeneeded = () => {
          this.database = request.result;
          const itemsStore = this.database.createObjectStore("items", {
            keyPath: "id",
          });
          itemsStore.createIndex("TypeIndex", "type");
          itemsStore.createIndex("DataIDIndex", "dataID");
          itemsStore.createIndex("NameIndex", "metadata.name");
          itemsStore.createIndex("TimeCreatedIndex", "metadata.timeCreated");
          itemsStore.createIndex("TimeModifiedIndex", "metadata.timeModified");
          const dataStore = this.database.createObjectStore("data", {
            keyPath: "id",
          });
        };
        request.onerror = () => {
          reject(new Error("could not open database"));
        };
        request.onsuccess = (e) => {
          this.database = request.result;
          resolve();
        };
      }
    });
  }

  public list(
    type: string,
    orderBy: string = "timeCreated",
    start: number = 0,
    count: number = 50
  ): Promise<{ items: ItemDescription[]; totalCount: number }> {
    return this.open().then(
      () =>
        new Promise<{ items: ItemDescription[]; totalCount: number }>(
          (resolve, reject) => {
            const tx = this.database.transaction("items", "readonly");
            const store = tx.objectStore("items");
            const request = store.index("TypeIndex").openCursor(type);
            const result: ItemDescription[] = [];
            request.onsuccess = () => {
              const cursor = request.result as IDBCursorWithValue;
              if (cursor) {
                const value = cursor.value as ItemDescription;
                result.push(value);
                cursor.continue();
              } else {
                let resultFiltered = result.sort(
                  (a, b) =>
                    (b.metadata[orderBy] as number) -
                    (a.metadata[orderBy] as number)
                );
                resultFiltered = resultFiltered.slice(start, start + count);
                resolve({
                  items: resultFiltered,
                  totalCount: result.length,
                });
              }
            };
            request.onerror = () => {
              reject(new Error("could not read from the database"));
            };
          }
        )
    );
  }

  public get(id: string): Promise<ItemData> {
    return this.open().then(
      () =>
        new Promise<ItemData>((resolve, reject) => {
          const tx = this.database.transaction(["items", "data"], "readonly");
          const itemsStore = tx.objectStore("items");
          const dataStore = tx.objectStore("data");
          const request = itemsStore.get(id);
          request.onsuccess = () => {
            const item = request.result;
            const request2 = dataStore.get(item.dataID);
            request2.onsuccess = () => {
              item.data = request2.result.data;
              resolve(item);
            };
            request2.onerror = () => {
              reject(new Error("could not read from the database"));
            };
          };
          request.onerror = () => {
            reject(new Error("could not read from the database"));
          };
        })
    );
  }

  public put(id: string, data: any, metadata?: ItemMetadata): Promise<void> {
    return this.open().then(
      () =>
        new Promise<void>((resolve, reject) => {
          const tx = this.database.transaction(["items", "data"], "readwrite");
          const itemsStore = tx.objectStore("items");
          const dataStore = tx.objectStore("data");
          const req1 = itemsStore.get(id);
          req1.onerror = () => {
            reject(new Error("could not write to the database"));
          };
          req1.onsuccess = () => {
            const original: ItemData = req1.result;
            metadata.timeCreated = original.metadata.timeCreated;
            metadata.timeModified = new Date().getTime();
            const obj = {
              id,
              dataID: req1.result.dataID,
              type: original.type,
              metadata,
            };
            const dataObj = {
              id: req1.result.dataID,
              data,
            };
            dataStore.put(dataObj);
            itemsStore.put(obj);
            tx.oncomplete = () => {
              resolve();
            };
            tx.onerror = () => {
              reject(new Error("could not write to the database"));
            };
          };
        })
    );
  }

  public create(
    type: string,
    data: any,
    metadata?: ItemMetadata
  ): Promise<string> {
    return this.open().then(
      () =>
        new Promise<string>((resolve, reject) => {
          const tx = this.database.transaction(["items", "data"], "readwrite");
          const itemsStore = tx.objectStore("items");
          const dataStore = tx.objectStore("data");
          metadata.timeCreated = new Date().getTime();
          metadata.timeModified = metadata.timeCreated;
          const obj = {
            id: uuid(),
            dataID: uuid(),
            type,
            metadata,
          };
          const dataObj = {
            id: obj.dataID,
            data,
          };
          dataStore.put(dataObj);
          itemsStore.put(obj);
          tx.oncomplete = () => {
            resolve(obj.id);
          };
          tx.onerror = () => {
            reject(new Error("could not write to the database"));
          };
        })
    );
  }

  public delete(id: string): Promise<void> {
    return this.open().then(
      () =>
        new Promise<void>((resolve, reject) => {
          const tx = this.database.transaction(["items", "data"], "readwrite");
          const itemsStore = tx.objectStore("items");
          const dataStore = tx.objectStore("data");
          const request = itemsStore.get(id);
          request.onsuccess = () => {
            const dataID = request.result.dataID;
            itemsStore.delete(id);
            dataStore.delete(dataID);
            tx.oncomplete = () => {
              resolve();
            };
            tx.onerror = () => {
              reject(new Error("could not write to the database"));
            };
          };
          request.onerror = () => {
            reject(new Error("could not write to the database"));
          };
        })
    );
  }
}
