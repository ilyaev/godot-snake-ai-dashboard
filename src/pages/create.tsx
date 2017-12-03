import * as React from 'react';
import Button from 'material-ui/Button';
import Dialog, { DialogActions, DialogContent, DialogTitle } from 'material-ui/Dialog'; // DialogContentText,
import TextField from 'material-ui/TextField';

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
        form: {} as any
    };

    handleClickOk = () => {
        this.props.onOk(this.state.form);
    };

    handleClickCancel = () => {
        this.props.onCancel();
    };

    handleChange = (name: string) => (event: any) => {
        let form = this.state.form;
        form[name] = event.target.value;
        this.setState({
            form
        } as any);
    };

    render() {
        return (
            <Dialog fullWidth={true} open={this.props.open} onRequestClose={this.handleClickCancel}>
                <DialogTitle>Create New Model</DialogTitle>
                <DialogContent>
                    <TextField
                        id="name"
                        label="Name"
                        fullWidth={true}
                        value={this.state.form.name}
                        onChange={this.handleChange('name')}
                        margin="normal"
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
