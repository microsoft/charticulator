import { deepClone, uniqueID } from "../common";
import { VariableStrength } from "../solver";
import * as Specification from "../specification";

import { TemplateParameters } from ".";
import { Controls, CreatingInteraction } from "./common";

export interface AttributeDescription {
  name: string;
  type: string;

  mode?: "intrinsic" | "positional";

  /** Deprecated: Variable strength */
  strength?: VariableStrength;

  /** Exclude this from the constraint solver */
  solverExclude?: boolean;
  stateExclude?: boolean;

  /** Display category */
  category?: string;
  /** Display name */
  displayName?: string;

  /** Default value: used when nothing is specified for this attribute */
  defaultValue?: Specification.AttributeValue;

  /** Default range: hint for scale inference */
  defaultRange?: Specification.AttributeValue[];
}

export interface ObjectClassMetadata {
  /** Display name of the object */
  displayName?: string;
  /** Object icon resource */
  iconPath?: string;

  /** Create by mouse interaction */
  creatingInteraction?: CreatingInteraction.Description;
}

/** A ObjectClass contains the runtime info for a chart object */
export abstract class ObjectClass {
  /** The static classID */
  public static classID: string = "object";
  /** The static type */
  public static type: string = null;

  /** The metadata associated with the class */
  public static metadata: ObjectClassMetadata = {};

  /** Default attributes */
  public static defaultProperties: Specification.AttributeMap = {};

  /** Default mapping values */
  public static defaultMappingValues: Specification.AttributeMap = {};

  /** The stored object */
  public readonly object: Specification.Object;
  /** The stored object state */
  public readonly state: Specification.ObjectState;
  /** The parent object class */
  public readonly parent: ObjectClass;

  /** Attribute names */
  public attributeNames: string[];
  /** Attribute descriptions */
  public attributes: { [name: string]: AttributeDescription };

  constructor(
    parent: ObjectClass,
    object: Specification.Object,
    state: Specification.ObjectState
  ) {
    this.parent = parent;
    this.object = object;
    this.state = state;
  }

  /** Initialize the state of the object */
  public initializeState() {}

  /** Get the UI spec for property panel */
  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    // By default, we create the attribute controls based on attribute descriptions
    const widgets: Controls.Widget[] = [];
    for (const attr of this.attributeNames) {
      widgets.push(manager.mappingEditorTOFIX(attr));
    }
    return widgets;
  }

  public getTemplateParameters(): TemplateParameters {
    return null;
  }

  /** Create a default object */
  public static createDefault(...args: any[]): Specification.Object {
    const id = uniqueID();
    const obj: Specification.Object = {
      _id: id,
      classID: this.classID,
      properties: {},
      mappings: {}
    };
    obj.properties = deepClone(this.defaultProperties);
    for (const attr in this.defaultMappingValues) {
      if (this.defaultMappingValues.hasOwnProperty(attr)) {
        const value = deepClone(this.defaultMappingValues[attr]);
        obj.mappings[attr] = {
          type: "value",
          value
        } as Specification.ValueMapping;
      }
    }
    return obj;
  }
}

/** ObjectClass constructor */
export interface ObjectClassConstructor {
  new (
    parent: ObjectClass,
    object: Specification.Object,
    state: Specification.ObjectState
  ): ObjectClass;

  classID: string;
  type: string;
  metadata: ObjectClassMetadata;

  defaultProperties: Specification.AttributeMap;
  defaultMappingValues: Specification.AttributeMap;

  createDefault: (...args: any[]) => Specification.Object;
}

/** Store the registered object classes */
export class ObjectClasses {
  private static registeredObjectClasses = new Map<
    string,
    ObjectClassConstructor
  >();
  private static type2Parents = new Map<string, string[]>();

  /** Create a ObjectClass for a object and its state */
  public static Create(
    parent: ObjectClass,
    object: Specification.Object,
    state: Specification.ObjectState
  ): ObjectClass {
    const constructor = ObjectClasses.registeredObjectClasses.get(
      object.classID
    );
    if (!constructor) {
      throw new Error(`undefined object class '${object.classID}'`);
    }
    return new constructor(parent, object, state);
  }

  public static CreateDefault(classID: string, ...args: any[]) {
    const constructor = ObjectClasses.registeredObjectClasses.get(classID);
    const obj = constructor.createDefault(...args);
    return obj;
  }

  public static GetMetadata(classID: string): ObjectClassMetadata {
    const constructor = ObjectClasses.registeredObjectClasses.get(classID);
    if (constructor) {
      return constructor.metadata || null;
    } else {
      return null;
    }
  }

  public static Register(constructor: ObjectClassConstructor) {
    ObjectClasses.registeredObjectClasses.set(constructor.classID, constructor);
    if (constructor.type != null) {
      ObjectClasses.RegisterType(constructor.classID, constructor.type);
    }
  }

  public static RegisterType(name: string, ...parents: string[]) {
    ObjectClasses.type2Parents.set(name, parents);
  }

  public static isType(type: string, parentType: string): boolean {
    if (type == parentType) {
      return true;
    }
    const parents = ObjectClasses.type2Parents.get(type);
    if (parents != null) {
      return parents.some(t => ObjectClasses.isType(t, parentType));
    } else {
      return false;
    }
  }
}

export let isType = ObjectClasses.isType;
