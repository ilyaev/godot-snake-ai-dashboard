import * as React from 'react';
import Button from 'material-ui/Button';
import Dialog, { DialogActions, DialogContent, DialogContentText, DialogTitle } from 'material-ui/Dialog';

type Props = {
    caption?: string;
    text?: string;
    open: boolean;
    onOk: () => any;
};

type State = {
    open: boolean;
};

class ErrorAlert extends React.Component<Props, State> {
    state = {
        open: false
    };

    handleClickOk = () => {
        this.props.onOk();
    };

    render() {
        return (
            <Dialog fullWidth={true} open={this.props.open} onRequestClose={this.handleClickOk}>
                <DialogTitle>{this.props.caption || 'Alert'}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{this.props.text || 'Alert Text'}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleClickOk} color="primary" autoFocus>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default ErrorAlert;
