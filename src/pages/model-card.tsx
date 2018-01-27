import * as React from 'react';
import Button from 'material-ui/Button';
import Typography from 'material-ui/Typography';
import Card, { CardActions, CardContent } from 'material-ui/Card';
import Switch from 'material-ui/Switch';
import Box, { Container, Center } from 'react-layout-components';
import Paper from 'material-ui/Paper';
import Grid from 'material-ui/Grid';
import Trend from 'react-trend';
import IconButton from 'material-ui/IconButton';
import DeleteIcon from 'material-ui-icons/Delete';
import Toolbar from 'material-ui/Toolbar';

type State = {
    specOpen: boolean;
};

export type ModelType = {
    name: string;
    params: any;
    spec: any;
    archive: boolean;
    worker: any;
};

type Props = {
    model: ModelType;
    disabledToggler: boolean;
    onChangeStatus: (status: boolean, name: string) => void;
    onDeleteModel: (name: string) => void;
    onShowSpec: (name: string) => void;
    onShowSim: (name: string) => void;
    onArchiveModel: (name: string, archive: boolean) => void;
};

class ModelCard extends React.Component<Props, State> {
    state = {
        specOpen: false
    };

    render() {
        return (
            <Card
                style={{
                    margin: '10px',
                    backgroundColor: this.props.disabledToggler
                        ? '#FFEEDD'
                        : this.props.model.worker.active ? '#C3E9B3' : 'white'
                }}
                key={this.props.model.name}
            >
                <CardContent>
                    <Typography type="headline" component="h2">
                        {this.renderClientHeader()}
                        {this.renderResults()}
                    </Typography>
                </CardContent>
                <CardActions>
                    <Center fit>
                        <Button
                            color="inherit"
                            style={{ marginRight: '10px' }}
                            disabled={this.props.disabledToggler}
                            onClick={() => this.props.onArchiveModel(this.props.model.name, !this.props.model.archive)}
                        >
                            {this.props.model.archive ? 'Restore' : 'Archive'}
                        </Button>
                        <Button
                            color="inherit"
                            style={{ marginRight: '10px' }}
                            disabled={this.props.disabledToggler}
                            onClick={() => this.props.onShowSpec(this.props.model.name)}
                        >
                            Spec
                        </Button>
                        <Button
                            color="inherit"
                            disabled={this.props.disabledToggler}
                            onClick={() => this.props.onShowSim(this.props.model.name)}
                        >
                            Simulate
                        </Button>
                    </Center>
                </CardActions>
            </Card>
        );
    }

    renderCell(caption: string, value: string) {
        return (
            <Grid key={caption} item>
                <Paper style={{ width: '150px', height: '50px', padding: '5px', marginRight: '10px' }}>
                    <Typography type="subheading">{caption}</Typography>
                    <Typography type="title">{value}</Typography>
                </Paper>
            </Grid>
        );
    }

    renderChart(caption: string, data: any[]) {
        const values = data.map(one => one.a || one.t);
        const max = values.reduce((result, next) => (next > result ? next : result), 0);
        const mvalues = caption === '10' ? data.map(one => one.t) : [];
        const mmax = caption === '10' ? mvalues.reduce((result, next) => (next > result ? next : result), 0) : 0;

        const last = values[values.length - 1];
        const mlast = mvalues[mvalues.length - 1];
        if (!data.length) {
            return '-';
        }
        return (
            <Grid container justify="center" spacing={8}>
                <Grid key={'progress1'} item style={{ width: '50px', marginTop: '10px' }}>
                    <Typography type="subheading">{caption}</Typography>
                </Grid>
                <Grid key={'progress2'} item>
                    <Trend
                        style={{ width: '200px', height: '60px' }}
                        smooth
                        autoDrawEasing="ease-out"
                        data={values}
                        gradient={['purple', 'violet']}
                        radius={10}
                        strokeWidth={2}
                        strokeLinecap={'butt'}
                    />
                    {caption === '10' && <br />}
                    {caption === '10' && (
                        <Trend
                            style={{ width: '200px', height: '60px' }}
                            smooth
                            autoDrawEasing="ease-out"
                            data={mvalues}
                            gradient={['purple', 'violet']}
                            radius={10}
                            strokeWidth={2}
                            strokeLinecap={'butt'}
                        />
                    )}
                </Grid>
                <Grid key={'progress3'} item style={{ width: '50px', marginTop: '10px' }}>
                    <Typography type="subheading">
                        {max}
                        <br />
                        {last}
                        {caption === '10' && (
                            <div>
                                <br />
                                {mmax}
                                <br />
                                {mlast}
                            </div>
                        )}
                    </Typography>
                </Grid>
            </Grid>
        );
    }

    renderResults() {
        const result = this.props.model.worker.status.result;
        if (!result) {
            return '-';
        }
        if (!result.epoch && result.step) {
            result.epoch = result.step;
        }
        return result && result.epoch ? (
            <Grid container justify="center" spacing={8}>
                {this.renderCell('Epoch', result.epoch.toLocaleString())}
                {this.renderCell('Wins', result.wins.toLocaleString())}
                <Grid key={'progress'} item>
                    <Paper style={{ width: '328px', padding: '5px', marginRight: '10px' }}>
                        <Typography type="subheading">{'Period, Progression, Max(Avg) Tail Size'}</Typography>
                        {result.history && result.history['10'] && this.renderChart('10', result.history['10'])}
                        {result.history &&
                            result.history['100'] &&
                            result.history['100'].length > 0 &&
                            this.renderChart('100', result.history['100'])}
                        {result.history &&
                            result.history['1000'] &&
                            result.history['1000'].length > 0 &&
                            this.renderChart('1000', result.history['1000'])}
                    </Paper>
                </Grid>
            </Grid>
        ) : (
            '-'
        );
    }

    renderControls() {
        const result = this.props.model.worker.status.result;
        return result && result.step ? (
            <Container column style={{ marginTop: '20px' }}>
                <Box>
                    <Paper>
                        <Typography type="subheading">Steps</Typography>
                        <Typography type="title">{result.step.toLocaleString()}</Typography>
                    </Paper>
                </Box>
                <Box>
                    <Typography type="body1" gutterBottom>
                        Wins: {result.wins.toLocaleString()}
                    </Typography>
                </Box>
            </Container>
        ) : (
            '-'
        );
    }

    renderClientHeader() {
        return (
            <Toolbar>
                <Typography type="title" color="inherit">
                    {this.props.model.name} / {this.props.model.params.homelevel || 'random'} /{' '}
                    {this.props.model.spec.epsilon || '-'}
                </Typography>
                {this.props.model.worker.active ? null : (
                    <IconButton
                        style={{
                            marginLeft: -5,
                            marginTop: 0,
                            marginRight: 20
                        }}
                        onClick={() => this.props.onDeleteModel(this.props.model.name)}
                        aria-label="Menu"
                    >
                        <DeleteIcon />
                    </IconButton>
                )}
                <Typography type="title" color="inherit" style={{ flex: 1 }}>
                    &nbsp;
                </Typography>
                <Switch
                    checked={this.props.model.worker.active}
                    disabled={this.props.disabledToggler}
                    onChange={(event, checked) => {
                        this.props.onChangeStatus(checked, this.props.model.name);
                    }}
                />
            </Toolbar>
        );
    }
}

export default ModelCard;
