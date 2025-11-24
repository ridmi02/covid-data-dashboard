import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import './MapChart.css';

// TopoJSON of world map (small/fast). Prefer a local copy in `public/` to avoid CORS.
const GEO_URL = '/world-110m.json';

// Common overrides to handle CSV / topojson name differences.
// Map normalized name -> ISO3 code (preferred) or alternative lookup key.
const COUNTRY_OVERRIDES = {
  'united kingdom': 'GBR',
  'united kingdom of great britain and northern ireland': 'GBR',
  'uk': 'GBR',
  'united states': 'USA',
  'united states of america': 'USA',
  'usa': 'USA',
  'russia': 'RUS',
  'south korea': 'KOR',
  'north korea': 'PRK',
  'ivory coast': 'CIV',
  'czech republic': 'CZE',
  'congo (kinshasa)': 'COD',
  'congo (brazzaville)': 'COG',
  'vatican': 'VAT',
  'thailand': 'THA',
  'tajikistan': 'TJK',
  'turkmenistan': 'TKM',
  'timor-leste': 'TLS',
  'east timor': 'TLS',
  'trinidad and tobago': 'TTO',
  'tunisia': 'TUN',
  'turkiye': 'TUR',
  'türkiye': 'TUR',
  'taiwan, province of china': 'TWN',
  'taiwan': 'TWN',
  'united republic of tanzania': 'TZA',
  'tanzania': 'TZA',
  'uganda': 'UGA',
  'ukraine': 'UKR',
  'uruguay': 'URY',
  'uzbekistan': 'UZB',
  'venezuela': 'VEN',
  'vietnam': 'VNM',
  'vanuatu': 'VUT',
  'yemen': 'YEM',
  'zambia': 'ZMB',
  'zimbabwe': 'ZWE',
  'brunei darussalam': 'BRN',
  'brunei': 'BRN',
  'democratic republic of the congo': 'COD',
  'democratic republic of congo': 'COD',
  'republic of the congo': 'COG',
  'dr congo': 'COD',
  'drc': 'COD',
  'congo-kinshasa': 'COD',
  'congo-brazzaville': 'COG',
  'falkland islands (malvinas)': 'FLK',
  'greenland': 'GRL',
  "lao people's democratic republic": 'LAO',
  'lao people\'s democratic republic': 'LAO',
  'moldova, republic of': 'MDA',
  'myanmar': 'MMR',
  'new caledonia': 'NCL',
  'puerto rico': 'PRI',
  'state of palestine': 'PSE',
  'palestine': 'PSE',
  'palestine, state of': 'PSE',
  'western sahara': 'ESH',
  'syrian arab republic': 'SYR',
  'french southern territories': 'ATF',
  'french southern and antarctic lands': 'ATF',
  'french southern territories (terres australes et antarctiques fran\u00e7aises)': 'ATF',
  // DPRK alternate names
  'democratic people\'s republic of korea': 'PRK',
  'democratic peoples republic of korea': 'PRK',
  'korea, democratic people\'s republic of': 'PRK',
  'korea, dpr': 'PRK',
  'dpr korea': 'PRK'
};

// Names we intentionally ignore for warnings because they often have no CSV data
const IGNORE_GEOS = new Set([
  'french southern territories',
  'falkland islands (malvinas)',
  'greenland',
  'new caledonia',
  'puerto rico',
  'western sahara',
  'french southern and antarctic lands',
  'french southern territories (terres australes et antarctiques fran\u00e7aises)'
  , 'state of palestine'
]);

