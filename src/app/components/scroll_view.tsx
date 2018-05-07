import * as React from "react";
import * as Hammer from "hammerjs";

export interface ScrollViewProps {
}

export interface ScrollViewState {
    height: number;
    position: number;
}

export class ScrollView extends React.Component<ScrollViewProps, ScrollViewState> {
    refs: {
        container: HTMLDivElement;
    };

    hammer: HammerManager;

    public componentDidMount() {
        this.hammer = new Hammer(this.refs.container);
        this.hammer.on("panstart", (e) => {
        });
    }

    public componentWillUnmount() {
        this.hammer.destroy();
    }

    public render() {
        return (
            <div className="scroll-view" ref="container">
                <div className="scroll-view-content">
                    {this.props.children}
                </div>
                <div className="scroll-bar">
                    <div className="scroll-bar-handle"></div>
                </div>
            </div>
        );
    }
}