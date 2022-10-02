// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * # Marks
 *
 * Most of mark elements extends {@link EmphasizableMarkClass} and  {@link MarkClass} classes.
 *
 * Each mark has a property
 *
 * ```typescript
 * public readonly object: Specification.Element<PropertiesType>;
 * ```
 *
 * it's a single graphical mark, such as rectangle, circle, wedge; an element is driven by a group of data rows.
 *
 * For example, char in the sample has one rectangle in the glyph. But if the chart has several glyphs, rectangle mark has several objects with different properties (different height).
 *
 * ![Mark class and object](media://mark_class_objects.png)
 *
 * The main interface of the object is {@linkcode ObjectClass}
 *
 * The interface contains several properties:
 *
 * ```typescript
 *   export interface Object<
 *      PropertiesType extends ObjectProperties = ObjectProperties
 *    > extends Identifiable {
 *      classID: string;
 *      properties: PropertiesType;
 *      mappings: Mappings;
 * }
 * ```
 *
 * classID - each mark class has its own ID, you can find them in ts files of marks. For example, [image](image.ts#L39) mark class has:
 *
 * ```typescript
 * public static classID = "mark.image";
 * ```
 *
 * properties - is attributes of objects. Read more about difference of properties and attributes in {@link "core/index"} module documentation.
 *
 *
 * All marks implement several methods of {@link ObjectClass}
 * for example
 * `{@link ObjectClass.getAttributePanelWidgets}` - the method responsible for displaying widgets in the property panel. Each time when a user selects the mark in the object browser, the charticulator calls this method to display properties. Charticulator displays the properties for rectangle named `Shape1`
 *
 * ![Mark widgets](media://mark_widgets.png)
 *
 * {@link ObjectClass.getTemplateParameters} - returns configurable parameters of the object. This method calls in {@link ChartTemplateBuilder.addObject} method to collect all parameters into inference list
 *
 * @packageDocumentation
 * @preferred
 */

import { ObjectClasses } from "../object";
import { CreationParameters, MarkClass } from "./mark";

import { AnchorElement } from "./anchor";
import { DataAxisClass } from "./data_axis";
import { ImageElementClass } from "./image";
import { LineElementClass } from "./line";
import { NestedChartElementClass } from "./nested_chart";
import { RectElementClass } from "./rect";
import { SymbolElementClass, symbolTypesList } from "./symbol";
import { TextElementClass } from "./text";
import { IconElementClass } from "./icon";
import { TextboxElementClass } from "./textbox";

export function registerClasses() {
  ObjectClasses.Register(AnchorElement);
  ObjectClasses.Register(RectElementClass);
  ObjectClasses.Register(LineElementClass);
  ObjectClasses.Register(SymbolElementClass);
  ObjectClasses.Register(TextElementClass);
  ObjectClasses.Register(TextboxElementClass);
  ObjectClasses.Register(ImageElementClass);
  ObjectClasses.Register(IconElementClass);
  ObjectClasses.Register(NestedChartElementClass);
  ObjectClasses.Register(DataAxisClass);
}

export { CreationParameters, MarkClass, symbolTypesList };
