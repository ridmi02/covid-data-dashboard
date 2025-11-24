const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'public', 'COVID_CASES_DEATHS_ANALYSIS.csv');
const OUT_JSON = path.join(__dirname, '..', 'public', 'country_report.json');

function parseCSV(csvText) {
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
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += ch;
    }
    i += 1;
  }
  if (cur !== '' || inQuotes || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  const data = [];
  for (let r = 1; r < rows.length; r++) {
    const values = rows[r];
    if (values.length === 1 && values[0] === '') continue;
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
}

function generateReport() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV not found at', CSV_PATH);
    process.exit(1);
  }
  const csv = fs.readFileSync(CSV_PATH, 'utf8');
  console.log('Parsing CSV...');
  const rows = parseCSV(csv);
  console.log('Rows parsed:', rows.length);

  // latest row per country
  const latest = {};
  for (const r of rows) {
    if (!r || !r.Country) continue;
    const country = r.Country;
    const date = r.Date ? new Date(r.Date) : new Date(0);
    const existing = latest[country];
    const existingDate = existing && existing.Date ? new Date(existing.Date) : new Date(0);
    if (!existing || date >= existingDate) {
      latest[country] = r;
    }
  }

  const countries = Object.keys(latest).sort();
  const totalCountries = countries.length;
  let nonZeroCases = 0, nonZeroDeaths = 0, bothZero = 0;
  const anomalies = [];
  const list = [];
  for (const c of countries) {
    const row = latest[c];
    const cases = isNaN(row.Cumulative_Cases) ? 0 : row.Cumulative_Cases;
    const deaths = isNaN(row.Cumulative_Deaths) ? 0 : row.Cumulative_Deaths;
    if ((cases || 0) > 0) nonZeroCases += 1;
    if ((deaths || 0) > 0) nonZeroDeaths += 1;
    if ((cases || 0) === 0 && (deaths || 0) === 0) bothZero += 1;
    if ((cases || 0) < 0 || (deaths || 0) < 0) anomalies.push({ country: c, issue: 'negative values', cases, deaths });
    if ((deaths || 0) > (cases || 0)) anomalies.push({ country: c, issue: 'deaths > cases', cases, deaths });
    list.push({ Country: c, Date: row.Date, Cases: cases, Deaths: deaths });
  }

  // top 10 by cases/deaths
  const topByCases = list.slice().sort((a,b)=>b.Cases - a.Cases).slice(0,10);
  const topByDeaths = list.slice().sort((a,b)=>b.Deaths - a.Deaths).slice(0,10);

  const report = {
    generatedAt: new Date().toISOString(),
    totalCountries,
    nonZeroCases,
    nonZeroDeaths,
    bothZero,
    anomalies,
    topByCases,
    topByDeaths,
    samples: list.slice(0,20)
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), 'utf8');
  console.log('Report written to', OUT_JSON);
  console.log('Summary:');
  console.log('Total countries:', totalCountries);
  console.log('Countries with non-zero cases:', nonZeroCases);
  console.log('Countries with non-zero deaths:', nonZeroDeaths);
  console.log('Countries with both zero:', bothZero);
  if (anomalies.length) {
    console.log('Anomalies found:', anomalies.length);
    anomalies.slice(0,10).forEach(a => console.log('-', a.country, a.issue, 'cases=', a.cases, 'deaths=', a.deaths));
  } else {
    console.log('No obvious anomalies found.');
  }
}

generateReport();
