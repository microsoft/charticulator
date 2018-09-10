// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
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

const usedIDs = new Set<string>();
/** Generate a unique ID in uuid format */
export function uniqueID(): string {
  while (true) {
    const id = Math.random()
      .toString(36)
      .substr(2);
    if (!usedIDs.has(id)) {
      usedIDs.add(id);
      return id;
    }
  }
}

let hashIndex = 1;
const objectHashs = new WeakMap<Object, string>();

export function objectHash(o: Object): string {
  if (objectHashs.has(o)) {
    return objectHashs.get(o);
  }
  const newHash = `<#${hashIndex.toString()}>`;
  hashIndex += 1;
  objectHashs.set(o, newHash);
  return newHash;
}
