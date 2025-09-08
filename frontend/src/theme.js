import { createTheme } from '@mui/material/styles';

// Central theme (black + orange)
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#f97316', // orange accent
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#ea580c'
    },
    background: {
      default: '#0d0d0f',
      paper: '#16181d'
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8'
    }
  },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    }
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen"
  }
});

export default theme;
