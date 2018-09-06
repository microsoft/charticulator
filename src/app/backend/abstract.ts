/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
export interface ItemMetadata {
  [name: string]: string | number | boolean;
  name?: string;
  timeCreated?: number;
  timeModified?: number;
}

export interface ItemDescription {
  id: string;
  type: string;
  metadata: ItemMetadata;
}

export interface ItemData extends ItemDescription {
  data: any;
}

export abstract class AbstractBackend {
  public abstract list(
    type: string,
    orderBy?: string,
    start?: number,
    count?: number
  ): Promise<{ items: ItemDescription[]; totalCount: number }>;
  public abstract get(id: string): Promise<ItemData>;
  public abstract create(
    type: string,
    data: any,
    metadata?: ItemMetadata
  ): Promise<string>;
  public abstract put(
    id: string,
    data: any,
    metadata?: ItemMetadata
  ): Promise<void>;
  public abstract delete(id: string): Promise<void>;
}
