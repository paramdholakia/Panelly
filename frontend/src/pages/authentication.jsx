import * as React from 'react';
import { Button, TextField, Paper, Typography, Snackbar, Tabs, Tab, Box } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { AuthContext } from '../contexts/AuthContext';



export default function Authentication() {

    

    const [username, setUsername] = React.useState();
    const [password, setPassword] = React.useState();
    const [name, setName] = React.useState();
    const [error, setError] = React.useState();
    const [message, setMessage] = React.useState();


    const [formState, setFormState] = React.useState(0);

    const [open, setOpen] = React.useState(false)


    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    let handleAuth = async () => {
        try {
            if (formState === 0) {

                let result = await handleLogin(username, password)


            }
            if (formState === 1) {
                let result = await handleRegister(name, username, password);
                console.log(result);
                setUsername("");
                setMessage(result);
                setOpen(true);
                setError("")
                setFormState(0)
                setPassword("")
            }
        } catch (err) {

            console.log(err);
            let message = (err.response.data.message);
            setError(message);
        }
    }


        return (
            <div className='authWrapper'>
                <Paper elevation={8} className='authCard'>
                    <div className='authIconCircle'>
                        <LockOutlinedIcon />
                    </div>
                    <Typography variant='h5' fontWeight={600} gutterBottom>Welcome</Typography>
                    <Typography variant='body2' className='mutedText' gutterBottom>{formState === 0 ? 'Login to continue your meetings' : 'Create an account to get started'}</Typography>
                    <Tabs value={formState} onChange={(_, v) => setFormState(v)} variant='fullWidth' className='authTabs'>
                        <Tab label='Sign In' />
                        <Tab label='Sign Up' />
                    </Tabs>
                    <Box component='form' noValidate className='authForm'>
                        {formState === 1 && (
                            <TextField
                                fullWidth
                                label='Full Name'
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                size='small'
                            />
                        )}
                        <TextField
                            fullWidth
                            label='Username'
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            size='small'
                        />
                        <TextField
                            fullWidth
                            label='Password'
                            type='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            size='small'
                        />
                        {error && <div className='errorText'>{error}</div>}
                        <Button fullWidth variant='contained' onClick={handleAuth} disabled={formState===1 && (!name || !username || !password)}>
                            {formState === 0 ? 'Login' : 'Register'}
                        </Button>
                    </Box>
                </Paper>
                <Snackbar open={open} autoHideDuration={4000} message={message} />
            </div>
        );
}