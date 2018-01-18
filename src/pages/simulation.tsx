import * as React from 'react';
import Button from 'material-ui/Button';
import Dialog, { DialogActions, DialogContent, DialogTitle } from 'material-ui/Dialog';
import Field from './simulation-field';
import { CircularProgress } from 'material-ui/Progress';
import 'rc-slider/assets/index.css';

type Props = {
    open: boolean;
    onOk: () => any;
    model: string;
    sendCommand: (command: any) => Promise<any>;
};

type State = {
    loading: boolean;
    model: any;
    open: boolean;
    turn: number;
};

class SimulationDialog extends React.Component<Props, State> {
    state = {
        open: false,
        loading: true,
        turn: 1,
        model: {} as any
    };

    snake: any = {} as any;
    model: any = {} as any;
    size: number;
    interval: any;

    handleClickOk = () => {
        this.props.onOk();
    };

    nextStep() {
        this.snake.nextStep();
        this.setState({
            turn: this.state.turn++
        });
    }

    initSnake(model: any, size: number) {
        this.model = model;
        this.size = size;
        delete this.snake;
        this.snake = require('../common/snake-scene').instance({
            mode: 'client'
        });

        this.snake.scene.spec = model.spec;
        this.snake.scene.spec.rivals = (Math.floor(size / 7) - 1) * 2;
        this.snake.scene.params = model.params;
        // this.snake.scene.maxX = model.maxX;
        // this.snake.scene.maxY = model.maxY;
        this.snake.scene.modelName = this.props.model;
        this.snake.initScene();
        this.snake.loadLevel(this.snake.scene.params.homelevel || 'random');
        model.maxX = this.snake.scene.maxX;
        model.maxY = this.snake.scene.maxY;
        model.params.maxX = model.maxX;
        model.params.maxY = model.maxY;
        this.snake.initAgents(this.snake.scene.env, this.snake.scene.spec);
        this.snake.scene.agent.epsilon = 0.05;
        this.snake.scene.rivalAgent.epsilon = 0.05;
        // this.snake.loadLevel('random');
        // this.snake.initScene();
        this.snake.implantBrain(model.brain);
        this.setState({ loading: false, model: model, turn: 1 });
        this.runSimulation(70);
    }

    runSimulation(speed: number) {
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.interval = setInterval(() => this.nextStep(), speed);
    }

    componentDidMount() {
        this.props
            .sendCommand({ cmd: 'LOAD_MODEL', model: this.props.model, await: 'LOAD_MODEL' })
            .then((response: any) => {
                const model = response.model;
                this.initSnake(model, model.maxX);
            })
            .catch(e => console.log(e));
    }

    componentWillUnmount() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    onSizeChange(size: number) {
        this.initSnake(this.model, size);
    }

    render() {
        return (
            <Dialog open={this.props.open} onRequestClose={this.handleClickOk}>
                <DialogTitle>
                    Sim {this.props.model} : {this.state.loading ? '-' : this.snake.scene.actor.tail.length}
                </DialogTitle>
                <DialogContent>
                    {this.state.loading ? (
                        <CircularProgress
                            size={100}
                            thickness={1}
                            style={{ position: 'absolute', marginLeft: '-50px' }}
                        />
                    ) : (
                        <Field
                            maxX={this.state.model.maxX}
                            maxY={this.state.model.maxY}
                            actor={this.snake.scene.actor}
                            rivals={this.snake.scene.rivals}
                            food={this.snake.scene.target}
                            walls={this.snake.walls}
                            foods={this.snake.foods}
                            turn={this.state.turn}
                            onSizeChange={size => this.onSizeChange(size)}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => this.onSizeChange(7)} color="primary" autoFocus>
                        Alone
                    </Button>
                    <Button onClick={() => this.onSizeChange(30)} color="primary" autoFocus>
                        Rivals
                    </Button>
                    <Button onClick={this.handleClickOk} color="primary" autoFocus>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default SimulationDialog;
