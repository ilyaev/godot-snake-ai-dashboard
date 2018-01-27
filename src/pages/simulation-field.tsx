import * as React from 'react';
import * as ReactDOM from 'react-dom';

type Props = {
    maxX: number;
    maxY: number;
    actor: any;
    rivals: any[];
    food: any;
    turn: number;
    walls: any[];
    foods: any[];
    pits: any[];
    toggleWall: (x: number, y: number) => void;
    onSizeChange: (size: number) => void;
};

type State = {};

class SimulationField extends React.Component<Props, State> {
    state = {};

    width = 100;
    height = 100;
    cellSize = 0;
    context: any;
    canvas: any;
    mouseDown: boolean;
    lastCell: any;

    recalcDimensions() {
        this.context = (ReactDOM.findDOMNode(this) as any).getContext('2d');
        this.cellSize = Math.floor(
            Math.min(Math.round(window.innerWidth * 0.73), Math.round(window.innerHeight * 0.6)) / (this.props.maxX + 1)
        );
        this.width = (this.props.maxX + 1) * this.cellSize;
        this.height = (this.props.maxY + 1) * this.cellSize;
    }

    componentDidMount() {
        this.recalcDimensions();
    }

    componentDidUpdate() {
        this.recalcDimensions();
        this.paint();
    }

    paint() {
        this.context.clearRect(0, 0, this.width, this.height);
        this.context.save();
        this.drawGrid();
        this.drawActors();
        this.drawDebug();
        this.context.restore();
    }

    drawDebug() {
        const from = this.getCellCenter(this.props.actor.x, this.props.actor.y);
        var to = { x: 0, y: 0 };
        try {
            to = this.getCellCenter(this.props.actor.target.x, this.props.actor.target.y);
        } catch (e) {
            console.log('ERROR: actor - ', JSON.stringify(this.props.actor));
        }
        this.context.save();
        this.context.strokeStyle = '#FF0000';
        this.context.beginPath();
        this.context.moveTo(from.x, from.y);
        this.context.lineTo(to.x, to.y);
        this.context.stroke();
        this.context.restore();
    }

    getCellCenter(x: any, y: any) {
        return {
            x: x * this.cellSize + this.cellSize / 2,
            y: y * this.cellSize + this.cellSize / 2
        };
    }

    drawGrid() {
        this.context.save();
        this.context.strokeStyle = '#AAAAAA';
        for (let x = 0; x <= this.props.maxX; x++) {
            for (let y = 0; y <= this.props.maxY; y++) {
                const nX = x * this.cellSize;
                const nY = y * this.cellSize;
                this.context.strokeRect(nX, nY, this.cellSize, this.cellSize);
                if (this.props.walls[x][y]) {
                    this.drawRect(x, y, 'gray');
                }
                if (this.props.foods[x][y]) {
                    this.drawRect(x, y, 'red');
                }
                if (this.props.pits[x][y]) {
                    this.drawRect(x, y, 'MediumPurple');
                }
            }
        }
        this.context.restore();
    }

    handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
        const rect = ReactDOM.findDOMNode(this).getBoundingClientRect();
        const px = event.clientX - rect.left,
            py = event.clientY - rect.top;

        const x = Math.floor(px / this.cellSize);
        const y = Math.floor(py / this.cellSize);

        if (this.lastCell !== x + '-' + y) {
            this.props.toggleWall(x, y);
            this.lastCell = x + '-' + y;
        }

        return null;
    }

    drawActor(actor: any) {
        this.context.save();
        this.drawRect(actor.x, actor.y, '#006400');
        var color = 'green';
        if (typeof actor.student !== 'undefined' && !actor.student) {
            color = 'orange';
        }
        actor.tail.forEach((tail: any) => this.drawRect(tail.x, tail.y, color));
        this.context.restore();
    }

    drawActors() {
        [this.props.actor]
            .concat(this.props.rivals)
            .filter(one => typeof one.active === 'undefined' || one.active)
            .forEach(actor => this.drawActor(actor));
    }

    drawRect(ax: number, ay: number, color: string) {
        this.context.fillStyle = color;
        const x = ax * this.cellSize;
        const y = ay * this.cellSize;
        this.context.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
    }

    render() {
        return (
            <canvas
                style={{ alignSelf: 'center' }}
                width={this.width}
                height={this.height}
                onMouseDown={event => {
                    this.mouseDown = true;
                    this.handleCanvasClick(event);
                }}
                onMouseUp={event => (this.mouseDown = false)}
                onMouseLeave={event => (this.mouseDown = false)}
                onMouseMove={event => this.mouseDown && this.handleCanvasClick(event)}
            />
        );
    }
}

export default SimulationField;
