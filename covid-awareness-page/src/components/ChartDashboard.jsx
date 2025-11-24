import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardContent,
  Stack,
  Typography,
  Button,
  Grid,
  Divider,
  Chip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import './ChartDashboard.css';
import MapChart from './MapChart';

// Robust CSV parser that handles quoted fields and commas inside quotes (basic RFC-4180)
const parseCSV = (csvText) => {
  if (!csvText) return [];
  const rows = [];
  let i = 0;
  const len = csvText.length;
  let cur = '';
  let row = [];
  let inQuotes = false;

  while (i < len) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        // escaped quote
        cur += '"';
        i += 1; // skip next
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      // handle CRLF and LF
      if (ch === '\r' && next === '\n') {
        i += 1; // skip the LF in CRLF
      }
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += ch;
    }
    i += 1;
  }
  // push last value
  if (cur !== '' || inQuotes || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  const data = [];
  for (let r = 1; r < rows.length; r++) {
    const values = rows[r];
    // skip empty trailing lines
    if (values.length === 1 && values[0] === '') continue;
    // if row has fewer columns, pad with empty strings
    const rowObj = {};
    for (let c = 0; c < headers.length; c++) {
      const raw = (values[c] || '').trim();
      const header = headers[c] || `col${c}`;
      if (header === 'Date') rowObj[header] = raw;
      else if (raw === '') rowObj[header] = '';
      else if (!isNaN(parseFloat(raw))) rowObj[header] = parseFloat(raw);
      else rowObj[header] = raw;
    }
    data.push(rowObj);
  }
  return data;
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

// --- CHART COMPONENTS MOVED OUTSIDE OF ChartDashboard ---
// 
// FIX: Removed ResponsiveContainer and set static width/height on LineChart, 
// relying on CSS (min-height: 350px) for layout.

const DailyCasesChart = ({ data: globalDailyTrends }) => (
  <div className="chart-box">
    <h3>Global Daily New Cases</h3>
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={globalDailyTrends} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="Date"
            tickFormatter={(tick) =>
              new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
          />
          <YAxis label={{ value: 'Cases', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="New_Cases" stroke="#27AE60" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const DailyDeathsChart = ({ data: globalDailyTrends }) => (
  <div className="chart-box">
    <h3>Global Daily New Deaths</h3>
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={globalDailyTrends} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="Date"
            tickFormatter={(tick) =>
              new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
          />
          <YAxis label={{ value: 'Deaths', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="New_Deaths" stroke="#A81921" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const TopCFRTable = ({ data: countryCFRs }) => (
  <TableContainer
    component={Paper}
    elevation={0}
    sx={{ background: 'transparent', boxShadow: 'none' }}
  >
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Country</TableCell>
          <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase' }} align="right">
            CFR (%)
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {countryCFRs.map((item) => (
          <TableRow
            key={item.Country}
            hover
            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
          >
            <TableCell>
              <Typography variant="body2" fontWeight={600}>
                {item.Country}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Chip
                size="small"
                color="error"
                label={`${item.CFR.toFixed(2)}%`}
                sx={{ fontWeight: 700 }}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

// --- MAIN DASHBOARD COMPONENT ---

function ChartDashboard({ chartPage: controlledChartPage, onChartPageChange }) {
  // 1. ALL HOOKS MUST BE DECLARED AT THE TOP (Unconditional)
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [internalChartPage, setInternalChartPage] = useState('cases');

  // useEffect is hook #4
  useEffect(() => {
    // Axios fetches the CSV from the public folder
    axios.get('/COVID_CASES_DEATHS_ANALYSIS.csv')
      .then(response => {
        const parsedData = parseCSV(response.data);
        setData(parsedData); 
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching or parsing data: ", err);
        setError("Failed to load data. Please check if 'COVID_CASES_DEATHS_ANALYSIS.csv' is in the public folder.");
        setLoading(false);
      });
  }, []);

  // useMemo is hook #5. It MUST be called unconditionally.
  const { globalDailyTrends, countryCFRsTop10, countryCFRsAll } = useMemo(() => {
    
    // Safety check inside useMemo is fine, as the hook itself is always called.
    if (data.length === 0) {
        return { globalDailyTrends: [], countryCFRsTop10: [], countryCFRsAll: [] };
    }

    // 1. Global Daily Trends (compute New_Cases from Cumulative_Cases and sum New_Deaths)
    const globalDailyDataMap = {};
    // keep track of previous cumulative cases per country to compute daily new cases
    const prevCumCasesByCountry = {};
    const prevCumDeathsByCountry = {};

    data.forEach(row => {
      const date = row.Date;
      if (!globalDailyDataMap[date]) {
        globalDailyDataMap[date] = {
          Date: date,
          New_Cases: 0,
          New_Deaths: 0,
        };
      }

      // Compute New_Cases from Cumulative_Cases deltas per country
      const cumCases = toNumber(row.Cumulative_Cases);
      const prevCases = prevCumCasesByCountry[row.Country] || 0;
      const newCasesDelta = Math.max(0, cumCases - prevCases);
      globalDailyDataMap[date].New_Cases += newCasesDelta;
      prevCumCasesByCountry[row.Country] = cumCases;

      // For deaths: prefer explicit New_Deaths if present, otherwise compute from cumulative deaths
      const newDeathsValue = toNumber(row.New_Deaths);
      if (newDeathsValue > 0) {
        globalDailyDataMap[date].New_Deaths += newDeathsValue;
      } else {
        const cumDeaths = toNumber(row.Cumulative_Deaths);
        const prevDeaths = prevCumDeathsByCountry[row.Country] || 0;
        const newDeathsDelta = Math.max(0, cumDeaths - prevDeaths);
        globalDailyDataMap[date].New_Deaths += newDeathsDelta;
        prevCumDeathsByCountry[row.Country] = cumDeaths;
      }
    });

    const trends = Object.values(globalDailyDataMap).slice(-180);

    // 2. Top CFR Countries: capture max cumulative counts per country to avoid trailing zero rows
    const countryTotalsMap = data.reduce((acc, row) => {
      if (!row || !row.Country) return acc;
      const country = row.Country;
      const cases = toNumber(row.Cumulative_Cases);
      const deaths = toNumber(row.Cumulative_Deaths);
      const existing = acc[country] || { Country: country, Cases: 0, Deaths: 0 };
      existing.Cases = Math.max(existing.Cases, cases);
      existing.Deaths = Math.max(existing.Deaths, deaths);
      acc[country] = existing;
      return acc;
    }, {});

    const countryTotals = Object.values(countryTotalsMap)
      .map(c => ({
        Country: c.Country,
        Cases: c.Cases,
        Deaths: c.Deaths,
        CFR: c.Cases > 0 ? (c.Deaths / c.Cases) * 100 : 0,
      }))
      .filter(c => c.Country && c.Country !== 'Unknown');

    const top10 = countryTotals
      .filter(c => c.CFR > 0)
      .sort((a, b) => b.CFR - a.CFR)
      .slice(0, 10)
      .map(({ Country, CFR }) => ({ Country, CFR }));

    return { globalDailyTrends: trends, countryCFRsTop10: top10, countryCFRsAll: countryTotals };

  }, [data]); // Only recalculate when raw data changes

  // Selected country state for side panel
  const [mapMetric, setMapMetric] = useState('Cases');

  // 2. CONDITIONAL RETURNS COME AFTER ALL HOOKS

  if (loading) return <div className="loading-message">Loading Interactive Data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  // Only render charts if data is available after filtering/transforming
    if (globalDailyTrends.length === 0) {
      return <div className="loading-message">Data is loading or empty after transformation...</div>;
    }

  const isControlled = typeof controlledChartPage === 'string';
  const activeKey = isControlled ? controlledChartPage : internalChartPage;

  const chartViews = {
    cases: {
      id: 'cases',
      title: 'Global Daily New Cases',
      component: <DailyCasesChart data={globalDailyTrends} />,
      pageLabel: 'Page 1',
    },
    deaths: {
      id: 'deaths',
      title: 'Global Daily New Deaths',
      component: <DailyDeathsChart data={globalDailyTrends} />,
      pageLabel: 'Page 2',
    },
  };

  const activeChart = chartViews[activeKey] || chartViews.cases;
  const nextChartKey = activeChart.id === 'cases' ? 'deaths' : 'cases';
  const nextChart = chartViews[nextChartKey];
  const handleChartPageChange = () => {
    const target = nextChart.id;
    if (onChartPageChange) onChartPageChange(target);
    else setInternalChartPage(target);
  };

  return (
    <Stack spacing={3}>
      <Card
        elevation={10}
        sx={{
          borderRadius: 4,
          backgroundImage: 'linear-gradient(145deg, rgba(8,18,38,0.9), rgba(10,30,64,0.85))',
        }}
      >
        <CardHeader
          title={
            <Stack spacing={0.5}>
              <Typography variant="overline" color="text.secondary">
                {activeChart.pageLabel}
              </Typography>
              <Typography variant="h5">{activeChart.title}</Typography>
            </Stack>
          }
          action={
            <Button
              variant="contained"
              color="primary"
              endIcon={<ArrowForwardIcon />}
              onClick={handleChartPageChange}
            >
              View {nextChart.title}
            </Button>
          }
        />
        <Divider />
        <CardContent>
          <Box className="chart-wrapper">{activeChart.component}</Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card elevation={8} sx={{ height: '100%' }}>
            <CardHeader
              title="Top 10 by Case Fatality Ratio"
              subheader="Highest observed CFR across countries"
              action={
                <Chip
                  color="secondary"
                  label={`${countryCFRsTop10.length} highlighted`}
                  size="small"
                />
              }
            />
            <Divider />
            <CardContent>
              <TopCFRTable data={countryCFRsTop10} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={10}>
        <CardHeader
          title="Interactive World Map"
          subheader="Pan, zoom, and tap regions to compare outbreaks"
          action={
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="mapMetric-label">Metric</InputLabel>
              <Select
                labelId="mapMetric-label"
                id="mapMetric"
                value={mapMetric}
                label="Metric"
                onChange={(e) => setMapMetric(e.target.value)}
              >
                <MenuItem value="Cases">Cases (Total confirmed)</MenuItem>
                <MenuItem value="Deaths">Deaths (Total confirmed)</MenuItem>
                <MenuItem value="CFR">Case Fatality Ratio (CFR)</MenuItem>
              </Select>
            </FormControl>
          }
        />
        <Divider />
        <CardContent>
          <Box sx={{ minHeight: 420 }}>
            <MapChart data={countryCFRsAll} metric={mapMetric} />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default ChartDashboard;