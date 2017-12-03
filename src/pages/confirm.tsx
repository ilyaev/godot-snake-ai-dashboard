import * as React from 'react';
import Button from 'material-ui/Button';
import Dialog, { DialogActions, DialogContent, DialogContentText, DialogTitle } from 'material-ui/Dialog';

type Props = {
    caption?: string;
    text?: string;
    open: boolean;
    onOk: () => any;
    onCancel: () => any;
};

type State = {
    open: boolean;
};

class ConfirmDialog extends React.Component<Props, State> {
    state = {
        open: false
    };

    handleClickOk = () => {
        this.props.onOk();
    };

    handleClickCancel = () => {
        this.props.onCancel();
    };

    render() {
        return (
            <Dialog fullWidth={true} open={this.props.open} onRequestClose={this.handleClickCancel}>
                <DialogTitle>{this.props.caption || 'Confirm Action'}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{this.props.text || 'Are You Sure?'}</DialogContentText>
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

export default ConfirmDialog;
