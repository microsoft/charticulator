// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { FluentColumnLayout } from "./fluentui_customized_components";
import { strings } from "../../../../../strings";
import { Prototypes, Specification } from "../../../../../core";
import { Button, Input, Label } from "@fluentui/react-components";
import { ColorFill20Regular } from "@fluentui/react-icons";

// import * as R from "../../../../resources";
// import { ColorFill20Regular } from "@fluentui/react-icons";

interface EmptyMappingProps {
  renderColorPicker: () => JSX.Element;
  onClick: () => void;
  options: Prototypes.Controls.MappingEditorOptions;
  type: Specification.AttributeType;
}

export const EmptyMapping = ({
  renderColorPicker,
  onClick,
  options,
  type,
}: EmptyMappingProps): JSX.Element => {
  const render = () => {
    if (options.defaultAuto) {
      return (
        <>
          {renderColorPicker()}
          {type === Specification.AttributeType.Color ? (
            <EmptyColorInput onClick={onClick} label={options.label} />
          ) : (
            <>
              <FluentColumnLayout>
                <Label>{options.label}</Label>
                <Input
                  id={`id_${options.label.replace(/\s/g, "_")}`}
                  // styles={defaultStyle}
                  // label={options.label}
                  // onRenderLabel={labelRender}
                  placeholder={strings.core.auto}
                  onClick={onClick}
                />
              </FluentColumnLayout>
            </>
          )}
        </>
      );
    } else {
      return (
        <>
          {renderColorPicker()}
          {type === Specification.AttributeType.Color ? (
            <EmptyColorInput onClick={onClick} label={options.label} />
          ) : (
            <>
              <FluentColumnLayout>
                <Label>{options.label}</Label>
                <Input
                  id={`id_${options.label.replace(/\s/g, "_")}`}
                  // styles={defaultStyle}
                  // label={options.label}
                  // onRenderLabel={labelRender}
                  placeholder={strings.core.none}
                  onClick={onClick}
                />
              </FluentColumnLayout>
            </>
          )}
        </>
      );
    }
  };

  return <>{render()}</>;
};

interface EmptyColorInputProps {
  label: string;
  onClick: () => void;
}

const EmptyColorInput = ({
  label,
  onClick,
}: EmptyColorInputProps): JSX.Element => {
  return (
    <div className="el-color-value">
      {/* <FluentTextField> */}
      <FluentColumnLayout
        style={{
          flex: 1,
        }}
      >
        <Label>{label}</Label>
        <Input
          id={`id_${label.replace(/\s/g, "_")}`}
          // styles={defaultStyle}
          // label={label}
          // onRenderLabel={labelRender}
          placeholder={strings.core.none}
          type="text"
          onClick={onClick}
        />
        {/* </FluentTextField> */}
      </FluentColumnLayout>
      <EmptyColorButton onClick={onClick} />
    </div>
  );
};

interface EmptyColorButtonProps {
  onClick: () => void;
  styles?: {
    marginTop?: string;
  };
}

export const EmptyColorButton = ({
  onClick,
}: EmptyColorButtonProps): JSX.Element => {
  return (
    // <FluentButton marginTop={styles?.marginTop}>
    <Button
      // iconProps={{
      //   iconName: "UnSetColor",
      // }}
      // icon={<SVGImageIcon url={R.getSVGIcon("UnSetColor")} />}
      icon={<ColorFill20Regular />}
      // styles={{
      //   root: {
      //     minWidth: "unset",
      //     ...defultBindButtonSize,
      //     marginLeft: 5,
      //   },
      // }}
      onClick={onClick}
      title={strings.mappingEditor.chooseColor}
    />
    // </FluentButton>
  );
};
