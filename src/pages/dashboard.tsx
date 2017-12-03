import * as React from 'react';
import Button from 'material-ui/Button';
import AddIcon from 'material-ui-icons/Add';
import withStyles, { WithStyles } from 'material-ui/styles/withStyles';
import withRoot from '../components/withRoot';
import * as ioClient from 'socket.io-client';
import ModelCard, { ModelType } from './model-card';
import { CircularProgress } from 'material-ui/Progress';
import AppBar from './appbar';
import BottomNavigation, { BottomNavigationButton } from 'material-ui/BottomNavigation';
import FavoriteIcon from 'material-ui-icons/Cloud';
import LocationOnIcon from 'material-ui-icons/NaturePeople';
import LibraryBooks from 'material-ui-icons/LibraryBooks';
import ConfirmDialog from './confirm';
import CreateModelDialog from './create';
import ErrorAlert from './error';
import SpecDialog from './model-spec';
import ServerStatus from './server-status';
import ServerConnections from './server-connections';
import SimulationView from './simulation';

const styles = {
    root: {
        width: '100%',
        textAlign: 'center',
        height: '100%'
    },
    card: {
        maxWidth: 345
    },
    media: {
        height: 200
    },
    redBox: {
        background: 'red'
    },
    yellowBox: {
        background: 'yellow'
    },
    greenBox: {
        background: 'green'
    },
    blueBox: {
        padding: 10,
        background: 'blue'
    },
    scrollView: {
        background: 'gray'
    },
    listItem: {
        borderBottom: '1px solid black'
    }
};

const ioCreator = (listener: (command: any) => void) => {
    let io =
        document.location.href.indexOf('localhost') !== -1
            ? ioClient('http://localhost:8080')
            : ioClient('http://godot-snake-ai-trainer.herokuapp.com');

    let connectionId = 0;
    let serverInstanceId = 0;

    const sendCommand = (data: any) => {
        io.emit('command', JSON.stringify(Object.assign({}, { connectionId, serverInstanceId, arena: 'SNAKE' }, data)));
    };

    io.on('response', (response: any) => {
        var cmd = {} as any;
        try {
            cmd = JSON.parse(response);
            if (cmd.code === 'HANDSHAKE') {
                connectionId = cmd.connectionId;
                serverInstanceId = cmd.serverInstanceId;
            }

            if (listener) {
                listener(cmd);
            }
        } catch (e) {
            console.error('Invalid socket response', e);
        }
    });

    return {
        send: (command: any) => {
            sendCommand(command);
        },
        getConnectionId: () => connectionId
    };
};

type State = {
    serverStatus: any;
    disabledToggler: boolean;
    loading: boolean;
    page: number;
    confirmOpen: boolean;
    createOpen: boolean;
    specOpen: boolean;
    simOpen: boolean;
    error: string;
    modelToSpec: string;
};

class Index extends React.Component<WithStyles<keyof typeof styles>, State> {
    state = {
        serverStatus: {} as any,
        disabledToggler: false,
        loading: true,
        page: 0,
        confirmOpen: false,
        createOpen: false,
        specOpen: false,
        modelToSpec: '',
        simOpen: false,
        error: ''
    };

    socket: any = {};
    serverIntervalId: any;
    modelToDelete: string = '';
    requests: any = {};

    componentDidMount() {
        this.socket = ioCreator(this.onSocketResponse.bind(this));
    }

    listenServerStatus(activate: boolean = true) {
        if (this.serverIntervalId) {
            clearInterval(this.serverIntervalId);
        }
        if (!activate) {
            return;
        }
        this.serverIntervalId = setInterval(() => {
            this.socket.send({
                cmd: 'SERVER_STATUS'
            });
        }, 1000);
    }

    onSocketResponse(command: any) {
        if (this.requests[command.code]) {
            this.requests[command.code].resolve(command);
            delete this.requests[command];
        }
        switch (command.code) {
            case 'HANDSHAKE':
                if (this.serverIntervalId) {
                    clearInterval(this.serverIntervalId);
                }
                this.socket.send({
                    cmd: 'SERVER_STATUS'
                });
                this.listenServerStatus();
                break;
            case 'SERVER_STATUS':
                command.lastPoll = new Date();
                this.setState({
                    serverStatus: command,
                    loading: false
                });
                break;
            case 'ERROR':
                this.setState({
                    error: command.error
                });
                break;
            default:
                break;
        }
    }

    sendCommandAsync(command: any) {
        if (!command.await) {
            console.log('Wrong async command, no wait code');
            return Promise.reject('Wrong async command, no wait code');
        }
        return new Promise((resolve, reject) => {
            this.requests[command.await] = { resolve, reject, command };
            this.socket.send(command);
        });
    }

    onModelDelete(model: string) {
        this.setState({
            confirmOpen: true
        });
        this.modelToDelete = model;
    }

    deleteModel() {
        this.setState({ disabledToggler: true });
        setTimeout(() => {
            this.setState({
                disabledToggler: false
            });
        }, 2000);
        this.setState({ loading: true });
        this.socket.send({
            cmd: 'DELETE_MODEL',
            name: this.modelToDelete
        });
    }

    onModelStatusChange(status: boolean, model: string) {
        this.setState({ disabledToggler: true });
        setTimeout(() => {
            this.setState({
                disabledToggler: false
            });
        }, 2000);
        this.setState({ loading: true });
        this.socket.send({
            cmd: 'CHANGE_STATUS',
            name: model,
            status: status
        });
    }

