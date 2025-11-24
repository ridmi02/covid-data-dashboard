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
              <Typography variant="body2" color="text.secondary" maxWidth="sm">
                This snapshot summarizes the latest WHO/JHU situation reports, combining cumulative case and death counts with derived daily trends. Switch between the tabs below to compare case and death trajectories over the past six months.
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

          <Stack
            direction="row"
            spacing={3}
            flexWrap="wrap"
            justifyContent="space-between"
            sx={{ width: '100%' }}
          >
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 260 }}>
              <DataCard
                title="Total Confirmed Deaths"
                value="6.98M"
                description="Cumulative mortality since January 2020. Derived from the Johns Hopkins CSSE global time series."
                color="#F06292"
              />
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 260 }}>
              <DataCard
                title="Avg Case Fatality Ratio"
                value="1.2%"
                description="Global deaths divided by total cases. A higher ratio signals health-system strain or reporting delays."
                color="#4AA3E8"
              />
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 260 }}>
              <DataCard
                title="Daily New Cases (7-Day Avg)"
                value="45,200"
                description="Seven-day mean of newly reported infections. Helps smooth weekend dips or late reporting."
                color="#27AE60"
              />
            </Box>
          </Stack>

          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h4" component="h2" sx={{ fontWeight: 600 }}>
                Interactive Global Trends
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The area below combines two perspectives: a time-series view of worldwide daily cases/deaths (switchable via the pager) and a comparative ranking of the countries with the highest case fatality ratios. Use the map legend to explore per-country metrics in context.
              </Typography>
            </Stack>
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