import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

const ChartDataEditor = ({ chartType, chartData, onDataChange, onSave }) => {
  const [localChartData, setLocalChartData] = useState(null);
  const [originalChartData, setOriginalChartData] = useState(null);
  const [error, setError] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCol, setHoveredCol] = useState(null);

  // Deep comparison function
  const deepEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    
    // Handle arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) return false;
      for (let i = 0; i < obj1.length; i++) {
        if (!deepEqual(obj1[i], obj2[i])) return false;
      }
      return true;
    }
    
    // Handle non-array objects
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
    if (Array.isArray(obj1) || Array.isArray(obj2)) return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  };


  // Transform chart data between formats when chart type changes
  const transformChartData = (data, targetChartType) => {
    if (!data || !data.series) return data;
    
    const isPieDonut = targetChartType === 'pie' || targetChartType === 'donut';
    const series = data.series;
    
    // Check if data format already matches the target chart type
    const hasLabels = series.labels && Array.isArray(series.labels) && series.labels.length > 0;
    const hasValues = series.data && series.data[0] && series.data[0].values && Array.isArray(series.data[0].values);
    const hasX = series.x && Array.isArray(series.x) && series.x.length > 0;
    const hasY = series.data && series.data[0] && series.data[0].y && Array.isArray(series.data[0].y);
    
    // If data format already matches target type, don't transform
    if (isPieDonut && hasLabels && hasValues) {
      return data; // Already in pie/donut format
    }
    if (!isPieDonut && hasX && hasY) {
      return data; // Already in standard format
    }
    
    // Only transform if format doesn't match
    // If converting from pie/donut to other chart types
    if (!isPieDonut && hasLabels && hasValues) {
      // Convert pie format to standard format
      const labels = Array.isArray(series.labels) ? series.labels : [];
      const values = Array.isArray(series.data[0].values) ? series.data[0].values : [];
      
      // Preserve all series if there are multiple
      const dataArray = Array.isArray(series.data) ? series.data : [];
      const convertedData = dataArray.map((entry, idx) => {
        if (idx === 0 && entry.values) {
          return {
            name: entry.name || 'Series 1',
            y: Array.isArray(entry.values) ? entry.values : []
          };
        } else if (entry.y) {
          return entry; // Already in correct format
        }
        return {
          name: entry.name || `Series ${idx + 1}`,
          y: []
        };
      });
      
      return {
        ...data,
        series: {
          x: labels,
          data: convertedData.length > 0 ? convertedData : [{
            name: 'Series 1',
            y: values
          }]
        }
      };
    }
    
    // If converting from standard format to pie/donut
    if (isPieDonut && hasX && hasY) {
      // Convert standard format to pie format
      const x = Array.isArray(series.x) ? series.x : [];
      const yValues = Array.isArray(series.data[0].y) ? series.data[0].y : [];
      
      return {
        ...data,
        series: {
          labels: x,
          data: [{
            name: series.data[0].name || 'Series 1',
            values: yValues
          }]
        }
      };
    }
    
    // If no transformation needed, return as-is
    return data;
  };

  // Use ref to track if we should update from props (prevent re-initialization when onDataChange updates parent)
  const isInternalUpdateRef = useRef(false);
  const lastChartDataRef = useRef(null);
  
  useEffect(() => {
    // Skip if this update was triggered by our own onDataChange
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    
    // Skip if chartData hasn't actually changed (compare serialized strings)
    const currentDataString = chartData ? (typeof chartData === 'string' ? chartData : JSON.stringify(chartData)) : '';
    if (lastChartDataRef.current === currentDataString) {
      return;
    }
    lastChartDataRef.current = currentDataString;
    
    // Initialize local state from props
    if (chartData) {
      try {
        const parsed = typeof chartData === 'string' ? JSON.parse(chartData) : chartData;
        
        // Only transform if chartType is provided and data format doesn't match
        let transformed = parsed;
        if (chartType && chartType.trim()) {
          transformed = transformChartData(parsed, chartType);
        }
        
        const cloned = JSON.parse(JSON.stringify(transformed));
        setLocalChartData(cloned);
        setOriginalChartData(JSON.parse(JSON.stringify(cloned)));
        setError('');
      } catch (e) {
        console.error('[ChartDataEditor] Error parsing chartData:', e);
        setError('Invalid chart data: ' + e.message);
        setLocalChartData(null);
        setOriginalChartData(null);
      }
    } else {
      setLocalChartData(null);
      setOriginalChartData(null);
    }
  }, [chartData, chartType]);

  // Update cell value
  const updateCell = (path, value) => {
    if (!localChartData) return;
    
    const newData = JSON.parse(JSON.stringify(localChartData));
    let current = newData;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    // For numeric paths (y, values), try to parse as number
    const isNumericPath = path.includes('y') || path.includes('values');
    if (isNumericPath) {
      const numValue = value === '' ? 0 : parseFloat(value);
      current[path[path.length - 1]] = isNaN(numValue) ? 0 : numValue;
    } else {
      current[path[path.length - 1]] = value;
    }
    
    // Sync changes with formatting.series_info
    if (newData.formatting && newData.formatting.series_info) {
      // For pie/donut charts, sync label changes with formatting.series_info
      if ((chartType === 'pie' || chartType === 'donut') && path[0] === 'series' && path[1] === 'labels') {
        const labelIndex = path[2];
        if (newData.formatting.series_info[labelIndex]) {
          newData.formatting.series_info[labelIndex].name = value;
        }
      }
      
      // For regular charts, sync series name changes with formatting.series_info
      if (path[0] === 'series' && path[1] === 'data' && path[3] === 'name') {
        const seriesIndex = path[2];
        if (newData.formatting.series_info[seriesIndex]) {
          newData.formatting.series_info[seriesIndex].name = value;
        }
      }
    }
    
    setLocalChartData(newData);
    // Mark that this is an internal update to prevent re-initialization
    isInternalUpdateRef.current = true;
    // Always call onDataChange when data is updated
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // Add row (at the end)
  const addRow = () => {
    if (!localChartData) return;
    
    const newData = JSON.parse(JSON.stringify(localChartData));
    
    if (chartType === 'pie' || chartType === 'donut') {
      const newLabel = 'New Category';
      newData.series.labels.push(newLabel);
      newData.series.data[0].values.push(0);
      if (newData.formatting && newData.formatting.series_info) {
        newData.formatting.series_info.push({name: newLabel, color: '#000000'});
      }
    } else if (chartType.includes('waterfall')) {
      newData.series.x.push('New Item');
      newData.series.data.forEach(series => {
        series.y.push(0);
        if (series.measure) series.measure.push('relative');
      });
    } else {
      newData.series.x.push('New');
      newData.series.data.forEach(series => series.y.push(0));
    }
    
    setLocalChartData(newData);
    // Mark that this is an internal update to prevent re-initialization
    isInternalUpdateRef.current = true;
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // Insert row at specific index
  const insertRow = (rowIndex) => {
    if (!localChartData) return;
    
    const newData = JSON.parse(JSON.stringify(localChartData));
    
    if (chartType === 'pie' || chartType === 'donut') {
      const newLabel = 'New Category';
      newData.series.labels.splice(rowIndex, 0, newLabel);
      newData.series.data[0].values.splice(rowIndex, 0, 0);
      if (newData.formatting && newData.formatting.series_info) {
        newData.formatting.series_info.splice(rowIndex, 0, {name: newLabel, color: '#000000'});
      }
    } else if (chartType.includes('waterfall')) {
      newData.series.x.splice(rowIndex, 0, 'New Item');
      newData.series.data.forEach(series => {
        series.y.splice(rowIndex, 0, 0);
        if (series.measure) series.measure.splice(rowIndex, 0, 'relative');
      });
    } else {
      newData.series.x.splice(rowIndex, 0, 'New');
      newData.series.data.forEach(series => series.y.splice(rowIndex, 0, 0));
    }
    
    setLocalChartData(newData);
    // Mark that this is an internal update to prevent re-initialization
    isInternalUpdateRef.current = true;
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // Remove row
  const removeRow = (rowIndex) => {
    if (!localChartData) return;
    
    const newData = JSON.parse(JSON.stringify(localChartData));
    
    if (chartType === 'pie' || chartType === 'donut') {
      if (newData.series.labels.length <= 1) {
        alert('Cannot remove the last row');
        return;
      }
      newData.series.labels.splice(rowIndex, 1);
      newData.series.data[0].values.splice(rowIndex, 1);
      if (newData.formatting && newData.formatting.series_info) {
        newData.formatting.series_info.splice(rowIndex, 1);
      }
    } else if (chartType.includes('waterfall')) {
      if (newData.series.x.length <= 1) {
        alert('Cannot remove the last row');
        return;
      }
      newData.series.x.splice(rowIndex, 1);
      newData.series.data.forEach(series => {
        series.y.splice(rowIndex, 1);
        if (series.measure) series.measure.splice(rowIndex, 1);
      });
    } else {
      if (newData.series.x.length <= 1) {
        alert('Cannot remove the last row');
        return;
      }
      newData.series.x.splice(rowIndex, 1);
      newData.series.data.forEach(series => series.y.splice(rowIndex, 1));
    }
    
    setLocalChartData(newData);
    // Mark that this is an internal update to prevent re-initialization
    isInternalUpdateRef.current = true;
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // Add series/column (at the end)
  const addColumn = () => {
    if (chartType === 'pie' || chartType === 'donut') {
      alert('Cannot add series to pie/donut charts');
      return;
    }
    
    if (!localChartData) return;
    
    const newData = JSON.parse(JSON.stringify(localChartData));
    const newSeriesName = 'New Series';
    const newSeries = {
      name: newSeriesName,
      y: new Array(newData.series.x.length).fill(0)
    };
    
    if (chartType.includes('waterfall_stacked')) {
      newSeries.measure = newData.series.data[0].measure.slice();
    }
    
    newData.series.data.push(newSeries);
    if (newData.formatting && newData.formatting.series_info) {
      newData.formatting.series_info.push({name: newSeriesName, color: '#000000'});
    }
    
    setLocalChartData(newData);
    // Mark that this is an internal update to prevent re-initialization
    isInternalUpdateRef.current = true;
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // Insert column at specific index
  const insertColumn = (colIndex) => {
    if (chartType === 'pie' || chartType === 'donut') {
      alert('Cannot add series to pie/donut charts');
      return;
    }
    
    if (!localChartData) return;
    
    const newData = JSON.parse(JSON.stringify(localChartData));
    const newSeriesName = 'New Series';
    const newSeries = {
      name: newSeriesName,
      y: new Array(newData.series.x.length).fill(0)
    };
    
    if (chartType.includes('waterfall_stacked')) {
      newSeries.measure = newData.series.data[0].measure.slice();
    }
    
    newData.series.data.splice(colIndex, 0, newSeries);
    if (newData.formatting && newData.formatting.series_info) {
      newData.formatting.series_info.splice(colIndex, 0, {name: newSeriesName, color: '#000000'});
    }
    
    setLocalChartData(newData);
    // Mark that this is an internal update to prevent re-initialization
    isInternalUpdateRef.current = true;
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // Remove column
  const removeColumn = (colIndex) => {
    if (chartType === 'pie' || chartType === 'donut') {
      alert('Cannot remove series from pie/donut charts');
      return;
    }
    
    if (!localChartData) return;
    
    const newData = JSON.parse(JSON.stringify(localChartData));
    
    if (newData.series.data.length <= 1) {
      alert('Cannot remove the last column');
      return;
    }
    
    newData.series.data.splice(colIndex, 1);
    if (newData.formatting && newData.formatting.series_info) {
      newData.formatting.series_info.splice(colIndex, 1);
    }
    
    setLocalChartData(newData);
    // Mark that this is an internal update to prevent re-initialization
    isInternalUpdateRef.current = true;
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // Render Excel-like table
  const renderTable = () => {
    if (!localChartData || !localChartData.series) {
      return (
        <div style={{padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '16px'}}>
          📋 No chart data available
        </div>
      );
    }

    const isPieDonut = chartType === 'pie' || chartType === 'donut';
    const isWaterfall = chartType.includes('waterfall') && !chartType.includes('waterfall_stacked');
    const isWaterfallStacked = chartType.includes('waterfall_stacked');

    if (isPieDonut) {
      return renderPieTable();
    } else if (isWaterfall) {
      return renderWaterfallTable();
    } else if (isWaterfallStacked) {
      return renderWaterfallStackedTable();
    } else {
      return renderStandardTable();
    }
  };

  // Standard table (bar, column, line, stacked)
  const renderStandardTable = () => {
    if (!localChartData || !localChartData.series) {
      return (
        <div style={{padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '16px'}}>
          📋 No chart data available
        </div>
      );
    }

    const series = localChartData.series;
    // Handle both pie format (labels/values) and standard format (x/data)
    let x, data;
    
    if (series.labels && series.data && series.data[0] && series.data[0].values) {
      // Pie format - convert to standard format for display
      x = Array.isArray(series.labels) ? series.labels : [];
      const values = Array.isArray(series.data[0].values) ? series.data[0].values : [];
      data = [{
        name: 'Series 1',
        y: values
      }];
    } else {
      // Standard format
      x = Array.isArray(series.x) ? series.x : [];
      data = Array.isArray(series.data) ? series.data : [];
    }

    // Safety check - if still no valid data, show error
    if (!x || !Array.isArray(x) || x.length === 0 || !data || !Array.isArray(data) || data.length === 0) {
      return (
        <div style={{padding: '40px', textAlign: 'center', color: '#ef4444', fontSize: '16px'}}>
          ⚠️ Chart data format is invalid for this chart type. Please regenerate the chart.
        </div>
      );
    }

    return (
      <div style={{overflow: 'auto', width: '100%', position: 'relative', padding: '12px'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #d1d5db'}}>
          <thead>
            <tr style={{backgroundColor: '#f3f4f6', position: 'relative'}}>
              <th style={cellStyle}></th>
              {data.map((series, idx) => (
                <th 
                  key={idx}
                  style={{...headerStyle, position: 'relative', overflow: 'visible'}}
                  onMouseEnter={() => setHoveredCol(idx)}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  <div style={{position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: '20px'}}>
                    <input
                      type="text"
                      value={series.name}
                      onChange={(e) => updateCell(['series', 'data', idx, 'name'], e.target.value)}
                      style={{...inputStyle, flex: 1, width: '100%'}}
                      onFocus={() => setHoveredCol(idx)}
                      onBlur={() => setTimeout(() => setHoveredCol(null), 200)}
                    />
                    <button
                      onClick={() => removeColumn(idx)}
                      style={{
                        ...removeHeaderButtonStyle,
                        opacity: hoveredCol === idx ? 1 : 0,
                        pointerEvents: hoveredCol === idx ? 'auto' : 'none',
                        transition: 'opacity 0.15s ease-in-out'
                      }}
                      title="Remove column"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    onClick={() => insertColumn(idx + 1)}
                    style={{
                      ...insertColBetweenButtonStyle,
                      opacity: hoveredCol === idx ? 1 : 0,
                      pointerEvents: hoveredCol === idx ? 'auto' : 'none',
                      transition: 'opacity 0.15s ease-in-out'
                    }}
                    title="Insert column after"
                  >
                    +
                  </button>
                </th>
              ))}
              <th 
                style={{...cellStyle, position: 'relative', minWidth: '40px'}}
                onMouseEnter={() => setHoveredCol(data.length)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                <button
                  onClick={addColumn}
                  style={{
                    ...insertColBetweenButtonStyle,
                    opacity: hoveredCol === data.length ? 1 : 0,
                    pointerEvents: hoveredCol === data.length ? 'auto' : 'none',
                    transition: 'opacity 0.15s ease-in-out'
                  }}
                  title="Add column at end"
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {x.map((label, rowIdx) => (
              <React.Fragment key={rowIdx}>
                <tr
                  onMouseEnter={() => setHoveredRow(rowIdx)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{position: 'relative'}}
                >
                  <td style={{...rowHeaderStyle, position: 'relative'}}>
                    <div style={{position: 'relative', width: '100%', display: 'flex', alignItems: 'center', paddingRight: '20px'}}>
                      <input
                        type="text"
                        value={label}
                        onChange={(e) => updateCell(['series', 'x', rowIdx], e.target.value)}
                        style={{...inputStyle, flex: 1, width: '100%'}}
                        onFocus={() => setHoveredRow(rowIdx)}
                        onBlur={() => setTimeout(() => setHoveredRow(null), 200)}
                      />
                      <button
                        onClick={() => removeRow(rowIdx)}
                        style={{
                          ...removeHeaderButtonStyle,
                          opacity: hoveredRow === rowIdx ? 1 : 0,
                          pointerEvents: hoveredRow === rowIdx ? 'auto' : 'none',
                          transition: 'opacity 0.15s ease-in-out'
                        }}
                        title="Remove row"
                      >
                        ×
                      </button>
                    </div>
                    <button
                      onClick={() => insertRow(rowIdx)}
                      style={{
                        ...insertRowButtonStyle,
                        opacity: hoveredRow === rowIdx ? 1 : 0,
                        pointerEvents: hoveredRow === rowIdx ? 'auto' : 'none',
                        transition: 'opacity 0.15s ease-in-out'
                      }}
                      title="Insert row above"
                    >
                      +
                    </button>
                  </td>
                  {data.map((series, colIdx) => (
                    <td key={colIdx} style={cellStyle}>
                      <input
                        type="number"
                        value={series.y[rowIdx]}
                        onChange={(e) => updateCell(['series', 'data', colIdx, 'y', rowIdx], e.target.value)}
                        style={inputStyle}
                      />
                    </td>
                  ))}
                  <td style={cellStyle}></td>
                </tr>
                <tr style={{height: '2px', position: 'relative'}}>
                  <td colSpan={data.length + 2} style={{padding: 0, border: 'none', position: 'relative', height: '2px'}}>
                    <button
                      onClick={() => insertRow(rowIdx + 1)}
                      style={{
                        ...insertRowBetweenButtonStyle,
                        opacity: hoveredRow === rowIdx ? 1 : 0,
                        pointerEvents: hoveredRow === rowIdx ? 'auto' : 'none',
                        transition: 'opacity 0.15s ease-in-out'
                      }}
                      title="Insert row below"
                    >
                      +
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
            <tr
              onMouseEnter={() => setHoveredRow(x.length)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td style={{...rowHeaderStyle, position: 'relative'}}>
                <button
                  onClick={addRow}
                  style={{
                    ...insertRowButtonStyle,
                    opacity: hoveredRow === x.length ? 1 : 0,
                    pointerEvents: hoveredRow === x.length ? 'auto' : 'none',
                    transition: 'opacity 0.15s ease-in-out'
                  }}
                  title="Add row at end"
                >
                  +
                </button>
              </td>
              {data.map((_, colIdx) => (
                <td key={colIdx} style={cellStyle}></td>
              ))}
              <td style={cellStyle}></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Pie/Donut table
  const renderPieTable = () => {
    if (!localChartData || !localChartData.series) {
      return (
        <div style={{padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '16px'}}>
          📋 No chart data available
        </div>
      );
    }
    
    const series = localChartData.series;
    const labels = Array.isArray(series.labels) ? series.labels : [];
    const dataArray = Array.isArray(series.data) ? series.data : [];
    const firstDataEntry = dataArray[0];
    const values = Array.isArray(firstDataEntry?.values) ? firstDataEntry.values : [];
    
    // Safety check - if no valid data, show error
    if (labels.length === 0 || values.length === 0) {
      return (
        <div style={{padding: '40px', textAlign: 'center', color: '#ef4444', fontSize: '16px'}}>
          ⚠️ Chart data format is invalid for pie/donut chart. Expected labels and values arrays.
        </div>
      );
    }

    return (
      <div style={{overflow: 'auto', width: '100%', position: 'relative', padding: '12px'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #d1d5db'}}>
          <thead>
            <tr style={{backgroundColor: '#f3f4f6'}}>
              <th style={headerStyle}>Category</th>
              <th style={headerStyle}>Value</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((label, idx) => (
              <React.Fragment key={idx}>
                <tr
                  onMouseEnter={() => setHoveredRow(idx)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{position: 'relative'}}
                >
                  <td style={{...rowHeaderStyle, position: 'relative'}}>
                    <div style={{position: 'relative', width: '100%', display: 'flex', alignItems: 'center', paddingRight: '20px'}}>
                      <input
                        type="text"
                        value={label}
                        onChange={(e) => updateCell(['series', 'labels', idx], e.target.value)}
                        style={{...inputStyle, flex: 1, width: '100%'}}
                        onFocus={() => setHoveredRow(idx)}
                        onBlur={() => setTimeout(() => setHoveredRow(null), 200)}
                      />
                      <button
                        onClick={() => removeRow(idx)}
                        style={{
                          ...removeHeaderButtonStyle,
                          opacity: hoveredRow === idx ? 1 : 0,
                          pointerEvents: hoveredRow === idx ? 'auto' : 'none',
                          transition: 'opacity 0.15s ease-in-out'
                        }}
                        title="Remove row"
                      >
                        ×
                      </button>
                    </div>
                    <button
                      onClick={() => insertRow(idx)}
                      style={{
                        ...insertRowButtonStyle,
                        opacity: hoveredRow === idx ? 1 : 0,
                        pointerEvents: hoveredRow === idx ? 'auto' : 'none',
                        transition: 'opacity 0.15s ease-in-out'
                      }}
                      title="Insert row above"
                    >
                      +
                    </button>
                  </td>
                  <td style={cellStyle}>
                    <input
                      type="number"
                      value={values[idx]}
                      onChange={(e) => updateCell(['series', 'data', 0, 'values', idx], e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                </tr>
                <tr style={{height: '2px', position: 'relative'}}>
                  <td colSpan={2} style={{padding: 0, border: 'none', position: 'relative', height: '2px'}}>
                    <button
                      onClick={() => insertRow(idx + 1)}
                      style={{
                        ...insertRowBetweenButtonStyle,
                        opacity: hoveredRow === idx ? 1 : 0,
                        pointerEvents: hoveredRow === idx ? 'auto' : 'none',
                        transition: 'opacity 0.15s ease-in-out'
                      }}
                      title="Insert row below"
                    >
                      +
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
            <tr
              onMouseEnter={() => setHoveredRow(labels.length)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td style={{...rowHeaderStyle, position: 'relative'}}>
                <button
                  onClick={addRow}
                  style={{
                    ...insertRowButtonStyle,
                    opacity: hoveredRow === labels.length ? 1 : 0,
                    pointerEvents: hoveredRow === labels.length ? 'auto' : 'none',
                    transition: 'opacity 0.15s ease-in-out'
                  }}
                  title="Add row at end"
                >
                  +
                </button>
              </td>
              <td style={cellStyle}></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Waterfall table
  const renderWaterfallTable = () => {
    const { x, data } = localChartData.series;
    const series = data[0];

    return (
      <div style={{overflow: 'auto', width: '100%', position: 'relative', padding: '12px'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #d1d5db'}}>
          <thead>
            <tr style={{backgroundColor: '#f3f4f6'}}>
              <th style={headerStyle}>Step</th>
              <th style={headerStyle}>Value</th>
              <th style={headerStyle}>Measure</th>
            </tr>
          </thead>
          <tbody>
            {x.map((label, idx) => (
              <React.Fragment key={idx}>
                <tr
                  onMouseEnter={() => setHoveredRow(idx)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{position: 'relative'}}
                >
                  <td style={{...rowHeaderStyle, position: 'relative'}}>
                    <div style={{position: 'relative', width: '100%', display: 'flex', alignItems: 'center', paddingRight: '20px'}}>
                      <input
                        type="text"
                        value={label}
                        onChange={(e) => updateCell(['series', 'x', idx], e.target.value)}
                        style={{...inputStyle, flex: 1, width: '100%'}}
                        onFocus={() => setHoveredRow(idx)}
                        onBlur={() => setTimeout(() => setHoveredRow(null), 200)}
                      />
                      <button
                        onClick={() => removeRow(idx)}
                        style={{
                          ...removeHeaderButtonStyle,
                          opacity: hoveredRow === idx ? 1 : 0,
                          pointerEvents: hoveredRow === idx ? 'auto' : 'none',
                          transition: 'opacity 0.15s ease-in-out'
                        }}
                        title="Remove row"
                      >
                        ×
                      </button>
                    </div>
                    <button
                      onClick={() => insertRow(idx)}
                      style={{
                        ...insertRowButtonStyle,
                        opacity: hoveredRow === idx ? 1 : 0,
                        pointerEvents: hoveredRow === idx ? 'auto' : 'none',
                        transition: 'opacity 0.15s ease-in-out'
                      }}
                      title="Insert row above"
                    >
                      +
                    </button>
                  </td>
                  <td style={cellStyle}>
                    <input
                      type="number"
                      value={series.y[idx]}
                      onChange={(e) => updateCell(['series', 'data', 0, 'y', idx], e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={cellStyle}>
                    <select
                      value={series.measure[idx]}
                      onChange={(e) => updateCell(['series', 'data', 0, 'measure', idx], e.target.value)}
                      style={selectStyle}
                    >
                      <option value="absolute">absolute</option>
                      <option value="relative">relative</option>
                      <option value="total">total</option>
                    </select>
                  </td>
                </tr>
                <tr style={{height: '2px', position: 'relative'}}>
                  <td colSpan={3} style={{padding: 0, border: 'none', position: 'relative', height: '2px'}}>
                    <button
                      onClick={() => insertRow(idx + 1)}
                      style={{
                        ...insertRowBetweenButtonStyle,
                        opacity: hoveredRow === idx ? 1 : 0,
                        pointerEvents: hoveredRow === idx ? 'auto' : 'none',
                        transition: 'opacity 0.15s ease-in-out'
                      }}
                      title="Insert row below"
                    >
                      +
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
            <tr
              onMouseEnter={() => setHoveredRow(x.length)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td style={{...rowHeaderStyle, position: 'relative'}}>
                <button
                  onClick={addRow}
                  style={{
                    ...insertRowButtonStyle,
                    opacity: hoveredRow === x.length ? 1 : 0,
                    pointerEvents: hoveredRow === x.length ? 'auto' : 'none',
                    transition: 'opacity 0.15s ease-in-out'
                  }}
                  title="Add row at end"
                >
                  +
                </button>
              </td>
              <td style={cellStyle}></td>
              <td style={cellStyle}></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Waterfall Stacked table
  const renderWaterfallStackedTable = () => {
    const { x, data } = localChartData.series;

    return (
      <div style={{overflow: 'auto', width: '100%', position: 'relative', padding: '12px'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #d1d5db'}}>
          <thead>
            <tr style={{backgroundColor: '#f3f4f6'}}>
              <th style={cellStyle}></th>
              {data.map((series, idx) => (
                <th 
                  key={idx} 
                  style={{...headerStyle, position: 'relative', overflow: 'visible'}} 
                  colSpan={2}
                  onMouseEnter={() => setHoveredCol(idx)}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  <div style={{position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: '20px'}}>
                    <input
                      type="text"
                      value={series.name}
                      onChange={(e) => updateCell(['series', 'data', idx, 'name'], e.target.value)}
                      style={{...inputStyle, flex: 1, width: '100%'}}
                    />
                  <button
                    onClick={() => removeColumn(idx)}
                    style={{
                      ...removeHeaderButtonStyle,
                      opacity: hoveredCol === idx ? 1 : 0,
                      pointerEvents: hoveredCol === idx ? 'auto' : 'none',
                      transition: 'opacity 0.15s ease-in-out'
                    }}
                    title="Remove column"
                  >
                    ×
                  </button>
                </div>
                <button
                  onClick={() => insertColumn(idx + 1)}
                  style={{
                    ...insertColBetweenButtonStyle,
                    opacity: hoveredCol === idx ? 1 : 0,
                    pointerEvents: hoveredCol === idx ? 'auto' : 'none',
                    transition: 'opacity 0.15s ease-in-out'
                  }}
                  title="Insert column after"
                >
                  +
                </button>
              </th>
            ))}
              <th 
                style={{...cellStyle, position: 'relative', minWidth: '40px'}}
                onMouseEnter={() => setHoveredCol(data.length)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                <button
                  onClick={addColumn}
                  style={{
                    ...insertColBetweenButtonStyle,
                    opacity: hoveredCol === data.length ? 1 : 0,
                    pointerEvents: hoveredCol === data.length ? 'auto' : 'none',
                    transition: 'opacity 0.15s ease-in-out'
                  }}
                  title="Add column at end"
                >
                  +
                </button>
              </th>
            </tr>
            <tr style={{backgroundColor: '#f9fafb'}}>
              <th style={headerStyle}>Step</th>
              {data.map((_, idx) => (
                <React.Fragment key={idx}>
                  <th style={headerStyle}>Value</th>
                  <th style={headerStyle}>Measure</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {x.map((label, rowIdx) => (
              <React.Fragment key={rowIdx}>
                <tr
                  onMouseEnter={() => setHoveredRow(rowIdx)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{position: 'relative'}}
                >
                  <td style={{...rowHeaderStyle, position: 'relative'}}>
                    <div style={{position: 'relative', width: '100%', display: 'flex', alignItems: 'center', paddingRight: '20px'}}>
                      <input
                        type="text"
                        value={label}
                        onChange={(e) => updateCell(['series', 'x', rowIdx], e.target.value)}
                        style={{...inputStyle, flex: 1, width: '100%'}}
                        onFocus={() => setHoveredRow(rowIdx)}
                        onBlur={() => setTimeout(() => setHoveredRow(null), 200)}
                      />
                      <button
                        onClick={() => removeRow(rowIdx)}
                        style={{
                          ...removeHeaderButtonStyle,
                          opacity: hoveredRow === rowIdx ? 1 : 0,
                          pointerEvents: hoveredRow === rowIdx ? 'auto' : 'none',
                          transition: 'opacity 0.15s ease-in-out'
                        }}
                        title="Remove row"
                      >
                        ×
                      </button>
                    </div>
                    <button
                      onClick={() => insertRow(rowIdx)}
                      style={{
                        ...insertRowButtonStyle,
                        opacity: hoveredRow === rowIdx ? 1 : 0,
                        pointerEvents: hoveredRow === rowIdx ? 'auto' : 'none',
                        transition: 'opacity 0.15s ease-in-out'
                      }}
                      title="Insert row above"
                    >
                      +
                    </button>
                  </td>
                  {data.map((series, colIdx) => (
                    <React.Fragment key={colIdx}>
                      <td style={cellStyle}>
                        <input
                          type="number"
                          value={series.y[rowIdx]}
                          onChange={(e) => updateCell(['series', 'data', colIdx, 'y', rowIdx], e.target.value)}
                          style={inputStyle}
                        />
                      </td>
                      <td style={cellStyle}>
                        <select
                          value={series.measure[rowIdx]}
                          onChange={(e) => updateCell(['series', 'data', colIdx, 'measure', rowIdx], e.target.value)}
                          style={selectStyle}
                        >
                          <option value="absolute">absolute</option>
                          <option value="relative">relative</option>
                          <option value="total">total</option>
                        </select>
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
                <tr style={{height: '2px', position: 'relative'}}>
                  <td colSpan={data.length * 2 + 1} style={{padding: 0, border: 'none', position: 'relative', height: '2px'}}>
                    <button
                      onClick={() => insertRow(rowIdx + 1)}
                      style={{
                        ...insertRowBetweenButtonStyle,
                        opacity: hoveredRow === rowIdx ? 1 : 0,
                        pointerEvents: hoveredRow === rowIdx ? 'auto' : 'none',
                        transition: 'opacity 0.15s ease-in-out'
                      }}
                      title="Insert row below"
                    >
                      +
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
            <tr
              onMouseEnter={() => setHoveredRow(x.length)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td style={{...rowHeaderStyle, position: 'relative'}}>
                <button
                  onClick={addRow}
                  style={{
                    ...insertRowButtonStyle,
                    opacity: hoveredRow === x.length ? 1 : 0,
                    pointerEvents: hoveredRow === x.length ? 'auto' : 'none',
                    transition: 'opacity 0.15s ease-in-out'
                  }}
                  title="Add row at end"
                >
                  +
                </button>
              </td>
              {data.map((_, colIdx) => (
                <React.Fragment key={colIdx}>
                  <td style={cellStyle}></td>
                  <td style={cellStyle}></td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Styles
  const cellStyle = {
    border: '1px solid #d1d5db',
    padding: '0',
    textAlign: 'center',
    backgroundColor: 'white',
    position: 'relative'
  };

  const headerStyle = {
    border: '1px solid #d1d5db',
    padding: '8px',
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: '#f3f4f6',
    position: 'relative'
  };

  const rowHeaderStyle = {
    border: '1px solid #d1d5db',
    padding: '0',
    textAlign: 'left',
    fontWeight: '600',
    backgroundColor: '#f9fafb',
    position: 'relative'
  };

  const inputStyle = {
    width: '100%',
    border: 'none',
    padding: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    textAlign: 'center',
    backgroundColor: 'transparent'
  };

  const selectStyle = {
    width: '100%',
    border: 'none',
    padding: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
    cursor: 'pointer'
  };

  const addButtonStyle = {
    padding: '4px 8px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    width: '100%'
  };

  const removeButtonStyle = {
    padding: '2px 6px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginLeft: '4px'
  };

  const insertRowButtonStyle = {
    position: 'absolute',
    left: '-12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '24px',
    height: '24px',
    padding: '0',
    backgroundColor: '#10b981',
    color: 'white',
    border: '2px solid white',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    pointerEvents: 'auto',
    opacity: 1,
    transition: 'opacity 0.1s ease-in-out'
  };

  const insertColBetweenButtonStyle = {
    position: 'absolute',
    top: '50%',
    right: '-12px',
    transform: 'translateY(-50%)',
    width: '24px',
    height: '24px',
    padding: '0',
    backgroundColor: '#10b981',
    color: 'white',
    border: '2px solid white',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    pointerEvents: 'auto',
    opacity: 1,
    transition: 'opacity 0.1s ease-in-out'
  };

  const removeHeaderButtonStyle = {
    position: 'absolute',
    right: '4px',
    top: '50%',
    transform: 'translateY(-50%)',
    padding: '2px 6px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    zIndex: 5
  };

  const insertRowBetweenButtonStyle = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '24px',
    height: '24px',
    padding: '0',
    backgroundColor: '#10b981',
    color: 'white',
    border: '2px solid white',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  };

  // Use useMemo to prevent unnecessary recalculations - must be called before any early returns
  // Use refs to cache serialized strings and comparison result to prevent flickering
  const localDataSerializedRef = useRef('');
  const originalDataSerializedRef = useRef('');
  const hasChangesRef = useRef(false);
  
  // Serialize data for stable comparison
  const localDataSerialized = useMemo(() => {
    try {
      const serialized = localChartData ? JSON.stringify(localChartData) : '';
      localDataSerializedRef.current = serialized;
      return serialized;
    } catch {
      localDataSerializedRef.current = '';
      return '';
    }
  }, [localChartData]);
  
  const originalDataSerialized = useMemo(() => {
    try {
      const serialized = originalChartData ? JSON.stringify(originalChartData) : '';
      originalDataSerializedRef.current = serialized;
      return serialized;
    } catch {
      originalDataSerializedRef.current = '';
      return '';
    }
  }, [originalChartData]);
  
  // Compare serialized strings for stable results - only recalculate when strings actually change
  const hasChangesMemo = useMemo(() => {
    if (!localChartData || !originalChartData) {
      const result = !!localChartData;
      hasChangesRef.current = result;
      return result;
    }
    
    // Only recalculate if serialized strings have changed
    if (localDataSerializedRef.current !== localDataSerialized || 
        originalDataSerializedRef.current !== originalDataSerialized) {
      const result = localDataSerialized !== originalDataSerialized;
      hasChangesRef.current = result;
      return result;
    }
    
    // Return cached result if strings haven't changed
    return hasChangesRef.current;
  }, [localChartData, originalChartData, localDataSerialized, originalDataSerialized]);

  if (error) {
    return (
      <div style={{padding: '20px', color: '#ef4444', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '10px'}}>
        ❌ {error}
      </div>
    );
  }

  return (
    <div style={{width: '100%'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
        <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>Chart Data Editor</h3>
        {onSave && hasChangesMemo && (
          <button
            onClick={async () => {
              if (onSave && localChartData) {
                try {
                  await onSave(localChartData);
                  // Update original data after successful save
                  setOriginalChartData(JSON.parse(JSON.stringify(localChartData)));
                } catch (err) {
                  console.error('Failed to save chart data:', err);
                }
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'background-color 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
          >
            💾 Save Changes
          </button>
        )}
      </div>
      
      <div style={{border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: 'white', overflow: 'auto', maxHeight: '600px', minHeight: '200px'}}>
        {renderTable()}
      </div>
    </div>
  );
};

export default ChartDataEditor;

