import * as React from 'react';
import * as ReactDOM from 'react-dom';

type Props = {
    maxX: number;
    maxY: number;
    actor: any;
    food: any;
    turn: number;
};

type State = {};

class SimulationField extends React.Component<Props, State> {
    state = {};

    width = 100;
    height = 100;
    cellSize = 0;
    context: any;

    componentDidMount() {
        this.cellSize = Math.floor(Math.round(window.innerWidth * 0.73) / (this.props.maxX + 1));
        this.width = (this.props.maxX + 1) * this.cellSize;
        this.height = (this.props.maxY + 1) * this.cellSize;
        this.context = (ReactDOM.findDOMNode(this) as any).getContext('2d');
        // this.paint();
    }

    componentDidUpdate() {
        var contextEl = ReactDOM.findDOMNode(this);
        var context = (contextEl as any).getContext('2d');
        this.context = context;
        context.clearRect(0, 0, this.width, this.height);
        this.paint();
    }

    drawGrid() {
        this.context.save();
        this.context.strokeStyle = '#AAAAAA';
        for (let x = 0; x <= this.props.maxX; x++) {
            for (let y = 0; y <= this.props.maxY; y++) {
                const nX = x * this.cellSize;
                const nY = y * this.cellSize;
                this.context.strokeRect(nX, nY, this.cellSize, this.cellSize);
            }
        }
        this.context.restore();
    }

    drawRect(ax: number, ay: number, color: string) {
        this.context.fillStyle = color;
        const x = ax * this.cellSize;
        const y = ay * this.cellSize;
        this.context.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
    }

    drawActor() {
        this.context.save();
        this.drawRect(this.props.actor.x, this.props.actor.y, '#006400');
        this.drawRect(this.props.food.x, this.props.food.y, 'red');
        this.props.actor.tail.forEach((tail: any) => this.drawRect(tail.x, tail.y, 'green'));
        this.context.restore();
    }

    paint() {
        this.context.save();
        this.drawGrid();
        this.drawActor();

        this.context.restore();
    }

    render() {
        return <canvas width={this.width} height={this.height} />;
    }
}

export default SimulationField;
