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
import './ChartDashboard.css'; // New CSS file for this component
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
  <div className="chart-box">
    <h3>Top 10 Countries by Case Fatality Ratio (CFR)</h3>
    <div className="country-table-wrapper">
      <table className="country-table">
        <thead>
          <tr>
            <th>Country</th>
            <th>CFR (%)</th>
          </tr>
        </thead>
        <tbody>
          {countryCFRs.map((item, index) => (
            <tr key={item.Country}>
              <td>{item.Country}</td>
              <td className="cfr-value">{item.CFR.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// --- MAIN DASHBOARD COMPONENT ---

function ChartDashboard() {
  // 1. ALL HOOKS MUST BE DECLARED AT THE TOP (Unconditional)
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      const cumCases = isNaN(row.Cumulative_Cases) ? 0 : row.Cumulative_Cases;
      const prevCases = prevCumCasesByCountry[row.Country] || 0;
      const newCasesDelta = Math.max(0, cumCases - prevCases);
      globalDailyDataMap[date].New_Cases += newCasesDelta;
      prevCumCasesByCountry[row.Country] = cumCases;

      // For deaths: prefer explicit New_Deaths if present, otherwise compute from cumulative deaths
      if (!isNaN(row.New_Deaths)) {
        globalDailyDataMap[date].New_Deaths += row.New_Deaths;
      } else {
        const cumDeaths = isNaN(row.Cumulative_Deaths) ? 0 : row.Cumulative_Deaths;
        const prevDeaths = prevCumDeathsByCountry[row.Country] || 0;
        const newDeathsDelta = Math.max(0, cumDeaths - prevDeaths);
        globalDailyDataMap[date].New_Deaths += newDeathsDelta;
        prevCumDeathsByCountry[row.Country] = cumDeaths;
      }
    });

    const trends = Object.values(globalDailyDataMap).slice(-180);

    // 2. Top CFR Countries: use the latest cumulative counts per country by date
    // Pick the row with the newest Date for each country (more robust than 'last seen')
    const latestCountryData = data.reduce((acc, row) => {
      if (!row || !row.Country) return acc;
      const country = row.Country;
      // parse row date safely
      const rowDate = row.Date ? new Date(row.Date) : new Date(0);
      const existing = acc[country];
      const existingDate = existing && existing.Date ? new Date(existing.Date) : new Date(0);
      // if this row is newer than existing, replace
      if (!existing || rowDate >= existingDate) {
        acc[country] = {
          Country: country,
          Date: row.Date,
          Cumulative_Cases: isNaN(row.Cumulative_Cases) ? 0 : row.Cumulative_Cases,
          Cumulative_Deaths: isNaN(row.Cumulative_Deaths) ? 0 : row.Cumulative_Deaths,
          Case_Fatality_Ratio: isNaN(row.Case_Fatality_Ratio) ? undefined : row.Case_Fatality_Ratio,
        };
      }
      return acc;
    }, {});

    const countryTotals = Object.values(latestCountryData)
      .map(c => ({
        Country: c.Country,
        Cases: c.Cumulative_Cases || 0,
        Deaths: c.Cumulative_Deaths || 0,
        CFR: (c.Cumulative_Cases > 0) ? ((c.Cumulative_Deaths || 0) / c.Cumulative_Cases) * 100 : 0
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
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [mapMetric, setMapMetric] = useState('Cases');
  const [chartPage, setChartPage] = useState('cases');

  const handleCountrySelect = (countryName) => {
    setSelectedCountry(countryName);
  };
  
  // 2. CONDITIONAL RETURNS COME AFTER ALL HOOKS

  if (loading) return <div className="loading-message">Loading Interactive Data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  // Only render charts if data is available after filtering/transforming
    if (globalDailyTrends.length === 0) {
      return <div className="loading-message">Data is loading or empty after transformation...</div>;
    }


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

  const activeChart = chartViews[chartPage] || chartViews.cases;
  const nextChartKey = activeChart.id === 'cases' ? 'deaths' : 'cases';
  const nextChart = chartViews[nextChartKey];

  return (
    <div className="chart-dashboard" style={{ height: '100%' }}>
      <div className="chart-row">
        <div className="chart-container chart-container-full chart-page-card">
          <button
            type="button"
            className="chart-page-header"
            onClick={() => setChartPage(nextChart.id)}
            aria-label={`Go to ${nextChart.title}`}
          >
            <div>
              <p className="chart-page-eyebrow">{activeChart.pageLabel}</p>
              <h3>{activeChart.title}</h3>
            </div>
            <div className="chart-page-link">
              View {nextChart.title}
              <span aria-hidden="true">→</span>
            </div>
          </button>
          <div className="chart-page-body">{activeChart.component}</div>
        </div>
      </div>
      {/* Top 10 CFR table: full width above the map */}
      <div className="chart-row">
        <div className="chart-container-full">
          <TopCFRTable data={countryCFRsTop10} />
        </div>
      </div>

      {/* Selected country panel (shows details when a country is clicked).
          Render the entire row only when a country is selected to avoid
          adding vertical space between the CFR table and the map when empty. */}
      {selectedCountry && (
        <div className="chart-row">
          <div className="chart-container-full">
            <div className="country-panel">
              <h3>{selectedCountry}</h3>
              {/* compute stats for selected country */}
              {(() => {
                const rows = data.filter(r => r.Country === selectedCountry);
                if (rows.length === 0) return <div>No data for selected country.</div>;
                const latest = rows[rows.length - 1];
                const timeseries = rows.map(r => ({ date: r.Date, cases: isNaN(r.Cumulative_Cases) ? 0 : r.Cumulative_Cases }));
                return (
                  <div>
                    <div className="country-stats">
                      <div><strong>Total cases:</strong> {latest.Cumulative_Cases}</div>
                      <div><strong>Total deaths:</strong> {latest.Cumulative_Deaths}</div>
                      <div><strong>CFR:</strong> {latest.Case_Fatality_Ratio ? `${latest.Case_Fatality_Ratio.toFixed ? latest.Case_Fatality_Ratio.toFixed(2) : latest.Case_Fatality_Ratio}%` : 'N/A'}</div>
                    </div>
                    <div className="sparkline">
                      <svg viewBox="0 0 200 40" preserveAspectRatio="none">
                        {(() => {
                          const vals = timeseries.slice(-50).map(t => t.cases);
                          const max = Math.max(...vals, 1);
                          const points = vals.map((v, i) => `${(i/(vals.length-1||1))*200},${40 - (v/max)*36}`).join(' ');
                          return <polyline fill="none" stroke="#27AE60" strokeWidth={2} points={points} />;
                        })()}
                      </svg>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Map: full width at the bottom */}
      <div className="chart-row">
        <div className="chart-container-full" style={{ minHeight: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label htmlFor="mapMetric">Map metric:</label>
            <select id="mapMetric" value={mapMetric} onChange={e => setMapMetric(e.target.value)}>
              <option value="Cases">Cases (Total confirmed)</option>
              <option value="Deaths">Deaths (Total confirmed)</option>
              <option value="CFR">Case Fatality Ratio (CFR)</option>
            </select>
          </div>
          <MapChart data={countryCFRsAll} metric={mapMetric} onSelect={handleCountrySelect} />
        </div>
      </div>
    </div>
  );
}

export default ChartDashboard;