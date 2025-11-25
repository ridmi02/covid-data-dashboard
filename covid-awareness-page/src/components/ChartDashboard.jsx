import React, { useState, useEffect, useMemo, useTransition } from 'react';
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
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Link as MuiLink,
  Avatar,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import countriesLib from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import { countries as countriesMeta } from 'countries-list';
import './ChartDashboard.css';
import MapChart from './MapChart';

try {
  countriesLib.registerLocale(enLocale);
} catch (e) {
  // ignore if already registered
}

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

const REGION_FILTERS = [
  { value: 'global', label: 'Global', continentCodes: null },
  { value: 'africa', label: 'Africa', continentCodes: ['AF'] },
  { value: 'asia', label: 'Asia', continentCodes: ['AS'] },
  { value: 'europe', label: 'Europe', continentCodes: ['EU'] },
  { value: 'north-america', label: 'North America', continentCodes: ['NA'] },
  { value: 'south-america', label: 'South America', continentCodes: ['SA'] },
  { value: 'oceania', label: 'Oceania', continentCodes: ['OC'] },
];

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const POLICY_TYPE_COLORS = {
  Travel: 'primary',
  Vaccination: 'success',
  Testing: 'info',
  Mask: 'warning',
  Lockdown: 'error',
};

const continentCache = new Map();

const getContinentCodeForCountry = (countryName) => {
  if (!countryName) return null;
  if (continentCache.has(countryName)) {
    return continentCache.get(countryName);
  }
  try {
    const alpha2 = countriesLib.getAlpha2Code(countryName, 'en');
    if (alpha2) {
      const meta = countriesMeta[alpha2];
      if (meta && meta.continent) {
        continentCache.set(countryName, meta.continent);
        return meta.continent;
      }
    }
  } catch (e) {
    continentCache.set(countryName, null);
    return null;
  }
  continentCache.set(countryName, null);
  return null;
};

const matchesRegionFilter = (countryName, filterValue) => {
  if (filterValue === 'global') return true;
  const filter = REGION_FILTERS.find((f) => f.value === filterValue);
  if (!filter) return true;
  const continent = getContinentCodeForCountry(countryName);
  return continent ? filter.continentCodes?.includes(continent) : false;
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
    <p className="chart-description">
      Aggregated daily counts sum confirmed infections reported across all countries. Values represent the latest 180 days of data and are smoothed only by daily totals (no additional averaging).
    </p>
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
    <p className="chart-description">
      Shows reported COVID-19 fatalities per day. When specific daily counts are missing in the source, values are computed from cumulative totals to avoid gaps.
    </p>
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
  const [regionFilter, setRegionFilter] = useState('global');
  const [isPending, startTransition] = useTransition();
  const [policyEvents, setPolicyEvents] = useState([]);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState(null);

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

  useEffect(() => {
    setPolicyLoading(true);
    fetch('/policy_events.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load policy timeline');
        return res.json();
      })
      .then((events) => {
        setPolicyEvents(Array.isArray(events) ? events : []);
        setPolicyLoading(false);
        setPolicyError(null);
      })
      .catch((err) => {
        console.error('Policy tracker load error', err);
        setPolicyError('Unable to load policy tracker data.');
        setPolicyLoading(false);
      });
  }, []);

  // useMemo is hook #5. It MUST be called unconditionally.
  const filteredData = useMemo(() => {
    if (regionFilter === 'global') return data;
    return data.filter((row) => matchesRegionFilter(row.Country, regionFilter));
  }, [data, regionFilter]);

  const { globalDailyTrends, countryCFRsTop10, countryCFRsAll } = useMemo(() => {
    
    // Safety check inside useMemo is fine, as the hook itself is always called.
    if (filteredData.length === 0) {
        return { globalDailyTrends: [], countryCFRsTop10: [], countryCFRsAll: [] };
    }

    // 1. Global Daily Trends (compute New_Cases from Cumulative_Cases and sum New_Deaths)
    const globalDailyDataMap = {};
    // keep track of previous cumulative cases per country to compute daily new cases
    const prevCumCasesByCountry = {};
    const prevCumDeathsByCountry = {};

    filteredData.forEach(row => {
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
    const countryTotalsMap = filteredData.reduce((acc, row) => {
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

  }, [filteredData]); // Only recalculate when raw data changes

  // Selected country state for side panel
  const [mapMetric, setMapMetric] = useState('Cases');

  const handleRegionChange = (_, value) => {
    if (value) {
      startTransition(() => setRegionFilter(value));
    }
  };

  const filteredPolicies = useMemo(() => {
    if (!policyEvents.length) return [];
    return policyEvents
      .filter((event) => {
        if (event.region === 'global') return true;
        if (regionFilter === 'global') return true;
        return event.region === regionFilter;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [policyEvents, regionFilter]);

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
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Stack spacing={0.5}>
          <Typography variant="overline" color="text.secondary">
            Region focus
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Filter every visualization by continent to understand localized outbreaks without global dilution.
          </Typography>
        </Stack>
        <ToggleButtonGroup
          value={regionFilter}
          exclusive
          size="small"
          onChange={handleRegionChange}
          aria-label="Region filter"
          color="primary"
        >
          {REGION_FILTERS.map((region) => (
            <ToggleButton key={region.value} value={region.value} aria-label={region.label}>
              {region.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      {isPending && (
        <LinearProgress sx={{ width: '100%', borderRadius: 999 }} color="secondary" />
      )}

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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                CFR (Case Fatality Ratio) reflects the proportion of recorded COVID-19 cases that resulted in death for each country. Limitations in testing/reporting can push ratios higher or lower than reality, so treat this as an indicator rather than an exact mortality rate.
              </Typography>
              <TopCFRTable data={countryCFRsTop10} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={8}>
        <CardHeader
          title="Policy Tracker"
          subheader="Key interventions aligned with the selected region"
        />
        <Divider />
        <CardContent>
          {policyLoading ? (
            <LinearProgress color="secondary" />
          ) : policyError ? (
            <Typography color="error">{policyError}</Typography>
          ) : filteredPolicies.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No recorded policy events for this region yet.
            </Typography>
          ) : (
            <List>
              {filteredPolicies.map((event) => (
                <ListItem key={`${event.date}-${event.title}`} alignItems="flex-start">
                  <ListItemIcon>
                    <Avatar
                      sx={{
                        bgcolor: `${POLICY_TYPE_COLORS[event.type] || 'primary'}.main`,
                        width: 36,
                        height: 36,
                        fontSize: 12,
                      }}
                    >
                      {event.type?.[0] || 'P'}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle2" component="span">
                          {event.title}
                        </Typography>
                        {event.type && (
                          <Chip
                            size="small"
                            color={POLICY_TYPE_COLORS[event.type] || 'default'}
                            label={event.type}
                          />
                        )}
                      </Stack>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(event.date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {event.region && event.region !== 'global'
                            ? ` · ${REGION_FILTERS.find((r) => r.value === event.region)?.label || event.region}`
                            : ' · Global'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {event.description}
                        </Typography>
                        {event.link && (
                          <MuiLink
                            href={event.link}
                            target="_blank"
                            rel="noreferrer"
                            variant="body2"
                          >
                            Learn more
                          </MuiLink>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Hover or tap a country to view the selected metric. Use the dropdown to switch between cumulative cases, deaths, or computed CFR percentages; the legend updates automatically to match the current data range.
            </Typography>
            <MapChart data={countryCFRsAll} metric={mapMetric} />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default ChartDashboard;