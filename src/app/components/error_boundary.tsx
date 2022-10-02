// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { ButtonRaised } from "./index";
import { copyToClipboard } from "../utils";

export enum TelemetryActionType {
  Exception = "exception",
  ExportTemplate = "exportTemplate",
}

export interface TelemetryRecorder {
  record(type: TelemetryActionType, payload: Record<string, any>): void;
}

export interface ErrorBoundaryProps {
  maxWidth?: number;
  telemetryRecorder?: TelemetryRecorder;
}

export const TelemetryContext = React.createContext<TelemetryRecorder>(null);

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; errorString?: string }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({
      hasError: true,
      errorString: `${error.name} \n ${error.message} \n ${
        error.stack && error.stack
      } \n ${info.componentStack}`,
    });

    this.props.telemetryRecorder?.record(TelemetryActionType.Exception, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    console.log(error, info);
  }

  public render(): any {
    if (this.state.hasError) {
      const maxWidth = this.props.maxWidth
        ? this.props.maxWidth + "px"
        : undefined;
      return (
        <div
          className="charticulator__error-boundary-report"
          style={{ margin: "1em", maxWidth }}
        >
          <p>
            Oops! Something went wrong here. This must be a software bug. As a
            last resort, you can undo the previous change and try again.
          </p>
          <p>
            <ButtonRaised
              text="Try Again"
              onClick={() => {
                this.setState({
                  hasError: false,
                });
              }}
            />
          </p>
          <p>
            <ButtonRaised
              text="Copy diagnostic information to clipboard"
              onClick={() => {
                copyToClipboard(this.state.errorString);
              }}
            />
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
