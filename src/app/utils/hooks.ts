// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types  */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { useState } from "react";

export function useLocalStorage<
  Type extends string | number | boolean | object
>(initialValue: Type, storageKey: string): [Type, (newValue: Type) => void] {
  const [currentValue, setCurrentValue] = useState<Type>(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (ex) {
      console.log(ex);
      return initialValue;
    }
  });

  const setValue = (value: Type) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
      setCurrentValue(value);
      return true;
    } catch (ex) {
      console.log(ex);

      return false;
    }
  };

  return [currentValue, setValue];
}
