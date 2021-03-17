// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/** The page side of the work instance, handles RPC and Tasks */

export class WorkerRPC {
  private worker: Worker;
  private currentUniqueID: number = 0;
  private idCallbacks = new Map<string, (message: any) => void>();

  constructor(workerScriptURL: string) {
    this.worker = new Worker(workerScriptURL);
    this.worker.onmessage = (event) => {
      const msg = event.data;
      if (this.idCallbacks.has(msg.instanceID)) {
        this.idCallbacks.get(msg.instanceID)(msg);
      } else {
      }
    };
  }

  private newUniqueID() {
    this.currentUniqueID += 1;
    return "ID" + this.currentUniqueID;
  }

  public rpc(path: string, ...args: any[]): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const msgID = this.newUniqueID();
      this.idCallbacks.set(msgID, (message) => {
        if (message.type == "rpc-result") {
          this.idCallbacks.delete(msgID);
          resolve(message.returnValue);
        }
        if (message.type == "rpc-error") {
          this.idCallbacks.delete(msgID);
          reject(new Error(message.errorMessage));
        }
      });
      this.worker.postMessage({
        type: "rpc-call",
        instanceID: msgID,
        path,
        args,
      });
    });
  }
}

/** The host process */
export class WorkerHostProcess {
  private rpcMethods = new Map<string, Function>();

  constructor() {
    onmessage = (event) => {
      const message = event.data;
      this.handleMessage(message, event);
    };
  }

  public registerRPC(path: string, method: Function) {
    this.rpcMethods.set(path, method);
  }

  private handleMessage(message: any, event: MessageEvent) {
    switch (message.type) {
      case "rpc-call":
        {
          try {
            const method = this.rpcMethods.get(message.path);
            if (!method) {
              postMessage(
                {
                  type: "rpc-error",
                  instanceID: message.instanceID,
                  errorMessage: `RPC method "${message.path}" not found`,
                },
                undefined
              );
            } else {
              const result = method(...message.args);
              if (result instanceof Promise) {
                result
                  .then((returnValue) => {
                    postMessage(
                      {
                        type: "rpc-result",
                        instanceID: message.instanceID,
                        returnValue,
                      },
                      undefined
                    );
                  })
                  .catch((error) => {
                    postMessage(
                      {
                        type: "rpc-error",
                        instanceID: message.instanceID,
                        errorMessage: error.message + "\n" + error.stack,
                      },
                      undefined
                    );
                  });
              } else {
                postMessage(
                  {
                    type: "rpc-result",
                    instanceID: message.instanceID,
                    returnValue: result,
                  },
                  undefined
                );
              }
            }
          } catch (e) {
            postMessage(
              {
                type: "rpc-error",
                instanceID: message.instanceID,
                errorMessage: e.message + "\n" + e.stack,
              },
              undefined
            );
          }
        }
        break;
    }
  }
}
