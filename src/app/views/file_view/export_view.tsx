// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { CurrentChartView } from ".";
import { deepClone, Specification } from "../../../core";
import { findObjectById } from "../../../core/prototypes";
import { Actions } from "../../actions";
import { ButtonRaised, ErrorBoundary, SVGImageIcon } from "../../components";
import { ContextedComponent } from "../../context_component";
import * as R from "../../resources";
import { ExportTemplateTarget } from "../../template";
import { classNames } from "../../utils";

export class InputGroup extends React.Component<
  {
    value: string;
    label: string;
    onChange: (newValue: string) => void;
  },
  {}
> {
  private ref: HTMLInputElement;

  public render() {
    return (
      <div className="form-group">
        <input
          ref={e => (this.ref = e)}
          type="text"
          required={true}
          value={this.props.value || ""}
          onChange={e => {
            this.props.onChange(this.ref.value);
          }}
        />
        <label>{this.props.label}</label>
        <i className="bar" />
      </div>
    );
  }
}

export class ExportImageView extends ContextedComponent<{}, { dpi: string }> {
  public state = { dpi: "144" };
  public getScaler() {
    let dpi = +this.state.dpi;
    if (dpi < 1 || dpi != dpi) {
      dpi = 144;
    }
    dpi = Math.max(Math.min(dpi, 1200), 36);
    return dpi / 72;
  }
  public render() {
    return (
      <div className="el-horizontal-layout-item is-fix-width">
        <CurrentChartView store={this.store} />
        <InputGroup
          label="DPI (for PNG/JPEG)"
          value={this.state.dpi}
          onChange={newValue => {
            this.setState({
              dpi: newValue
            });
          }}
        />
        <div className="buttons">
          <ButtonRaised
            text="PNG"
            url={R.getSVGIcon("toolbar/export")}
            onClick={() => {
              this.dispatch(
                new Actions.Export("png", { scale: this.getScaler() })
              );
            }}
          />{" "}
          <ButtonRaised
            text="JPEG"
            url={R.getSVGIcon("toolbar/export")}
            onClick={() => {
              this.dispatch(
                new Actions.Export("jpeg", { scale: this.getScaler() })
              );
            }}
          />{" "}
          <ButtonRaised
            text="SVG"
            url={R.getSVGIcon("toolbar/export")}
            onClick={() => {
              this.dispatch(new Actions.Export("svg"));
            }}
          />
        </div>
      </div>
    );
  }
}

export class ExportHTMLView extends ContextedComponent<{}, {}> {
  public render() {
    return (
      <div className="el-horizontal-layout-item is-fix-width">
        <CurrentChartView store={this.store} />
        <div className="buttons">
          <ButtonRaised
            text="HTML"
            url={R.getSVGIcon("toolbar/export")}
            onClick={() => {
              this.dispatch(new Actions.Export("html"));
            }}
          />
        </div>
      </div>
    );
  }
}

export interface FileViewExportState {
  exportMode: string;
}

export class FileViewExport extends ContextedComponent<
  {
    onClose: () => void;
  },
  FileViewExportState
> {
  public state: FileViewExportState = {
    exportMode: "image"
  };

  public renderExportView(mode: "image" | "html") {
    if (mode == "image") {
      return <ExportImageView />;
    }
    if (mode == "html") {
      return <ExportHTMLView />;
    }
  }

  public renderExportTemplate() {
    return (
      <div className="el-horizontal-layout-item is-fix-width">
        <CurrentChartView store={this.store} />
        <ExportTemplateView exportKind={this.state.exportMode} />
      </div>
    );
  }
  public render() {
    return (
      <div className="charticulator__file-view-content">
        <h1>Export</h1>
        <div className="el-horizontal-layout">
          <div className="el-horizontal-layout-item">
            <div className="charticulator__list-view">
              <div
                className={classNames("el-item", [
                  "is-active",
                  this.state.exportMode == "image"
                ])}
                onClick={() => this.setState({ exportMode: "image" })}
              >
                <SVGImageIcon url={R.getSVGIcon("toolbar/export")} />
                <span className="el-text">Export as Image</span>
              </div>
              <div
                className={classNames("el-item", [
                  "is-active",
                  this.state.exportMode == "html"
                ])}
                onClick={() => this.setState({ exportMode: "html" })}
              >
                <SVGImageIcon url={R.getSVGIcon("toolbar/export")} />
                <span className="el-text">Export as HTML</span>
              </div>
              {this.store.listExportTemplateTargets().map(name => (
                <div
                  key={name}
                  className={classNames("el-item", [
                    "is-active",
                    this.state.exportMode == name
                  ])}
                  onClick={() => this.setState({ exportMode: name })}
                >
                  <SVGImageIcon url={R.getSVGIcon("toolbar/export")} />
                  <span className="el-text">{name}</span>
                </div>
              ))}
            </div>
          </div>
          <ErrorBoundary maxWidth={300}>
            {this.state.exportMode == "image" || this.state.exportMode == "html"
              ? this.renderExportView(this.state.exportMode)
              : this.renderExportTemplate()}
          </ErrorBoundary>
        </div>
      </div>
    );
  }
}

