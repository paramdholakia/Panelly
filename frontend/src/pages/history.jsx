import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { IconButton, Paper, Typography, Tooltip } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import VideocamIcon from '@mui/icons-material/Videocam';
export default function History() {


    const { getHistoryOfUser } = useContext(AuthContext);

    const [meetings, setMeetings] = useState([])


    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch {
                // IMPLEMENT SNACKBAR
            }
        }

        fetchHistory();
    }, [])

    let formatDate = (dateString) => {

        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear();

        return `${day}/${month}/${year}`

    }

        return (
            <div className='historyWrapper'>
                <div className='historyHeader'>
                    <Tooltip title='Back to Home'>
                        <IconButton color='primary' onClick={() => routeTo('/home')}>
                            <HomeIcon />
                        </IconButton>
                    </Tooltip>
                    <Typography variant='h5' fontWeight={600}>Meeting History</Typography>
                </div>
                <div className='historyList'>
                    {meetings.length !== 0 ? meetings.map((e, i) => (
                        <Paper key={i} className='historyItem' elevation={3}>
                            <div className='historyIcon'><VideocamIcon fontSize='small'/></div>
                            <div className='historyMeta'>
                                <span className='historyCode'>{e.meetingCode}</span>
                                <span className='historyDate'>{formatDate(e.date)}</span>
                            </div>
                        </Paper>
                    )) : <Typography variant='body2' className='mutedText'>No meetings yet.</Typography>}
                </div>
            </div>
        );
}
