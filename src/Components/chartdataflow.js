import React, { useState } from 'react';

const App = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');

  const sampleJson = {
    "desc": "Pie chart is centered on a crisp white background",
    "model": "PLOTLY",
    "colors": ["#4F46E5", "#06B6D4", "#8B5CF6", "#EC4899", "#F59E0B"],
    "duration": 10,
    "gen_image": true,
    "chart_data": {
      "series": {
        "x": ["Migrating in next 2 years", "Already migrated", "Planning beyond 2 years", "No migration plans"],
        "data": [
          {"y": [68, 12, 15, 5], "name": "Cloud Migration Plans"}
        ]
      }
    },
    "chart_type": "pie",
    "scene_title": "Cloud Adoption Soars"
  };

  const handleParse = () => {
    try {
      const parsed = JSON.parse(jsonInput || JSON.stringify(sampleJson, null, 2));
      setParsedData(parsed);
      setError('');
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
      setParsedData(null);
    }
  };

  const loadSample = () => {
    setJsonInput(JSON.stringify(sampleJson, null, 2));
    setParsedData(sampleJson);
    setError('');
  };

  const renderSeriesData = (chartData, chartType) => {
    if (!chartData || !chartData.series) return null;

    const { x, y, data } = chartData.series;

    // Different rendering based on chart type
    const renderByChartType = () => {
      switch(chartType) {
        case 'bar':
        case 'grouped_bar':
        case 'stacked_bar':
        case 'line':
        case 'multi_line':
        case 'area':
        case 'pie':
        case 'donut':
        case 'funnel':
          // Standard x-axis + data series
          return renderStandardSeries(x, data);
        
        case 'scatter':
        case 'bubble':
          // X-Y coordinates
          return renderScatterSeries(x, data);
        
        case 'heatmap':
          // X, Y, Z matrix
          return renderHeatmapSeries(chartData.series);
        
        case 'waterfall':
          // X + measures
          return renderWaterfallSeries(x, data, chartData.series.measure);
        
        case 'combo_bar_line':
          // Multiple series with types
          return renderComboSeries(x, data);
        
        case 'treemap':
          // Hierarchical
          return renderTreemapSeries(chartData.series);
        
        case 'candlestick':
          // OHLC data
          return renderCandlestickSeries(chartData.series);
        
        default:
          return renderStandardSeries(x, data);
      }
    };

    return (
      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{marginBottom: '16px', color: '#1f2937', fontSize: '18px', fontWeight: '700'}}>
          📊 Chart Data Series
        </h3>
        {renderByChartType()}
      </div>
    );
  };

  // Standard series (bar, line, pie, etc.)
  const renderStandardSeries = (xLabels, seriesData) => {
    if (!seriesData || !xLabels) return <div>No data available</div>;

    return seriesData.map((series, idx) => (
      <div key={idx} style={{marginBottom: '24px'}}>
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#4f46e5',
          color: 'white',
          borderRadius: '6px',
          marginBottom: '12px',
          fontWeight: '600'
        }}>
          {series.name || `Series ${idx + 1}`}
        </div>

        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
          <thead>
            <tr style={{backgroundColor: '#f3f4f6'}}>
              <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600'}}>
                Category
              </th>
              <th style={{padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600'}}>
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {xLabels.map((label, i) => (
              <tr key={i} style={{borderBottom: '1px solid #e5e7eb'}}>
                <td style={{padding: '12px'}}>{label}</td>
                <td style={{padding: '12px', textAlign: 'right', fontWeight: '700', color: '#4f46e5', fontSize: '16px'}}>
                  {series.y && series.y[i] !== undefined ? series.y[i] : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{backgroundColor: '#f3f4f6', fontWeight: '700'}}>
              <td style={{padding: '12px', borderTop: '2px solid #e5e7eb'}}>Total</td>
              <td style={{padding: '12px', textAlign: 'right', borderTop: '2px solid #e5e7eb', color: '#10b981', fontSize: '16px'}}>
                {series.y ? series.y.reduce((sum, val) => sum + val, 0) : 0}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    ));
  };

  // Scatter/Bubble (X-Y coordinates)
  const renderScatterSeries = (xValues, seriesData) => {
    if (!seriesData) return <div>No data</div>;

    return seriesData.map((series, idx) => (
      <div key={idx} style={{marginBottom: '24px'}}>
        <div style={{padding: '8px 12px', backgroundColor: '#4f46e5', color: 'white', borderRadius: '6px', marginBottom: '12px', fontWeight: '600'}}>
          {series.name || `Series ${idx + 1}`}
        </div>

        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
          <thead>
            <tr style={{backgroundColor: '#f3f4f6'}}>
              <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb'}}>X</th>
              <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb'}}>Y</th>
              {series.size && <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb'}}>Size</th>}
            </tr>
          </thead>
          <tbody>
            {xValues && xValues.map((x, i) => (
              <tr key={i} style={{borderBottom: '1px solid #e5e7eb'}}>
                <td style={{padding: '12px', fontWeight: '600'}}>{x}</td>
                <td style={{padding: '12px', color: '#4f46e5', fontWeight: '700'}}>{series.y[i]}</td>
                {series.size && <td style={{padding: '12px'}}>{series.size[i]}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ));
  };

  // Heatmap (X, Y, Z matrix)
  const renderHeatmapSeries = (seriesData) => {
    const { x, y, z } = seriesData;
    if (!x || !y || !z) return <div>No heatmap data</div>;

    return (
      <div style={{overflowX: 'auto'}}>
        <table style={{borderCollapse: 'collapse', fontSize: '13px'}}>
          <thead>
            <tr>
              <th style={{padding: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6'}}></th>
              {x.map((col, i) => (
                <th key={i} style={{padding: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', fontWeight: '600'}}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {y.map((row, i) => (
              <tr key={i}>
                <th style={{padding: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', fontWeight: '600'}}>
                  {row}
                </th>
                {z[i] && z[i].map((val, j) => (
                  <td key={j} style={{padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: '700', color: '#4f46e5'}}>
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Waterfall
  const renderWaterfallSeries = (xLabels, seriesData, measures) => {
    if (!seriesData || !xLabels) return <div>No data</div>;

    const series = seriesData[0];
    return (
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
        <thead>
          <tr style={{backgroundColor: '#f3f4f6'}}>
            <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb'}}>Step</th>
            <th style={{padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb'}}>Value</th>
            <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb'}}>Type</th>
          </tr>
        </thead>
        <tbody>
          {xLabels.map((label, i) => (
            <tr key={i} style={{borderBottom: '1px solid #e5e7eb'}}>
              <td style={{padding: '12px'}}>{label}</td>
              <td style={{padding: '12px', textAlign: 'right', fontWeight: '700', color: '#4f46e5', fontSize: '16px'}}>
                {series.y[i]}
              </td>
              <td style={{padding: '12px', textAlign: 'center'}}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: measures && measures[i] === 'total' ? '#dbeafe' : '#fef3c7',
                  color: measures && measures[i] === 'total' ? '#1e40af' : '#92400e'
                }}>
                  {measures ? measures[i] : 'relative'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Combo Bar+Line
  const renderComboSeries = (xLabels, seriesData) => {
    return renderStandardSeries(xLabels, seriesData);
  };

  // Treemap
  const renderTreemapSeries = (seriesData) => {
    const { labels, parents, data } = seriesData;
    if (!labels || !data) return <div>No treemap data</div>;

    const values = data[0]?.y || [];
    
    return (
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
        <thead>
          <tr style={{backgroundColor: '#f3f4f6'}}>
            <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb'}}>Label</th>
            <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb'}}>Parent</th>
            <th style={{padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb'}}>Value</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => (
            <tr key={i} style={{borderBottom: '1px solid #e5e7eb'}}>
              <td style={{padding: '12px', fontWeight: '600'}}>{label}</td>
              <td style={{padding: '12px', color: '#6b7280'}}>{parents[i] || '-'}</td>
              <td style={{padding: '12px', textAlign: 'right', fontWeight: '700', color: '#4f46e5'}}>{values[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Candlestick
  const renderCandlestickSeries = (seriesData) => {
    const { x, open, high, low, close } = seriesData;
    if (!x) return <div>No candlestick data</div>;

    return (
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
        <thead>
          <tr style={{backgroundColor: '#f3f4f6'}}>
            <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb'}}>Date</th>
            <th style={{padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb'}}>Open</th>
            <th style={{padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb'}}>High</th>
            <th style={{padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb'}}>Low</th>
            <th style={{padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb'}}>Close</th>
          </tr>
        </thead>
        <tbody>
          {x.map((date, i) => (
            <tr key={i} style={{borderBottom: '1px solid #e5e7eb'}}>
              <td style={{padding: '12px'}}>{date}</td>
              <td style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>{open[i]}</td>
              <td style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: '#10b981'}}>{high[i]}</td>
              <td style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: '#ef4444'}}>{low[i]}</td>
              <td style={{padding: '12px', textAlign: 'right', fontWeight: '700', color: '#4f46e5'}}>{close[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui', backgroundColor: '#f9fafb', minHeight: '100vh'}}>
      <h1 style={{color: '#1f2937', marginBottom: '24px'}}>📊 PLOTLY Scene Viewer</h1>
      
      <div style={{marginBottom: '20px'}}>
        <button onClick={loadSample} style={{padding: '12px 24px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '10px', fontWeight: '600'}}>
          📥 Load Sample
        </button>
        <button onClick={handleParse} style={{padding: '12px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'}}>
          ✅ Parse JSON
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
        <div>
          <h3 style={{marginBottom: '10px'}}>📝 JSON Input</h3>
          <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} placeholder="Paste JSON..." style={{width: '100%', height: '400px', padding: '16px', border: '1px solid #d1d5db', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', backgroundColor: 'white'}} />
        </div>

        <div>
          <h3 style={{marginBottom: '10px'}}>ℹ️ Scene Info</h3>
          <div style={{width: '100%', height: '400px', padding: '16px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: 'white', overflow: 'auto'}}>
            {error && <div style={{color: '#ef4444', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px', marginBottom: '10px'}}>❌ {error}</div>}
            {parsedData && (
              <div>
                <div style={{fontSize: '20px', fontWeight: '700', marginBottom: '16px'}}>{parsedData.scene_title}</div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                  <div><span style={{color: '#6b7280', fontSize: '12px'}}>Chart Type:</span> <strong>{parsedData.chart_type}</strong></div>
                  <div><span style={{color: '#6b7280', fontSize: '12px'}}>Generate Image:</span> <strong style={{color: parsedData.gen_image ? '#22c55e' : '#ef4444'}}>{parsedData.gen_image ? 'YES' : 'NO'}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {parsedData && parsedData.chart_data && renderSeriesData(parsedData.chart_data, parsedData.chart_type)}
    </div>
  );
};

export default App;