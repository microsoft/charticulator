// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export enum MessageType {
  GeneralError,
  ParsingDataError,
  ConstraintSolvingError,
  LinkGuideCreatingError,
  InvalidLinksData,
  NoID,
  NoSourceOrTargetID,
}

export const messageTypes = Object.values(MessageType);

export const LinkSourceKeyColumn = "source_id";

export const LinkTargetKeyColumn = "target_id";

export const KeyColumn = "id";
