// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { DefaultButton, TextField } from "@fluentui/react";
import {
  defaultStyle,
  defultBindButtonSize,
  FluentButton,
  FluentTextField,
  labelRender,
} from "./fluentui_customized_components";
import { strings } from "../../../../../strings";
import { Prototypes, Specification } from "../../../../../core";

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
            <TextField
              id={`id_${options.label}`}
              styles={defaultStyle}
              label={options.label}
              onRenderLabel={labelRender}
              placeholder={strings.core.auto}
              onClick={onClick}
            />
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
            <TextField
              id={`id_${options.label}`}
              styles={defaultStyle}
              label={options.label}
              onRenderLabel={labelRender}
              placeholder={strings.core.none}
              onClick={onClick}
            />
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
    <span className="el-color-value">
      <FluentTextField>
        <TextField
          id={`id_${label}`}
          styles={defaultStyle}
          label={label}
          onRenderLabel={labelRender}
          placeholder={strings.core.none}
          type="text"
          onClick={onClick}
        />
      </FluentTextField>
      <EmptyColorButton onClick={onClick} />
    </span>
  );
};

interface EmptyColorButtonProps {
  onClick: () => void;
}

const EmptyColorButton = ({ onClick }: EmptyColorButtonProps): JSX.Element => {
  return (
    <FluentButton>
      <DefaultButton
        iconProps={{
          iconName: "BucketColor",
        }}
        styles={{
          root: {
            minWidth: "unset",
            ...defultBindButtonSize,
            marginLeft: 5,
          },
        }}
        onClick={onClick}
        title={strings.mappingEditor.chooseColor}
      />
    </FluentButton>
  );
};
