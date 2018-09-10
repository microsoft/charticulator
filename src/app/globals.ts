// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Actions } from "./actions";
import {
  DragController,
  PopupController,
  ResizeListeners
} from "./controllers";
import { MainStore } from "./stores";

import { IndexedDBBackend } from "./backend/indexed_db";

export let dragController = new DragController();
export let popupController = new PopupController();
export let resizeListeners = new ResizeListeners();