// small Levenshtein distance implementation for fuzzy matching
function levenshtein(a, b) {
  const an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array(an + 1).fill(null).map(() => Array(bn + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[i][0] = i;
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[an][bn];
}

function MapChart({ data /* array of { Country, Cases, Deaths, CFR } */, metric = 'CFR', onSelect }) {
  // Build a lookup by normalized country name
  // register english locale for i18n-iso-countries
  // ensure locale is registered synchronously so lookups during render work
  try {
    countries.registerLocale(enLocale);
  } catch (e) {
    // ignore if already registered
  }

  const lookup = useMemo(() => {
    const map = {};
    const normMap = {};
    (data || []).forEach(item => {
      if (!item || !item.Country) return;
      const key = item.Country.trim();
      map[key.toLowerCase()] = item;
      const normalized = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      normMap[normalized] = item;
      // create some common alias variants to improve matching for messy CSV names
      try {
        const keyLower = key.toLowerCase();
        // 1) If the CSV uses comma form like "Congo, Democratic Republic of the", add reversed form
        if (keyLower.includes(',')) {
          const parts = keyLower.split(',').map(p => p.trim()).filter(Boolean);
          if (parts.length > 1) {
            const rev = parts.reverse().join(' ');
            if (!map[rev]) map[rev] = item;
            const revNorm = rev.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
            if (!normMap[revNorm]) normMap[revNorm] = item;
          }
        }
        // 2) Strip parenthetical notes, e.g. "Congo (Kinshasa)" -> "congo"
        const noParen = keyLower.replace(/\s*\([^\)]*\)\s*/g, ' ').trim();
        if (noParen && !map[noParen]) map[noParen] = item;
        const noParenNorm = noParen.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
        if (noParen && !normMap[noParenNorm]) normMap[noParenNorm] = item;
        // 3) Add very common short synonyms
        const synonyms = [];
        if (keyLower.includes('myanmar')) synonyms.push('burma');
        if (keyLower.includes('burma')) synonyms.push('myanmar');
        if (keyLower.includes('lao') || keyLower.includes('laos')) synonyms.push('laos', "lao people's democratic republic", "lao peoples democratic republic");
        if (keyLower.includes('palestine') || keyLower.includes('state of palestine')) synonyms.push('palestine', 'state of palestine', 'palestine, state of');
        if (keyLower.includes('korea') && keyLower.includes('north')) synonyms.push('north korea', 'democratic people\'s republic of korea', 'korea, democratic people\'s republic of');
        if (keyLower.includes('congo')) {
          // try to disambiguate common CSV forms
          synonyms.push('democratic republic of the congo', 'republic of the congo', 'dr congo', 'drc', 'congo-kinshasa', 'congo-brazzaville');
        }
        for (const s of synonyms) {
          const sKey = s.toLowerCase();
          if (!map[sKey]) map[sKey] = item;
          const sNorm = sKey.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
          if (!normMap[sNorm]) normMap[sNorm] = item;
        }
      } catch (e) {
        // defensive; don't let aliasing break lookup build
      }
      // map by ISO3 when possible
      const iso3 = countries.getAlpha3Code(item.Country, 'en');
      if (iso3) map[iso3.toUpperCase()] = item;
      // also map by alpha-2 and numeric codes when available
      const alpha2 = countries.getAlpha2Code ? countries.getAlpha2Code(item.Country, 'en') : undefined;
      const simpleAlpha2 = countries.getSimpleAlpha2Code ? countries.getSimpleAlpha2Code(item.Country, 'en') : undefined;
      const a2 = alpha2 || simpleAlpha2;
      if (a2) {
        map[a2.toUpperCase()] = item;
        try {
          const numeric = countries.alpha2ToNumeric ? countries.alpha2ToNumeric(a2) : undefined;
          if (numeric) map[String(numeric)] = item;
        } catch (e) {
          // ignore
        }
      }
    });
    // attach normalized map to returned map for use by matching logic
    map.__normalized = normMap;
    return map;
  }, [data]);

  // compute domain for color scale based on selected metric
  const domain = useMemo(() => {
    const values = (data || []).map(d => {
      if (!d) return 0;
      if (metric === 'CFR') return d.CFR || 0;
      if (metric === 'Deaths') return d.Deaths || 0;
      // default to Cases
      return d.Cases || 0;
    }).filter(v => typeof v === 'number');
    const max = values.length ? Math.max(...values) : 0;
    return [0, Math.max(1, max)];
  }, [data, metric]);

  // Rainbow HSL mapper: maps value -> hue across the spectrum for vivid multi-color map
  const domainMax = domain[1] || 1;
  const colorScale = (v) => {
    const t = domainMax <= 0 ? 0 : Math.max(0, Math.min(1, v / domainMax));
    // Hue from 260 (indigo) -> 0 (red) through blues/greens/yellows
    const hue = Math.round((1 - t) * 260);
    return `hsl(${hue}deg 75% 50%)`;
  };

  // Helper to compute HSL for a fractional position [0..1] across the same hue sweep
  const hslForFraction = (t) => {
    const clamped = Math.max(0, Math.min(1, t));
    const hue = Math.round((1 - clamped) * 260);
    return `hsl(${hue}deg 75% 50%)`;
  };

  // Legend gradient built from the same HSL stops so the legend exactly matches the map colors
  const legendGradient = useMemo(() => {
    const stops = [0, 0.2, 0.4, 0.6, 0.8, 1].map(t => `${hslForFraction(t)} ${Math.round(t * 100)}%`);
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  }, [domainMax]);

  // Legend numeric labels (format differently for CFR vs absolute counts)
  const legendMin = domain[0] || 0;
  const legendMax = domain[1] || 0;
  const numberFormat = new Intl.NumberFormat();
  const formatLegendValue = (v) => {
    if (metric === 'CFR') return `${v.toFixed(2)}%`;
    return numberFormat.format(Math.round(v));
  };

  // Interactive state
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState([0, 0]);
  const containerRef = useRef(null);
  const seenUnmatchedRef = useRef(new Set());
  const unmatchedRef = useRef(new Set());
  const [unmatchedList, setUnmatchedList] = useState([]);

  // quick summary: how many countries have non-zero values for the current metric
  const nonZeroCount = (data || []).filter(d => {
    if (!d) return false;
    if (metric === 'CFR') return (d.CFR || 0) > 0;
    if (metric === 'Deaths') return (d.Deaths || 0) > 0;
    return (d.Cases || 0) > 0;
  }).length;

  // Flush collected unmatched names (populated during render) into state for display
  useEffect(() => {
    setUnmatchedList(Array.from(unmatchedRef.current));
  }, [data, metric]);

  const onMouseEnter = (evt, name, datum) => {
    const rect = containerRef.current && containerRef.current.getBoundingClientRect();
    let x = rect ? evt.clientX - rect.left : evt.clientX;
    let y = rect ? evt.clientY - rect.top : evt.clientY;
    // clamp tooltip so it stays inside container
    if (rect) {
      const maxX = rect.width - 160; // tooltip width guard
      const maxY = rect.height - 60;
      x = Math.max(8, Math.min(x, maxX));
      y = Math.max(8, Math.min(y, maxY));
    }
    const nf = new Intl.NumberFormat();
    let content = 'No data';
    if (datum) {
      if (metric === 'CFR') content = `${datum.CFR ? datum.CFR.toFixed(2) : 0}%`;
      else if (metric === 'Deaths') content = nf.format(datum.Deaths || 0);
      else content = nf.format(datum.Cases || 0);
    }
    setTooltip({ visible: true, x, y, content: `${name} — ${content}` });
  };

  const onMouseMove = (evt) => {
    const rect = containerRef.current && containerRef.current.getBoundingClientRect();
    const x = rect ? evt.clientX - rect.left : evt.clientX;
    const y = rect ? evt.clientY - rect.top : evt.clientY;
    setTooltip(t => ({ ...t, x, y }));
  };

  const onMouseLeave = () => setTooltip({ visible: false, x: 0, y: 0, content: '' });

  const onClick = (name, datum) => {
    setSelected(datum ? datum.Country : name);
  };

  const zoomIn = () => setZoom(z => Math.min(8, +(z * 1.5).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(1, +(z / 1.5).toFixed(2)));
  const resetZoom = () => { setZoom(1); setCenter([0,0]); };

  return (
    <div className="map-chart">
      <h3>Interactive World Map — {metric === 'CFR' ? 'Case Fatality Ratio' : metric}</h3>
      <div className="map-wrapper" ref={containerRef}>
        <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: '100%', height: '100%' }}>
          <ZoomableGroup zoom={zoom} center={center} onMoveEnd={({ coord, center: newCenter, zoom: newZoom }) => {
            if (newCenter) setCenter(newCenter);
            if (newZoom) setZoom(newZoom);
          }}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => {
                  let name = (geo.properties && (geo.properties.NAME || geo.properties.name || geo.properties.NAME_LONG)) || 'Unknown';
                  const key = name.toLowerCase();
                  // try finding by several property names for ISO3 on the geo
                  const geoIso = (geo.properties && (geo.properties.ISO_A3 || geo.properties.iso_a3 || geo.properties.ADM0_A3 || geo.properties.adm0_a3 || geo.properties.ISO_A3_EH || geo.properties.iso_a3_eh)) || null;
                  let datum = (geoIso && lookup[geoIso.toUpperCase()]) || lookup[key];

                  // Fallback: some topojsons put only numeric ISO codes in geo.id — try a small common mapping
                  if (!datum && geo && (geo.id || geo.properties && geo.properties.id)) {
                    const geoId = String(geo.id || (geo.properties && geo.properties.id));
                    // If geoId looks numeric, try resolving to ISO3 using i18n-iso-countries
                    if (!datum && /^[0-9]+$/.test(geoId)) {
                      try {
                        const iso3 = countries.toAlpha3(geoId);
                        if (iso3) {
                          const maybe = lookup[iso3.toUpperCase()] || lookup[iso3.toLowerCase()];
                          if (maybe) datum = maybe;
                          // if we still have an Unknown display name, try to resolve a human-friendly name
                          if (name === 'Unknown') {
                            const resolved = countries.getName(geoId, 'en');
                            if (resolved) name = resolved;
                          }
                        }
                      } catch (e) {
                        // ignore
                      }
                    }
                    const numericFallbacks = {
                      // numeric ISO -> candidate country name keys (lowercase)
                      '826': ['united kingdom', 'uk', 'great britain', 'gbr'],
                      '840': ['united states', 'united states of america', 'usa', 'us'],
                      '156': ['china', 'chn'],
                      '356': ['india', 'ind'],
                      '124': ['canada', 'can'],
                      '250': ['france', 'fra'],
                      '276': ['germany', 'deutschland', 'deu'],
                      '643': ['russia', 'russian federation', 'rus'],
                      '076': ['brazil', 'bra'],
                      '710': ['south africa', 'za', 'zaf']
                    };
                    const candidates = numericFallbacks[geoId] || [];
                    for (const c of candidates) {
                      if (lookup[c]) { datum = lookup[c]; break; }
                      if (lookup[c.toUpperCase()]) { datum = lookup[c.toUpperCase()]; break; }
                    }
                  }

                  // Final fallback: explicit overrides mapping (handles common name variants)
                  if (!datum) {
                    try {
                      const normalize = (s) => s.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
                      const nName = name.toString().toLowerCase();
                      const n = normalize(name);
                      // check overrides against both raw and normalized forms
                      const overrideIso = COUNTRY_OVERRIDES[nName] || COUNTRY_OVERRIDES[n];
                      if (overrideIso) {
                        datum = lookup[overrideIso.toUpperCase()] || lookup[overrideIso.toLowerCase()];
                        if (datum) {
                          // helpful debug: indicate when override resolved to a CSV key
                          // eslint-disable-next-line no-console
                          console.debug && console.debug(`MapChart: override matched geo "${name}" -> overrideIso=${overrideIso}`);
                        }
                      }
                      // try normalized matching (remove diacritics/punctuation)
                      if (!datum) {
                        const normMap = lookup.__normalized || {};
                        if (normMap[n]) datum = normMap[n];
                        else {
                          // fuzzy includes match
                          const keys = Object.keys(normMap);
                          for (const k of keys) {
                            if (k.includes(n) || n.includes(k)) { datum = normMap[k]; break; }
                          }
                          // if still not found, try Levenshtein fuzzy match and pick best candidate
                          if (!datum && keys.length) {
                            let best = null;
                            let bestScore = 0;
                            for (const k of keys) {
                              const dist = levenshtein(k, n);
                              const maxLen = Math.max(k.length, n.length);
                              const score = 1 - dist / maxLen; // similarity 0..1
                              if (score > bestScore) { bestScore = score; best = k; }
                            }
                            if (best && bestScore >= 0.55) { // threshold
                              datum = normMap[best];
                              // eslint-disable-next-line no-console
                              console.debug && console.debug(`MapChart: fuzzy matched geo "${name}" -> normKey=${best} (score=${bestScore.toFixed(2)})`);
                            }
                          }
                        }
                      }
                      // As a last attempt, try resolving the geo name to an ISO alpha-2/alpha-3 and use that
                      if (!datum) {
                        try {
                          const alpha2FromName = countries.getAlpha2Code ? (countries.getAlpha2Code(name, 'en') || countries.getSimpleAlpha2Code(name, 'en')) : undefined;
                          if (alpha2FromName) {
                            const iso3FromAlpha2 = countries.toAlpha3(alpha2FromName);
                            if (iso3FromAlpha2 && lookup[iso3FromAlpha2.toUpperCase()]) datum = lookup[iso3FromAlpha2.toUpperCase()];
                            else if (lookup[alpha2FromName.toUpperCase()]) datum = lookup[alpha2FromName.toUpperCase()];
                            if (datum) {
                              // eslint-disable-next-line no-console
                              console.debug && console.debug(`MapChart: resolved geo "${name}" -> alpha2=${alpha2FromName} iso3=${iso3FromAlpha2}`);
                            }
                          }
                        } catch (e) {
                          // ignore
                        }
                      }
                    } catch (e) {
                      // ignore
                    }
                  }

                  // Diagnostic: warn once per unmatched geo name to help tune overrides
                  if (!datum) {
                    const seen = seenUnmatchedRef.current;
                    // skip noisy/invalid unknown ids like -99 or blank 'Unknown' features
                    const geoIdStr = String(geo.id || (geo.properties && geo.properties.id) || '');
                    const skipUnknown = name === 'Unknown' || geoIdStr === '-99' || geoIdStr === '' || IGNORE_GEOS.has(name.toLowerCase());
                    if (!skipUnknown && !seen.has(name)) {
                      seen.add(name);
                      unmatchedRef.current.add(name);
                      // eslint-disable-next-line no-console
                      // include attempted candidate info to help debugging
                      const attempts = [];
                      try {
                        const normalize = (s) => s.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
                        const nName = name.toString().toLowerCase();
                        const n = normalize(name);
                        const geoIso = (geo.properties && (geo.properties.ISO_A3 || geo.properties.iso_a3 || geo.properties.ADM0_A3)) || null;
                        if (geoIso) attempts.push(`geoIso:${geoIso}`);
                        attempts.push(`raw:${nName}`);
                        attempts.push(`norm:${n}`);
                        const overrideIso = COUNTRY_OVERRIDES[nName] || COUNTRY_OVERRIDES[n];
                        if (overrideIso) attempts.push(`override:${overrideIso}`);
                      } catch (e) {
                        // ignore
                      }
                      console.warn(`MapChart: no data match for geo "${name}" (geo.id=${geo.id}) — attempts: ${attempts.join(', ')}`);
                    }
                  }

                  const value = datum ? (metric === 'CFR' ? datum.CFR : (metric === 'Deaths' ? datum.Deaths : datum.Cases)) : 0;
                  const fill = datum ? colorScale(value) : '#EEE';
                  const isSelected = selected && ((datum && datum.Country) === selected || name === selected);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke={isSelected ? '#1f4b99' : '#DDD'}
                      strokeWidth={isSelected ? 1.6 : 0.6}
                      tabIndex={0}
                      role="button"
                      aria-label={`${name} — ${datum ? (metric === 'CFR' ? `${(datum.CFR||0).toFixed(2)}%` : `${new Intl.NumberFormat().format(metric === 'Deaths' ? (datum.Deaths||0) : (datum.Cases||0))}`) : 'No data'}`}
                      onFocus={(evt) => onMouseEnter(evt, name, datum)}
                      onBlur={onMouseLeave}
                      onMouseEnter={(evt) => onMouseEnter(evt, name, datum)}
                      onMouseMove={onMouseMove}
                      onMouseLeave={onMouseLeave}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (onSelect) onSelect(datum ? datum.Country : name); else onClick(name, datum); } }}
                      onClick={() => { if (onSelect) onSelect(datum ? datum.Country : name); else onClick(name, datum); }}
                      style={{
                        default: { outline: 'none', cursor: datum ? 'pointer' : 'default', transition: 'fill 150ms' },
                        hover: { outline: 'none', opacity: 0.95, cursor: datum ? 'pointer' : 'default' },
                        pressed: { outline: 'none' }
                      }}
                    >
                      <title>{`${name} — ${datum ? (metric === 'CFR' ? `${(datum.CFR||0).toFixed(2)}%` : `${new Intl.NumberFormat().format(metric === 'Deaths' ? (datum.Deaths||0) : (datum.Cases||0))}`) : 'No data'}`}</title>
                    </Geography>
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Zoom controls overlay */}
        <div className="map-controls">
          <button title="Zoom in" onClick={zoomIn} className="map-ctrl" aria-label="Zoom in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button title="Zoom out" onClick={zoomOut} className="map-ctrl" aria-label="Zoom out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button title="Reset" onClick={resetZoom} className="map-ctrl" aria-label="Reset zoom">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M21 12a9 9 0 1 0-3.36 6.36L21 12z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
          <div className="map-selection" style={{ marginTop: 6, fontSize: 12 }}>
            {nonZeroCount} countries with data
          </div>
        </div>

        {/* Tooltip */}
        {tooltip.visible && (
          <div className="map-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
            {tooltip.content}
          </div>
        )}
        {/* Unmatched diagnostics panel (shows names we couldn't match) */}
      </div>

      <div className="map-legend">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
          <div style={{ minWidth: 80, textAlign: 'left', color: '#bfe6ff', fontSize: 12 }}>{formatLegendValue(legendMin)}</div>
          <div style={{ flex: 1, margin: '0 8px' }}>
            <div className="legend-bar" style={{ background: legendGradient }} aria-hidden />
          </div>
          <div style={{ minWidth: 80, textAlign: 'right', color: '#bfe6ff', fontSize: 12 }}>{formatLegendValue(legendMax)}</div>
        </div>
      </div>

      {/* selection display handled by parent via onSelect callback */}
    </div>
  );
}

 
export default MapChart;
