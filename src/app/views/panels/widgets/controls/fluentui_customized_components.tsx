// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import styled from "styled-components";

export const FluentButton = styled.div`
  margin-top: 24px;
  display: inline-block;
  padding: 0px 4px 0px 4px;
  button {
    min-width: unset;
    padding: 4px;
  }
`;

export const FluentActionButton = styled.div`
  button {
    border: 1px solid;
    height: 32px;
    width: 100%;
  }
`;

export const FluentTextField = styled.div`
  flex: 1;
  * {
    flex: 1;
  }
`;