    onShowSpec(model: string) {
        this.setState({ modelToSpec: model });
        this.setState({ specOpen: true });
        this.listenServerStatus(false);
    }

    onShowSim(model: string) {
        this.setState({ modelToSpec: model });
        this.setState({ simOpen: true });
        this.listenServerStatus(false);
    }

    onUpdateSpec(form: any) {
        this.setState({ specOpen: false });
        this.setState({ disabledToggler: true });
        setTimeout(() => {
            this.setState({
                disabledToggler: false
            });
        }, 2000);
        this.setState({ loading: true });
        this.socket.send({
            cmd: 'UPDATE_MODEL',
            name: this.state.modelToSpec,
            form: form
        });
    }

    createNewModel(form: any) {
        this.setState({ disabledToggler: true });
        setTimeout(() => {
            this.setState({
                disabledToggler: false
            });
        }, 2000);
        this.setState({ loading: true });
        this.socket.send({
            cmd: 'CREATE_MODEL',
            name: form.name
        });
    }

    render() {
        const showLoader = this.state.disabledToggler || this.state.loading;
        const isDialog = this.state.confirmOpen || this.state.createOpen || this.state.specOpen || this.state.simOpen;
        return (
            <div className={this.props.classes.root}>
                <ErrorAlert
                    caption={'Server Error'}
                    text={this.state.error}
                    onOk={() => this.setState({ error: '' })}
                    open={this.state.error && !this.state.loading && !this.state.disabledToggler ? true : false}
                />
                <ConfirmDialog
                    caption={'Please confirm'}
                    text={'Are you sure you want permanently delete model?'}
                    open={this.state.confirmOpen}
                    onCancel={() => this.setState({ confirmOpen: false })}
                    onOk={() => {
                        this.setState({ confirmOpen: false });
                        this.deleteModel();
                    }}
                />
                <CreateModelDialog
                    onCancel={() => this.setState({ createOpen: false })}
                    open={this.state.createOpen}
                    onOk={form => {
                        this.setState({ createOpen: false });
                        this.createNewModel(form);
                    }}
                />
                {this.state.specOpen && (
                    <SpecDialog
                        open={this.state.specOpen}
                        onOk={form => {
                            this.setState({ specOpen: false });
                            this.onUpdateSpec(form);
                            this.listenServerStatus();
                        }}
                        onCancel={() => {
                            this.setState({ specOpen: false });
                            this.listenServerStatus();
                        }}
                        worker={
                            this.state.serverStatus && this.state.serverStatus.models
                                ? this.state.serverStatus.models.reduce((result: any, one: any) => {
                                      return this.state.modelToSpec === one.name ? one.worker : result;
                                  }, {})
                                : {}
                        }
                    />
                )}
                {this.state.simOpen && (
                    <SimulationView
                        model={this.state.modelToSpec}
                        open={this.state.simOpen}
                        sendCommand={command => this.sendCommandAsync(command)}
                        onOk={() => {
                            this.setState({ simOpen: false });
                            this.listenServerStatus();
                        }}
                    />
                )}
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        width: '100%',
                        height: '100%'
                    }}
                >
                    <AppBar />
                    <main
                        style={{
                            width: '100%',
                            flexGrow: 1,
                            height: 'calc(100% - 56px)',
                            marginTop: 56
                        }}
                    >
                        {showLoader && (
                            <CircularProgress
                                size={100}
                                thickness={1}
                                style={{ position: 'absolute', marginLeft: '-50px' }}
                            />
                        )}
                        {this.state.serverStatus.models &&
                            this.state.page === 0 &&
                            this.state.serverStatus.models.map((one: any) => (
                                <ModelCard
                                    model={one as ModelType}
                                    key={one.name}
                                    onDeleteModel={model => this.onModelDelete(model)}
                                    onShowSpec={model => this.onShowSpec(model)}
                                    onShowSim={model => this.onShowSim(model)}
                                    disabledToggler={this.state.disabledToggler}
                                    onChangeStatus={(status, model) => this.onModelStatusChange(status, model)}
                                />
                            ))}
                        {this.state.serverStatus &&
                            this.state.serverStatus.status &&
                            this.state.page === 1 && <ServerStatus status={this.state.serverStatus} />}
                        {this.state.serverStatus &&
                            this.state.serverStatus.status &&
                            this.state.page === 2 && (
                                <ServerConnections
                                    status={this.state.serverStatus}
                                    connectionId={this.socket.getConnectionId()}
                                />
                            )}
                        <div style={{ paddingBottom: '60px' }} />
                        <BottomNavigation
                            value={this.state.page}
                            showLabels
                            onChange={(_e, value) => this.setState({ page: value })}
                            style={{
                                position: 'fixed',
                                bottom: '0px',
                                width: '100%',
                                left: 'auto',
                                zIndex: 1110,
                                borderTop: '1px solid gray'
                            }}
                        >
                            <BottomNavigationButton label="Models" icon={<LibraryBooks />} />
                            <BottomNavigationButton label="Server" icon={<FavoriteIcon />} />
                            <BottomNavigationButton label="Connections" icon={<LocationOnIcon />} />
                        </BottomNavigation>
                        {isDialog || this.state.page !== 0 ? null : (
                            <Button
                                fab
                                color="primary"
                                aria-label="add"
                                onClick={() => this.setState({ createOpen: true })}
                                style={{ position: 'fixed', bottom: '70px', right: '20px', zIndex: 2000 }}
                            >
                                <AddIcon />
                            </Button>
                        )}
                    </main>
                </div>
            </div>
        );
    }
}

export default withRoot(withStyles(styles)<{}>(Index));
