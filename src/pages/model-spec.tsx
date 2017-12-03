import * as React from 'react';
import Button from 'material-ui/Button';
import Dialog, { DialogActions, DialogContent, DialogTitle } from 'material-ui/Dialog';
// import TextField from 'material-ui/TextField';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import Typography from 'material-ui/Typography';

type Props = {
    caption?: string;
    text?: string;
    open: boolean;
    onOk: (form: any) => any;
    onCancel: () => any;
    worker: any;
};

type State = {
    form: any;
    open: boolean;
};

class ModelSpecDialog extends React.Component<Props, State> {
    state = {
        open: false,
        form: {} as any
    };

    handleClickOk = () => {
        this.props.onOk(Object.assign({}, this.state.form));
        this.setState({ form: {} });
    };

    handleClickCancel = () => {
        this.setState({ form: {} });
        this.props.onCancel();
    };

    handleChange = (name: string) => (event: any) => {
        let form = this.state.form;
        form[name] = event.target ? event.target.value : event;
        this.setState({
            form
        } as any);
    };

    componentDidMount() {
        const spec = this.props.worker.status.spec;
        const form = Object.assign({}, spec);
        this.setState({ form });
    }

    render() {
        const style = { marginTop: '20px', marginBottom: '20px' };
        const handleStyle = {
            height: 28,
            width: 28,
            marginLeft: -14,
            marginTop: -14
        };
        return (
            <Dialog fullWidth={true} open={this.props.open} onRequestClose={this.handleClickCancel}>
                <DialogTitle>Model Spec</DialogTitle>
                <DialogContent>
                    <Typography type="caption" color="inherit">
                        {'Epsilon (Exploration rate): ' + this.state.form.epsilon}
                    </Typography>
                    <Slider
                        style={style}
                        value={this.state.form.epsilon}
                        defaultValue={0.2}
                        min={0.001}
                        max={0.6}
                        step={0.001}
                        onChange={this.handleChange('epsilon')}
                        marks={{ '0.6': '0.6' }}
                        handleStyle={handleStyle}
                    />
                    <Typography type="caption" color="inherit">
                        {'Alpha (Learning rate): ' + this.state.form.alpha}
                    </Typography>
                    <Slider
                        style={style}
                        value={this.state.form.alpha}
                        defaultValue={0.02}
                        min={0.005}
                        max={0.1}
                        step={0.0005}
                        onChange={this.handleChange('alpha')}
                        marks={{ '0.1': '0.1' }}
                        handleStyle={handleStyle}
                    />
                    <Typography type="caption" color="inherit">
                        {'Gamma (Greed): ' + this.state.form.gamma}
                    </Typography>
                    <Slider
                        style={style}
                        value={this.state.form.gamma}
                        defaultValue={0.75}
                        min={0.3}
                        max={0.99}
                        step={0.01}
                        onChange={this.handleChange('gamma')}
                        marks={{ '0.99': '0.99' }}
                        handleStyle={handleStyle}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleClickCancel} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={this.handleClickOk} color="primary" autoFocus>
                        Update
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default ModelSpecDialog;
