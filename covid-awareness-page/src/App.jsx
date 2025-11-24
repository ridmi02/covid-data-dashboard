import './App.css';
import {
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  Box,
  Container,
  Stack,
  Typography,
  Grid,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import DataCard from './components/DataCard';
import ChartDashboard from './components/ChartDashboard';

function ChartDashboardRoute() {
  const { view } = useParams();
  const navigate = useNavigate();
  const normalizedView = view === 'deaths' ? 'deaths' : 'cases';

  return (
    <ChartDashboard
      chartPage={normalizedView}
      onChartPageChange={(next) => navigate(`/charts/${next}`)}
    />
  );
}

function App() {
  const location = useLocation();
  const tabValue = location.pathname.includes('/charts/deaths')
    ? '/charts/deaths'
    : '/charts/cases';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: { xs: 4, md: 8 },
        px: { xs: 2, md: 4 },
        background: 'radial-gradient(1200px 500px at 10% 10%, rgba(74,163,232,0.12), transparent), #020916',
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={5}>
          <Paper
            elevation={12}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 5,
              textAlign: 'center',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Stack spacing={2} alignItems="center">
              <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
                Global COVID-19 Awareness Dashboard 🌍
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" maxWidth="md">
                Track emerging waves in real time, spotlight the hardest-hit regions, and dive into country-level insights to stay informed.
              </Typography>
              <Tabs
                value={tabValue}
                onChange={() => {}}
                centered
                variant="scrollable"
                allowScrollButtonsMobile
                textColor="secondary"
                indicatorColor="secondary"
              >
                <Tab label="Daily Cases" value="/charts/cases" component={Link} to="/charts/cases" />
                <Tab label="Daily Deaths" value="/charts/deaths" component={Link} to="/charts/deaths" />
              </Tabs>
            </Stack>
          </Paper>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <DataCard
                title="Total Confirmed Deaths"
                value="6.98M"
                description="Global cumulative mortality reported to date."
                color="#F06292"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DataCard
                title="Avg Case Fatality Ratio"
                value="1.2%"
                description="Average ratio of deaths to confirmed cases globally."
                color="#4AA3E8"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DataCard
                title="Daily New Cases (7-Day Avg)"
                value="45,200"
                description="Current 7-day rolling average of new cases."
                color="#27AE60"
              />
            </Grid>
          </Grid>

          <Stack spacing={2}>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 600 }}>
              Interactive Global Trends
            </Typography>
            <Routes>
              <Route path="/" element={<Navigate to="/charts/cases" replace />} />
              <Route path="/charts/:view" element={<ChartDashboardRoute />} />
              <Route path="*" element={<Navigate to="/charts/cases" replace />} />
            </Routes>
          </Stack>
        </Stack>
      </Container>

      <Box
        component="footer"
        sx={{
          textAlign: 'center',
          mt: 6,
          color: 'text.secondary',
          fontSize: '0.9rem',
        }}
      >
        Data provided for educational purposes. Source: JHU CSSE. Consult official health organizations for guidance.
      </Box>
    </Box>
  );
}

export default App;