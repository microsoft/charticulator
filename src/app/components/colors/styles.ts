// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// import { IButtonStyles } from "@fluentui/react";
import styled from "styled-components";

// export const defaultNoneButtonStyles: IButtonStyles = {
//   root: {
//     border: "unset",
//     width: "100%",
//     padding: "unset",
//     height: 24,
//   },
//   label: {
//     textAlign: "start",
//   },
// };

// export const defaultPaletteButtonsStyles: IButtonStyles = {
//   root: {
//     border: "unset",
//     height: 24,
//     width: "100%",
//   },
//   label: {
//     textAlign: "start",
//     fontWeight: 400,
//   },
// };

// export const NullButtonWrapper = styled.div`
//   border-top: 1px solid #e6e6e6;
// `;

export const ColorGridRowWrapper = styled.div`
  display: flex;
  flex-direction: row;
`;

export const ColorGridColumnWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

export const PickersSectionWrapper = styled.div`
  margin: 5px;
  width: 150px;
  display: flex;
  flex-direction: column;
`;

export const PickersSection = styled.div`
  flex-grow: 1;
`;

export const ColorsSectionWrapper = styled.div`
  margin: 5px;
`;

export const ColorsPickerWrapper = styled.div`
  display: flex;
`;

export const ColorsPickerLeftSectionWrapper = styled.div`
  border-right: 1px solid #e6e6e6;
  display: flex;
`;
