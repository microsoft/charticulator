import { ItemMetadata, ItemDescription, ItemData, AbstractBackend } from "./abstract";

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

export function uuid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

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
                let request = indexedDB.open(this.databaseName, 2);
                request.onupgradeneeded = () => {
                    this.database = request.result;
                    let itemsStore = this.database.createObjectStore("items", { keyPath: "id" });
                    itemsStore.createIndex("TypeIndex", "type");
                    itemsStore.createIndex("DataIDIndex", "dataID");
                    itemsStore.createIndex("NameIndex", "metadata.name");
                    itemsStore.createIndex("TimeCreatedIndex", "metadata.timeCreated");
                    itemsStore.createIndex("TimeModifiedIndex", "metadata.timeModified");
                    let dataStore = this.database.createObjectStore("data", { keyPath: "id" });
                };
                request.onerror = () => {
                    reject(new Error("could not open database"));
                };
                request.onsuccess = (e) => {
                    this.database = request.result;
                    resolve();
                }
            }
        });
    }

    public list(type: string, orderBy: string = "timeCreated", start: number = 0, count: number = 50): Promise<{ items: ItemDescription[], totalCount: number }> {
        return this.open().then(() =>
            new Promise<{ items: ItemDescription[], totalCount: number }>((resolve, reject) => {
                let tx = this.database.transaction("items", "readonly");
                let store = tx.objectStore("items");
                let request = store.index("TypeIndex").openCursor(type);
                let result: ItemDescription[] = [];
                request.onsuccess = () => {
                    let cursor = request.result as IDBCursorWithValue;
                    if (cursor) {
                        let value = cursor.value as ItemDescription;
                        result.push(value);
                        cursor.continue();
                    } else {
                        let resultFiltered = result.sort((a, b) => (b.metadata[orderBy] as number) - (a.metadata[orderBy] as number));
                        resultFiltered = resultFiltered.slice(start, start + count);
                        resolve({
                            items: resultFiltered,
                            totalCount: result.length
                        });
                    }
                }
                request.onerror = () => {
                    reject(new Error("could not read from the database"));
                }
            })
        );
    }

    public get(id: string): Promise<ItemData> {
        return this.open().then(() =>
            new Promise<ItemData>((resolve, reject) => {
                let tx = this.database.transaction(["items", "data"], "readonly");
                let itemsStore = tx.objectStore("items");
                let dataStore = tx.objectStore("data");
                let request = itemsStore.get(id);
                request.onsuccess = () => {
                    let item = request.result;
                    let request2 = dataStore.get(item.dataID);
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
        return this.open().then(() =>
            new Promise<void>((resolve, reject) => {
                let tx = this.database.transaction(["items", "data"], "readwrite");
                let itemsStore = tx.objectStore("items");
                let dataStore = tx.objectStore("data");
                let req1 = itemsStore.get(id);
                req1.onerror = () => {
                    reject(new Error("could not write to the database"));
                };
                req1.onsuccess = () => {
                    let original: ItemData = req1.result;
                    metadata.timeCreated = original.metadata.timeCreated;
                    metadata.timeModified = new Date().getTime();
                    let obj = {
                        id: id,
                        dataID: req1.result.dataID,
                        type: original.type,
                        metadata: metadata
                    };
                    let dataObj = {
                        id: req1.result.dataID,
                        data: data
                    };
                    dataStore.put(dataObj);
                    itemsStore.put(obj);
                    tx.oncomplete = () => {
                        resolve();
                    };
                    tx.onerror = () => {
                        reject(new Error("could not write to the database"));
                    };
                }
            })
        );
    }

    public create(type: string, data: any, metadata?: ItemMetadata): Promise<string> {
        return this.open().then(() =>
            new Promise<string>((resolve, reject) => {
                let tx = this.database.transaction(["items", "data"], "readwrite");
                let itemsStore = tx.objectStore("items");
                let dataStore = tx.objectStore("data");
                metadata.timeCreated = new Date().getTime();
                metadata.timeModified = metadata.timeCreated;
                let obj = {
                    id: uuid(),
                    dataID: uuid(),
                    type: type,
                    metadata: metadata
                };
                let dataObj = {
                    id: obj.dataID,
                    data: data
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
        return this.open().then(() =>
            new Promise<void>((resolve, reject) => {
                let tx = this.database.transaction(["items", "data"], "readwrite");
                let itemsStore = tx.objectStore("items");
                let dataStore = tx.objectStore("data");
                let request = itemsStore.get(id);
                request.onsuccess = () => {
                    let dataID = request.result.dataID;
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


// export function test() {
//     let backend = new IndexedDBBackend();
//     backend.open().then(() => {
//         backend.listContent("test", "timeCreated", 0, 10).then((result) => {
//             console.log(result);
//         });
//         backend.putContent("test", { a: 10, b: 20, t: new Date().getTime() }, { name: "MyName" }, true).then((id) => {
//             console.log(id);
//             backend.getContent(id).then((content) => {
//                 console.log(id, content);
//             });
//         });
//     });
// }