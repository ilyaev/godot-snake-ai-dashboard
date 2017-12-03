import * as React from 'react';
import Paper from 'material-ui/Paper';
import Typography from 'material-ui/Typography';
// import totime from 'to-time';
import {} from 'date';
type Props = {
    status: any;
    connectionId: any;
};

type State = {};

class ServerConnections extends React.Component<Props, State> {
    state = {
        open: false
    };

    renderOne(one: any, connectionId: any) {
        const renderSubOne = (caption: string, value: any) => {
            return (
                <div style={{ marginBottom: '5px' }}>
                    <Typography type="subheading" component="h3">
                        {caption}
                    </Typography>
                    <Typography type="title" component="p">
                        {value}
                    </Typography>
                </div>
            );
        };
        return (
            <Paper
                key={one.key}
                elevation={4}
                style={{
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: connectionId === one.id ? '#C3E9B3' : 'white'
                }}
            >
                {renderSubOne('ID', one.id)}
                {renderSubOne('Key', one.key)}
                {renderSubOne('Model', one.arena ? one.arena.ai + ' - ' + one.arena.status : '-')}
                {renderSubOne(
                    'Spec',
                    one.arena
                        ? Object.keys(one.arena.spec)
                              .map(field => field + ': ' + one.arena.spec[field])
                              .join(', ')
                        : ' - '
                )}
            </Paper>
        );
    }

    render() {
        return (
            <div style={{ margin: '20px', textAlign: 'left' }}>
                {this.props.status.clients &&
                    this.props.status.clients.map((one: any) => this.renderOne(one, this.props.connectionId))}
            </div>
        );
    }
}

export default ServerConnections;
