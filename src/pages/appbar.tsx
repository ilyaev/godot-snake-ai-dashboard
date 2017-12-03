import * as React from 'react';
import { withStyles } from 'material-ui/styles';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import Button from 'material-ui/Button';
import IconButton from 'material-ui/IconButton';
import MenuIcon from 'material-ui-icons/Menu';

const styles = (theme: any) => ({
    root: {
        marginTop: theme.spacing.unit * 3,
        width: '100%'
    },
    flex: {
        flex: 1
    },
    menuButton: {
        marginLeft: -12,
        marginRight: 20
    }
});

function ButtonAppBar(props: any) {
    const { classes } = props;
    return (
        <AppBar position="static" style={{ position: 'fixed', top: '0px', left: 'auto', zIndex: 1100 }}>
            <Toolbar>
                <IconButton className={classes.menuButton} color="contrast" aria-label="Menu">
                    <MenuIcon />
                </IconButton>
                <Typography type="title" color="inherit" className={classes.flex}>
                    Snake AI Dashboard
                </Typography>
                <Button color="contrast">Login</Button>
            </Toolbar>
        </AppBar>
    );
}

export default withStyles(styles)(ButtonAppBar);
