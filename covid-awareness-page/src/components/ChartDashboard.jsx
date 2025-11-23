import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
  // ResponsiveContainer is removed to resolve the hook conflict
} from 'recharts';
import './ChartDashboard.css'; // New CSS file for this component
import MapChart from './MapChart';

// Utility function to parse CSV data
const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        // Clean up data and convert numbers
        const value = values[index].trim();
        if (header === 'Date') {
          row[header] = value;
        } else if (!isNaN(parseFloat(value))) {
          row[header] = parseFloat(value);
        } else {
          row[header] = value;
        }
      });
      data.push(row);
    }
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
    {/* Removed ResponsiveContainer and set width/height directly */}
    <LineChart width={480} height={300} data={globalDailyTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis 
        dataKey="Date" 
        tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      />
      <YAxis label={{ value: 'Cases', angle: -90, position: 'insideLeft' }} />
      <Tooltip />
      <Legend />
      <Line 
        type="monotone" 
        dataKey="New_Cases" 
        stroke="#27AE60" 
        strokeWidth={2}
        dot={false}
      />
    </LineChart>
  </div>
);

const DailyDeathsChart = ({ data: globalDailyTrends }) => (
  <div className="chart-box">
    <h3>Global Daily New Deaths</h3>
    {/* Removed ResponsiveContainer and set width/height directly */}
    <LineChart width={480} height={300} data={globalDailyTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis 
        dataKey="Date" 
        tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      />
      <YAxis label={{ value: 'Deaths', angle: -90, position: 'insideLeft' }} />
      <Tooltip />
      <Legend />
      <Line 
        type="monotone" 
        dataKey="New_Deaths" 
        stroke="#A81921" 
        strokeWidth={2}
        dot={false}
      />
    </LineChart>
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
  const { globalDailyTrends, countryCFRs } = useMemo(() => {
    
    // Safety check inside useMemo is fine, as the hook itself is always called.
    if (data.length === 0) {
        return { globalDailyTrends: [], countryCFRs: [] };
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

    // 2. Top CFR Countries: use latest cumulative counts per country
    const latestCountryData = data.reduce((acc, row) => {
      acc[row.Country] = {
        Country: row.Country,
        Cumulative_Cases: isNaN(row.Cumulative_Cases) ? 0 : row.Cumulative_Cases,
        Cumulative_Deaths: isNaN(row.Cumulative_Deaths) ? 0 : row.Cumulative_Deaths,
      };
      return acc;
    }, {});

    const cfrs = Object.values(latestCountryData)
      .map(c => ({
        Country: c.Country,
        CFR: (c.Cumulative_Cases > 0 && c.Cumulative_Deaths > 0) ? (c.Cumulative_Deaths / c.Cumulative_Cases) * 100 : 0
      }))
      .filter(c => c.CFR > 0 && c.Country !== 'Unknown')
      .sort((a, b) => b.CFR - a.CFR)
      .slice(0, 10);

    return { globalDailyTrends: trends, countryCFRs: cfrs };

  }, [data]); // Only recalculate when raw data changes
  
  // 2. CONDITIONAL RETURNS COME AFTER ALL HOOKS

  if (loading) return <div className="loading-message">Loading Interactive Data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  // Only render charts if data is available after filtering/transforming
  if (globalDailyTrends.length === 0) {
      return <div className="loading-message">Data is loading or empty after transformation...</div>;
  }


  return (
    <div className="chart-dashboard">
      <div className="chart-row">
        <div className="chart-container">
          {/* Pass data as a prop */}
          <DailyCasesChart data={globalDailyTrends} />
        </div>
        <div className="chart-container">
          {/* Pass data as a prop */}
          <DailyDeathsChart data={globalDailyTrends} />
        </div>
      </div>
      <div className="chart-row">
        {/* We place the Table and Map in containers that allow them to take full width on small screens */}
        <div className="chart-container-half">
          {/* Pass data as a prop */}
          <TopCFRTable data={countryCFRs} />
        </div>
        <div className="chart-container-half">
          <MapChart data={countryCFRs} />
        </div>
      </div>
    </div>
  );
}

export default ChartDashboard;