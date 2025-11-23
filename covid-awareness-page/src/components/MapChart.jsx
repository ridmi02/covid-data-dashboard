import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import './MapChart.css';

// TopoJSON of world map (small/fast). react-simple-maps can fetch it at runtime.
const GEO_URL = 'https://unpkg.com/world-atlas@2.0.2/world/110m.json';

function MapChart({ data /* array of { Country, CFR } */ }) {
  // Build a lookup by lower-cased country name
  const lookup = useMemo(() => {
    const map = {};
    (data || []).forEach(item => {
      if (!item || !item.Country) return;
      map[item.Country.toLowerCase()] = item;
    });
    return map;
  }, [data]);

  // compute domain for color scale
  const domain = useMemo(() => {
    const values = (data || []).map(d => d.CFR || 0).filter(v => typeof v === 'number');
    const max = values.length ? Math.max(...values) : 0;
    return [0, Math.max(1, max)];
  }, [data]);

  const colorScale = scaleLinear().domain(domain).range(['#ffedea', '#7a0019']);

  return (
    <div className="map-chart">
      <h3>World Map — Case Fatality Ratio (Top 10 highlighted)</h3>
      <div className="map-wrapper">
        <ComposableMap projectionConfig={{ scale: 140 }}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const name = (geo.properties && (geo.properties.NAME || geo.properties.name || geo.properties.NAME_LONG)) || 'Unknown';
                const key = name.toLowerCase();
                const datum = lookup[key];
                const value = datum ? datum.CFR : 0;
                const fill = datum ? colorScale(value) : '#EEE';
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#DDD"
                    onMouseEnter={() => {
                      // simple hover title handled via DOM tooltip
                      // more advanced tooltips can be added later
                    }}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', opacity: 0.9 },
                      pressed: { outline: 'none' }
                    }}
                  >
                    {/* title gives native tooltip on hover */}
                    <title>{`${name} — ${datum ? `${datum.CFR.toFixed(2)}%` : 'No data'}`}</title>
                  </Geography>
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
      <div className="map-legend">
        <span>Low</span>
        <div className="legend-bar" />
        <span>High</span>
      </div>
    </div>
  );
}

export default MapChart;
