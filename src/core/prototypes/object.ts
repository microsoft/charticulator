// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { deepClone, uniqueID } from "../common";
import * as Specification from "../specification";

import { TemplateParameters } from ".";
import { Controls, CreatingInteraction } from "./common";
import { MappingType } from "../specification";
import { strings } from "../../strings";

export interface AttributeDescription {
  name: string;
  type: Specification.AttributeType;

  /** Exclude this from the constraint solver */
  solverExclude?: boolean;
  stateExclude?: boolean;
  editableInGlyphStage?: boolean;

  /** Default value: used when nothing is specified for this attribute */
  defaultValue?: Specification.AttributeValue;

  /** Default range: hint for scale inference */
  defaultRange?: Specification.AttributeValue[];
}

export interface AttributeDescriptions {
  [name: string]: AttributeDescription;
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
export abstract class ObjectClass<
  PropertiesType extends Specification.AttributeMap = Specification.AttributeMap,
  AttributesType extends Specification.AttributeMap = Specification.AttributeMap
> {
  /** The static classID */
  public static classID: string = "object";
  /** The static type */
  public static type: string = null;

  /** The metadata associated with the class */
  public static metadata: ObjectClassMetadata = {};

  /** Default attributes */
  public static defaultProperties: Specification.AttributeMap = {
    enableTooltips: true,
    enableContextMenu: true,
    enableSelection: true,
    exposed: true,
  };

  /** Default mapping values */
  public static defaultMappingValues: Specification.AttributeMap = {};

  /** The stored object */
  public readonly object: Specification.Object<PropertiesType>;
  /** The stored object state */
  public readonly state: Specification.ObjectState<AttributesType>;
  /** The parent object class */
  public readonly parent: ObjectClass;

  /** Attribute names, this can be a normal field or a dynamic property with a get method */
  public abstract attributeNames: string[];
  /** Attribute descriptions, this can be a normal field or a dynamic property with a get method */
  public abstract attributes: AttributeDescriptions;

  constructor(
    parent: ObjectClass,
    object: Specification.Object<PropertiesType>,
    state: Specification.ObjectState<AttributesType>
  ) {
    this.parent = parent;
    this.object = object;
    this.state = state;
  }

  /** Initialize the state of the object */
  // eslint-disable-next-line
  public initializeState() {}

  /** Get the UI spec for property panel */
  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.verticalGroup(
        {
          header: strings.objects.interactivity,
        },
        [
          manager.inputBoolean(
            { property: "enableTooltips" },
            {
              type: "checkbox",
              label: strings.objects.toolTips,
              searchSection: strings.objects.interactivity,
            }
          ),
          manager.inputBoolean(
            { property: "enableContextMenu" },
            {
              type: "checkbox",
              label: strings.objects.contextMenu,
              searchSection: strings.objects.interactivity,
            }
          ),
          manager.inputBoolean(
            { property: "enableSelection" },
            {
              type: "checkbox",
              label: strings.objects.selection,
              searchSection: strings.objects.interactivity,
            }
          ),
        ]
      ),
    ];
  }

  public getTemplateParameters(): TemplateParameters {
    return null;
  }

  /** Create a default object */
  // eslint-disable-next-line
  public static createDefault(...args: any[]): Specification.Object {
    const id = uniqueID();
    const obj: Specification.Object = {
      _id: id,
      classID: this.classID,
      properties: {},
      mappings: {},
    };
    obj.properties = deepClone(this.defaultProperties);
    for (const attr in this.defaultMappingValues) {
      if (
        Object.prototype.hasOwnProperty.call(this.defaultMappingValues, attr)
      ) {
        const value = deepClone(this.defaultMappingValues[attr]);
        obj.mappings[attr] = <Specification.ValueMapping>{
          type: MappingType.value,
          value,
        };
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
      return parents.some((t) => ObjectClasses.isType(t, parentType));
    } else {
      return false;
    }
  }

  /**
   * Gets an iterator of registered classes.
   */
  public static RegisteredClasses(): IterableIterator<ObjectClassConstructor> {
    return this.registeredObjectClasses.values();
  }
}

export const isType = ObjectClasses.isType;