export interface ExportTemplateViewState {
  template: Specification.Template.ChartTemplate;
  target: ExportTemplateTarget;
  targetProperties: { [name: string]: string };
}

export class ExportTemplateView extends ContextedComponent<
  { exportKind: string },
  {}
> {
  public state = this.getDefaultState(this.props.exportKind);

  public getDefaultState(kind: string): ExportTemplateViewState {
    const template = deepClone(this.store.buildChartTemplate());
    const target = this.store.createExportTemplateTarget(kind, template);
    const targetProperties: { [name: string]: string } = {};
    for (const property of target.getProperties()) {
      targetProperties[property.name] = property.default;
    }
    return {
      template,
      target,
      targetProperties
    };
  }

  public componentWillReceiveProps(newProps: { exportKind: string }) {
    this.setState(this.getDefaultState(newProps.exportKind));
  }

  public renderInput(
    label: string,
    value: string,
    onChange: (value: string) => void
  ) {
    let ref: HTMLInputElement;
    return (
      <div className="form-group">
        <input
          ref={e => (ref = e)}
          type="text"
          required={true}
          value={value || ""}
          onChange={e => {
            onChange(ref.value);
          }}
        />
        <label>{label}</label>
        <i className="bar" />
      </div>
    );
  }

  public renderTargetProperties() {
    return this.state.target.getProperties().map(property => {
      return (
        <div key={property.name}>
          {this.renderInput(
            property.displayName,
            this.state.targetProperties[property.name],
            value => {
              this.state.targetProperties[property.name] = value;
              this.setState({
                targetProperties: this.state.targetProperties
              });
            }
          )}
        </div>
      );
    });
  }

  public renderSlots() {
    if (this.state.template.tables.length == 0) {
      return <p>(none)</p>;
    }
    return this.state.template.tables.map(table => (
      <div key={table.name}>
        {table.columns.map(column => (
          <div key={column.name}>
            {this.renderInput(column.name, column.displayName, value => {
              column.displayName = value;
              this.setState({
                template: this.state.template
              });
            })}
          </div>
        ))}
      </div>
    ));
  }

  public renderInferences() {
    const template = this.state.template;
    if (template.inference.length == 0) {
      return <p>(none)</p>;
    }
    return (
      template.inference
        // Only show axis and scale inferences
        .filter(inference => inference.axis || inference.scale)
        .map((inference, index) => {
          let description = inference.description;
          if (!description) {
            if (inference.scale) {
              const scaleName = findObjectById(
                template.specification,
                inference.objectID
              ).properties.name;
              description = `Auto domain and range for ${scaleName}`;
            }
            if (inference.axis) {
              const objectName = findObjectById(
                template.specification,
                inference.objectID
              ).properties.name;
              description = `Auto axis range for ${objectName}/${inference.axis.property.toString()}`;
            }
          }
          return (
            <div
              key={index}
              className="el-inference-item"
              onClick={() => {
                inference.disableAuto = !inference.disableAuto;
                this.setState({ template });
              }}
            >
              <SVGImageIcon
                url={
                  inference.disableAuto
                    ? R.getSVGIcon("checkbox/empty")
                    : R.getSVGIcon("checkbox/checked")
                }
              />
              <span className="el-text">{description}</span>
            </div>
          );
        })
    );
  }

  public renderExposedProperties() {
    const result: JSX.Element[] = [];
    for (const p of this.state.template.properties) {
      const id = p.objectID;
      const obj = findObjectById(this.state.template.specification, id);
      if (p.target.attribute) {
        result.push(
          <div key={id + p.target.attribute}>
            {this.renderInput(
              obj.properties.name + "/" + p.target.attribute,
              p.displayName,
              value => {
                p.displayName = value;
                this.setState({
                  template: this.state.template
                });
              }
            )}
          </div>
        );
      }
      if (p.target.property) {
        const pf = p.target.property;
        let pfstr = null;
        if (typeof pf == "string") {
          pfstr = pf;
        } else {
          pfstr =
            pf.property +
            "/" +
            (typeof pf.field == "string" || typeof pf.field == "number"
              ? pf.field
              : pf.field.join("."));
        }
        result.push(
          <div key={id + pfstr}>
            {this.renderInput(
              obj.properties.name + "/" + pfstr,
              p.displayName,
              value => {
                p.displayName = value;
                this.setState({
                  template: this.state.template
                });
              }
            )}
          </div>
        );
      }
    }
    return result;
  }

  public render() {
    return (
      <div className="charticulator__export-template-view">
        <h2>Data Mapping Slots</h2>
        {this.renderSlots()}
        <h2>Axes and Scales</h2>
        {this.renderInferences()}
        <h2>Exposed Properties</h2>
        {this.renderExposedProperties()}
        <h2>{this.props.exportKind} Properties</h2>
        {this.renderTargetProperties()}
        <div className="buttons">
          <ButtonRaised
            text={this.props.exportKind}
            url={R.getSVGIcon("toolbar/export")}
            onClick={() => {
              this.dispatch(
                new Actions.ExportTemplate(
                  this.props.exportKind,
                  this.state.target,
                  this.state.targetProperties
                )
              );
            }}
          />
        </div>
      </div>
    );
  }
}
