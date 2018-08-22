import * as React from "react";
import * as ReactDOM from "react-dom";
import { ToolButton, SVGImageIcon } from "../components";
import * as R from "../resources";
import * as globals from "../globals";
import { DragData, Actions } from "../actions";
import { ChartStore } from "../stores";
import { EventSubscription, Dispatcher } from "../../core";
import { ContextedComponent } from "../context_component";
import { DatasetStore } from "../stores/dataset";
import { PopupView } from "../controllers";
import { LinkCreationPanel } from "./panels/link_creator";
import { Button } from "./panels/widgets/controls";
import { classNames } from "../utils";

export interface ToolbarProps {
  store: ChartStore;
}

export class Toolbar extends React.Component<ToolbarProps, {}> {
  public token: EventSubscription;

  public componentDidMount() {
    this.token = this.props.store.addListener(
      ChartStore.EVENT_CURRENT_TOOL,
      () => {
        this.forceUpdate();
      }
    );
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  public render() {
    return (
      <div className="chartaccent__toolbar">
        <span className="chartaccent__toolbar-label">Marks</span>
        <MultiObjectButton
          tools={[
            {
              classID: "mark.rect",
              title: "Rectangle",
              icon: "mark/rect",
              options: '{"shape":"rectangle"}'
            },
            {
              classID: "mark.rect",
              title: "Ellipse",
              icon: "mark/ellipse",
              options: '{"shape":"ellipse","name":"Ellipse"}'
            },
            {
              classID: "mark.rect",
              title: "Triangle",
              icon: "mark/triangle",
              options: '{"shape":"triangle","name":"Triangle"}'
            }
          ]}
        />
        <ObjectButton classID="mark.symbol" title="Symbol" icon="mark/symbol" />
        <ObjectButton classID="mark.line" title="Line" icon="mark/line" />
        <ObjectButton classID="mark.text" title="Text" icon="mark/text" />
        {/* <ObjectButton classID="mark.textbox" title="Text" icon="mark/textbox" currentTool={this.props.store.currentTool} /> */}
        <span className="chartaccent__toolbar-separator" />
        <ObjectButton
          classID="mark.data-axis"
          title="Data Axis"
          icon="mark/data-axis"
        />
        <span className="chartaccent__toolbar-label">Links</span>
        <LinkButton />
        <span className="chartaccent__toolbar-label">Guides</span>
        <ObjectButton
          classID="guide-y"
          title="Guide Y"
          icon="guide/x"
          noDragging={true}
        />
        <ObjectButton
          classID="guide-x"
          title="Guide X"
          icon="guide/y"
          noDragging={true}
        />
        <ObjectButton
          classID="guide-coordinator-y"
          title="Guide Y"
          icon="guide/coordinator-x"
          noDragging={true}
        />
        <ObjectButton
          classID="guide-coordinator-x"
          title="Guide Y"
          icon="guide/coordinator-y"
          noDragging={true}
        />
        <span className="chartaccent__toolbar-label">Plot Segments</span>
        <ObjectButton
          classID="plot-segment.cartesian"
          title="2D Region"
          icon="plot/region"
          noDragging={true}
        />
        <ObjectButton
          classID="plot-segment.line"
          title="Line"
          icon="plot/line"
          noDragging={true}
        />
        {/* <ScaffoldButton type="curve" title="Curve" icon="plot/curve" currentTool={this.props.store.currentTool} /> */}
        <span className="chartaccent__toolbar-label">Scaffolds</span>
        <ScaffoldButton
          type="cartesian-x"
          title="Horizontal Line"
          icon="scaffold/cartesian-x"
          currentTool={this.props.store.currentTool}
        />
        <ScaffoldButton
          type="cartesian-y"
          title="Vertical Line"
          icon="scaffold/cartesian-y"
          currentTool={this.props.store.currentTool}
        />
        <ScaffoldButton
          type="polar"
          title="Polar"
          icon="scaffold/circle"
          currentTool={this.props.store.currentTool}
        />
        <ScaffoldButton
          type="curve"
          title="Custom Curve"
          icon="scaffold/curve"
          currentTool={this.props.store.currentTool}
        />
        {/* <ScaffoldButton type="map" title="Map" icon="scaffold/map" currentTool={this.props.store.currentTool} /> */}
      </div>
    );
  }
}

export interface ObjectButtonProps {
  title: string;
  classID: string;
  icon: string;
  options?: string;
  noDragging?: boolean;
  onClick?: () => void;
}

export class ObjectButton extends ContextedComponent<ObjectButtonProps, {}> {
  public token: EventSubscription;

  public getIsActive() {
    return (
      this.context.store.chartStore.currentTool == this.props.classID &&
      this.context.store.chartStore.currentToolOptions == this.props.options
    );
  }

