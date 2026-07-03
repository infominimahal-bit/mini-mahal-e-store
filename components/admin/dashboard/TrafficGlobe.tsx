'use client';

import React, { useState, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const NAME_ALIASES: Record<string, string> = {
  'United States': 'United States of America',
  'South Korea': 'Republic of Korea',
  'Russia': 'Russian Federation',
  'Iran': 'Iran (Islamic Republic of)',
  'Syria': 'Syrian Arab Republic',
  'Vietnam': 'Viet Nam',
  'Tanzania': 'United Republic of Tanzania',
  'Moldova': 'Republic of Moldova',
  'Bolivia': 'Bolivia (Plurinational State of)',
  'Venezuela': 'Venezuela (Bolivarian Republic of)',
  'Brunei': 'Brunei Darussalam',
  'Ivory Coast': "Côte d'Ivoire",
  'Czech Republic': 'Czechia',
  'East Timor': 'Timor-Leste',
  'Palestine': 'Palestine, State of',
  'Turkey': 'Türkiye',
  'Cape Verde': 'Cabo Verde',
  'DR Congo': 'Democratic Republic of the Congo',
  'North Korea': "Democratic People's Republic of Korea",
  'Myanmar': 'Myanmar',
  'Laos': 'Lao People\'s Democratic Republic',
  'Türkiye': 'Turkey',
};

interface Dot {
  city: string;
  lat: number;
  lng: number;
  count: number;
}

interface Country {
  code: string;
  name: string;
  visitors: number;
}

interface TrafficGlobeProps {
  visitorDots: Dot[];
  orderDots: Dot[];
  countries?: Country[];
  height?: number;
}

function resolveCountryName(apiName: string): string {
  return NAME_ALIASES[apiName] || apiName;
}

function getCountryColor(countryName: string, visitors: number, maxVisitors: number): string {
  if (countryName === 'Pakistan') {
    return visitors === 0 ? '#f9b97a' : '#e05c00';
  }
  if (visitors === 0) return '#e8e8e8';
  const ratio = maxVisitors > 0 ? visitors / maxVisitors : 0;
  if (ratio < 0.1) return '#fde8cc';
  if (ratio < 0.3) return '#f9b97a';
  if (ratio < 0.6) return '#f58c2a';
  return '#e05c00';
}

export default function TrafficGlobe({ visitorDots, orderDots, countries = [], height = 400 }: TrafficGlobeProps) {
  const [tooltip, setTooltip] = useState<{ name: string; visitors: number; x: number; y: number } | null>(null);
  const [scale, setScale] = useState(180);

  const countryMap = new Map<string, number>();
  for (const c of countries) {
    countryMap.set(resolveCountryName(c.name), c.visitors);
  }
  const maxVisitors = Math.max(...countries.map(c => c.visitors), 1);
  const hasData = countries.some(c => c.visitors > 0) || visitorDots.length > 0;

  const handleZoomIn = () => setScale(s => Math.min(s * 1.4, 800));
  const handleZoomOut = () => setScale(s => Math.max(s / 1.4, 50));
  const handleReset = () => setScale(180);

  const handleMouseEnter = useCallback((geo: { properties: Record<string, unknown> }, evt: React.MouseEvent) => {
    const name = geo.properties.name as string;
    const visitors = countryMap.get(name) || 0;
    if (visitors > 0 || name === 'Pakistan') {
      setTooltip({ name, visitors, x: evt.clientX, y: evt.clientY });
    }
  }, [countryMap]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale }}
        style={{ width: '100%', height: '100%', backgroundColor: '#f0f7ff' }}
      >
        <ZoomableGroup center={[70, 30]} minZoom={1} maxZoom={10}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties.name as string;
                const visitors = countryMap.get(name) || 0;
                const fill = getCountryColor(name, visitors, maxVisitors);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: '#d4d4d4', outline: 'none', cursor: visitors > 0 || name === 'Pakistan' ? 'pointer' : 'default' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e: React.MouseEvent) => handleMouseEnter(geo, e)}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              })
            }
          </Geographies>
          {visitorDots.map((dot, i) => (
            <Marker key={`v-${i}`} coordinates={[dot.lng, dot.lat]}>
              <circle r={Math.max(5, Math.min(14, 4 + dot.count * 0.3))} fill="#22c55e" stroke="#ffffff" strokeWidth={2} />
              <text
                textAnchor="start"
                dx={12}
                dy={-6}
                fill="#1f2937"
                fontSize={10}
                fontWeight={700}
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {dot.city}
              </text>
              <title>{dot.city}: {dot.count} visitors</title>
            </Marker>
          ))}
          {orderDots.map((dot, i) => (
            <Marker key={`o-${i}`} coordinates={[dot.lng, dot.lat]}>
              <circle r={Math.max(5, Math.min(14, 4 + dot.count * 0.3))} fill="#f97316" stroke="#ffffff" strokeWidth={2} />
              <text
                textAnchor="start"
                dx={12}
                dy={-6}
                fill="#1f2937"
                fontSize={10}
                fontWeight={700}
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {dot.city}
              </text>
              <title>{dot.city}: {dot.count} orders</title>
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {/* Zoom buttons */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg shadow-sm text-gray-700 hover:bg-gray-50 font-bold text-lg leading-none cursor-pointer"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg shadow-sm text-gray-700 hover:bg-gray-50 font-bold text-lg leading-none cursor-pointer"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleReset}
          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg shadow-sm text-gray-500 hover:bg-gray-50 text-xs font-bold cursor-pointer"
          title="Reset view"
        >
          ⌖
        </button>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-white/90  border border-gray-200 rounded-full px-4 py-2 shadow-md">
            <span className="text-sm font-semibold text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Waiting for traffic data
            </span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm whitespace-nowrap"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <span className="font-bold text-gray-900">{tooltip.name}</span>
          <span className="text-gray-500 ml-2">{tooltip.visitors} visitors</span>
        </div>
      )}

      {/* Scroll hint */}
      <div className="absolute bottom-3 right-3 z-10 text-[10px] text-gray-400 font-medium bg-white/80 px-2 py-1 rounded-md border border-gray-100">
        Scroll to zoom
      </div>
    </div>
  );
}
