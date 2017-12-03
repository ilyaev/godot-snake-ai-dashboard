import * as React from 'react';
import Paper from 'material-ui/Paper';
import Typography from 'material-ui/Typography';
// import totime from 'to-time';
import humanize from 'humanize-duration';
import {} from 'date';
type Props = {
    status: any;
};

type State = {};

class ServerStatus extends React.Component<Props, State> {
    state = {
        open: false
    };

    renderOne(caption: string, value: any) {
        return (
            <div style={{ marginBottom: '20px' }}>
                <Typography type="subheading" component="h3">
                    {caption}
                </Typography>
                <Typography type="title" component="p">
                    {value}
                </Typography>
            </div>
        );
    }

    render() {
        return (
            <div style={{ margin: '20px', textAlign: 'left' }}>
                <Paper elevation={4} style={{ padding: '10px', marginBottom: '10px' }}>
                    {this.renderOne('Status', this.props.status.status)}
                    {this.renderOne('Connections', this.props.status.connections)}
                    {this.renderOne('Learning Cycles', this.props.status.learningCycles)}
                    {this.renderOne('Uptime', humanize(Math.floor(this.props.status.upTime), { round: true }))}
                    {this.renderOne('Last Sync', new Date(this.props.status.lastPoll).toUTCString())}
                </Paper>
            </div>
        );
    }
}

export default ServerStatus;
