// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
function s4() {
  // eslint-disable-next-line
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
  // eslint-disable-next-line
  while (true) {
    // eslint-disable-next-line
    const id = Math.random().toString(36).substr(2);
    if (!usedIDs.has(id)) {
      usedIDs.add(id);
      return id;
    }
  }
}

let hashIndex = 1;
const objectHashes = new WeakMap<Record<string, never>, string>();

export function objectHash(o: Record<string, never>): string {
  if (objectHashes.has(o)) {
    return objectHashes.get(o);
  }
  const newHash = `<#${hashIndex.toString()}>`;
  hashIndex += 1;
  objectHashes.set(o, newHash);
  return newHash;
}
