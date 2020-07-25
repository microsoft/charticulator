// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { EventEmitter } from "../../../../core";

import {
  Specification,
  Prototypes,
  ZoomInfo
} from "../../../../core";

export interface HandlesDragEvent {
  [name: string]: Specification.AttributeValue;
}

export class HandlesDragContext extends EventEmitter {
  public onDrag(listener: (e: HandlesDragEvent) => void) {
    return this.addListener("drag", listener);
  }
  public onEnd(listener: (e: HandlesDragEvent) => void) {
    return this.addListener("end", listener);
  }
}

export interface HandleViewProps {
  zoom: ZoomInfo;
  active?: boolean;
  visible?: boolean;
  snapped?: boolean;
  onDragStart?: (
    handle: Prototypes.Handles.Description,
    ctx: HandlesDragContext
  ) => void;
}
