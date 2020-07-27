// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export type MessageTypes =
  | "generalError"
  | "parsingDataError"
  | "constraintSolvingError"
  | "linkGuideCreatingError"
  | "invalidLinksData"
  | "noID"
  | "noSourceOrTargetID";

export const LinkSourceKeyColumn = "source_id";

export const LinkTargetKeyColumn = "target_id";

export const KeyColumn = "id";
