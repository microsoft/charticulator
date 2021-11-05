// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export class HistoryManager<StateType> {
  public statesBefore: StateType[] = [];
  public statesAfter: StateType[] = [];

  public addState(state: StateType) {
    this.statesAfter = [];
    this.statesBefore.push(state);
  }

  public undo(currentState: StateType): StateType {
    if (this.statesBefore.length > 0) {
      const item = this.statesBefore.pop();
      this.statesAfter.push(currentState);
      return item;
    } else {
      return null;
    }
  }

  public redo(currentState: StateType): StateType {
    if (this.statesAfter.length > 0) {
      const item = this.statesAfter.pop();
      this.statesBefore.push(currentState);
      return item;
    } else {
      return null;
    }
  }

  public clear() {
    this.statesAfter = [];
    this.statesBefore = [];
  }

  public getState() {
    return {
      statesAfter: this.statesAfter,
      statesBefore: this.statesBefore,
    };
  }

  public setState(statesAfter: StateType[], statesBefore: StateType[]) {
    this.statesAfter = statesAfter;
    this.statesBefore = statesBefore;
  }
}