  public componentDidMount() {
    this.token = this.context.store.chartStore.addListener(
      ChartStore.EVENT_CURRENT_TOOL,
      () => {
        this.forceUpdate();
      }
    );
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  public render() {
    return (
      <ToolButton
        icon={R.getSVGIcon(this.props.icon)}
        active={this.getIsActive()}
        title={this.props.title}
        onClick={() => {
          this.dispatch(
            new Actions.SetCurrentTool(this.props.classID, this.props.options)
          );
          if (this.props.onClick) {
            this.props.onClick();
          }
        }}
        dragData={
          this.props.noDragging
            ? null
            : () => {
                return new DragData.ObjectType(
                  this.props.classID,
                  this.props.options
                );
              }
        }
      />
    );
  }
}

export class MultiObjectButton extends ContextedComponent<
  {
    tools: ObjectButtonProps[];
  },
  {
    currentSelection: {
      classID: string;
      options: string;
    };
  }
> {
  public state = {
    currentSelection: {
      classID: this.props.tools[0].classID,
      options: this.props.tools[0].options
    }
  };
  private refButton: ObjectButton;
  public token: EventSubscription;

  public isActive() {
    const store = this.context.store.chartStore;
    for (const item of this.props.tools) {
      if (
        item.classID == store.currentTool &&
        item.options == store.currentToolOptions
      ) {
        return true;
      }
    }
    return false;
  }
  public getSelectedTool() {
    for (const item of this.props.tools) {
      if (
        item.classID == this.state.currentSelection.classID &&
        item.options == this.state.currentSelection.options
      ) {
        return item;
      }
    }
    return this.props.tools[0];
  }

  public componentDidMount() {
    this.token = this.context.store.chartStore.addListener(
      ChartStore.EVENT_CURRENT_TOOL,
      () => {
        for (const item of this.props.tools) {
          // If the tool is within the tools defined here, we update the current selection
          if (
            this.context.store.chartStore.currentTool == item.classID &&
            this.context.store.chartStore.currentToolOptions == item.options
          ) {
            this.setState({
              currentSelection: {
                classID: item.classID,
                options: item.options
              }
            });
            break;
          }
        }
        this.forceUpdate();
      }
    );
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  public render() {
    return (
      <div
        className={classNames("charticulator__button-multi-tool", [
          "is-active",
          this.isActive()
        ])}
      >
        <ObjectButton
          ref={e => (this.refButton = e)}
          {...this.getSelectedTool()}
        />
        <span
          className="el-dropdown"
          onClick={() => {
            globals.popupController.popupAt(
              context => {
                return (
                  <PopupView context={context}>
                    {this.props.tools.map((tool, index) => (
                      <div
                        key={index}
                        className="charticulator__button-multi-tool-dropdown"
                      >
                        <ObjectButton
                          {...tool}
                          noDragging={true}
                          onClick={() => context.close()}
                        />
                      </div>
                    ))}
                  </PopupView>
                );
              },
              {
                anchor: ReactDOM.findDOMNode(this.refButton) as Element,
                alignX: "start-inner",
                alignY: "end-outer"
              }
            );
          }}
        >
          <SVGImageIcon url={R.getSVGIcon("general/dropdown")} />
        </span>
      </div>
    );
  }
}

export class ScaffoldButton extends ContextedComponent<
  {
    currentTool: string;
    title: string;
    type: string;
    icon: string;
  },
  {}
> {
  public render() {
    return (
      <ToolButton
        icon={R.getSVGIcon(this.props.icon)}
        active={this.props.currentTool == this.props.type}
        title={this.props.title}
        onClick={() => {
          // this.dispatch(new Actions.SetCurrentTool(this.props.type));
        }}
        dragData={() => {
          return new DragData.ScaffoldType(this.props.type);
        }}
      />
    );
  }
}

export class LinkButton extends ContextedComponent<{}, {}> {
  public container: HTMLSpanElement;

  public render() {
    return (
      <span ref={e => (this.container = e)}>
        <ToolButton
          title="Link"
          icon={R.getSVGIcon("link/tool")}
          active={this.context.store.chartStore.currentTool == "link"}
          onClick={() => {
            globals.popupController.popupAt(
              context => (
                <PopupView context={context}>
                  <LinkCreationPanel onFinish={() => context.close()} />
                </PopupView>
              ),
              { anchor: this.container }
            );
          }}
        />
      </span>
    );
  }
}

export class CheckboxButton extends React.Component<
  {
    value: boolean;
    text?: string;
    onChange?: (v: boolean) => void;
  },
  {}
> {
  public render() {
    return (
      <span
        className="chartaccent__toolbar-checkbox"
        onClick={() => {
          const nv = !this.props.value;
          if (this.props.onChange) {
            this.props.onChange(nv);
          }
        }}
      >
        <SVGImageIcon
          url={R.getSVGIcon(
            this.props.value ? "checkbox/checked" : "checkbox/empty"
          )}
        />
        <span className="el-label">{this.props.text}</span>
      </span>
    );
  }
}
