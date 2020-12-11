import { useState, useEffect } from 'react';

export function useLocalStorage<Type extends string | number | boolean | object> (initialValue: Type, storageKey: string): [Type, (newValue: Type) => void] {
    const storedValue = localStorage.getItem(storageKey);
    const [currentValue, setCurrentValue] = useState<Type>(initialValue);

    const convert = (storedValue: string) => {
        try {
            const parsedJson = JSON.parse(storedValue);
            if (parsedJson) {
                return parsedJson;
            }
        } catch (error) {
            
        }

        try {
            const parsedFloat = Number.parseFloat(storedValue);
            if (parsedFloat) {
                return parsedFloat;
            }
        } catch (error) {
            
        }
    }

    useEffect(() => {
        if (!storedValue) {
            localStorage.setItem(storageKey, JSON.stringify(currentValue));
        }
        setCurrentValue(storedValue as any);
    })

    return [
        storedValue ? convert(storedValue) : initialValue,
        (newValue: Type) => {
            localStorage.setItem(storageKey, JSON.stringify(newValue));
            setCurrentValue(newValue);
        }
    ]

}