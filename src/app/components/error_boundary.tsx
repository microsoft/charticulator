import * as React from "react";
import { ButtonRaised } from "./index";

export class ErrorBoundary extends React.Component<{}, { hasError: boolean }> {
  constructor(props: {}) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public componentDidCatch(error: Error, info: any) {
    this.setState({
      hasError: true
    });
    console.log(error, info);
  }

  public render(): any {
    if (this.state.hasError) {
      return (
        <div
          className="charticulator__error-boundary-report"
          style={{ margin: "1em" }}
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
                  hasError: false
                });
              }}
            />
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
