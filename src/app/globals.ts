import { Actions } from "./actions";
import {
  DragController,
  PopupController,
  ResizeListeners
} from "./controllers";
import { MainStore } from "./stores";

import { IndexedDBBackend } from "./backend/indexedDB";

export let dragController = new DragController();
export let popupController = new PopupController();
export let resizeListeners = new ResizeListeners();
