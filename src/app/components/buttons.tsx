import * as React from "react";

import { classNames } from "../utils";
import { DraggableElement, ClickableSVGElement } from "./draggable";
import { SVGImageIcon } from "./icons";

import * as R from "../resources";

export interface ToolButtonProps {
  icon?: string;
  text?: string;
  title?: string;
  onClick?: () => void;
  dragData?: () => any;
  active?: boolean;
}

export class ToolButton extends React.Component<
  ToolButtonProps,
  { dragging: boolean }
> {
  constructor(props: ToolButtonProps) {
    super(props);
    this.state = {
      dragging: false
    };
  }

  public render() {
    if (this.props.dragData) {
      return (
        <DraggableElement
          dragData={this.props.dragData}
          onDragStart={() => this.setState({ dragging: true })}
          onDragEnd={() => this.setState({ dragging: false })}
          renderDragElement={() => {
            return [
              <SVGImageIcon url={this.props.icon} width={32} height={32} />,
              { x: -16, y: -16 }
            ];
          }}
        >
          <span
            className={classNames("charticulator__button-tool", [
              "is-active",
              this.props.active || this.state.dragging
            ])}
            title={this.props.title}
            onClick={() => {
              if (this.props.onClick) {
                this.props.onClick();
              }
            }}
          >
            {this.props.icon ? <SVGImageIcon url={this.props.icon} /> : null}
            {this.props.text ? (
              <span className="el-text">{this.props.text}</span>
            ) : null}
          </span>
        </DraggableElement>
      );
    } else {
      return (
        <span
          className={classNames("charticulator__button-tool", [
            "is-active",
            this.props.active
          ])}
          title={this.props.title}
          onClick={() => {
            if (this.props.onClick) {
              this.props.onClick();
            }
          }}
        >
          {this.props.icon ? <SVGImageIcon url={this.props.icon} /> : null}
          {this.props.text ? (
            <span className="el-text">{this.props.text}</span>
          ) : null}
        </span>
      );
    }
  }
}

export interface ButtonProps {
  onClick?: () => void;
  stopPropagation?: boolean;
  disabled?: boolean;
}

export abstract class BaseButton<
  Props extends ButtonProps
> extends React.PureComponent<Props, {}> {
  private doClick(e: React.MouseEvent<HTMLSpanElement>) {
    if (this.props.onClick) {
      this.props.onClick();
    }
    if (this.props.stopPropagation) {
      e.stopPropagation();
    }
  }
  protected _doClick = this.doClick.bind(this);
}

export class AppButton extends BaseButton<ButtonProps> {
  public render() {
    return (
      <span
        className="charticulator__button-menu-app"
        title="Open file menu"
        onClick={this._doClick}
      >
        <SVGImageIcon url={R.getSVGIcon("app-icon")} />
        <span className="el-text">Charticulator</span>
      </span>
    );
  }
}

export interface IconButtonProps extends ButtonProps {
  url?: string;
  title?: string;
  text?: string;
}

export class MenuButton extends BaseButton<IconButtonProps> {
  public render() {
    const props = this.props;
    if (props.text) {
      return (
        <span
          className="charticulator__button-menu-text"
          title={props.title}
          onClick={this._doClick}
        >
          <SVGImageIcon url={props.url} />
          <span className="el-text">{props.text}</span>
        </span>
      );
    } else {
      return (
        <span
          className="charticulator__button-menu"
          title={props.title}
          onClick={this._doClick}
        >
          <SVGImageIcon url={props.url} />
        </span>
      );
    }
  }
}

export class ButtonFlat extends BaseButton<IconButtonProps> {
  public render() {
    const props = this.props;
    if (props.url) {
      if (props.text) {
        return (
          <span
            className="charticulator__button-flat"
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
            <span className="el-text">{props.text}</span>
          </span>
        );
      } else {
        return (
          <span
            className="charticulator__button-flat"
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
          </span>
        );
      }
    } else {
      return (
        <span
          className="charticulator__button-flat"
          title={props.title}
          onClick={this._doClick}
        >
          <span className="el-text">{props.text}</span>
        </span>
      );
    }
  }
}

export class ButtonFlatPanel extends BaseButton<IconButtonProps> {
  public render() {
    const props = this.props;
    if (props.url) {
      if (props.text) {
        return (
          <span
            className={classNames("charticulator__button-flat-panel", [
              "is-disabled",
              this.props.disabled
            ])}
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
            <span className="el-text">{props.text}</span>
          </span>
        );
      } else {
        return (
          <span
            className={classNames("charticulator__button-flat-panel", [
              "is-disabled",
              this.props.disabled
            ])}
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
          </span>
        );
      }
    } else {
      return (
        <span
          className={classNames("charticulator__button-flat-panel", [
            "is-disabled",
            this.props.disabled
          ])}
          title={props.title}
          onClick={this._doClick}
        >
          <span className="el-text">{props.text}</span>
        </span>
      );
    }
  }
}

export class ButtonRaised extends BaseButton<IconButtonProps> {
  public render() {
    const props = this.props;
    if (props.url) {
      if (props.text) {
        return (
          <span
            className={classNames("charticulator__button-raised", [
              "is-disabled",
              this.props.disabled
            ])}
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
            <span className="el-text">{props.text}</span>
          </span>
        );
      } else {
        return (
          <span
            className={classNames("charticulator__button-raised", [
              "is-disabled",
              this.props.disabled
            ])}
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
          </span>
        );
      }
    } else {
      return (
        <span
          className={classNames("charticulator__button-raised", [
            "is-disabled",
            this.props.disabled
          ])}
          title={props.title}
          onClick={this._doClick}
        >
          <span className="el-text">{props.text}</span>
        </span>
      );
    }
  }
}
