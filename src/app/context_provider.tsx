// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { createContext } from "React";
import { MainContextInterface } from "./context_component";

export const MainContext = createContext<MainContextInterface>(null);
