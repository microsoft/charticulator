import * as React from "react";
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
        <ObjectButton
          classID="mark.rect"
          title="Rectangle"
          icon="mark/rect"
          currentTool={this.props.store.currentTool}
        />
        <ObjectButton
          classID="mark.symbol"
          title="Symbol"
          icon="mark/symbol"
          currentTool={this.props.store.currentTool}
        />
        <ObjectButton
          classID="mark.line"
          title="Line"
          icon="mark/line"
          currentTool={this.props.store.currentTool}
        />
        <ObjectButton
          classID="mark.text"
          title="Text"
          icon="mark/text"
          currentTool={this.props.store.currentTool}
        />
        {/* <ObjectButton classID="mark.textbox" title="Text" icon="mark/textbox" currentTool={this.props.store.currentTool} /> */}
        <span className="chartaccent__toolbar-separator" />
        <ObjectButton
          classID="mark.data-axis"
          title="Data Axis"
          icon="mark/data-axis"
          currentTool={this.props.store.currentTool}
        />
        <span className="chartaccent__toolbar-label">Links</span>
        <LinkButton />
        <span className="chartaccent__toolbar-label">Guides</span>
        <ObjectButton
          classID="guide-y"
          title="Guide Y"
          icon="guide/x"
          currentTool={this.props.store.currentTool}
          noDragging={true}
        />
        <ObjectButton
          classID="guide-x"
          title="Guide X"
          icon="guide/y"
          currentTool={this.props.store.currentTool}
          noDragging={true}
        />
        <ObjectButton
          classID="guide-coordinator-y"
          title="Guide Y"
          icon="guide/coordinator-x"
          currentTool={this.props.store.currentTool}
          noDragging={true}
        />
        <ObjectButton
          classID="guide-coordinator-x"
          title="Guide Y"
          icon="guide/coordinator-y"
          currentTool={this.props.store.currentTool}
          noDragging={true}
        />
        <span className="chartaccent__toolbar-label">Plot Segments</span>
        <ObjectButton
          classID="plot-segment.cartesian"
          title="2D Region"
          icon="plot/region"
          currentTool={this.props.store.currentTool}
          noDragging={true}
        />
        <ObjectButton
          classID="plot-segment.line"
          title="Line"
          icon="plot/line"
          currentTool={this.props.store.currentTool}
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

export class ObjectButton extends ContextedComponent<
  {
    currentTool: string;
    title: string;
    classID: string;
    icon: string;
    options?: any;
    noDragging?: boolean;
  },
  {}
> {
  public render() {
    return (
      <ToolButton
        icon={R.getSVGIcon(this.props.icon)}
        active={this.props.currentTool == this.props.classID}
        title={this.props.title}
        onClick={() => {
          this.dispatch(
            new Actions.SetCurrentTool(
              this.props.classID,
              this.props.options || {}
            )
          );
        }}
        dragData={
          this.props.noDragging
            ? null
            : () => {
                return new DragData.ObjectType(this.props.classID);
              }
        }
      />
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
