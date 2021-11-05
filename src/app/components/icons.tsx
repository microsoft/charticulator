// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

export class SVGImageIcon extends React.PureComponent<
  { url: string; width?: number; height?: number },
  Record<string, never>
> {
  public render() {
    const style: React.CSSProperties = {};
    if (this.props.width != null) {
      style.width = this.props.width + "px";
    }
    if (this.props.height != null) {
      style.height = this.props.height + "px";
    }
    if (this.props.url) {
      style.backgroundImage = `url(${this.props.url})`;
      return (
        <span
          className="el-svg-icon svg-image-icon"
          style={style}
          onDragStart={() => false}
        />
      );
    } else {
      return <span className="el-svg-icon svg-image-icon" />;
    }
  }
}
