import * as React from 'react';
import Button from 'material-ui/Button';
import Dialog, { DialogActions, DialogContent, DialogTitle } from 'material-ui/Dialog';
import Typography from 'material-ui/Typography';
import Field from './simulation-field';
import { CircularProgress } from 'material-ui/Progress';
import { clearInterval } from 'timers';
const DQNAgent = require('../common/agent').DQNAgent;
// import Slider from 'rc-slider';
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

    componentDidMount() {
        this.props
            .sendCommand({ cmd: 'LOAD_MODEL', model: this.props.model, await: 'LOAD_MODEL' })
            .then((response: any) => {
                const model = response.model;
                this.snake = require('../common/snake-scene').instance({
                    mode: 'client'
                });
                this.snake.scene.spec = model.spec;
                this.snake.scene.params = model.params;
                this.snake.scene.maxX = model.maxX;
                this.snake.scene.maxY = model.maxY;
                this.snake.scene.modelName = this.props.model;
                this.snake.initScene();
                this.snake.scene.agent = new DQNAgent(this.snake.scene.env, this.snake.scene.spec);
                this.snake.scene.agent.fromJSON(model.brain);
                this.snake.scene.agent.epsilon = 0.0001;
                this.setState({ loading: false, model: response.model });
                if (this.interval) {
                    clearInterval(this.interval);
                }
                setInterval(() => this.nextStep(), 100);
            })
            .catch(e => console.log(e));
    }

    render() {
        // const style = { marginTop: '20px', marginBottom: '20px' };
        // const handleStyle = {
        //     height: 28,
        //     width: 28,
        //     marginLeft: -14,
        //     marginTop: -14
        // };
        return (
            <Dialog open={this.props.open} onRequestClose={this.handleClickOk}>
                <DialogTitle>Model Simulation: {this.props.model}</DialogTitle>
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
                            food={this.snake.scene.target}
                            turn={this.state.turn}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    {this.state.loading ? null : (
                        <div style={{ marginTop: '-3px', display: 'float' }}>
                            {/* <Slider
                                style={style}
                                value={5}
                                defaultValue={5}
                                min={1}
                                max={10}
                                step={0.1}
                                // onChange={this.handleChange('epsilon')}
                                // marks={{ '1': '0.6' }}
                                handleStyle={handleStyle}
                            /> */}
                            <Typography type="title">Size: {this.snake.scene.actor.tail.length}</Typography>
                        </div>
                    )}
                    <Button onClick={this.handleClickOk} color="primary" autoFocus>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default SimulationDialog;
