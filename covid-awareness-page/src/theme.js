import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#4aa3e8' },
    secondary: { main: '#27AE60' },
    background: {
      default: '#020916',
      paper: '#0b1622',
    },
    text: {
      primary: '#e6eef8',
      secondary: '#9fb3c8',
    },
  },
  typography: {
    fontFamily: ['Inter', 'Poppins', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h1: { fontWeight: 700, letterSpacing: '-0.5px' },
    h2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(135deg, rgba(18,44,89,0.6), rgba(9,17,37,0.88))',
        },
      },
    },
  },
});

export default theme;

