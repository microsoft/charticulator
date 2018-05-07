class ElementInfo {
    element: Element;
    previousWidth: number;
    previousHeight: number;
    currentID: number;
    callbacks: Map<number, () => void>;

    constructor(element: Element) {
        let rect = element.getBoundingClientRect();
        this.previousWidth = rect.width;
        this.previousHeight = rect.height;
        this.currentID = 0;
        this.callbacks = new Map<number, () => void>();
        this.element = element;
    }

    public addCallback(cb: () => void) {
        this.currentID += 1;
        this.callbacks.set(this.currentID, cb);
        return this.currentID;
    }

    public removeCallback(handle: number) {
        this.callbacks.delete(handle);
    }

    public timerCallback() {
        let rect = this.element.getBoundingClientRect();
        if (rect.width != this.previousWidth || rect.height != this.previousHeight) {
            this.previousWidth = rect.width;
            this.previousHeight = rect.height;
            this.callbacks.forEach((cb, e) => {
                cb();
            });
        }
    }
}

export class ResizeListeners {
    private timer: number;
    private entries = new Map<Element, ElementInfo>();

    constructor() {
        this.timer = setInterval(this.timerCallback.bind(this), 200);
    }

    public addListener(element: Element, callback: () => void) {
        if (this.entries.has(element)) {
            return this.entries.get(element).addCallback(callback);
        } else {
            let info = new ElementInfo(element);
            this.entries.set(element, info);
            return info.addCallback(callback);
        }
    }

    public removeListener(element: Element, handle: number) {
        if (this.entries.has(element)) {
            let info = this.entries.get(element);
            info.removeCallback(handle);
            if (info.callbacks.size == 0) {
                this.entries.delete(element);
            }
        }
    }

    private timerCallback() {
        for (let [element, info] of this.entries) {
            info.timerCallback();
        }
    }
}