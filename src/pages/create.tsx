import * as React from 'react';
import Button from 'material-ui/Button';
import Dialog, { DialogActions, DialogContent, DialogTitle } from 'material-ui/Dialog'; // DialogContentText,
import TextField from 'material-ui/TextField';
import { FormLabel, FormControl, FormGroup, FormControlLabel } from 'material-ui/Form';
import Checkbox from 'material-ui/Checkbox';
import { featureMap } from './const';
import Select from 'material-ui/Select';
import Input, { InputLabel } from 'material-ui/Input';
import { MenuItem } from 'material-ui/Menu';
import { levels } from '../common/levels';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import Typography from 'material-ui/Typography';

type Props = {
    caption?: string;
    text?: string;
    open: boolean;
    onOk: (form: any) => any;
    onCancel: () => any;
};

type State = {
    open: boolean;
    form: any;
};

class CreateModelDialog extends React.Component<Props, State> {
    state = {
        open: false,
        form: {
            features: ['2', '10'],
            level: '',
            rotation: 0
        } as any
    };

    handleClickOk = () => {
        this.props.onOk(this.state.form);
    };

    handleClickCancel = () => {
        this.props.onCancel();
    };

    handleChange = (name: string) => (event: any) => {
        let form = this.state.form;
        form[name] = event.target ? event.target.value : event;
        this.setState({
            form
        } as any);
    };

    handleCbChange = (name: any) => (event: any, checked: boolean) => {
        let form = this.state.form;
        if (!checked) {
            form.features = form.features.filter((one: any) => one !== name);
        }
        if (checked) {
            form.features.push(name);
        }
        this.setState({ form } as any);
    };

    handleLevelChange = (event: any) => {
        let form = this.state.form;
        form.level = event.target.value;
        this.setState({ form: Object.assign({}, form) } as any);
    };

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
                <DialogTitle>Create New Model</DialogTitle>
                <DialogContent>
                    <FormControl style={{ width: '300px', marginBottom: '-10px' }}>
                        <InputLabel htmlFor="age-simple">Training Level</InputLabel>
                        <Select
                            value={this.state.form.level}
                            onChange={this.handleLevelChange}
                            input={<Input name="level" id="age-simple" />}
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {levels.map(level => {
                                return (
                                    <MenuItem value={level.name} key={level.name}>
                                        {level.name}
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>

                    <TextField
                        id="name"
                        label="Name"
                        fullWidth={true}
                        value={this.state.form.name}
                        onChange={this.handleChange('name')}
                        margin="normal"
                    />

                    <FormControl component="fieldset" style={{ marginTop: '10px' }}>
                        <FormLabel>Input features</FormLabel>
                        <FormGroup>
                            {Object.keys(featureMap)
                                .map((one: any) => {
                                    return {
                                        value: one,
                                        label: featureMap[one]
                                    };
                                })
                                .map((one: any) => (
                                    <FormControlLabel
                                        key={'key_' + one.value}
                                        control={
                                            <Checkbox
                                                checked={this.state.form.features.indexOf(one.value) !== -1}
                                                value={one.value}
                                                onChange={this.handleCbChange(one.value)}
                                            />
                                        }
                                        label={one.label}
                                    />
                                ))}
                        </FormGroup>
                    </FormControl>
                    <Typography type="caption" color="inherit">
                        {'Level Rotation Frequency'}
                    </Typography>
                    <Slider
                        style={style}
                        value={this.state.form.rotation}
                        defaultValue={0}
                        min={0}
                        max={1000}
                        step={50}
                        onChange={this.handleChange('rotation')}
                        marks={{
                            1000: {
                                label: <strong>{this.state.form.rotation}</strong>
                            }
                        }}
                        handleStyle={handleStyle}
                    />
                    {/* <DialogContentText>Create New Model Right now!</DialogContentText> */}
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleClickCancel} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={this.handleClickOk} color="primary" autoFocus>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default CreateModelDialog;
