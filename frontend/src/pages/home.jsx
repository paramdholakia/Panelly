import React, { useContext, useState } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import "../App.css";
import { Button, IconButton, TextField, Paper, Typography, Fade, Tooltip } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import LogoutIcon from '@mui/icons-material/Logout';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {
    const navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const { addToUserHistory } = useContext(AuthContext);

    const createNewMeeting = () => {
        const code = Math.random().toString(36).substring(2, 9);
        setMeetingCode(code);
    };

    const handleJoinVideoCall = async () => {
        if (!meetingCode.trim()) return;
        await addToUserHistory(meetingCode);
        navigate(`/${meetingCode}`);
    };

    return (
        <div className='homePageWrapper'>
            <header className='appHeader'>
                <div className='brandArea' onClick={() => navigate('/')}> 
                    <img src='/panelly_logo.png' alt='Panelly' className='headerLogo' />
                    <h1 className='appName'>Panelly</h1>
                </div>
                <div className='headerActions'>
                    <Tooltip title='History'>
                        <IconButton color='primary' onClick={() => navigate('/history')}>
                            <RestoreIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title='Logout'>
                        <IconButton color='primary' onClick={() => { localStorage.removeItem('token'); navigate('/auth'); }}>
                            <LogoutIcon />
                        </IconButton>
                    </Tooltip>
                </div>
            </header>

            <main className='homeMain'>
                <Fade in timeout={600}>
                    <Paper elevation={6} className='meetingCard'>
                        <div className='meetingCardHeader'>
                            <VideocamRoundedIcon className='cardIcon' />
                            <Typography variant='h5' fontWeight={600}>Start or Join a Meeting</Typography>
                        </div>
                        <Typography variant='body2' className='mutedText'>Create a new room or join an existing one with a code.</Typography>
                        <div className='meetingActions'>
                            <Button startIcon={<AddCircleOutlineIcon />} variant='contained' color='primary' onClick={createNewMeeting}>New Code</Button>
                            <TextField size='small' label='Meeting Code' value={meetingCode} onChange={e => setMeetingCode(e.target.value)} className='meetingInput' />
                            <Button variant='outlined' color='primary' onClick={handleJoinVideoCall} disabled={!meetingCode.trim()}>Join</Button>
                        </div>
                        <div className='hintRow'>Tip: Share the code with others to let them join quickly.</div>
                    </Paper>
                </Fade>
                <div className='illustrationPane'>
                    <div className='circleGlow'></div>
                    <img src='/logo3.png' alt='Illustration' className='illustrationImg' />
                </div>
            </main>
        </div>
    );
}


export default withAuth(HomeComponent)