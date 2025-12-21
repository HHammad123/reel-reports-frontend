import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'
import { FaTimes, FaUndo, FaRedo } from 'react-icons/fa'

const deepClone = (value) => JSON.parse(JSON.stringify(value))

// Aspect ratio helper functions
const normalizeAspectRatioValue = (ratio, fallback = '16:9') => {
  if (!ratio || typeof ratio !== 'string') return fallback;
  // Normalize common separators: space, underscore, "x", "/", ":"
  const cleaned = ratio.replace(/\s+/g, '').replace(/_/g, ':');
  const match = cleaned.match(/(\d+(?:\.\d+)?)[:/xX](\d+(?:\.\d+)?)/);
  if (match) {
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (w > 0 && h > 0) return `${w}:${h}`;
  }
  const lower = cleaned.toLowerCase();
  if (lower === '9:16' || lower === '9x16') return '9:16';
  if (lower === '16:9' || lower === '16x9') return '16:9';
  return fallback;
};

const aspectRatioToCss = (ratio) => {
  const normalized = normalizeAspectRatioValue(ratio);
  const [w, h] = normalized.split(':').map(Number);
  if (w > 0 && h > 0) return `${w} / ${h}`;
  return '16 / 9';
};

// Constants from App.jsx
const FONTS = ['Arial', 'Open Sans', 'Roboto', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Trebuchet MS']
const LINE_DASH = ['solid', 'dash', 'dot', 'dashdot', 'longdash', 'longdashdot']
const LINE_SHAPE = ['linear', 'spline', 'hv', 'vh', 'hvh', 'vhv']
const MARKER_SYMBOLS = ['circle', 'square', 'diamond', 'cross', 'x', 'triangle-up', 'triangle-down', 'star']
const POSITIONS = ['inside', 'outside', 'auto']
const TEXT_POSITIONS = ['top left', 'top center', 'top right', 'middle left', 'middle center', 'middle right', 'bottom left', 'bottom center', 'bottom right']

const LEGEND_POSITIONS = {
  'top-left': { x: 0, y: 1, xanchor: 'left', yanchor: 'top' },
  'top-center': { x: 0.5, y: 1, xanchor: 'center', yanchor: 'top' },
  'top-right': { x: 1, y: 1, xanchor: 'right', yanchor: 'top' },
  'middle-left': { x: 0, y: 0.5, xanchor: 'left', yanchor: 'middle' },
  'middle-center': { x: 0.5, y: 0.5, xanchor: 'center', yanchor: 'middle' },
  'middle-right': { x: 1, y: 0.5, xanchor: 'right', yanchor: 'middle' },
  'bottom-left': { x: 0, y: 0, xanchor: 'left', yanchor: 'bottom' },
  'bottom-center': { x: 0.5, y: 0, xanchor: 'center', yanchor: 'bottom' },
  'bottom-right': { x: 1, y: 0, xanchor: 'right', yanchor: 'bottom' },
  'right': { x: 1.02, y: 1, xanchor: 'left', yanchor: 'top' }
}

const mapSeriesEntries = (entries = []) =>
  entries.reduce((acc, entry) => {
    if (!entry) return acc
    const key = entry.series ?? 'global'
    if (!acc[key]) acc[key] = {}
    acc[key][entry.name] = entry.value
    return acc
  }, {})

const getConfigDict = (section = []) => {
  if (!Array.isArray(section)) return {}
  return section.reduce((acc, item) => {
    if (!item || typeof item !== 'object') return acc
    const { name, value, series } = item
    if (!name) return acc
    if (series) {
      if (!acc[series]) acc[series] = {}
      acc[series][name] = value
    } else {
      acc[name] = value
    }
    return acc
  }, {})
}

// Helper functions from App.jsx
const getConfig = (sections, sectionName, configName, seriesName = null) => {
  if (!sections || !sections[sectionName]) return null
  
  const section = sections[sectionName]
  if (!Array.isArray(section)) return null
  
  if (seriesName && seriesName !== 'global') {
    // Look for series-specific first (non-global series)
    const seriesConfig = section.find(item => item.name === configName && item.series === seriesName)
    if (seriesConfig && seriesConfig.value !== null && seriesConfig.value !== undefined) {
      return seriesConfig.value
    }
  }
  
  // Fall back to global or direct lookup
  const globalConfig = section.find(item => 
    item.name === configName && (!item.series || item.series === 'global')
  )
  if (globalConfig && globalConfig.value !== null && globalConfig.value !== undefined) {
    return globalConfig.value
  }
  
  return null
}

const getAxisConfig = (sections, axis, subsection, configName) => {
  if (!sections || !sections[axis]) return null
  const axisSection = sections[axis]
  if (!axisSection[subsection]) return null
  const config = axisSection[subsection].find(item => item.name === configName)
  return config ? config.value : null
}

const formatNumber = (value, format, prefix = '', suffix = '') => {
  if (value == null) return ''
  
  let formatted = value.toString()
  if (format === '.0f') {
    formatted = Math.round(value).toString()
  } else if (format === '.1f') {
    formatted = value.toFixed(1)
  } else if (format === '.2f') {
    formatted = value.toFixed(2)
  } else if (format === '.0%') {
    formatted = Math.round(value * 100).toString() + '%'
  } else if (format === '.1%') {
    formatted = (value * 100).toFixed(1) + '%'
  }
  
  return `${prefix}${formatted}${suffix}`
}

const resolveBrandFont = (fontValue) => {
  if (fontValue === 'var(--brand-font)') return 'Verdana'
  return fontValue || 'Verdana'
}

const setConfigValue = (section = [], name, value, series = null) => {
  const newSection = Array.isArray(section) ? [...section] : []
  const key = series || 'global'

  const existingIndex = newSection.findIndex(
    item => item.name === name && (item.series || 'global') === key
  )

  const entry = { name, value, ...(series ? { series } : {}) }

  if (existingIndex >= 0) {
    newSection[existingIndex] = entry
  } else {
    newSection.push(entry)
  }

  return newSection
}

const extractChartData = (chartData, chartType) => {
  const seriesBlock = chartData?.series
  if (!seriesBlock || typeof seriesBlock !== 'object') {
    return null
  }

  if (['pie', 'donut'].includes(chartType)) {
    const labels = Array.isArray(seriesBlock.labels) ? seriesBlock.labels : []
    const dataEntries = Array.isArray(seriesBlock.data) ? seriesBlock.data : []
    const values = dataEntries[0]?.values
    if (!labels.length || !Array.isArray(values) || !values.length) return null
    const minLen = Math.min(labels.length, values.length)
    return { categories: labels.slice(0, minLen), values: values.slice(0, minLen) }
  }

  // WATERFALL
  if (chartType === 'waterfall_bar' || chartType === 'waterfall_column') {
    const xValues = Array.isArray(seriesBlock.x) ? seriesBlock.x : []
    const dataEntries = Array.isArray(seriesBlock.data) ? seriesBlock.data : []
    
    if (!xValues.length || !dataEntries.length) return null
    
    const firstEntry = dataEntries[0]
    if (!firstEntry || typeof firstEntry !== 'object') return null
    
    const yValues = Array.isArray(firstEntry.y) ? firstEntry.y : []
    const measure = Array.isArray(firstEntry.measure) ? firstEntry.measure : []
    
    if (!yValues.length || !measure.length) return null
    if (xValues.length !== yValues.length || xValues.length !== measure.length) return null
    
    return {
      categories: xValues,
      values: yValues,
      measure: measure
    }
  }

  // BAR/COLUMN/LINE/AREA/SCATTER/STACKED/CLUSTERED
  if (
    [
      'bar',
      'column',
      'stacked_bar',
      'stacked_column',
      'clustered_column',
      'clustered_bar',
      'line',
      'area',
      'scatter'
    ].includes(chartType)
  ) {
    // Primary extraction: try standard format (x and data[].y)
    const xValues = Array.isArray(seriesBlock.x) ? seriesBlock.x : []
    const dataEntries = Array.isArray(seriesBlock.data) ? seriesBlock.data : []
    const dataset = {}
    dataEntries.forEach((entry, idx) => {
      if (!entry || typeof entry !== 'object') return
      const name = entry.name ?? `Series ${idx + 1}`
      const yValues = Array.isArray(entry.y) ? entry.y : []
      // Always add series to dataset, even if empty (will be handled in rendering)
      dataset[name] = yValues
    })
    
    // Debug logging
    try {
      console.log('[extractChartData] Extracted data:', {
        chartType,
        xValuesCount: xValues.length,
        dataEntriesCount: dataEntries.length,
        datasetKeys: Object.keys(dataset),
        dataset: dataset
      });
    } catch(_) {}
    
    // If we have both x and dataset, return it (even if some series are empty)
    if (Object.keys(dataset).length && xValues.length) {
      return { categories: xValues, dataset }
    }
    
    // Fallback: Try to convert from pie/donut format (labels/values) to other chart format
    // This handles cases where API returns data in pie format but chart type has changed
    const labels = Array.isArray(seriesBlock.labels) ? seriesBlock.labels : []
    const pieDataEntries = Array.isArray(seriesBlock.data) ? seriesBlock.data : []
    const pieValues = pieDataEntries[0]?.values
    
    if (labels.length && Array.isArray(pieValues) && pieValues.length) {
      // Convert pie format to bar/line format
      // Use labels as categories (x-axis) and values as a single series
      const minLen = Math.min(labels.length, pieValues.length)
      const convertedDataset = {
        'Series 1': pieValues.slice(0, minLen)
      }
      return { 
        categories: labels.slice(0, minLen), 
        dataset: convertedDataset 
      }
    }
    
    // If still no data found, return null
    return null
  }

  return null
}

const createPieChart = (data, presetData, chartData, chartType, sections) => {
  console.log('🥧 createPieChart called with chartType:', chartType, 'Type:', typeof chartType)
  
  const labels = data.categories ?? []
  const values = data.values ?? []
  const effectiveSections = sections ?? presetData?.preset_definitions?.[0]?.sections ?? {}
  
  // ✅ CRITICAL: Check if labels should be shown - must check explicitly for false
  const showLabelsConfig = getConfig(effectiveSections, 'segment_values', 'show', 'global')
  const showLabels = showLabelsConfig !== false
  
  // ✅ Determine if this should be a donut (check multiple possible values)
  const isDonut = chartType === 'donut' || 
                  chartType === 'pie_donut' || 
                  chartType?.includes('donut')
  
  console.log('🥧 Pie/Donut chart config:', {
    chartType,
    isDonut,
    showLabelsConfig,
    showLabels,
    segment_values_section: effectiveSections?.segment_values
  })

  return [
    {
      type: 'pie',
      labels: labels,
      values: values,
      // ✅ Set hole based on isDonut check
      hole: isDonut ? 0.4 : 0,
      // ✅ When showLabels is false, completely hide text
      textinfo: showLabels ? 'label+percent' : 'none',
      textposition: getConfig(effectiveSections, 'segment_values', 'position', 'global') || 'inside',
      textfont: {
        size: getConfig(effectiveSections, 'segment_values', 'font_size', 'global') || 16,
        color: getConfig(effectiveSections, 'segment_values', 'font_color', 'global') || '#FFFFFF',
        family: resolveBrandFont(getConfig(effectiveSections, 'segment_values', 'font_family', 'global'))
      },
      marker: {
        colors: labels.map(label => getConfig(effectiveSections, 'colors', 'color', label)),
        line: {
          color: labels.map(label => getConfig(effectiveSections, 'slices', 'border_color', label) || '#FFFFFF'),
          width: labels.map(label => getConfig(effectiveSections, 'slices', 'border_width', label) || 0)
        }
      },
      opacity: labels.map(label => getConfig(effectiveSections, 'slices', 'opacity', label) ?? 1),
      hoverinfo: 'label+percent+value',
      pull: labels.map(label => getConfig(effectiveSections, 'slices', 'explode', label) || 0)
    }
  ]
}

const createBarChart = (data, presetData, chartData, chartType, sections) => {
  const categories = data.categories ?? []
  const dataset = data.dataset ?? {}
  const effectiveSections = sections ?? presetData?.preset_definitions?.[0]?.sections ?? {}
  const series = chartData?.series || {}
  const isStacked = chartType.includes('stacked')
  const isHorizontal = chartType.includes('bar') && !chartType.includes('column')

  // Helper to get value with proper fallback chain
  const getValue = (section, configName, seriesName, defaultValue) => {
    const seriesVal = getConfig(effectiveSections, section, configName, seriesName)
    if (seriesVal !== null && seriesVal !== undefined) return seriesVal
    
    const globalVal = getConfig(effectiveSections, section, configName, 'global')
    if (globalVal !== null && globalVal !== undefined) return globalVal
    
    return defaultValue
  }

  const traces = Object.entries(dataset).map(([seriesName, yValues]) => {
    const color = getConfig(effectiveSections, 'colors', 'color', seriesName)
    
    // Ensure yValues is an array and has the same length as categories
    const safeYValues = Array.isArray(yValues) ? yValues : []
    const paddedYValues = categories.map((_, idx) => safeYValues[idx] ?? 0)
    
    // ✅ Bar properties - READ FROM PRESET (no defaults)
    const barOpacity = getValue('bars', 'opacity', seriesName, undefined)
    const cornerRadius = getValue('bars', 'corner_radius', seriesName, undefined)
    const borderWidth = getValue('bars', 'border_width', seriesName, undefined)
    const borderColor = getValue('bars', 'border_color', seriesName, undefined)
    console.log('🎨 Bar styling for series:', seriesName, {
  barOpacity,
  cornerRadius,
  borderWidth,
  borderColor,
  sectionsStateBars: effectiveSections?.bars
})
    
    // ✅ Label properties
    const showLabels = getValue('segment_values', 'show', seriesName, true)
    const labelPosition = getValue('segment_values', 'position', seriesName, 'inside')
    const labelFormat = getValue('segment_values', 'format', seriesName, '.0f')
    const labelPrefix = getValue('segment_values', 'prefix', seriesName, '')
    const labelSuffix = getValue('segment_values', 'suffix', seriesName, '')
    const labelFontSize = getValue('segment_values', 'font_size', seriesName, 16)
    const labelFontColor = getValue('segment_values', 'font_color', seriesName, '#FFFFFF')
    const labelFontFamily = resolveBrandFont(getValue('segment_values', 'font_family', seriesName, 'Verdana'))
    const labelFontWeight = getValue('segment_values', 'font_weight', seriesName, 'bold')
    
    const textValues = showLabels ? paddedYValues.map(v => formatNumber(v, labelFormat, labelPrefix, labelSuffix)) : []
    
    // ✅ Build marker with opacity baked into color
    const marker = {}
    
    // Convert color to rgba with opacity
    if (color) {
      const finalOpacity = barOpacity !== null && barOpacity !== undefined ? barOpacity : 1
      
      // Convert hex to rgba
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16)
        const g = parseInt(color.slice(3, 5), 16)
        const b = parseInt(color.slice(5, 7), 16)
        marker.color = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`
      } else if (color.startsWith('rgba')) {
        marker.color = color.replace(/[\d.]+\)$/, `${finalOpacity})`)
      } else if (color.startsWith('rgb')) {
        marker.color = color.replace('rgb', 'rgba').replace(')', `, ${finalOpacity})`)
      } else {
        marker.color = color
        marker.opacity = finalOpacity
      }
    }
    
    if (cornerRadius !== null && cornerRadius !== undefined) {
      marker.cornerradius = cornerRadius
    }
    
    if (borderWidth !== null && borderWidth !== undefined && borderWidth > 0) {
      marker.line = {
        width: borderWidth,
        color: borderColor || '#FFFFFF'
      }
    }
    
    return {
      type: 'bar',
      name: seriesName,
      x: isHorizontal ? paddedYValues : (series.x || categories),
      y: isHorizontal ? (series.x || categories) : paddedYValues,
      text: textValues,
      textposition: labelPosition,
      textfont: {
        size: labelFontSize,
        color: labelFontColor,
        family: labelFontFamily,
        weight: labelFontWeight
      },
      constraintext: 'none',
      insidetextanchor: 'middle',
      marker: marker,
      orientation: isHorizontal ? 'h' : 'v'
    }
  })

  const layout = {
    barmode: isStacked ? 'stack' : 'group',
    bargap: getConfig(effectiveSections, 'spacing', 'bargap') ?? 0.15,
    bargroupgap: getConfig(effectiveSections, 'spacing', 'bargroupgap') ?? 0
  }
  return { traces, layout }
}

const createLineChart = (data, presetData, chartData, chartType, sections) => {
  const categories = data.categories ?? []
  const dataset = data.dataset ?? {}
  const effectiveSections = sections ?? presetData?.preset_definitions?.[0]?.sections ?? {}
  const series = chartData?.series || {}
  const isArea = chartType === 'area'

  // Helper to get value with proper fallback chain
  const getValue = (section, configName, seriesName, defaultValue) => {
    // Try series-specific first
    const seriesVal = getConfig(effectiveSections, section, configName, seriesName)
    if (seriesVal !== null && seriesVal !== undefined) return seriesVal
    
    // Try global
    const globalVal = getConfig(effectiveSections, section, configName, 'global')
    if (globalVal !== null && globalVal !== undefined) return globalVal
    
    // Use default
    return defaultValue
  }

  return Object.entries(dataset).map(([seriesName, yValues]) => {
    const color = getConfig(effectiveSections, 'colors', 'color', seriesName) || '#1470D2'
    
    // Line properties
    const lineWidth = getValue('lines', 'width', seriesName, 3)
    const lineDash = getValue('lines', 'dash', seriesName, 'solid')
    const lineShape = getValue('lines', 'shape', seriesName, 'linear')
    const lineOpacity = getValue('lines', 'opacity', seriesName, 1)
    
    // Marker properties
    const showMarkers = getValue('markers', 'show', seriesName, true)
    const markerSize = getValue('markers', 'size', seriesName, 8)
    const markerSymbol = getValue('markers', 'symbol', seriesName, 'circle')
    const markerColor = getValue('markers', 'color', seriesName, color)
    const markerLineWidth = getValue('markers', 'line_width', seriesName, 0)
    const markerLineColor = getValue('markers', 'line_color', seriesName, color)
    
    // Area properties
    const areaFill = getValue('areas', 'fill', seriesName, false)
    const areaOpacity = getValue('areas', 'opacity', seriesName, 0.2)
    const areaColor = getValue('areas', 'color', seriesName, color)
    
    // Label properties
    const showLabels = getValue('segment_values', 'show', seriesName, false)
    const labelFormat = getValue('segment_values', 'format', seriesName, '.0f')
    const labelPrefix = getValue('segment_values', 'prefix', seriesName, '')
    const labelSuffix = getValue('segment_values', 'suffix', seriesName, '')
    const labelPosition = getValue('segment_values', 'position', seriesName, 'top center')
    const labelFontSize = getValue('segment_values', 'font_size', seriesName, 14)
    const labelFontColor = getValue('segment_values', 'font_color', seriesName, color)
    const labelFontFamily = resolveBrandFont(getValue('segment_values', 'font_family', seriesName, 'Verdana'))
    
    const textValues = showLabels ? yValues.map(v => formatNumber(v, labelFormat, labelPrefix, labelSuffix)) : []
    
    return {
      type: 'scatter',
      name: seriesName,
      x: series.x || categories,
      y: yValues,
      mode: showMarkers ? (showLabels ? 'lines+markers+text' : 'lines+markers') : (showLabels ? 'lines+text' : 'lines'),
      line: {
        color: color,
        width: lineWidth,
        dash: lineDash,
        shape: lineShape
      },
      opacity: lineOpacity,
      marker: showMarkers ? {
        size: markerSize,
        symbol: markerSymbol,
        color: markerColor,
        line: {
          width: markerLineWidth,
          color: markerLineColor
        }
      } : undefined,
      fill: areaFill ? 'tonexty' : 'none',
      fillcolor: areaFill ? areaColor : undefined,
      text: textValues,
      textposition: labelPosition,
      textfont: {
        size: labelFontSize,
        color: labelFontColor,
        family: labelFontFamily
      }
    }
  })
}

const createScatterChart = (data, presetData, chartData, sections) => {
  const categories = data.categories ?? []
  const dataset = data.dataset ?? {}
  const effectiveSections = sections ?? presetData?.preset_definitions?.[0]?.sections ?? {}
  const series = chartData?.series || {}

  return Object.entries(dataset).map(([seriesName, yValues]) => {
    const color = getConfig(effectiveSections, 'colors', 'color', seriesName) || '#1470D2'
    const markerSize = getConfig(effectiveSections, 'markers', 'size', seriesName) || getConfig(effectiveSections, 'markers', 'size', 'global') || 8
    const markerSymbol = getConfig(effectiveSections, 'markers', 'symbol', seriesName) || getConfig(effectiveSections, 'markers', 'symbol', 'global') || 'circle'
    const markerOpacity = getConfig(effectiveSections, 'markers', 'opacity', seriesName) || getConfig(effectiveSections, 'markers', 'opacity', 'global') || 1
    
    const showLabels = getConfig(effectiveSections, 'segment_values', 'show', seriesName) || getConfig(effectiveSections, 'segment_values', 'show', 'global')
    const labelFormat = getConfig(effectiveSections, 'segment_values', 'format', seriesName) || getConfig(effectiveSections, 'segment_values', 'format', 'global') || '.0f'
    const labelPrefix = getConfig(effectiveSections, 'segment_values', 'prefix', seriesName) || getConfig(effectiveSections, 'segment_values', 'prefix', 'global') || ''
    const labelSuffix = getConfig(effectiveSections, 'segment_values', 'suffix', seriesName) || getConfig(effectiveSections, 'segment_values', 'suffix', 'global') || ''
    
    const textValues = showLabels ? yValues.map(v => formatNumber(v, labelFormat, labelPrefix, labelSuffix)) : []
    
    return {
      type: 'scatter',
      name: seriesName,
      x: series.x || categories,
      y: yValues,
      mode: showLabels ? 'markers+text' : 'markers',
      marker: {
        size: markerSize,
        symbol: markerSymbol,
        color: color,
        opacity: markerOpacity,
        line: {
          width: getConfig(effectiveSections, 'markers', 'line_width', seriesName) || 0,
          color: getConfig(effectiveSections, 'markers', 'line_color', seriesName) || color
        }
      },
      text: textValues,
      textposition: getConfig(effectiveSections, 'segment_values', 'position', seriesName) || getConfig(effectiveSections, 'segment_values', 'position', 'global') || 'top center',
      textfont: {
        size: getConfig(effectiveSections, 'segment_values', 'font_size', seriesName) || getConfig(effectiveSections, 'segment_values', 'font_size', 'global') || 14,
        color: getConfig(effectiveSections, 'segment_values', 'font_color', seriesName) || getConfig(effectiveSections, 'segment_values', 'font_color', 'global') || color,
        family: resolveBrandFont(getConfig(effectiveSections, 'segment_values', 'font_family', seriesName) || getConfig(effectiveSections, 'segment_values', 'font_family', 'global'))
      }
    }
  })
}
const createWaterfallChart = (data, presetData, chartData, chartType, sections) => {
  const categories = data.categories ?? []
  const values = data.values ?? []
  const measure = data.measure ?? []
  const effectiveSections = sections ?? presetData?.preset_definitions?.[0]?.sections ?? {}
  
  const isHorizontal = chartType === 'waterfall_bar'
  
  // ✅ Get waterfall colors from colors section (matching backend preset structure)
  // Look for entries with name="increasing", name="decreasing", name="totals"
  const colorsSection = effectiveSections.colors || []
  const findColor = (name, fallback) => {
    const entry = colorsSection.find(item => item.name === name || item.name === name.toLowerCase())
    return entry?.value || fallback
  }
  
  const increasingColor = findColor('increasing', '#1976D2')
  const decreasingColor = findColor('decreasing', '#FF375E')
  const totalsColor = findColor('totals', '#4F008C')
  
  // Get connector settings
  const showConnector = getConfig(effectiveSections, 'connector', 'show') !== false
  const connectorColor = getConfig(effectiveSections, 'connector', 'line_color') || '#999999'
  const connectorWidth = getConfig(effectiveSections, 'connector', 'line_width') || 2
  const connectorDash = getConfig(effectiveSections, 'connector', 'line_dash') || 'solid'
  
  // Get text/label settings for waterfall bars
  const showLabels = getConfig(effectiveSections, 'segment_values', 'show', 'global') !== false
  const labelFormat = getConfig(effectiveSections, 'segment_values', 'format', 'global') || '.0f'
  const labelPrefix = getConfig(effectiveSections, 'segment_values', 'prefix', 'global') || ''
  const labelSuffix = getConfig(effectiveSections, 'segment_values', 'suffix', 'global') || ''
  const labelPosition = getConfig(effectiveSections, 'segment_values', 'position', 'global') || 'outside'
  const labelFontSize = getConfig(effectiveSections, 'segment_values', 'font_size', 'global') || 14
  const labelFontColor = getConfig(effectiveSections, 'segment_values', 'font_color', 'global') || '#000000'
  const labelFontFamily = resolveBrandFont(getConfig(effectiveSections, 'segment_values', 'font_family', 'global'))
  
  const textValues = showLabels ? values.map(v => formatNumber(v, labelFormat, labelPrefix, labelSuffix)) : []
  
  return [{
    type: 'waterfall',
    name: 'Waterfall',
    orientation: isHorizontal ? 'h' : 'v',
    x: isHorizontal ? values : categories,
    y: isHorizontal ? categories : values,
    measure: measure,
    text: textValues,
    textposition: labelPosition,
    textfont: {
      size: labelFontSize,
      color: labelFontColor,
      family: labelFontFamily
    },
    increasing: { marker: { color: increasingColor } },
    decreasing: { marker: { color: decreasingColor } },
    totals: { marker: { color: totalsColor } },
    connector: { 
      visible: showConnector,
      line: { 
        color: connectorColor,
        width: connectorWidth,
        dash: connectorDash
      } 
    }
  }]
}

const applyDimensions = (fig, sections) => {
  const dims = getConfigDict(sections.dimensions ?? [])
  if (Object.keys(dims).length) {
    fig.layout.width = dims.width ?? 960
    fig.layout.height = dims.height ?? 540
  }
}

const applyMargins = (fig, sections) => {
  const margins = getConfigDict(sections.margins ?? [])
  if (Object.keys(margins).length) {
    fig.layout.margin = {
      l: margins.left ?? 80,
      r: margins.right ?? 80,
      t: margins.top ?? 100,
      b: margins.bottom ?? 80
    }
  }
}

const applyBackground = (fig, sections) => {
  if (!sections) {
    // Default to white if no sections
    fig.layout.paper_bgcolor = '#FFFFFF'
    fig.layout.plot_bgcolor = '#FFFFFF'
    return
  }
  
  // Use getConfig to read from the array format
  const paperColor = getConfig(sections, 'background', 'paper_color')
  const plotColor = getConfig(sections, 'background', 'color')
  
  // Always apply background colors - use configured values or default to white
  if (paperColor !== null && paperColor !== undefined && paperColor !== '') {
    fig.layout.paper_bgcolor = paperColor
  } else {
    fig.layout.paper_bgcolor = '#FFFFFF'
  }
  
  if (plotColor !== null && plotColor !== undefined && plotColor !== '') {
    fig.layout.plot_bgcolor = plotColor
  } else {
    fig.layout.plot_bgcolor = '#FFFFFF'
  }
}

const applyTitle = (fig, sections) => {
  const titleText = getConfig(sections, 'title', 'text')
  if (titleText !== null) {
    const xAlign = getConfig(sections, 'title', 'x_align') || 'left'
    const fontWeight = getConfig(sections, 'title', 'font_weight') || 'bold'  // ✅ ADD THIS
    
    fig.layout.title = {
      text: titleText || '',
      font: {
        family: resolveBrandFont(getConfig(sections, 'title', 'font_family')),
        size: getConfig(sections, 'title', 'font_size') || 40,
        color: getConfig(sections, 'title', 'font_color') || '#000000',
        weight: fontWeight  // ✅ ADD THIS - Map to Plotly's font.weight
      },
      x: xAlign === 'center' ? 0.5 : (xAlign === 'right' ? 1 : 0),
      xanchor: xAlign || 'left'
    }
  }
}

const applyLegend = (fig, sections) => {
  const showLegend = getConfig(sections, 'legend', 'show')
  if (showLegend === false) {
    fig.layout.showlegend = false
    return
  }
  
  fig.layout.showlegend = showLegend !== false
  const orientation = getConfig(sections, 'legend', 'orientation') === 'horizontal' ? 'h' : 'v'
  const position = getConfig(sections, 'legend', 'position') || 'right'
  const pos = LEGEND_POSITIONS[position] || LEGEND_POSITIONS['right']
  
  fig.layout.legend = {
    orientation: orientation,
    x: getConfig(sections, 'legend', 'x') ?? pos.x,
    y: getConfig(sections, 'legend', 'y') ?? pos.y,
    xanchor: getConfig(sections, 'legend', 'xanchor') || pos.xanchor,
    yanchor: getConfig(sections, 'legend', 'yanchor') || pos.yanchor,
    font: {
      family: resolveBrandFont(getConfig(sections, 'legend', 'font_family')) || 'Verdana',
      size: getConfig(sections, 'legend', 'font_size') || 20,
      color: getConfig(sections, 'legend', 'font_color') || '#000000'
    },
    bgcolor: getConfig(sections, 'legend', 'background_color') || 'rgba(255,255,255,0)',
    bordercolor: getConfig(sections, 'legend', 'border_color') || '#000000',
    borderwidth: getConfig(sections, 'legend', 'border_width') || 0
  }
}

const applyPresetFormatting = (fig, sections, chartType, chartData) => {
  if (!sections) return
  console.log('📝 applyPresetFormatting called with sections.y_axis.line:', 
    sections?.y_axis?.line,
    'Line visible value:', 
    getAxisConfig(sections, 'y_axis', 'line', 'visible')
  )
  applyDimensions(fig, sections)
  applyMargins(fig, sections)
  applyBackground(fig, sections)
  applyTitle(fig, sections)
  applyLegend(fig, sections)

  const isPieDonut = chartType === 'pie' || chartType === 'donut'
  
  // Only add axis configs if not pie/donut
  if (!isPieDonut) {
    // ✅ X-AXIS - Exactly like Python (lines 777-796)
    const xAxisSection = sections.x_axis
    if (xAxisSection && typeof xAxisSection === 'object') {
      const xAxisDict = {}
      
      // Grid
      const xGridShow = getAxisConfig(sections, 'x_axis', 'grid', 'show')
      if (xGridShow !== null && xGridShow !== undefined) {
        xAxisDict.showgrid = xGridShow
        if (xGridShow) {
          const gridColor = getAxisConfig(sections, 'x_axis', 'grid', 'color')
          const gridWidth = getAxisConfig(sections, 'x_axis', 'grid', 'width')
          if (gridColor) xAxisDict.gridcolor = gridColor
          if (gridWidth !== null && gridWidth !== undefined) xAxisDict.gridwidth = gridWidth
        }
      }
      
      // Line
      const xLineVisible = getAxisConfig(sections, 'x_axis', 'line', 'visible')
      if (xLineVisible !== null && xLineVisible !== undefined) {
        xAxisDict.showline = xLineVisible
        if (xLineVisible) {
          const lineColor = getAxisConfig(sections, 'x_axis', 'line', 'color')
          const lineWidth = getAxisConfig(sections, 'x_axis', 'line', 'width')
          if (lineColor) xAxisDict.linecolor = lineColor
          if (lineWidth !== null && lineWidth !== undefined) xAxisDict.linewidth = lineWidth
        }
      }
      
      // Ticks
      const xTickSize = getAxisConfig(sections, 'x_axis', 'ticks', 'font_size')
      if (xTickSize !== null && xTickSize !== undefined) {
        xAxisDict.showticklabels = xTickSize !== 0
        
        const tickFont = {}
        const tickFamily = getAxisConfig(sections, 'x_axis', 'ticks', 'font_family')
        const tickColor = getAxisConfig(sections, 'x_axis', 'ticks', 'font_color')
        
        if (tickFamily) tickFont.family = resolveBrandFont(tickFamily)
        tickFont.size = xTickSize === 0 ? 1 : xTickSize
        if (tickColor) tickFont.color = tickColor
        
        xAxisDict.tickfont = tickFont
        
        const tickAngle = getAxisConfig(sections, 'x_axis', 'ticks', 'angle')
        if (tickAngle !== null && tickAngle !== undefined) {
          xAxisDict.tickangle = tickAngle
        }
        
        const tickFormat = getAxisConfig(sections, 'x_axis', 'ticks', 'format')
        const tickPrefix = getAxisConfig(sections, 'x_axis', 'ticks', 'prefix')
        const tickSuffix = getAxisConfig(sections, 'x_axis', 'ticks', 'suffix')
        
        if (tickFormat) xAxisDict.tickformat = tickFormat
        if (tickPrefix) xAxisDict.tickprefix = tickPrefix
        if (tickSuffix) xAxisDict.ticksuffix = tickSuffix
      }
      
      // Title
      const xTitleText = getAxisConfig(sections, 'x_axis', 'title', 'text')
      if (xTitleText) {
        const titleObj = { text: xTitleText }
        const titleFont = {}
        
        const titleFamily = getAxisConfig(sections, 'x_axis', 'title', 'font_family')
        const titleSize = getAxisConfig(sections, 'x_axis', 'title', 'font_size')
        const titleColor = getAxisConfig(sections, 'x_axis', 'title', 'font_color')
        
        if (titleFamily) titleFont.family = resolveBrandFont(titleFamily)
        if (titleSize !== null && titleSize !== undefined) titleFont.size = titleSize
        if (titleColor) titleFont.color = titleColor
        
        titleObj.font = titleFont
        xAxisDict.title = titleObj
      }
      
      // ✅ CRITICAL: Merge with existing, don't replace
      if (Object.keys(xAxisDict).length > 0) {
        fig.layout.xaxis = {
          ...(fig.layout.xaxis || {}),
          ...xAxisDict
        }
      }
    }
    
    // ✅ Y-AXIS - Exactly like Python (lines 798-821)
    const yAxisSection = sections.y_axis
    if (yAxisSection && typeof yAxisSection === 'object') {
      const yAxisDict = {}
      
      // Grid
      const yGridShow = getAxisConfig(sections, 'y_axis', 'grid', 'show')
      if (yGridShow !== null && yGridShow !== undefined) {
        yAxisDict.showgrid = yGridShow
        if (yGridShow) {
          const gridColor = getAxisConfig(sections, 'y_axis', 'grid', 'color')
          const gridWidth = getAxisConfig(sections, 'y_axis', 'grid', 'width')
          if (gridColor) yAxisDict.gridcolor = gridColor
          if (gridWidth !== null && gridWidth !== undefined) yAxisDict.gridwidth = gridWidth
        }
      }
      
      // Line
const yLineVisible = getAxisConfig(sections, 'y_axis', 'line', 'visible')
console.log('🔍 In applyPresetFormatting - yLineVisible:', yLineVisible)

if (yLineVisible !== null && yLineVisible !== undefined) {
  yAxisDict.showline = yLineVisible
  console.log('✅ Setting yAxisDict.showline to:', yLineVisible)
  if (yLineVisible) {
    const lineColor = getAxisConfig(sections, 'y_axis', 'line', 'color')
    const lineWidth = getAxisConfig(sections, 'y_axis', 'line', 'width')
    if (lineColor) yAxisDict.linecolor = lineColor
    if (lineWidth !== null && lineWidth !== undefined) yAxisDict.linewidth = lineWidth
  }
}
      
      // Zeroline
      const yZerolineShow = getAxisConfig(sections, 'y_axis', 'zeroline', 'show')
      if (yZerolineShow !== null && yZerolineShow !== undefined) {
        yAxisDict.zeroline = yZerolineShow
        if (yZerolineShow) {
          const zerolineColor = getAxisConfig(sections, 'y_axis', 'zeroline', 'color')
          const zerolineWidth = getAxisConfig(sections, 'y_axis', 'zeroline', 'width')
          if (zerolineColor) yAxisDict.zerolinecolor = zerolineColor
          if (zerolineWidth !== null && zerolineWidth !== undefined) yAxisDict.zerolinewidth = zerolineWidth
        }
      }
      
      // Ticks
      const yTickSize = getAxisConfig(sections, 'y_axis', 'ticks', 'font_size')
      if (yTickSize !== null && yTickSize !== undefined) {
        yAxisDict.showticklabels = yTickSize !== 0
        
        const tickFont = {}
        const tickFamily = getAxisConfig(sections, 'y_axis', 'ticks', 'font_family')
        const tickColor = getAxisConfig(sections, 'y_axis', 'ticks', 'font_color')
        
        if (tickFamily) tickFont.family = resolveBrandFont(tickFamily)
        tickFont.size = yTickSize === 0 ? 1 : yTickSize
        if (tickColor) tickFont.color = tickColor
        
        yAxisDict.tickfont = tickFont
        
        const tickFormat = getAxisConfig(sections, 'y_axis', 'ticks', 'format')
        const tickPrefix = getAxisConfig(sections, 'y_axis', 'ticks', 'prefix')
        const tickSuffix = getAxisConfig(sections, 'y_axis', 'ticks', 'suffix')
        
        if (tickFormat) yAxisDict.tickformat = tickFormat
        if (tickPrefix) yAxisDict.tickprefix = tickPrefix
        if (tickSuffix) yAxisDict.ticksuffix = tickSuffix
      }
      
      // Title
      const yTitleText = getAxisConfig(sections, 'y_axis', 'title', 'text')
      if (yTitleText) {
        const titleObj = { text: yTitleText }
        const titleFont = {}
        
        const titleFamily = getAxisConfig(sections, 'y_axis', 'title', 'font_family')
        const titleSize = getAxisConfig(sections, 'y_axis', 'title', 'font_size')
        const titleColor = getAxisConfig(sections, 'y_axis', 'title', 'font_color')
        
        if (titleFamily) titleFont.family = resolveBrandFont(titleFamily)
        if (titleSize !== null && titleSize !== undefined) titleFont.size = titleSize
        if (titleColor) titleFont.color = titleColor
        
        titleObj.font = titleFont
        yAxisDict.title = titleObj
      }
      
      // ✅ CRITICAL: Merge with existing, don't replace
      if (Object.keys(yAxisDict).length > 0) {
        fig.layout.yaxis = {
          ...(fig.layout.yaxis || {}),
          ...yAxisDict
        }
      }
    }
    
    // ✅✅✅ NUCLEAR OPTION: Force override Plotly defaults if NOT in preset
    // This is what Python does - if no config, Plotly shows defaults
    // We need to EXPLICITLY hide things not in preset
    
    // If x_axis section doesn't exist or line.visible not set, force hide
    if (!xAxisSection || getAxisConfig(sections, 'x_axis', 'line', 'visible') === null) {
      fig.layout.xaxis = {
        ...(fig.layout.xaxis || {}),
        showline: false,
        linewidth: 0
      }
    }
    
    // Same for grid
    if (!xAxisSection || getAxisConfig(sections, 'x_axis', 'grid', 'show') === null) {
      fig.layout.xaxis = {
        ...(fig.layout.xaxis || {}),
        showgrid: false
      }
    }
    
    // Y-axis - only hide if NOT explicitly set
    if (!yAxisSection || getAxisConfig(sections, 'y_axis', 'line', 'visible') === null) {
      fig.layout.yaxis = {
        ...(fig.layout.yaxis || {}),
        showline: false,
        linewidth: 0
      }
    }
    
    if (!yAxisSection || getAxisConfig(sections, 'y_axis', 'grid', 'show') === null) {
      fig.layout.yaxis = {
        ...(fig.layout.yaxis || {}),
        showgrid: false
      }
    }
    
    if (!yAxisSection || getAxisConfig(sections, 'y_axis', 'zeroline', 'show') === null) {
      fig.layout.yaxis = {
        ...(fig.layout.yaxis || {}),
        zeroline: false
      }
    }
  }
  
  // Annotations for subtitle and center value
  fig.layout.annotations = []
  
  const subtitleText = getConfig(sections, 'subtitle', 'text')
  if (subtitleText && subtitleText.trim() !== '') {
    fig.layout.annotations.push({
      text: subtitleText,
      xref: 'paper',
      yref: 'paper',
      x: 0.5,
      y: 1,
      xanchor: 'center',
      yanchor: 'bottom',
      showarrow: false,
      font: {
        family: resolveBrandFont(getConfig(sections, 'subtitle', 'font_family')),
        size: getConfig(sections, 'subtitle', 'font_size') || 14,
        color: getConfig(sections, 'subtitle', 'font_color') || '#666666'
      }
    })
  }
  
  if (chartType === 'donut') {
    const showCenterValue = getConfig(sections, 'center_value', 'show')
    if (showCenterValue) {
      fig.layout.annotations.push({
        text: getConfig(sections, 'center_value', 'text') || 'Total',
        x: 0.5,
        y: 0.5,
        xref: 'paper',
        yref: 'paper',
        showarrow: false,
        font: {
          size: getConfig(sections, 'center_value', 'font_size') || 20,
          color: getConfig(sections, 'center_value', 'font_color') || '#000000',
          family: resolveBrandFont(getConfig(sections, 'center_value', 'font_family'))
        }
      })
    }
  }
}

const safeParseJSON = (value, fallback = {}) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return value ?? fallback
}

const chartTypeOptions = [
  { value: 'stacked_bar', label: 'Stacked Bar' },
  { value: 'stacked_column', label: 'Stacked Column' },
  { value: 'line', label: 'Line' },
  { value: 'clustered_bar', label: 'Clustered Bar' },
  { value: 'clustered_column', label: 'Clustered Column' },
  { value: 'waterfall_bar', label: 'Waterfall Bar' },
  { value: 'waterfall_column', label: 'Waterfall Column' },
  { value: 'pie', label: 'Pie' },
  { value: 'donut', label: 'Donut' }
]

const computeColorTargets = (chartType, chartData) => {
  if (!chartData || typeof chartData !== 'object') return []
  
  // ✅ Waterfall charts have fixed series: increasing, decreasing, totals
  if (chartType === 'waterfall_bar' || chartType === 'waterfall_column') {
    return ['increasing', 'decreasing', 'totals']
  }
  
  const isPie = chartType === 'pie' || chartType === 'donut'
  if (isPie) {
    return Array.isArray(chartData?.series?.labels) ? chartData.series.labels.filter(Boolean) : []
  }
  const dataEntries = Array.isArray(chartData?.series?.data) ? chartData.series.data : []
  return dataEntries
    .map((entry, idx) => entry?.name || `Series ${idx + 1}`)
    .filter(Boolean)
}

const extractInitialColorOverrides = (sceneData, targets = [], chartType = '') => {
  if (!sceneData || !targets.length) return {}
  const sections = sceneData?.preset?.preset_definitions?.[0]?.sections ?? {}
  
  // ✅ For waterfall charts, colors are stored differently
  const isWaterfall = chartType === 'waterfall_bar' || chartType === 'waterfall_column'
  
  if (isWaterfall) {
    // Waterfall: look for {name: "increasing", value: "#color"}
    const colorsSection = sections.colors || []
    return targets.reduce((acc, target) => {
      const entry = colorsSection.find(item => item.name === target || item.name === target.toLowerCase())
      if (entry?.value) {
        acc[target] = entry.value
      }
      return acc
    }, {})
  }
  
  // Other charts: use mapSeriesEntries
  const colorMap = mapSeriesEntries(sections.colors ?? [])
  return targets.reduce((acc, target) => {
    const colorValue =
      colorMap[target]?.color ??
      colorMap[target]?.value ??
      colorMap[target]?.fill ??
      colorMap[target]
    if (typeof colorValue === 'string' && colorValue.trim()) {
      acc[target] = colorValue.trim()
    }
    return acc
  }, {})
}

const mergeSectionArray = (base = [], overrides = []) => {
  if (!Array.isArray(overrides) || overrides.length === 0) return base
  
  const makeKey = (item) => {
    // ✅ For waterfall colors: key is just the name (e.g., "increasing")
    // ✅ For other colors: key is series::name (e.g., "Series 1::color")
    if (item?.name && !item?.series && ['increasing', 'decreasing', 'totals'].includes(item.name)) {
      return item.name // Waterfall color
    }
    return `${item?.series || 'global'}::${item?.name || ''}` // Regular color
  }
  
  const merged = Array.isArray(base) ? [...base] : []
  overrides.forEach((override) => {
    if (!override) return
    const key = makeKey(override)
    const idx = merged.findIndex((item) => makeKey(item) === key)
    if (idx >= 0) {
      merged[idx] = override
    } else {
      merged.push(override)
    }
  })
  return merged
}
const mergeSectionsWithOverrides = (baseSections = {}, overrideSections = null) => {
  if (!overrideSections) return baseSections
  const merged = { ...(baseSections || {}) }
  if (overrideSections.colors) {
    merged.colors = mergeSectionArray(baseSections?.colors, overrideSections.colors)
  }
  return merged
}

const buildSectionsOverrideFromColors = (colorOverrides = {}, chartType = '') => {
  const entries = Object.entries(colorOverrides || {}).filter(([_, color]) => Boolean(color))
  if (!entries.length) return null
  
  // ✅ For waterfall charts, use 'name' field instead of 'series'
  const isWaterfall = chartType === 'waterfall_bar' || chartType === 'waterfall_column'
  
  const colors = entries.map(([series, color]) => {
    if (isWaterfall) {
      // Waterfall: {name: "increasing", value: "#757575"}
      return {
        name: series, // "increasing", "decreasing", "totals"
        value: color
      }
    } else {
      // Other charts: {series: "Series 1", name: "color", value: "#1470D2"}
      return {
        series: series || 'global',
        name: 'color',
        value: color
      }
    }
  })
  return { colors }
}

const normalizeColorInputValue = (value, fallback = '#636EFA') => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const hexMatch = trimmed.match(/^#([0-9a-fA-F]{6})$/)
    if (hexMatch) return hexMatch[0]
  }
  return fallback
}

const generateChart = (sceneData, sectionsOverride = null) => {
  const chartType = (sceneData.chart_type || sceneData.chartType || '').toLowerCase()
  const rawChartData = sceneData.chart_data ?? sceneData.chartData ?? {}
  const chartData = safeParseJSON(rawChartData, {})
  const presetData = sceneData.preset ?? {}
  if (!chartType) {
    throw new Error('chart_type is missing in scene data')
  }

  const data = extractChartData(chartData, chartType)
  if (!data) {
    throw new Error('Unable to extract chart data')
  }

  const defaultSections = presetData?.preset_definitions?.[0]?.sections ?? {}
  const sections = sectionsOverride ?? defaultSections

  const fig = {
    data: [],
    layout: {
      autosize: true,
      margin: { l: 80, r: 80, t: 100, b: 80 },
      paper_bgcolor: '#FFFFFF',
      plot_bgcolor: '#FFFFFF'
    },
    config: {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['zoom2d', 'lasso2d', 'autoScale2d']
    }
  }

  if (['pie', 'donut'].includes(chartType)) {
  const pieData = createPieChart(data, presetData, { ...chartData, chart_type: chartType }, chartType, sections)
  fig.data = pieData
}else if (
    ['bar', 'column', 'stacked_bar', 'stacked_column', 'clustered_column', 'clustered_bar'].includes(
      chartType
    )
  ) {
    const { traces, layout } = createBarChart(data, presetData, chartData, chartType, sections)
    fig.data = traces
    fig.layout = { ...fig.layout, ...layout }
  } else if (['line', 'area'].includes(chartType)) {
    fig.data = createLineChart(data, presetData, chartData, chartType, sections)
  } else if (chartType === 'scatter') {
    fig.data = createScatterChart(data, presetData, chartData, sections)
  } else if (chartType === 'waterfall_bar' || chartType === 'waterfall_column') {
    fig.data = createWaterfallChart(data, presetData, chartData, chartType, sections)
  } else {
    throw new Error(`Unsupported chart type: ${chartType}`)
  }

  applyPresetFormatting(fig, sections, chartType, chartData)
  return fig
}

const ChartEditorModal = ({ sceneData, isOpen = false, onClose, onSave }) => {
  const [figure, setFigure] = useState(null)
  const [error, setError] = useState('')
  const [seriesColorOverrides, setSeriesColorOverrides] = useState({})
  const [rawChartDataInput, setRawChartDataInput] = useState('')
  const [rawChartError, setRawChartError] = useState('')
  const [chartTypeState, setChartTypeState] = useState(
    (sceneData?.chart_type || sceneData?.chartType || '').toLowerCase()
  )
  const [chartDataState, setChartDataState] = useState(
    safeParseJSON(sceneData?.chart_data ?? sceneData?.chartData ?? {}, {})
  )
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [layoutOverrides, setLayoutOverrides] = useState({
    title: { text: '', font: { size: 20, color: '#000000', family: 'Verdana' }, x: 0.5, xanchor: 'center' },
    showlegend: true,
    legend: { orientation: 'v', x: 1.02, y: 0.5, font: { size: 12, color: '#000000', family: 'Verdana' } },
    paper_bgcolor: '#FFFFFF',
    plot_bgcolor: '#FFFFFF'
  })
  const [expandedSections, setExpandedSections] = useState({
    dimensions: false,
    title: false,
    subtitle: false,
    legend: false,
    background: false,
    margins: false,
    bars: false,
    spacing: false,
    lines: false,
    markers: false,
    areas: false,
    slices: false,
    centerValue: false,
    dataLabels: false,
    xAxis: false,
    yAxis: false,
    axes: false,
    data: false
  })
  const [sectionsState, setSectionsState] = useState({})
  const [selectedSeriesForSection, setSelectedSeriesForSection] = useState({
    colors: 'global',
    bars: 'global',
    lines: 'global',
    markers: 'global',
    areas: 'global',
    slices: 'global',
    dataLabels: 'global'
  })
  const [tempInputValues, setTempInputValues] = useState({})  // ← ADD THIS LINE
  const [history, setHistory] = useState([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const historyInitializedRef = useRef(false)
  const currentHistoryIndexRef = useRef(-1)
  const plotRef = useRef(null)
  const sceneNumber = sceneData?.scene_number || sceneData?.sceneNumber
  const chartTitle = sceneData?.chart_title || sceneData?.scene_title || 'Chart'
  const [availablePresets, setAvailablePresets] = useState([])
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0)
  const [isLoadingPresets, setIsLoadingPresets] = useState(false)
  const [aspectRatioCss, setAspectRatioCss] = useState('16 / 9')
  const [isVertical, setIsVertical] = useState(false) // Track if aspect ratio is 9:16 (vertical)

  // Capture current editor state
  const captureEditorState = useCallback(() => {
    return {
      chartTypeState,
      chartDataState: deepClone(chartDataState),
      seriesColorOverrides: deepClone(seriesColorOverrides),
      layoutOverrides: deepClone(layoutOverrides),
      rawChartDataInput
    }
  }, [chartTypeState, chartDataState, seriesColorOverrides, layoutOverrides, rawChartDataInput])

  // Restore editor state from history entry
  const restoreEditorState = useCallback((state) => {
    setChartTypeState(state.chartTypeState)
    setChartDataState(deepClone(state.chartDataState))
    setSeriesColorOverrides(deepClone(state.seriesColorOverrides))
    setLayoutOverrides(deepClone(state.layoutOverrides))
    setRawChartDataInput(state.rawChartDataInput)
    setRawChartError('')
    setIsDirty(true)
    setSaveError('')
  }, [])

  // Save current state to history
  const saveToHistory = useCallback((skipMarkDirty = false) => {
    const currentState = captureEditorState()
    setHistory((prev) => {
      const idx = currentHistoryIndexRef.current
      const newHistory = prev.slice(0, idx + 1)
      newHistory.push(currentState)
      // Limit history to 50 entries
      const finalHistory = newHistory.length > 50 ? newHistory.slice(-50) : newHistory
      const newIndex = finalHistory.length - 1
      currentHistoryIndexRef.current = newIndex
      setCurrentHistoryIndex(newIndex)
      return finalHistory
    })
    if (!skipMarkDirty) {
      setIsDirty(true)
      setSaveError('')
    }
  }, [captureEditorState])

  // Undo handler
  const handleUndo = useCallback(() => {
    const idx = currentHistoryIndexRef.current
    if (idx > 0 && history.length > 0) {
      const prevIndex = idx - 1
      const prevState = history[prevIndex]
      if (prevState) {
        restoreEditorState(prevState)
        currentHistoryIndexRef.current = prevIndex
        setCurrentHistoryIndex(prevIndex)
      }
    }
  }, [history, restoreEditorState])

  // Redo handler
  const handleRedo = useCallback(() => {
    const idx = currentHistoryIndexRef.current
    if (idx < history.length - 1 && history.length > 0) {
      const nextIndex = idx + 1
      const nextState = history[nextIndex]
      if (nextState) {
        restoreEditorState(nextState)
        currentHistoryIndexRef.current = nextIndex
        setCurrentHistoryIndex(nextIndex)
      }
    }
  }, [history, restoreEditorState])

  const canUndo = currentHistoryIndex > 0 && history.length > 0
  const canRedo = currentHistoryIndex < history.length - 1 && history.length > 0

  const rebuildEditorStateFromScene = useCallback(() => {
  if (!sceneData) {
    console.warn('[ChartEditorModal] rebuildEditorStateFromScene called but sceneData is null/undefined')
    return
  }
  
  const nextType = (sceneData?.chart_type || sceneData?.chartType || '').toLowerCase()
  if (!nextType) {
    console.warn('[ChartEditorModal] No chart_type found in sceneData. Available keys:', Object.keys(sceneData || {}))
    return
  }
  const parsedData = safeParseJSON(sceneData?.chart_data ?? sceneData?.chartData ?? {}, {})
  
  try {
    console.log('[ChartEditorModal] rebuildEditorStateFromScene:', {
      chart_type: nextType,
      has_chart_data: !!(sceneData?.chart_data || sceneData?.chartData),
      chart_data_type: typeof (sceneData?.chart_data || sceneData?.chartData),
      sceneData_keys: Object.keys(sceneData || {})
    })
  } catch(_) {}
  
  const targets = computeColorTargets(nextType, parsedData)
  const selectedPreset = availablePresets[selectedPresetIndex] || sceneData?.preset?.preset_definitions?.[0]
  const presetSections = selectedPreset?.sections ?? sceneData?.preset?.preset_definitions?.[0]?.sections ?? {}
  
  const titleConfig = getConfigDict(presetSections.title ?? [])
  const legendConfig = getConfigDict(presetSections.legend ?? [])
  const bgConfig = getConfigDict(presetSections.background ?? [])
  
  setChartTypeState(nextType)
  setChartDataState(parsedData)
  
  // ✅ CRITICAL FIX: Deep clone the entire preset sections into sectionsState
  // This ensures all axis configs are available in the UI
  setSectionsState(JSON.parse(JSON.stringify(presetSections)))
  
  const sceneDataWithSelectedPreset = selectedPreset 
    ? { ...sceneData, preset: { preset_definitions: [selectedPreset] } }
    : sceneData
  setSeriesColorOverrides(extractInitialColorOverrides(sceneDataWithSelectedPreset, targets, nextType))
  setRawChartDataInput(JSON.stringify(parsedData, null, 2))
  setRawChartError('')
  setIsDirty(false)
  setSaveError('')
  setLayoutOverrides({
    title: {
      text: titleConfig.text || sceneData?.chart_title || sceneData?.scene_title || '',
      font: {
        size: titleConfig.font_size || 20,
        color: titleConfig.font_color || '#000000',
        family: titleConfig.font_family || 'Verdana'
      },
      x: titleConfig.x_align === 'left' ? 0 : 0.5,
      xanchor: titleConfig.x_align === 'left' ? 'left' : 'center'
    },
    showlegend: legendConfig.show !== false,
    legend: {
      orientation: legendConfig.orientation === 'horizontal' ? 'h' : 'v',
      x: legendConfig.x ?? 1.02,
      y: legendConfig.y ?? 0.5,
      font: {
        size: legendConfig.font_size || 12,
        color: legendConfig.font_color || '#000000',
        family: legendConfig.font_family || 'Verdana'
      }
    },
    paper_bgcolor: bgConfig.paper_color || '#FFFFFF',
    plot_bgcolor: bgConfig.plot_color || bgConfig.color || '#FFFFFF'
  })
  
  // Initialize history with initial state
  const initialState = {
    chartTypeState: nextType,
    chartDataState: deepClone(parsedData),
    seriesColorOverrides: extractInitialColorOverrides(sceneData, targets),
    layoutOverrides: {
      title: {
        text: titleConfig.text || sceneData?.chart_title || sceneData?.scene_title || '',
        font: {
          size: titleConfig.font_size || 20,
          color: titleConfig.font_color || '#000000',
          family: titleConfig.font_family || 'Verdana'
        },
        x: titleConfig.x_align === 'left' ? 0 : 0.5,
        xanchor: titleConfig.x_align === 'left' ? 'left' : 'center'
      },
      showlegend: legendConfig.show !== false,
      legend: {
        orientation: legendConfig.orientation === 'horizontal' ? 'h' : 'v',
        x: legendConfig.x ?? 1.02,
        y: legendConfig.y ?? 0.5,
        font: {
          size: legendConfig.font_size || 12,
          color: legendConfig.font_color || '#000000',
          family: legendConfig.font_family || 'Verdana'
        }
      },
      paper_bgcolor: bgConfig.paper_color || '#FFFFFF',
      plot_bgcolor: bgConfig.plot_color || bgConfig.color || '#FFFFFF',
      xaxis: { title: { text: '' }, showgrid: true, gridcolor: '#E5E5E5', showline: true, linecolor: '#000000', linewidth: 1 },
      yaxis: { title: { text: '' }, showgrid: true, gridcolor: '#E5E5E5', showline: true, linecolor: '#000000', linewidth: 1 }
    },
    rawChartDataInput: JSON.stringify(parsedData, null, 2)
  }
  setHistory([initialState])
  setCurrentHistoryIndex(0)
  currentHistoryIndexRef.current = 0
  historyInitializedRef.current = true
}, [sceneData, availablePresets, selectedPresetIndex])

  useEffect(() => {
    if (isOpen && sceneData) {
      rebuildEditorStateFromScene()
    }
  }, [isOpen, sceneData, rebuildEditorStateFromScene])

  // Fetch available chart presets
  useEffect(() => {
    const fetchChartPresets = async () => {
      if (!sceneData || !sceneNumber) return
      
      setIsLoadingPresets(true)
      try {
        const sessionId = localStorage.getItem('session_id')
        const userId = localStorage.getItem('token')
        if (!sessionId || !userId) {
          // Fallback: use preset_definitions from sceneData if available
          const presetDefs = sceneData?.preset?.preset_definitions || []
          if (Array.isArray(presetDefs) && presetDefs.length > 0) {
            setAvailablePresets(presetDefs)
            // Prioritize "final" preset if it exists
            const finalIndex = presetDefs.findIndex(p => p?.name === 'final')
            setSelectedPresetIndex(finalIndex >= 0 ? finalIndex : 0)
            setIsLoadingPresets(false)
            return
          }
          setIsLoadingPresets(false)
          return
        }

        // Try to fetch all available chart presets
        // First, try fetching from the chart-preset endpoint to see if it returns a list
        const resp = await fetch(
          `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/chart-preset/${encodeURIComponent(
            sessionId
          )}/${encodeURIComponent(sceneNumber)}?user_id=${encodeURIComponent(userId)}`
        )
        
        if (resp.ok) {
          const payload = await resp.json()
          const presetPayload = payload?.chart_preset || payload
          
          // Check if it's an array of presets or a single preset
          if (Array.isArray(presetPayload) && presetPayload.length > 0) {
            // If it's an array, extract preset_definitions from each
            const allPresets = presetPayload.flatMap(p => 
              Array.isArray(p?.preset?.preset_definitions) 
                ? p.preset.preset_definitions 
                : (p?.preset_definitions || [])
            )
            if (allPresets.length > 0) {
              setAvailablePresets(allPresets)
              // Prioritize "final" preset if it exists, otherwise use current preset or first one
              const finalIndex = allPresets.findIndex(p => p?.name === 'final')
              if (finalIndex >= 0) {
                setSelectedPresetIndex(finalIndex)
              } else {
              // Find current preset index
              const currentPresetName = sceneData?.preset?.preset_definitions?.[0]?.name
              const foundIndex = allPresets.findIndex(p => p?.name === currentPresetName)
              setSelectedPresetIndex(foundIndex >= 0 ? foundIndex : 0)
              }
              setIsLoadingPresets(false)
              return
            }
          }
        }

        // Fallback: use preset_definitions from sceneData
        const presetDefs = sceneData?.preset?.preset_definitions || []
        if (Array.isArray(presetDefs) && presetDefs.length > 0) {
          setAvailablePresets(presetDefs)
          // Prioritize "final" preset if it exists
          const finalIndex = presetDefs.findIndex(p => p?.name === 'final')
          setSelectedPresetIndex(finalIndex >= 0 ? finalIndex : 0)
        } else {
          // Default preset if none found
          setAvailablePresets([{ name: 'Default', sections: {} }])
          setSelectedPresetIndex(0)
        }
      } catch (err) {
        console.error('Error fetching chart presets:', err)
        // Fallback: use preset_definitions from sceneData
        const presetDefs = sceneData?.preset?.preset_definitions || []
        if (Array.isArray(presetDefs) && presetDefs.length > 0) {
          setAvailablePresets(presetDefs)
          // Prioritize "final" preset if it exists
          const finalIndex = presetDefs.findIndex(p => p?.name === 'final')
          setSelectedPresetIndex(finalIndex >= 0 ? finalIndex : 0)
        } else {
          setAvailablePresets([{ name: 'Default', sections: {} }])
          setSelectedPresetIndex(0)
        }
      } finally {
        setIsLoadingPresets(false)
      }
    }

    if (isOpen && sceneData) {
      fetchChartPresets()
    }
  }, [isOpen, sceneData, sceneNumber])

  // Fetch aspect ratio from session data
  useEffect(() => {
    const fetchAspectRatio = async () => {
      try {
        const session_id = localStorage.getItem('session_id')
        const user_id = localStorage.getItem('token')
        if (!session_id || !user_id) {
          console.log('📐 ChartEditorModal - No session_id or user_id, using default 16:9')
          setAspectRatioCss('16 / 9')
          return
        }

        console.log('📐 ChartEditorModal - Fetching aspect ratio from session data...')
        const sresp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id, session_id })
        })
        
        if (!sresp.ok) {
          throw new Error(`Failed to fetch session data: ${sresp.status}`)
        }

        const stext = await sresp.text()
        let sdata
        try {
          sdata = JSON.parse(stext)
        } catch (_) {
          sdata = stext
        }

        const sessionData = sdata?.session_data || sdata?.session || {}
        const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 ? sessionData.scripts : []
        // scripts[0] has the latest version (e.g., v9) - use index 0 for latest script
        const currentScript = scripts[0] || null

        const pickString = (val) => (typeof val === 'string' && val.trim() ? val.trim() : '')

        // 1) Prefer aspect_ratio from guidelines
        let fromGuidelines = ''
        if (currentScript && typeof currentScript === 'object') {
          const currentVersionKey = currentScript.current_version || currentScript.currentVersion
          const currentVersionObj =
            (typeof currentVersionKey === 'string' && currentScript[currentVersionKey]) ||
            currentScript
          const userQueryArr =
            (Array.isArray(currentVersionObj?.userquery) && currentVersionObj.userquery) ||
            (Array.isArray(currentVersionObj?.user_query) && currentVersionObj.user_query) ||
            []
          const firstUserQuery = userQueryArr[0] || {}
          const guidelines = firstUserQuery?.guidelines || firstUserQuery?.guideLines || {}
          const tech = guidelines.technical_and_formal_constraints ||
            guidelines.technicalAndFormalConstraints ||
            guidelines.technical_constraints ||
            guidelines.technicalConstraints ||
            {}
          fromGuidelines =
            pickString(tech.aspect_ratio) ||
            pickString(tech.aspectRatio)
        }

        let aspectRatio = '16:9'
        if (fromGuidelines) {
          aspectRatio = fromGuidelines
          console.log('📐 ChartEditorModal - Found aspect ratio from guidelines:', aspectRatio)
        } else {
          // 2) Fallback to script-level / session-level aspect_ratio fields
          aspectRatio =
            pickString(currentScript?.aspect_ratio) ||
            pickString(currentScript?.aspectRatio) ||
            pickString(sessionData?.aspect_ratio) ||
            pickString(sessionData?.aspectRatio) ||
            '16:9'
          console.log('📐 ChartEditorModal - Using fallback aspect ratio:', aspectRatio)
        }

        // Normalize the aspect ratio first (handles 9_16, 16_9, etc.)
        const normalizedRatio = normalizeAspectRatioValue(aspectRatio)
        console.log('📐 ChartEditorModal - Normalized aspect ratio:', normalizedRatio)
        
        // Check if it's vertical (9:16)
        const isVerticalRatio = normalizedRatio === '9:16'
        setIsVertical(isVerticalRatio)
        console.log('📐 ChartEditorModal - Is vertical (9:16):', isVerticalRatio)
        
        // Convert to CSS format
        const cssRatio = aspectRatioToCss(normalizedRatio)
        console.log('📐 ChartEditorModal - Final CSS aspect ratio:', cssRatio)
        
        setAspectRatioCss(cssRatio)
      } catch (err) {
        console.error('❌ ChartEditorModal - Error fetching aspect ratio:', err)
        setAspectRatioCss('16 / 9')
      }
    }

    if (isOpen) {
      fetchAspectRatio()
    }
  }, [isOpen])

  const colorTargets = useMemo(
    () => computeColorTargets(chartTypeState, chartDataState),
    [chartTypeState, chartDataState]
  )
  // Auto-select first series when colorTargets changes
useEffect(() => {
  if (colorTargets.length > 0) {
    setSelectedSeriesForSection(prev => ({
      ...prev,
      bars: colorTargets[0],
      lines: colorTargets[0],
      markers: colorTargets[0],
      areas: colorTargets[0],
      dataLabels: colorTargets[0]
    }))
  }
}, [colorTargets])

  useEffect(() => {
  if (!sceneData) return
  try {
    // Use selected preset if available, otherwise fall back to sceneData preset
    const selectedPreset = availablePresets[selectedPresetIndex] || sceneData?.preset?.preset_definitions?.[0]
    const baseSections = selectedPreset?.sections ?? sceneData?.preset?.preset_definitions?.[0]?.sections ?? {}
    const overrideSections = buildSectionsOverrideFromColors(seriesColorOverrides, chartTypeState)
    // Merge base sections with user-edited sectionsState
    const mergedBase = JSON.parse(JSON.stringify(baseSections))
    Object.keys(sectionsState).forEach(key => {
      if (sectionsState[key]) {
        mergedBase[key] = JSON.parse(JSON.stringify(sectionsState[key]))
      }
    })
    const mergedSections = mergeSectionsWithOverrides(mergedBase, overrideSections)
    const preparedPreset = selectedPreset || sceneData?.preset
      ? {
          ...(selectedPreset || sceneData.preset),
          preset_definitions: [
            {
              ...((selectedPreset || sceneData.preset?.preset_definitions?.[0]) ?? {}),
              sections: mergedSections
            }
          ]
        }
      : {
          preset_definitions: [
            {
              name: 'Editable',
              sections: mergedSections
            }
          ]
        }
    const prepared = {
      ...sceneData,
      chart_type: chartTypeState,
      chart_data: chartDataState,
      preset: preparedPreset
    }
    const fig = generateChart(prepared, mergedSections)
    fig.config = {
      ...fig.config,
      editable: true,
      edits: {
        annotationPosition: true,
        annotationTail: true,
        annotationText: true,
        axisTitleText: true,
        colorbarPosition: true,
        colorbarTitleText: true,
        legendPosition: true,
        legendText: true,
        shapePosition: true,
        titleText: true
      },
      displaylogo: false,
      scrollZoom: true,
      responsive: true,
      modeBarButtonsToRemove: ['select2d', 'lasso2d'],
      modeBarButtonsToAdd: [
        'drawline',
        'drawopenpath',
        'drawrect',
        'drawcircle',
        'drawclosedpath',
        'eraseshape',
        'toggleSpikelines',
        'resetScale2d'
      ]
    }
    // Exclude background colors from layoutOverrides to prevent conflicts
    const { paper_bgcolor, plot_bgcolor, ...layoutOverridesWithoutBg } = layoutOverrides || {}
    
    // Adjust layout for aspect ratio
    const shouldUseVerticalLayout = isVertical
    const adjustedLayout = {
      ...fig.layout,
      ...layoutOverridesWithoutBg,
      dragmode: 'zoom',
      hovermode: 'closest',
      newshape: {
        line: {
          color: '#13008B',
          width: 2
        }
      },
      editrevision: (fig.layout?.editrevision || 0) + 1,
      // Ensure autosize is true so Plotly respects container dimensions
      autosize: true,
      // Remove any fixed width/height to let container control sizing
      width: undefined,
      height: undefined,
      // Adjust margins for vertical layout if needed - increased left margin for Y-axis labels
      ...(shouldUseVerticalLayout ? {
        margin: {
          l: fig.layout.margin?.l || 90,  // Increased from 50 to 90 for Y-axis labels
          r: fig.layout.margin?.r || 40,
          t: fig.layout.margin?.t || 90,
          b: fig.layout.margin?.b || 60
        }
      } : {})
    }
    
    fig.layout = adjustedLayout
    console.log('🔍 BEFORE NUCLEAR FIX - Y-axis layout:', JSON.stringify(fig.layout.yaxis, null, 2))

    // ✅✅✅ NUCLEAR FIX: Force axis settings AFTER everything else
const isPieDonut = chartTypeState === 'pie' || chartTypeState === 'donut'
if (!isPieDonut) {
  // Determine if this is a horizontal bar chart (axes are swapped)
  const isHorizontalBar = chartTypeState.includes('bar') && !chartTypeState.includes('column')
  
  // For horizontal bars: X-axis shows values, Y-axis shows categories
  // For columns/others: X-axis shows categories, Y-axis shows values
  const valueAxisKey = isHorizontalBar ? 'x_axis' : 'y_axis'
  const categoryAxisKey = isHorizontalBar ? 'y_axis' : 'x_axis'
  
  // Get config for VALUE axis (the one with numbers)
  const valueLineVisible = getAxisConfig(mergedSections, valueAxisKey, 'line', 'visible')
  const valueGridShow = getAxisConfig(mergedSections, valueAxisKey, 'grid', 'show')
  const valueZerolineShow = getAxisConfig(mergedSections, valueAxisKey, 'zeroline', 'show')
  const valueTickSize = getAxisConfig(mergedSections, valueAxisKey, 'ticks', 'font_size')
  
  // Get config for CATEGORY axis (the one with labels)
  const categoryLineVisible = getAxisConfig(mergedSections, categoryAxisKey, 'line', 'visible')
  const categoryGridShow = getAxisConfig(mergedSections, categoryAxisKey, 'grid', 'show')
  const categoryTickSize = getAxisConfig(mergedSections, categoryAxisKey, 'ticks', 'font_size')
  
  console.log('🎯 NUCLEAR FIX - Axis config:', {
    chartType: chartTypeState,
    isHorizontalBar,
    valueAxisKey,
    categoryAxisKey,
    valueLineVisible,
    categoryLineVisible,
    valueTickSize,
    categoryTickSize
  })
  
  // ✅ Apply to Plotly's X-axis
  fig.layout.xaxis = fig.layout.xaxis || {}
  const xAxisConfig = isHorizontalBar ? mergedSections[valueAxisKey] : mergedSections[categoryAxisKey]
  const xLineVisible = isHorizontalBar ? valueLineVisible : categoryLineVisible
  const xGridShow = isHorizontalBar ? valueGridShow : categoryGridShow
  const xTickSize = isHorizontalBar ? valueTickSize : categoryTickSize
  
  // X-axis line
if (xLineVisible === true) {
  console.log('✅ Setting X-axis line VISIBLE')
  fig.layout.xaxis.showline = true
  fig.layout.xaxis.linecolor = getAxisConfig(mergedSections, isHorizontalBar ? valueAxisKey : categoryAxisKey, 'line', 'color') || '#000000'
  fig.layout.xaxis.linewidth = getAxisConfig(mergedSections, isHorizontalBar ? valueAxisKey : categoryAxisKey, 'line', 'width') || 1
  // ✅ Show ticks based on font_size (independent of line visibility)
  fig.layout.xaxis.showticklabels = xTickSize !== 0
} else {
  console.log('✅ Setting X-axis line HIDDEN')
  fig.layout.xaxis.showline = false
  fig.layout.xaxis.linewidth = 0
  fig.layout.xaxis.linecolor = 'rgba(0,0,0,0)'
  fig.layout.xaxis.mirror = false
  // ✅ CHANGED: When line is hidden, ticks are INDEPENDENT - controlled by font_size only
  fig.layout.xaxis.showticklabels = xTickSize !== 0 && xTickSize !== null && xTickSize !== undefined
}
  // X-axis grid
  if (xGridShow === true) {
    fig.layout.xaxis.showgrid = true
    fig.layout.xaxis.gridcolor = getAxisConfig(mergedSections, isHorizontalBar ? valueAxisKey : categoryAxisKey, 'grid', 'color') || '#E5E7EB'
    fig.layout.xaxis.gridwidth = getAxisConfig(mergedSections, isHorizontalBar ? valueAxisKey : categoryAxisKey, 'grid', 'width') || 1
  } else {
    fig.layout.xaxis.showgrid = false
  }
  
  // X-axis zeroline
  fig.layout.xaxis.zeroline = false
  
  // ✅ Apply to Plotly's Y-axis
  fig.layout.yaxis = fig.layout.yaxis || {}
  const yAxisConfig = isHorizontalBar ? mergedSections[categoryAxisKey] : mergedSections[valueAxisKey]
  const yLineVisible = isHorizontalBar ? categoryLineVisible : valueLineVisible
  const yGridShow = isHorizontalBar ? categoryGridShow : valueGridShow
  const yZerolineShow = isHorizontalBar ? null : valueZerolineShow
  const yTickSize = isHorizontalBar ? categoryTickSize : valueTickSize
  
 // Y-axis line
if (yLineVisible === true) {
  console.log('✅ Setting Y-axis line VISIBLE')
  fig.layout.yaxis.showline = true
  fig.layout.yaxis.linecolor = getAxisConfig(mergedSections, isHorizontalBar ? categoryAxisKey : valueAxisKey, 'line', 'color') || '#000000'
  fig.layout.yaxis.linewidth = getAxisConfig(mergedSections, isHorizontalBar ? categoryAxisKey : valueAxisKey, 'line', 'width') || 1
  // ✅ Show ticks based on font_size (independent of line visibility)
  fig.layout.yaxis.showticklabels = yTickSize !== 0
} else {
  console.log('✅ Setting Y-axis line HIDDEN')
  fig.layout.yaxis.showline = false
  fig.layout.yaxis.linewidth = 0
  fig.layout.yaxis.linecolor = 'rgba(0,0,0,0)'
  fig.layout.yaxis.mirror = false
  // ✅ CHANGED: When line is hidden, ticks are INDEPENDENT - controlled by font_size only
  fig.layout.yaxis.showticklabels = yTickSize !== 0 && yTickSize !== null && yTickSize !== undefined
}
  
  // Y-axis grid
  if (yGridShow === true) {
    fig.layout.yaxis.showgrid = true
    fig.layout.yaxis.gridcolor = getAxisConfig(mergedSections, isHorizontalBar ? categoryAxisKey : valueAxisKey, 'grid', 'color') || '#E5E7EB'
    fig.layout.yaxis.gridwidth = getAxisConfig(mergedSections, isHorizontalBar ? categoryAxisKey : valueAxisKey, 'grid', 'width') || 1
  } else {
    fig.layout.yaxis.showgrid = false
  }
  
  // Y-axis zeroline (only for value axis)
  if (yZerolineShow === true && !isHorizontalBar) {
    fig.layout.yaxis.zeroline = true
    fig.layout.yaxis.zerolinecolor = getAxisConfig(mergedSections, valueAxisKey, 'zeroline', 'color') || '#000000'
    fig.layout.yaxis.zerolinewidth = getAxisConfig(mergedSections, valueAxisKey, 'zeroline', 'width') || 1
  } else {
    fig.layout.yaxis.zeroline = false
  }
  
  console.log('📊 Final axis config:', {
    xaxis: {
      showline: fig.layout.xaxis.showline,
      showgrid: fig.layout.xaxis.showgrid,
      showticklabels: fig.layout.xaxis.showticklabels
    },
    yaxis: {
      showline: fig.layout.yaxis.showline,
      showgrid: fig.layout.yaxis.showgrid,
      showticklabels: fig.layout.yaxis.showticklabels
    }
  })
}
      console.log('🔍 AFTER NUCLEAR FIX - Y-axis layout:', JSON.stringify(fig.layout.yaxis, null, 2))

    
    // Apply background colors AFTER layoutOverrides to ensure they take precedence
    applyBackground(fig, mergedSections)
    
    // Re-apply title and subtitle from sectionsState AFTER layoutOverrides to ensure they take precedence
    applyTitle(fig, mergedSections)
    
    // Re-apply subtitle annotation
    const subtitleText = getConfig(mergedSections, 'subtitle', 'text')
    if (subtitleText) {
      if (!fig.layout.annotations) {
        fig.layout.annotations = []
      }
      const subtitleIndex = fig.layout.annotations.findIndex(ann => 
        ann.xref === 'paper' && ann.yref === 'paper' && ann.x === 0.5 && ann.y === 1 && ann.xanchor === 'center' && ann.yanchor === 'bottom'
      )
      const subtitleAnnotation = {
        text: subtitleText,
        xref: 'paper',
        yref: 'paper',
        x: 0.5,
        y: 1,
        xanchor: 'center',
        yanchor: 'bottom',
        showarrow: false,
        font: {
          family: resolveBrandFont(getConfig(mergedSections, 'subtitle', 'font_family')),
          size: getConfig(mergedSections, 'subtitle', 'font_size') || 14,
          color: getConfig(mergedSections, 'subtitle', 'font_color') || '#666666'
        }
      }
      if (subtitleIndex >= 0) {
        fig.layout.annotations[subtitleIndex] = subtitleAnnotation
      } else {
        fig.layout.annotations = fig.layout.annotations.filter(ann => 
          !(ann.xref === 'paper' && ann.yref === 'paper' && ann.x === 0.5 && ann.y === 1 && ann.xanchor === 'center' && ann.yanchor === 'bottom')
        )
        fig.layout.annotations.unshift(subtitleAnnotation)
      }
    } else {
      if (fig.layout.annotations) {
        fig.layout.annotations = fig.layout.annotations.filter(ann => 
          !(ann.xref === 'paper' && ann.yref === 'paper' && ann.x === 0.5 && ann.y === 1 && ann.xanchor === 'center' && ann.yanchor === 'bottom')
        )
      }
    }
    setFigure(fig)
    setError('')
  } catch (err) {
    setFigure(null)
    setError(err?.message || 'Unable to render chart')
  }
}, [sceneData, chartTypeState, chartDataState, seriesColorOverrides, layoutOverrides, availablePresets, selectedPresetIndex, sectionsState, isVertical])

  const datasetSummary = useMemo(() => {
    const extracted = extractChartData(chartDataState, chartTypeState)
    if (!extracted) return null
    return extracted
  }, [chartDataState, chartTypeState])

  const markDirty = useCallback(() => {
    setIsDirty(true)
    setSaveError('')
  }, [])

  const handleColorOverrideChange = useCallback((target, color) => {
  console.log('🎨 Color change:', target, color)
  if (historyInitializedRef.current) saveToHistory()
  setSeriesColorOverrides((prev) => {
    const newOverrides = {
      ...prev,
      [target]: color
    }
    console.log('🎨 New color overrides:', newOverrides)
    return newOverrides
  })
  markDirty()
}, [markDirty, saveToHistory])

  const handleChartTypeChange = (event) => {
    if (historyInitializedRef.current) saveToHistory()
    setChartTypeState(event.target.value)
    markDirty()
  }

  const handlePresetChange = (event) => {
    if (historyInitializedRef.current) saveToHistory()
    const selectedIndex = Number(event.target.value)
    setSelectedPresetIndex(selectedIndex)
    markDirty()
  }

  const handleRawChartDataInputChange = (event) => {
    setRawChartDataInput(event.target.value)
  }

  const handleApplyRawChartData = useCallback(() => {
  try {
    if (historyInitializedRef.current) saveToHistory()
    const parsed = JSON.parse(rawChartDataInput || '{}')
    setChartDataState(parsed)
    setRawChartError('')
    setRawChartDataInput(JSON.stringify(parsed, null, 2))
    const targets = computeColorTargets(chartTypeState, parsed)
    const baseColors = extractInitialColorOverrides(sceneData, targets, chartTypeState)
    setSeriesColorOverrides((prev) => {
      const next = {}
      targets.forEach((target) => {
        if (Object.prototype.hasOwnProperty.call(prev, target)) {
          next[target] = prev[target]
        } else if (baseColors[target]) {
          next[target] = baseColors[target]
        }
      })
      return next
    })
    markDirty()
  } catch (err) {
    setRawChartError(err?.message || 'Invalid chart_data JSON')
  }
}, [chartTypeState, rawChartDataInput, sceneData, markDirty, saveToHistory])
  const handleResetEditor = useCallback(() => {
    rebuildEditorStateFromScene()
    setIsDirty(false)
    setSaveError('')
  }, [rebuildEditorStateFromScene])

  const updateLayoutOverride = useCallback((path, value) => {
    if (historyInitializedRef.current) saveToHistory()
    setLayoutOverrides((prev) => {
      const keys = path.split('.')
      const newState = deepClone(prev)
      let current = newState
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newState
    })
    markDirty()
  }, [markDirty, saveToHistory])

  const updateSection = useCallback((sectionName, configName, value, series = null) => {
    if (historyInitializedRef.current) saveToHistory()
    setSectionsState((prev) => {
      const newSections = prev ? JSON.parse(JSON.stringify(prev)) : {}
      
      if (!newSections[sectionName]) {
        newSections[sectionName] = []
      }

      newSections[sectionName] = setConfigValue(newSections[sectionName], configName, value, series)
      
      return newSections
    })
    markDirty()
  }, [markDirty, saveToHistory])

  const updateAxisSection = useCallback((axis, subsection, configName, value) => {
  console.log('🔧 updateAxisSection called:', { axis, subsection, configName, value })
  
  if (historyInitializedRef.current) saveToHistory()
  setSectionsState((prev) => {
    const newSections = prev ? JSON.parse(JSON.stringify(prev)) : {}
    const axisKey = axis === 'x' ? 'x_axis' : axis === 'y' ? 'y_axis' : axis
    
    if (!newSections[axisKey]) newSections[axisKey] = {}
    if (!newSections[axisKey][subsection]) newSections[axisKey][subsection] = []
    
    newSections[axisKey][subsection] = setConfigValue(newSections[axisKey][subsection], configName, value)
    
    // ✅ AUTOMATIC: When line visibility is set to false, also set ticks font_size to 0
    if (subsection === 'line' && configName === 'visible' && value === false) {
      console.log('🔧 Line unchecked - setting ticks font_size to 0')
      if (!newSections[axisKey]['ticks']) newSections[axisKey]['ticks'] = []
      newSections[axisKey]['ticks'] = setConfigValue(newSections[axisKey]['ticks'], 'font_size', 0)
    }
    
    console.log('✅ Updated sectionsState:', {
      axis: axisKey,
      subsection,
      configName,
      value,
      newConfig: newSections[axisKey][subsection]
    })
    
    return newSections
  })
  markDirty()
}, [markDirty, saveToHistory])

  const toggleSection = useCallback((section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }, [])

  const colorControlsVisible = colorTargets.length > 0

  const handleSaveChart = useCallback(async () => {
  if (!plotRef.current) return
  const sessionId = localStorage.getItem('session_id')
  const userId = localStorage.getItem('token')
  if (!sessionId || !userId || !sceneNumber) {
    setSaveError('Missing session, user, or scene number.')
    return
  }
  setIsSaving(true)
  setSaveError('')
  try {
    const plotElement = plotRef.current?.el
    if (!plotElement) {
      throw new Error('Chart preview is not ready yet.')
    }
    
    console.log('📸 Exporting chart with Plotly.toImage...')
    
    // Wait a moment to ensure plot is fully rendered
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const presetSections = sectionsState || sceneData?.preset?.preset_definitions?.[0]?.sections || {}

    console.log('🔍 Full sceneData keys:', Object.keys(sceneData || {}))

    let plotWidth, plotHeight
    let existingBoundingBox = null

    // Fetch the complete scene data from API to get base_image dimensions AND bounding_box
    try {
      if (sessionId && userId && sceneNumber) {
        console.log('🔄 Fetching complete scene data from API for scene:', sceneNumber)
        
        // Fetch user session data
        const sessionReqBody = { user_id: userId, session_id: sessionId }
        const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionReqBody)
        })
        
        if (sessionResp.ok) {
          const sessionDataResponse = await sessionResp.json()
          const sessionData = sessionDataResponse?.session_data || sessionDataResponse?.session || {}
          const allImages = Array.isArray(sessionData?.images) ? sessionData.images : []
          
          // Find the current scene
          const currentScene = allImages.find(img => 
            (img?.scene_number === sceneNumber) || 
            (img?.sceneNumber === sceneNumber) ||
            (allImages.indexOf(img) + 1 === sceneNumber)
          )
          
          if (currentScene?.images) {
            const currentVersion = currentScene.images.current_version || 'v1'
            const versionData = currentScene.images[currentVersion]
            
            if (versionData?.images?.[0]) {
              const firstFrame = versionData.images[0]
              
              // Get base_image dimensions
              const baseImageDims = firstFrame?.base_image?.image_dimensions
              if (baseImageDims) {
                const frameWidth = baseImageDims.width
                const frameHeight = baseImageDims.height
                
                const isPortrait = frameHeight > frameWidth
                
                console.log('📐 Detected from API:', frameWidth, 'x', frameHeight, '→', isPortrait ? '9:16 (portrait)' : '16:9 (landscape)')
                
                if (isPortrait) {
                  plotWidth = 810
                  plotHeight = 1440
                } else {
                  plotWidth = 960
                  plotHeight = 540
                }
              }
              
              // Get bounding_box from overlay_elements
              const overlayElements = firstFrame?.overlay_elements || []
              const chartOverlay = overlayElements.find(el => 
                el?.element_id === 'chart_overlay' || 
                el?.label_name === 'Chart' || 
                overlayElements.indexOf(el) === 0
              )
              
              if (chartOverlay?.bounding_box) {
                existingBoundingBox = chartOverlay.bounding_box
                console.log('📦 Found existing bounding_box from API:', existingBoundingBox)
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('❌ Error fetching scene dimensions:', e)
    }

    // If still not found, throw error
    if (!plotWidth || !plotHeight) {
      console.error('❌ Could not determine chart dimensions from API')
      console.error('sceneNumber:', sceneNumber)
      throw new Error('Unable to determine chart dimensions - please ensure scene data is available')
    }

    console.log('📐 Final dimensions:', plotWidth, 'x', plotHeight)
    console.log('📦 Bounding box:', existingBoundingBox || 'will use default if creating new')

    // Use Plotly's built-in toImage method
    const imageDataUrl = await Plotly.toImage(plotElement, {
      format: 'png',
      width: plotWidth,
      height: plotHeight,
    })
    console.log('✅ Chart exported to data URL, converting to blob...')

    // Convert data URL to blob
    const response = await fetch(imageDataUrl)
    if (!response.ok) {
      throw new Error('Failed to convert image data URL to blob')
    }
    const blob = await response.blob()

    if (!blob || blob.size === 0) {
      throw new Error('Failed to create blob from image data')
    }

    console.log(`✅ Blob created: ${blob.size} bytes`)

    // Generate filename
    const fileName = `scene-${sceneNumber}-chart.png`

    // Create a File object from the blob
    const file = new File([blob], fileName, {
      type: 'image/png',
      lastModified: Date.now()
    })

    // Upload the chart image to the upload_chart API
    console.log(`📤 Uploading chart to upload_chart API...`)
    const uploadFormData = new FormData()
    uploadFormData.append('session_id', sessionId)
    uploadFormData.append('user_id', userId)
    uploadFormData.append('scene_number', String(sceneNumber))
    uploadFormData.append('file', file, fileName)

    const uploadResponse = await fetch(
      'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/upload_chart',
      {
        method: 'POST',
        body: uploadFormData
      }
    )

    // Get the response text first (can only read once)
    const uploadResponseText = await uploadResponse.text()

    if (!uploadResponse.ok) {
      throw new Error(uploadResponseText || 'Failed to upload chart')
    }

    // Get the URL from the upload response
    let chartImageUrl = null
    try {
      const uploadData = JSON.parse(uploadResponseText)
      chartImageUrl = uploadData?.url || uploadData?.image_url || uploadData?.chart_url || uploadData?.chart_image_url
      if (!chartImageUrl && typeof uploadData === 'string') {
        chartImageUrl = uploadData
      }
      console.log('✅ Chart uploaded successfully, URL:', chartImageUrl)
    } catch (parseError) {
      chartImageUrl = uploadResponseText.trim()
      if (chartImageUrl && (chartImageUrl.startsWith('http://') || chartImageUrl.startsWith('https://'))) {
        console.log('✅ Chart URL extracted from text response:', chartImageUrl)
      } else {
        throw new Error('Failed to extract chart URL from upload response')
      }
    }

    if (!chartImageUrl) {
      throw new Error('Chart upload succeeded but no URL was returned')
    }

    // Declare updatedOverlayElements at function scope so it's accessible for onSave callback
    let updatedOverlayElements = []

    // Call elements API to update overlay_elements with the new chart URL
    console.log('📤 Calling elements API to update overlay_elements...')
    try {
      // First, fetch user session data to get the complete overlay structure
      console.log('🔄 Fetching user session data to get complete overlay structure...')
      const sessionReqBody = { user_id: userId, session_id: sessionId }
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionReqBody)
      })
      
      if (!sessionResp.ok) {
        const text = await sessionResp.text()
        throw new Error(`Failed to fetch user session data: ${sessionResp.status} ${text}`)
      }
      
      const sessionDataResponse = await sessionResp.json()
      const sessionData = sessionDataResponse?.session_data || sessionDataResponse?.session || {}
      const images = Array.isArray(sessionData?.images) ? sessionData.images : []
      
      // Find the scene data for the current scene number
      const sceneImageData = images.find(img => 
        (img?.scene_number === sceneNumber) || 
        (img?.sceneNumber === sceneNumber) ||
        (images.indexOf(img) + 1 === sceneNumber)
      )
      
      // Get overlay_elements from the fetched session data for this scene
      let existingOverlayElements = []
      if (sceneImageData) {
        if (Array.isArray(sceneImageData.imageFrames)) {
          const frame = sceneImageData.imageFrames.find(f => 
            f?.overlay_elements || f?.overlayElements
          ) || sceneImageData.imageFrames[0]
          existingOverlayElements = frame?.overlay_elements || frame?.overlayElements || []
        }
        if (existingOverlayElements.length === 0) {
          existingOverlayElements = sceneImageData?.overlay_elements || 
                                   sceneImageData?.overlayElements || 
                                   []
        }
      }
      
      // Fallback to sceneData if session data doesn't have overlay_elements
      if (existingOverlayElements.length === 0) {
        existingOverlayElements = sceneData?.overlay_elements || 
                                 sceneData?.overlayElements || 
                                 []
      }
      
      // Update overlay_elements with the new chart URL while preserving all other data
      if (Array.isArray(existingOverlayElements) && existingOverlayElements.length > 0) {
        updatedOverlayElements = existingOverlayElements.map((overlay, idx) => {
          const isChartOverlay = overlay?.element_id === 'chart_overlay' || 
                                overlay?.label_name === 'Chart' || 
                                overlay?.type === 'chart' || 
                                overlay?.isChartOverlay ||
                                idx === 0
          
          if (isChartOverlay) {
            const updatedOverlay = JSON.parse(JSON.stringify(overlay))
            
            // ONLY update image_url and image_dimensions, preserve everything else INCLUDING bounding_box
            if (updatedOverlay.overlay_image) {
              updatedOverlay.overlay_image.image_url = chartImageUrl
              updatedOverlay.overlay_image.image_dimensions = {
                width: plotWidth,
                height: plotHeight
              }
            } else {
              updatedOverlay.overlay_image = {
                enabled: true,
                scaling: {
                  enabled: false,
                  scale_x: 1,
                  scale_y: 1,
                  fit_mode: "contain"
                },
                position: {
                  x: 0,
                  y: 0
                },
                image_url: chartImageUrl,
                image_dimensions: {
                  width: plotWidth,
                  height: plotHeight
                }
              }
            }
            
            return updatedOverlay
          }

          return overlay
        })
      } else {
        // Create a new overlay element structure for the chart if none exist
        const boundingBoxToUse = existingBoundingBox || {
          x: 0.17172897196261683,
          y: 0.14583333333333334,
          width: 0.6869158878504672,
          height: 0.6479166666666667
        }

        updatedOverlayElements = [{
          layout: {
            zIndex: 2,  
            rotation: 0,
            alignment: "center",
            anchor_point: "center"
          },
          offset: {
            x: 0,
            y: 0
          },
          element_id: "chart_overlay",
          label_name: "Chart",
          synced_with: null,
          bounding_box: boundingBoxToUse,
          overlay_image: {
            enabled: true,
            scaling: {
              enabled: false,
              scale_x: 1,
              scale_y: 1,
              fit_mode: "contain"
            },
            position: {
              x: 0,
              y: 0
            },
            image_url: chartImageUrl,
            image_dimensions: {
              width: plotWidth,
              height: plotHeight
            }
          }
        }]
      }
      
      // Get existing text_elements from the fetched session data or sceneData
      let existingTextElements = []
      if (sceneImageData) {
        if (Array.isArray(sceneImageData.imageFrames)) {
          const frame = sceneImageData.imageFrames.find(f => 
            f?.text_elements || f?.textElements
          ) || sceneImageData.imageFrames[0]
          existingTextElements = frame?.text_elements || frame?.textElements || []
        }
        if (existingTextElements.length === 0) {
          existingTextElements = sceneImageData?.text_elements || 
                               sceneImageData?.textElements || 
                               []
        }
      }
      
      if (existingTextElements.length === 0) {
        existingTextElements = sceneData?.text_elements || 
                             sceneData?.textElements || 
                             []
      }
      
      // Build elements API request body with two updates (image_index 0 and 1)
      const elementsRequestBody = {
        session_id: sessionId,
        user_id: userId,
        updates: [
          {
            image_index: 0,
            overlay_elements: updatedOverlayElements,
            scene_number: sceneNumber,
            text_elements: Array.isArray(existingTextElements) ? existingTextElements : []
          },
          {
            image_index: 1,
            overlay_elements: updatedOverlayElements,
            scene_number: sceneNumber,
            text_elements: Array.isArray(existingTextElements) ? existingTextElements : []
          }
        ]
      }
      
      console.log('📋 Elements API request body:', JSON.stringify(elementsRequestBody, null, 2))
      
      const elementsResponse = await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/elements',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(elementsRequestBody)
        }
      )
      
      if (!elementsResponse.ok) {
        const errorText = await elementsResponse.text()
        throw new Error(`Failed to update elements: ${elementsResponse.status} ${errorText}`)
      }
      
      console.log('✅ Elements updated successfully')
    } catch (elementsError) {
      console.error('❌ Error updating elements:', elementsError)
      throw elementsError
    }

    // Build JSON data and send to chart-preset/update API
    console.log('📤 Preparing JSON data for chart-preset/update API...')
    try {
      const selectedPreset = availablePresets[selectedPresetIndex] || sceneData?.preset?.preset_definitions?.[0]
      const baseSections = selectedPreset?.sections ?? sceneData?.preset?.preset_definitions?.[0]?.sections ?? {}
      const overrideSections = buildSectionsOverrideFromColors(seriesColorOverrides, chartTypeState)
      
      // Merge base sections with user-edited sectionsState
      const mergedBase = { ...baseSections }
      Object.keys(sectionsState).forEach(key => {
        if (sectionsState[key]) {
          mergedBase[key] = sectionsState[key]
        }
      })
      const mergedSections = mergeSectionsWithOverrides(mergedBase, overrideSections)

      // Build JSON output structure
      const output = {
        preset: {
          chart_type: sceneData?.preset?.chart_type || (chartTypeState === 'donut' ? 'pie_donut' : chartTypeState),
          preset_definitions: [
            {
              name: "final",
              sections: mergedSections
            }
          ]
        },
        chart_data: chartDataState,
        chart_type: chartTypeState,
        scene_number: sceneNumber
      }
      
      const jsonString = JSON.stringify(output, null, 2)
      
      // Send JSON to chart-preset/update API using PUT method
      const updateUrl = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/chart-preset/update?session_id=${encodeURIComponent(sessionId)}&user_id=${encodeURIComponent(userId)}`
      
      console.log('📤 Sending JSON to chart-preset/update API (PUT)...')
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString
      })
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        throw new Error(`Failed to update chart preset: ${updateResponse.status} ${errorText}`)
      }
      console.log('✅ Chart preset updated successfully')
    } catch (jsonError) {
      console.error('❌ Error updating chart preset:', jsonError)
      throw jsonError
    }
    
    // Fetch updated user session data to refresh the UI
    console.log('🔄 Fetching updated user session data...')
    try {
      const sessionReqBody = { user_id: userId, session_id: sessionId }
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionReqBody)
      })
      
      if (!sessionResp.ok) {
        const text = await sessionResp.text()
        console.warn(`⚠️ Failed to fetch updated session data: ${sessionResp.status} ${text}`)
      } else {
        const sessionDataResponse = await sessionResp.json()
        console.log('✅ User session data refreshed')
        try {
          localStorage.setItem('last_session_data', JSON.stringify(sessionDataResponse))
        } catch (_) {
          // Ignore localStorage errors
        }
      }
    } catch (sessionError) {
      console.warn('⚠️ Error fetching updated session data:', sessionError)
    }
    
    setIsDirty(false)
    
    // Pass the updated data to onSave callback
    if (onSave) {
      onSave({
        sceneNumber,
        overlayElements: updatedOverlayElements,
        chartImageUrl
      })
    }
    
    // Close the modal after successful save
    if (onClose) {
      onClose()
    }
  } catch (err) {
    console.error('❌ Error saving chart:', err)
    setSaveError(err?.message || 'Failed to save chart')
  } finally {
    setIsSaving(false)
  }
}, [sceneNumber, figure, sceneData, availablePresets, selectedPresetIndex, seriesColorOverrides, sectionsState, chartTypeState, chartDataState, onSave, onClose])

  
  if (!isOpen) return null

  // Calculate modal dimensions based on aspect ratio
  // For 9:16 (vertical), we need wider modal to accommodate sidebar + tall chart
  // For 16:9 (horizontal), standard wide modal
  const modalWidth = isVertical ? 'max-w-[1300px]' : 'max-w-[1400px]'  // Increased for Y-axis labels
  const modalHeight = isVertical ? 'max-h-[95vh]' : 'max-h-[90vh]'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${modalWidth} ${modalHeight} flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Chart Editor</p>
            <h2 className="text-lg font-semibold text-gray-900">
              Scene {sceneNumber ?? '-'} • {chartTitle}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border-r pr-3">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${
                  canUndo
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
                title="Undo"
                aria-label="Undo"
              >
                <FaUndo />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${
                  canRedo
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
                title="Redo"
                aria-label="Redo"
              >
                <FaRedo />
              </button>
            </div>
            {isDirty && (
              <button
                type="button"
                onClick={handleSaveChart}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
                  isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'
                }`}
              >
                {isSaving ? 'Saving…' : 'Save Chart'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              aria-label="Close chart editor"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 overflow-hidden">
          <aside className="col-span-1 border-t lg:border-r border-gray-200 p-6 overflow-y-auto bg-gray-50 space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">Chart Type</p>
              <select
                value={chartTypeState}
                onChange={handleChartTypeChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#13008B]"
              >
                {chartTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500">Switch chart styles without leaving the editor.</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">Preset</p>
              {isLoadingPresets ? (
                <p className="text-sm text-gray-500">Loading presets...</p>
              ) : (
                <select
                  value={selectedPresetIndex}
                  onChange={handlePresetChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                >
                  {availablePresets.map((preset, idx) => (
                    <option key={idx} value={idx}>
                      {preset?.name || `Preset ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-gray-500">Select a preset style for your chart.</p>
            </div>

            {/* Dimensions */}
            <div className="border rounded-lg bg-white">
              <button
                type="button"
                onClick={() => toggleSection('dimensions')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
              >
                <span>Dimensions</span>
                <span className={`transform transition-transform ${expandedSections.dimensions ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {expandedSections.dimensions && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Width</label>
                    <input
                      type="number"
                      value={getConfig(sectionsState, 'dimensions', 'width') || 960}
                      onChange={(e) => updateSection('dimensions', 'width', parseInt(e.target.value) || 960)}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Height</label>
                    <input
                      type="number"
                      value={getConfig(sectionsState, 'dimensions', 'height') || 540}
                      onChange={(e) => updateSection('dimensions', 'height', parseInt(e.target.value) || 540)}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Scale</label>
                    <input
                      type="number"
                      value={getConfig(sectionsState, 'dimensions', 'scale') || 2}
                      onChange={(e) => updateSection('dimensions', 'scale', parseInt(e.target.value) || 2)}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {colorControlsVisible && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">Series Colors</p>
                <div className="space-y-2">
                  {colorTargets.map((target) => (
                    <div
                      key={target}
                      className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm"
                    >
                      <div className="flex flex-col flex-1">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          {target}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          Tap the swatch to pick a new color
                        </span>
                      </div>
                      <label className="relative inline-flex items-center">
                        <span className="sr-only">Choose color for {target}</span>
                        <input
                          type="color"
                          title={`Pick color for ${target}`}
                          value={normalizeColorInputValue(seriesColorOverrides[target])}
                          onChange={(e) => handleColorOverrideChange(target, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="w-10 h-10 rounded-full border border-gray-200 shadow-inner"
                          style={{ backgroundColor: normalizeColorInputValue(seriesColorOverrides[target]) }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Title Settings */}
            <div className="border rounded-lg bg-white">
              <button
                type="button"
                onClick={() => toggleSection('title')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
              >
                <span>Title</span>
                <span className={`transform transition-transform ${expandedSections.title ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {expandedSections.title && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Text</label>
                    <input
                      type="text"
                      value={getConfig(sectionsState, 'title', 'text') || ''}
                      onChange={(e) => updateSection('title', 'text', e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1"
                      placeholder="Chart Title"
                    />
                  </div>
                    <div>
                    <label className="text-xs text-gray-600 block mb-1">Font</label>
                    <select
                      value={resolveBrandFont(getConfig(sectionsState, 'title', 'font_family'))}
                      onChange={(e) => updateSection('title', 'font_family', e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1"
                    >
                      {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Size</label>
                      <input
                        type="number"
                      value={getConfig(sectionsState, 'title', 'font_size') || 40}
                      onChange={(e) => updateSection('title', 'font_size', parseInt(e.target.value) || 40)}
                        className="w-full text-sm border rounded px-2 py-1"
                        min="8"
                        max="48"
                      />
                    </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Weight</label>
                    <select
                      value={getConfig(sectionsState, 'title', 'font_weight') || 'bold'}
                      onChange={(e) => updateSection('title', 'font_weight', e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Color</label>
                      <input
                        type="color"
                      value={getConfig(sectionsState, 'title', 'font_color') || '#000000'}
                      onChange={(e) => updateSection('title', 'font_color', e.target.value)}
                        className="w-full h-8 border rounded"
                      />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Align</label>
                    <select
                      value={getConfig(sectionsState, 'title', 'x_align') || 'center'}
                      onChange={(e) => updateSection('title', 'x_align', e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Subtitle Settings */}
            <div className="border rounded-lg bg-white">
              <button
                type="button"
                onClick={() => toggleSection('subtitle')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
              >
                <span>Subtitle</span>
                <span className={`transform transition-transform ${expandedSections.subtitle ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {expandedSections.subtitle && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Text</label>
                    <input
                      type="text"
                      value={getConfig(sectionsState, 'subtitle', 'text') ?? ''}
                      onChange={(e) => updateSection('subtitle', 'text', e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1"
                      placeholder="Subtitle"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Font</label>
                    <select
                      value={resolveBrandFont(getConfig(sectionsState, 'subtitle', 'font_family')) || 'Verdana'}
                      onChange={(e) => updateSection('subtitle', 'font_family', e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1"
                    >
                      {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Size</label>
                    <input
                      type="number"
                      value={getConfig(sectionsState, 'subtitle', 'font_size') ?? 14}
                      onChange={(e) => updateSection('subtitle', 'font_size', parseInt(e.target.value) || 14)}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Color</label>
                    <input
                      type="color"
                      value={getConfig(sectionsState, 'subtitle', 'font_color') ?? '#666666'}
                      onChange={(e) => updateSection('subtitle', 'font_color', e.target.value)}
                      className="w-full h-8 border rounded"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Legend Settings */}
            <div className="border rounded-lg bg-white">
              <button
                type="button"
                onClick={() => toggleSection('legend')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
              >
                <span>Legend</span>
                <span className={`transform transition-transform ${expandedSections.legend ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {expandedSections.legend && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layoutOverrides.showlegend}
                      onChange={(e) => updateLayoutOverride('showlegend', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs text-gray-700">Show Legend</span>
                  </label>
                  {layoutOverrides.showlegend && (
                    <>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Position</label>
                        <select
                          value={layoutOverrides.legend.orientation}
                          onChange={(e) => updateLayoutOverride('legend.orientation', e.target.value)}
                          className="w-full text-sm border rounded px-2 py-1"
                        >
                          <option value="v">Vertical</option>
                          <option value="h">Horizontal</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Font Size</label>
                          <input
                            type="number"
                            value={layoutOverrides.legend.font.size}
                            onChange={(e) => updateLayoutOverride('legend.font.size', Number(e.target.value) || 12)}
                            className="w-full text-sm border rounded px-2 py-1"
                            min="8"
                            max="24"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Color</label>
                          <input
                            type="color"
                            value={layoutOverrides.legend.font.color}
                            onChange={(e) => updateLayoutOverride('legend.font.color', e.target.value)}
                            className="w-full h-8 border rounded"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Background Settings */}
            <div className="border rounded-lg bg-white">
              <button
                type="button"
                onClick={() => toggleSection('background')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
              >
                <span>Background</span>
                <span className={`transform transition-transform ${expandedSections.background ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {expandedSections.background && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Plot Color</label>
                    <input
                      type="color"
                      value={(() => {
                        const color = getConfig(sectionsState, 'background', 'color')
                        if (!color || color === 'rgba(0,0,0,0)') return '#FFFFFF'
                        // Convert rgba to hex if needed
                        if (color.startsWith('rgba')) {
                          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
                          if (match) {
                            const r = parseInt(match[1]).toString(16).padStart(2, '0')
                            const g = parseInt(match[2]).toString(16).padStart(2, '0')
                            const b = parseInt(match[3]).toString(16).padStart(2, '0')
                            return `#${r}${g}${b}`
                          }
                        }
                        return color.startsWith('#') ? color : `#${color}`
                      })()}
                      onChange={(e) => updateSection('background', 'color', e.target.value)}
                      className="w-full h-8 border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Paper Color</label>
                    <input
                      type="color"
                      value={(() => {
                        const color = getConfig(sectionsState, 'background', 'paper_color')
                        if (!color || color === 'rgba(0,0,0,0)') return '#FFFFFF'
                        // Convert rgba to hex if needed
                        if (color.startsWith('rgba')) {
                          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
                          if (match) {
                            const r = parseInt(match[1]).toString(16).padStart(2, '0')
                            const g = parseInt(match[2]).toString(16).padStart(2, '0')
                            const b = parseInt(match[3]).toString(16).padStart(2, '0')
                            return `#${r}${g}${b}`
                          }
                        }
                        return color.startsWith('#') ? color : `#${color}`
                      })()}
                      onChange={(e) => updateSection('background', 'paper_color', e.target.value)}
                      className="w-full h-8 border rounded"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateSection('background', 'color', 'rgba(0,0,0,0)')
                      updateSection('background', 'paper_color', 'rgba(0,0,0,0)')
                    }}
                    className="w-full mt-2 px-3 py-1.5 text-xs border border-gray-300 rounded bg-transparent hover:bg-gray-50"
                  >
                    Make background transparent
                  </button>
                </div>
              )}
            </div>

            {/* Bar Styling - for bar/column charts (excluding waterfall) */}
            {(chartTypeState.includes('bar') || chartTypeState.includes('column')) && 
            !chartTypeState.includes('waterfall') && (
              <>
            <div className="border rounded-lg bg-white">
              <button
                type="button"
                    onClick={() => toggleSection('bars')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
              >
                    <span>Bar Styling</span>
                    <span className={`transform transition-transform ${expandedSections.bars ? 'rotate-180' : ''}`}>▼</span>
              </button>
                  {expandedSections.bars && (
                    <div className="px-3 pb-3 space-y-2 border-t">
                  <div>
                        <label className="text-xs text-gray-600 block mb-1">Select Series</label>
                        <select
                          value={selectedSeriesForSection.bars}
                          onChange={(e) => setSelectedSeriesForSection(prev => ({ ...prev, bars: e.target.value }))}
                          className="w-full text-sm border rounded px-2 py-1 mb-2"
                        >
                          {colorTargets.length > 0 ? colorTargets.map(target => (
                            <option key={target} value={target}>{target}</option>
                          )) : <option value="global">Global</option>}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Opacity ({selectedSeriesForSection.bars})</label>
                    <input
  type="number"
  min="0"
  max="1"
  step="0.1"
  value={tempInputValues[`bars-opacity-${selectedSeriesForSection.bars}`] ?? getConfig(sectionsState, 'bars', 'opacity', selectedSeriesForSection.bars) ?? ''}
  onChange={(e) => {
    setTempInputValues(prev => ({ ...prev, [`bars-opacity-${selectedSeriesForSection.bars}`]: e.target.value }))
  }}
  onBlur={(e) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value)
    console.log('🔧 Setting opacity:', val, 'for series:', selectedSeriesForSection.bars)
    updateSection('bars', 'opacity', val, selectedSeriesForSection.bars)
    setTempInputValues(prev => {
      const newState = { ...prev }
      delete newState[`bars-opacity-${selectedSeriesForSection.bars}`]
      return newState
    })
  }}
  className="w-full text-sm border rounded px-2 py-1"
/>
                  </div>
                  <div>
                        <label className="text-xs text-gray-600 block mb-1">Corner Radius ({selectedSeriesForSection.bars})</label>
                    <input
  type="number"
  value={tempInputValues[`bars-corner_radius-${selectedSeriesForSection.bars}`] ?? getConfig(sectionsState, 'bars', 'corner_radius', selectedSeriesForSection.bars) ?? ''}
  onChange={(e) => {
    setTempInputValues(prev => ({ ...prev, [`bars-corner_radius-${selectedSeriesForSection.bars}`]: e.target.value }))
  }}
  onBlur={(e) => {
    const val = e.target.value === '' ? null : parseInt(e.target.value)
    updateSection('bars', 'corner_radius', val, selectedSeriesForSection.bars)
    setTempInputValues(prev => {
      const newState = { ...prev }
      delete newState[`bars-corner_radius-${selectedSeriesForSection.bars}`]
      return newState
    })
  }}
  className="w-full text-sm border rounded px-2 py-1"
/>
                  </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Border Width ({selectedSeriesForSection.bars})</label>
                        <input
  type="number"
  value={tempInputValues[`bars-border_width-${selectedSeriesForSection.bars}`] ?? getConfig(sectionsState, 'bars', 'border_width', selectedSeriesForSection.bars) ?? ''}
  onChange={(e) => {
    setTempInputValues(prev => ({ ...prev, [`bars-border_width-${selectedSeriesForSection.bars}`]: e.target.value }))
  }}
  onBlur={(e) => {
    const val = e.target.value === '' ? null : parseInt(e.target.value)
    updateSection('bars', 'border_width', val, selectedSeriesForSection.bars)
    setTempInputValues(prev => {
      const newState = { ...prev }
      delete newState[`bars-border_width-${selectedSeriesForSection.bars}`]
      return newState
    })
  }}
  className="w-full text-sm border rounded px-2 py-1"
/>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Border Color ({selectedSeriesForSection.bars})</label>
                    <input
                      type="color"
                          value={getConfig(sectionsState, 'bars', 'border_color', selectedSeriesForSection.bars) || '#FFFFFF'}
                          onChange={(e) => updateSection('bars', 'border_color', e.target.value, selectedSeriesForSection.bars)}
                      className="w-full h-8 border rounded"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-lg bg-white">
              <button
                type="button"
                    onClick={() => toggleSection('spacing')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
              >
                    <span>Bar Spacing</span>
                    <span className={`transform transition-transform ${expandedSections.spacing ? 'rotate-180' : ''}`}>▼</span>
              </button>
                  {expandedSections.spacing && (
                    <div className="px-3 pb-3 space-y-2 border-t">
                  <div>
                        <label className="text-xs text-gray-600 block mb-1">Bar Gap</label>
                    <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          value={getConfig(sectionsState, 'spacing', 'bargap') ?? 0.15}
                          onChange={(e) => updateSection('spacing', 'bargap', parseFloat(e.target.value))}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                        <label className="text-xs text-gray-600 block mb-1">Group Gap</label>
                    <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          value={getConfig(sectionsState, 'spacing', 'bargroupgap') ?? 0}
                          onChange={(e) => updateSection('spacing', 'bargroupgap', parseFloat(e.target.value))}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Lines - for line/area charts */}
            {(chartTypeState === 'line' || chartTypeState === 'area') && (
              <div className="border rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('lines')}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
                >
                  <span>Lines</span>
                  <span className={`transform transition-transform ${expandedSections.lines ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {expandedSections.lines && (
                  <div className="px-3 pb-3 space-y-2 border-t">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Select Series</label>
                      <select
                        value={selectedSeriesForSection.lines}
                        onChange={(e) => setSelectedSeriesForSection(prev => ({ ...prev, lines: e.target.value }))}
                        className="w-full text-sm border rounded px-2 py-1 mb-2"
                      >
                        {colorTargets.length > 0 ? colorTargets.map(target => (
                          <option key={target} value={target}>{target}</option>
                        )) : <option value="global">Global</option>}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Width ({selectedSeriesForSection.lines})</label>
                      <input
                        type="number"
                        value={getConfig(sectionsState, 'lines', 'width', selectedSeriesForSection.lines) ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value)
                          updateSection('lines', 'width', val, selectedSeriesForSection.lines)
                        }}
                        className="w-full text-sm border rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Dash ({selectedSeriesForSection.lines})</label>
                      <select
                        value={getConfig(sectionsState, 'lines', 'dash', selectedSeriesForSection.lines) || 'solid'}
                        onChange={(e) => updateSection('lines', 'dash', e.target.value, selectedSeriesForSection.lines)}
                        className="w-full text-sm border rounded px-2 py-1"
                      >
                        {LINE_DASH.map(dash => <option key={dash} value={dash}>{dash}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Shape ({selectedSeriesForSection.lines})</label>
                      <select
                        value={getConfig(sectionsState, 'lines', 'shape', selectedSeriesForSection.lines) || 'linear'}
                        onChange={(e) => updateSection('lines', 'shape', e.target.value, selectedSeriesForSection.lines)}
                        className="w-full text-sm border rounded px-2 py-1"
                      >
                        {LINE_SHAPE.map(shape => <option key={shape} value={shape}>{shape}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Opacity ({selectedSeriesForSection.lines})</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={getConfig(sectionsState, 'lines', 'opacity', selectedSeriesForSection.lines) ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value)
                          updateSection('lines', 'opacity', val, selectedSeriesForSection.lines)
                        }}
                        className="w-full text-sm border rounded px-2 py-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Markers - for line/area/scatter charts */}
            {(chartTypeState === 'line' || chartTypeState === 'area' || chartTypeState === 'scatter') && (
              <div className="border rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('markers')}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
                >
                  <span>Markers</span>
                  <span className={`transform transition-transform ${expandedSections.markers ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {expandedSections.markers && (
                  <div className="px-3 pb-3 space-y-2 border-t">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Select Series</label>
                      <select
                        value={selectedSeriesForSection.markers}
                        onChange={(e) => setSelectedSeriesForSection(prev => ({ ...prev, markers: e.target.value }))}
                        className="w-full text-sm border rounded px-2 py-1 mb-2"
                      >
                        {colorTargets.length > 0 ? colorTargets.map(target => (
                          <option key={target} value={target}>{target}</option>
                        )) : <option value="global">Global</option>}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={getConfig(sectionsState, 'markers', 'show', selectedSeriesForSection.markers) !== false}
                        onChange={(e) => updateSection('markers', 'show', e.target.checked, selectedSeriesForSection.markers)}
                        className="w-4 h-4"
                      />
                      <label className="text-xs text-gray-700">Show ({selectedSeriesForSection.markers})</label>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Size ({selectedSeriesForSection.markers})</label>
                      <input
                        type="number"
                        value={getConfig(sectionsState, 'markers', 'size', selectedSeriesForSection.markers) ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value)
                          updateSection('markers', 'size', val, selectedSeriesForSection.markers)
                        }}
                        className="w-full text-sm border rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Symbol ({selectedSeriesForSection.markers})</label>
                      <select
                        value={getConfig(sectionsState, 'markers', 'symbol', selectedSeriesForSection.markers) || 'circle'}
                        onChange={(e) => updateSection('markers', 'symbol', e.target.value, selectedSeriesForSection.markers)}
                        className="w-full text-sm border rounded px-2 py-1"
                      >
                        {MARKER_SYMBOLS.map(symbol => <option key={symbol} value={symbol}>{symbol}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Color ({selectedSeriesForSection.markers})</label>
                      <input
                        type="color"
                        value={getConfig(sectionsState, 'markers', 'color', selectedSeriesForSection.markers) || '#1470D2'}
                        onChange={(e) => updateSection('markers', 'color', e.target.value, selectedSeriesForSection.markers)}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Line Width ({selectedSeriesForSection.markers})</label>
                      <input
                        type="number"
                        value={getConfig(sectionsState, 'markers', 'line_width', selectedSeriesForSection.markers) ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value)
                          updateSection('markers', 'line_width', val, selectedSeriesForSection.markers)
                        }}
                        className="w-full text-sm border rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Line Color ({selectedSeriesForSection.markers})</label>
                      <input
                        type="color"
                        value={getConfig(sectionsState, 'markers', 'line_color', selectedSeriesForSection.markers) || '#000000'}
                        onChange={(e) => updateSection('markers', 'line_color', e.target.value, selectedSeriesForSection.markers)}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                    {chartTypeState === 'scatter' && (
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Opacity ({selectedSeriesForSection.markers})</label>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={getConfig(sectionsState, 'markers', 'opacity', selectedSeriesForSection.markers) ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value)
                            updateSection('markers', 'opacity', val, selectedSeriesForSection.markers)
                          }}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Areas - for area charts */}
            {chartTypeState === 'area' && (
              <div className="border rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('areas')}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
                >
                  <span>Areas</span>
                  <span className={`transform transition-transform ${expandedSections.areas ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {expandedSections.areas && (
                  <div className="px-3 pb-3 space-y-2 border-t">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Select Series</label>
                      <select
                        value={selectedSeriesForSection.areas}
                        onChange={(e) => setSelectedSeriesForSection(prev => ({ ...prev, areas: e.target.value }))}
                        className="w-full text-sm border rounded px-2 py-1 mb-2"
                      >
                        {colorTargets.length > 0 ? colorTargets.map(target => (
                          <option key={target} value={target}>{target}</option>
                        )) : <option value="global">Global</option>}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={getConfig(sectionsState, 'areas', 'fill', selectedSeriesForSection.areas) === true}
                        onChange={(e) => updateSection('areas', 'fill', e.target.checked, selectedSeriesForSection.areas)}
                        className="w-4 h-4"
                      />
                      <label className="text-xs text-gray-700">Fill ({selectedSeriesForSection.areas})</label>
                  </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Opacity ({selectedSeriesForSection.areas})</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={getConfig(sectionsState, 'areas', 'opacity', selectedSeriesForSection.areas) ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value)
                          updateSection('areas', 'opacity', val, selectedSeriesForSection.areas)
                        }}
                        className="w-full text-sm border rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Color ({selectedSeriesForSection.areas})</label>
                      <input
                        type="color"
                        value={getConfig(sectionsState, 'areas', 'color', selectedSeriesForSection.areas) || '#1470D2'}
                        onChange={(e) => updateSection('areas', 'color', e.target.value, selectedSeriesForSection.areas)}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Slices - for pie/donut charts */}
            {(chartTypeState === 'pie' || chartTypeState === 'donut') && (
              <>
                <div className="border rounded-lg bg-white">
                  <button
                    type="button"
                    onClick={() => toggleSection('slices')}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
                  >
                    <span>Slices</span>
                    <span className={`transform transition-transform ${expandedSections.slices ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {expandedSections.slices && (
                    <div className="px-3 pb-3 space-y-2 border-t">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Select Series</label>
                        <select
                          value={selectedSeriesForSection.slices}
                          onChange={(e) => setSelectedSeriesForSection(prev => ({ ...prev, slices: e.target.value }))}
                          className="w-full text-sm border rounded px-2 py-1 mb-2"
                        >
                          <option value="global">Global</option>
                          {colorTargets.length > 0 && colorTargets.map(target => (
                            <option key={target} value={target}>{target}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Explode ({selectedSeriesForSection.slices})</label>
                        <input
                          type="number"
                          min="0"
                          max="0.5"
                          step="0.05"
                          value={getConfig(sectionsState, 'slices', 'explode', selectedSeriesForSection.slices) ?? ''}
                        onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value)
                            updateSection('slices', 'explode', val, selectedSeriesForSection.slices)
                          }}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Border Width ({selectedSeriesForSection.slices})</label>
                        <input
                          type="number"
                          value={getConfig(sectionsState, 'slices', 'border_width', selectedSeriesForSection.slices) ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value)
                            updateSection('slices', 'border_width', val, selectedSeriesForSection.slices)
                          }}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Border Color ({selectedSeriesForSection.slices})</label>
                        <input
                          type="color"
                          value={getConfig(sectionsState, 'slices', 'border_color', selectedSeriesForSection.slices) || '#FFFFFF'}
                          onChange={(e) => updateSection('slices', 'border_color', e.target.value, selectedSeriesForSection.slices)}
                        className="w-full h-8 border rounded"
                      />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Opacity ({selectedSeriesForSection.slices})</label>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={getConfig(sectionsState, 'slices', 'opacity', selectedSeriesForSection.slices) ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value)
                            updateSection('slices', 'opacity', val, selectedSeriesForSection.slices)
                          }}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Center Value - for donut charts */}
                {chartTypeState === 'donut' && (
                  <div className="border rounded-lg bg-white">
                    <button
                      type="button"
                      onClick={() => toggleSection('centerValue')}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
                    >
                      <span>Center Value</span>
                      <span className={`transform transition-transform ${expandedSections.centerValue ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {expandedSections.centerValue && (
                      <div className="px-3 pb-3 space-y-2 border-t">
                        <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                            checked={getConfig(sectionsState, 'center_value', 'show') === true}
                            onChange={(e) => updateSection('center_value', 'show', e.target.checked)}
                          className="w-4 h-4"
                        />
                          <label className="text-xs text-gray-700">Show</label>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Text</label>
                          <input
                            type="text"
                            value={getConfig(sectionsState, 'center_value', 'text') || 'Total'}
                            onChange={(e) => updateSection('center_value', 'text', e.target.value)}
                            className="w-full text-sm border rounded px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Font</label>
                          <select
                            value={resolveBrandFont(getConfig(sectionsState, 'center_value', 'font_family'))}
                            onChange={(e) => updateSection('center_value', 'font_family', e.target.value)}
                            className="w-full text-sm border rounded px-2 py-1"
                          >
                            {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Size</label>
                          <input
                            type="number"
                            value={getConfig(sectionsState, 'center_value', 'font_size') || 20}
                            onChange={(e) => updateSection('center_value', 'font_size', parseInt(e.target.value) || 20)}
                            className="w-full text-sm border rounded px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Color</label>
                          <input
                            type="color"
                            value={getConfig(sectionsState, 'center_value', 'font_color') || '#000000'}
                            onChange={(e) => updateSection('center_value', 'font_color', e.target.value)}
                            className="w-full h-8 border rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Data Labels - Enhanced */}
            <div className="border rounded-lg bg-white">
              <button
                type="button"
                onClick={() => toggleSection('dataLabels')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
              >
                <span>Data Labels</span>
                <span className={`transform transition-transform ${expandedSections.dataLabels ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {expandedSections.dataLabels && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Select Series</label>
                    <select
                      value={selectedSeriesForSection.dataLabels}
                      onChange={(e) => setSelectedSeriesForSection(prev => ({ ...prev, dataLabels: e.target.value }))}
                      className="w-full text-sm border rounded px-2 py-1 mb-2"
                    >
                      {(chartTypeState === 'pie' || chartTypeState === 'donut') ? (
                        <option value="global">Global</option>
                      ) : (
                        <>
                          {colorTargets.length > 0 ? colorTargets.map(target => (
                            <option key={target} value={target}>{target}</option>
                          )) : <option value="global">Global</option>}
                        </>
                      )}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                        <input
  type="checkbox"
  checked={getConfig(sectionsState, 'segment_values', 'show', selectedSeriesForSection.dataLabels) !== false}
  onChange={(e) => {
    const seriesTarget = (chartTypeState === 'pie' || chartTypeState === 'donut') ? 'global' : selectedSeriesForSection.dataLabels
    console.log('🏷️ Data Labels checkbox changed:', {
      checked: e.target.checked,
      series: seriesTarget,
      chartType: chartTypeState
    })
    updateSection('segment_values', 'show', e.target.checked, seriesTarget)
  }}
  className="w-4 h-4"
/>
                    <label className="text-xs text-gray-700">Show</label>
                    </div>
                  {(chartTypeState === 'pie' || chartTypeState === 'donut') && selectedSeriesForSection.dataLabels !== 'global' ? (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      Note: Position can only be set globally for pie/donut charts
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Position ({selectedSeriesForSection.dataLabels})</label>
                      <select
                        value={getConfig(sectionsState, 'segment_values', 'position', selectedSeriesForSection.dataLabels) || 'inside'}
                        onChange={(e) => updateSection('segment_values', 'position', e.target.value, selectedSeriesForSection.dataLabels)}
                        className="w-full text-sm border rounded px-2 py-1"
                      >
                        {(chartTypeState === 'pie' || chartTypeState === 'donut') ? (
                          POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)
                        ) : (
                          TEXT_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)
                        )}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Format ({selectedSeriesForSection.dataLabels})</label>
                    <input
                      type="text"
                      value={getConfig(sectionsState, 'segment_values', 'format', selectedSeriesForSection.dataLabels) || '.0f'}
                      onChange={(e) => updateSection('segment_values', 'format', e.target.value, selectedSeriesForSection.dataLabels)}
                      className="w-full text-sm border rounded px-2 py-1"
                      placeholder=".0f, .1f, .2f, .0%, .1%"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Prefix ({selectedSeriesForSection.dataLabels})</label>
                    <input
                      type="text"
                      value={getConfig(sectionsState, 'segment_values', 'prefix', selectedSeriesForSection.dataLabels) || ''}
                      onChange={(e) => updateSection('segment_values', 'prefix', e.target.value, selectedSeriesForSection.dataLabels)}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Suffix ({selectedSeriesForSection.dataLabels})</label>
                    <input
                      type="text"
                      value={getConfig(sectionsState, 'segment_values', 'suffix', selectedSeriesForSection.dataLabels) || ''}
                      onChange={(e) => updateSection('segment_values', 'suffix', e.target.value, selectedSeriesForSection.dataLabels)}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Font ({selectedSeriesForSection.dataLabels})</label>
                    <select
                      value={resolveBrandFont(getConfig(sectionsState, 'segment_values', 'font_family', selectedSeriesForSection.dataLabels)) || 'Verdana'}
                      onChange={(e) => updateSection('segment_values', 'font_family', e.target.value, selectedSeriesForSection.dataLabels)}
                      className="w-full text-sm border rounded px-2 py-1"
                    >
                      {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Font Size ({selectedSeriesForSection.dataLabels})</label>
                    <input
                      type="number"
                      value={getConfig(sectionsState, 'segment_values', 'font_size', selectedSeriesForSection.dataLabels) ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseInt(e.target.value)
                        updateSection('segment_values', 'font_size', val, selectedSeriesForSection.dataLabels)
                      }}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Font Color ({selectedSeriesForSection.dataLabels})</label>
                          <input
                            type="color"
                      value={getConfig(sectionsState, 'segment_values', 'font_color', selectedSeriesForSection.dataLabels) || '#FFFFFF'}
                      onChange={(e) => updateSection('segment_values', 'font_color', e.target.value, selectedSeriesForSection.dataLabels)}
                      className="w-full h-8 border rounded"
                    />
                  </div>
                </div>
              )}
            </div>

            

            {/* Margins */}
            <div className="border rounded-lg bg-white">
              <button
                type="button"
                onClick={() => toggleSection('margins')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
              >
                <span>Margins</span>
                <span className={`transform transition-transform ${expandedSections.margins ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {expandedSections.margins && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Left</label>
                    <input
                      type="number"
                      value={getConfig(sectionsState, 'margins', 'left') || 100}
                      onChange={(e) => updateSection('margins', 'left', parseInt(e.target.value) || 100)}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Right</label>
                    <input
                      type="number"
                      value={getConfig(sectionsState, 'margins', 'right') || 160}
                      onChange={(e) => updateSection('margins', 'right', parseInt(e.target.value) || 160)}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Top</label>
                    <input
                      type="number"
                      value={getConfig(sectionsState, 'margins', 'top') || 100}
                      onChange={(e) => updateSection('margins', 'top', parseInt(e.target.value) || 100)}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Bottom</label>
                    <input
                      type="number"
                      value={getConfig(sectionsState, 'margins', 'bottom') || 80}
                      onChange={(e) => updateSection('margins', 'bottom', parseInt(e.target.value) || 80)}
                      className="w-full text-sm border rounded px-2 py-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* X-Axis Settings - Enhanced */}
            {!(chartTypeState === 'pie' || chartTypeState === 'donut') && (
              <div className="border rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('xAxis')}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
                >
                  <span>X-Axis</span>
                  <span className={`transform transition-transform ${expandedSections.xAxis ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {expandedSections.xAxis && (
                  <div className="px-3 pb-3 space-y-3 border-t">
                    <div className="space-y-2 border-b pb-2">
                      <p className="text-xs font-medium text-gray-700">Grid</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={getAxisConfig(sectionsState, 'x_axis', 'grid', 'show') === true}
                          onChange={(e) => updateAxisSection('x_axis', 'grid', 'show', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <label className="text-xs text-gray-700">Show</label>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Color</label>
                        <input
                          type="color"
                          value={getAxisConfig(sectionsState, 'x_axis', 'grid', 'color') || '#E5E7EB'}
                          onChange={(e) => updateAxisSection('x_axis', 'grid', 'color', e.target.value)}
                          className="w-full h-8 border rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Width</label>
                        <input
                          type="number"
                          value={getAxisConfig(sectionsState, 'x_axis', 'grid', 'width') || 1}
                          onChange={(e) => updateAxisSection('x_axis', 'grid', 'width', parseInt(e.target.value) || 1)}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 border-b pb-2">
                      <p className="text-xs font-medium text-gray-700">Line</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={getAxisConfig(sectionsState, 'x_axis', 'line', 'visible') === true}
                          onChange={(e) => updateAxisSection('x_axis', 'line', 'visible', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <label className="text-xs text-gray-700">Visible</label>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Color</label>
                        <input
                          type="color"
                          value={getAxisConfig(sectionsState, 'x_axis', 'line', 'color') || '#000000'}
                          onChange={(e) => updateAxisSection('x_axis', 'line', 'color', e.target.value)}
                          className="w-full h-8 border rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Width</label>
                        <input
                          type="number"
                          value={getAxisConfig(sectionsState, 'x_axis', 'line', 'width') || 1}
                          onChange={(e) => updateAxisSection('x_axis', 'line', 'width', parseInt(e.target.value) || 1)}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 border-b pb-2">
                      <p className="text-xs font-medium text-gray-700">Ticks</p>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Font</label>
                        <select
                          value={resolveBrandFont(getAxisConfig(sectionsState, 'x_axis', 'ticks', 'font_family'))}
                          onChange={(e) => updateAxisSection('x_axis', 'ticks', 'font_family', e.target.value)}
                          className="w-full text-sm border rounded px-2 py-1"
                        >
                          {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Size</label>
                        <input
                          type="number"
                          value={getAxisConfig(sectionsState, 'x_axis', 'ticks', 'font_size') || 0}
                          onChange={(e) => updateAxisSection('x_axis', 'ticks', 'font_size', parseInt(e.target.value) || 0)}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Color</label>
                        <input
                          type="color"
                          value={getAxisConfig(sectionsState, 'x_axis', 'ticks', 'font_color') || '#000000'}
                          onChange={(e) => updateAxisSection('x_axis', 'ticks', 'font_color', e.target.value)}
                          className="w-full h-8 border rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Angle</label>
                        <input
                          type="number"
                          value={getAxisConfig(sectionsState, 'x_axis', 'ticks', 'angle') || 0}
                          onChange={(e) => updateAxisSection('x_axis', 'ticks', 'angle', parseInt(e.target.value) || 0)}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Format</label>
                        <input
                          type="text"
                          value={getAxisConfig(sectionsState, 'x_axis', 'ticks', 'format') || ''}
                          onChange={(e) => updateAxisSection('x_axis', 'ticks', 'format', e.target.value)}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Prefix</label>
                        <input
                          type="text"
                          value={getAxisConfig(sectionsState, 'x_axis', 'ticks', 'prefix') || ''}
                          onChange={(e) => updateAxisSection('x_axis', 'ticks', 'prefix', e.target.value)}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Suffix</label>
                        <input
                          type="text"
                          value={getAxisConfig(sectionsState, 'x_axis', 'ticks', 'suffix') || ''}
                          onChange={(e) => updateAxisSection('x_axis', 'ticks', 'suffix', e.target.value)}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">Title</p>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Text</label>
                        <input
                          type="text"
                          value={getAxisConfig(sectionsState, 'x_axis', 'title', 'text') || ''}
                          onChange={(e) => updateAxisSection('x_axis', 'title', 'text', e.target.value)}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Font</label>
                        <select
                          value={resolveBrandFont(getAxisConfig(sectionsState, 'x_axis', 'title', 'font_family'))}
                          onChange={(e) => updateAxisSection('x_axis', 'title', 'font_family', e.target.value)}
                          className="w-full text-sm border rounded px-2 py-1"
                        >
                          {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Size</label>
                        <input
                          type="number"
                          value={getAxisConfig(sectionsState, 'x_axis', 'title', 'font_size') || 14}
                          onChange={(e) => updateAxisSection('x_axis', 'title', 'font_size', parseInt(e.target.value) || 14)}
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Color</label>
                        <input
                          type="color"
                          value={getAxisConfig(sectionsState, 'x_axis', 'title', 'font_color') || '#000000'}
                          onChange={(e) => updateAxisSection('x_axis', 'title', 'font_color', e.target.value)}
                          className="w-full h-8 border rounded"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Y-Axis Settings - Enhanced */}
{!(chartTypeState === 'pie' || chartTypeState === 'donut') && (
  <div className="border rounded-lg bg-white">
    <button
      type="button"
      onClick={() => {
        toggleSection('yAxis')
        // Debug: Log ALL possible sources when opening Y-Axis
        console.log('📂 Opening Y-Axis section - checking all sources:')
        console.log('1. sectionsState.y_axis:', sectionsState?.y_axis)
        console.log('2. sceneData.preset:', sceneData?.preset?.preset_definitions?.[0]?.sections?.y_axis)
        console.log('3. selectedPresetIndex:', selectedPresetIndex)
        console.log('4. availablePresets[selectedPresetIndex]:', availablePresets[selectedPresetIndex]?.sections?.y_axis)
      }}
      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
    >
      <span>Y-Axis</span>
      <span className={`transform transition-transform ${expandedSections.yAxis ? 'rotate-180' : ''}`}>▼</span>
    </button>
    {expandedSections.yAxis && (
      <div className="px-3 pb-3 space-y-3 border-t">
        <div className="space-y-2 border-b pb-2">
          <p className="text-xs font-medium text-gray-700">Grid</p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(() => {
                const value = getAxisConfig(sectionsState, 'y_axis', 'grid', 'show')
                console.log('🔍 Y-Axis Grid Show:', value, 'Type:', typeof value, 'sectionsState.y_axis:', sectionsState?.y_axis)
                return value === true
              })()}
              onChange={(e) => {
                console.log('✏️ Grid Show changed to:', e.target.checked)
                updateAxisSection('y_axis', 'grid', 'show', e.target.checked)
              }}
              className="w-4 h-4"
            />
            <label className="text-xs text-gray-700">Show</label>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Color</label>
            <input
              type="color"
              value={getAxisConfig(sectionsState, 'y_axis', 'grid', 'color') || '#E5E7EB'}
              onChange={(e) => updateAxisSection('y_axis', 'grid', 'color', e.target.value)}
              className="w-full h-8 border rounded"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Width</label>
            <input
              type="number"
              value={getAxisConfig(sectionsState, 'y_axis', 'grid', 'width') || 1}
              onChange={(e) => updateAxisSection('y_axis', 'grid', 'width', parseInt(e.target.value) || 1)}
              className="w-full text-sm border rounded px-2 py-1"
            />
          </div>
        </div>
        
        <div className="space-y-2 border-b pb-2">
          <p className="text-xs font-medium text-gray-700">Line</p>
          <div className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={(() => {
      const value = getAxisConfig(sectionsState, 'y_axis', 'line', 'visible')
      const isChecked = value === true
      console.log('🔍 Y-Axis Line checkbox render:')
      console.log('  - Raw value:', value, 'Type:', typeof value)
      console.log('  - Computed checked:', isChecked)
      console.log('  - sectionsState.y_axis.line:', sectionsState?.y_axis?.line)
      return isChecked
    })()}
    onChange={(e) => {
      console.log('✏️ Line Visible checkbox clicked, new checked state:', e.target.checked)
      updateAxisSection('y_axis', 'line', 'visible', e.target.checked)
    }}
    className="w-4 h-4"
  />
  <label className="text-xs text-gray-700">Visible</label>
</div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Color</label>
            <input
              type="color"
              value={getAxisConfig(sectionsState, 'y_axis', 'line', 'color') || '#000000'}
              onChange={(e) => updateAxisSection('y_axis', 'line', 'color', e.target.value)}
              className="w-full h-8 border rounded"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Width</label>
            <input
              type="number"
              value={getAxisConfig(sectionsState, 'y_axis', 'line', 'width') || 1}
              onChange={(e) => updateAxisSection('y_axis', 'line', 'width', parseInt(e.target.value) || 1)}
              className="w-full text-sm border rounded px-2 py-1"
            />
          </div>
        </div>
        
        <div className="space-y-2 border-b pb-2">
          <p className="text-xs font-medium text-gray-700">Zero Line</p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={getAxisConfig(sectionsState, 'y_axis', 'zeroline', 'show') === true}
              onChange={(e) => updateAxisSection('y_axis', 'zeroline', 'show', e.target.checked)}
              className="w-4 h-4"
            />
            <label className="text-xs text-gray-700">Show</label>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Color</label>
            <input
              type="color"
              value={getAxisConfig(sectionsState, 'y_axis', 'zeroline', 'color') || '#000000'}
              onChange={(e) => updateAxisSection('y_axis', 'zeroline', 'color', e.target.value)}
              className="w-full h-8 border rounded"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Width</label>
            <input
              type="number"
              value={getAxisConfig(sectionsState, 'y_axis', 'zeroline', 'width') || 1}
              onChange={(e) => updateAxisSection('y_axis', 'zeroline', 'width', parseInt(e.target.value) || 1)}
              className="w-full text-sm border rounded px-2 py-1"
            />
          </div>
        </div>
        
        <div className="space-y-2 border-b pb-2">
          <p className="text-xs font-medium text-gray-700">Ticks</p>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Font</label>
            <select
              value={resolveBrandFont(getAxisConfig(sectionsState, 'y_axis', 'ticks', 'font_family'))}
              onChange={(e) => updateAxisSection('y_axis', 'ticks', 'font_family', e.target.value)}
              className="w-full text-sm border rounded px-2 py-1"
            >
              {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Size</label>
            <input
              type="number"
              value={getAxisConfig(sectionsState, 'y_axis', 'ticks', 'font_size') ?? 12}
              onChange={(e) => updateAxisSection('y_axis', 'ticks', 'font_size', parseInt(e.target.value) || 12)}
              className="w-full text-sm border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Color</label>
            <input
              type="color"
              value={getAxisConfig(sectionsState, 'y_axis', 'ticks', 'font_color') || '#000000'}
              onChange={(e) => updateAxisSection('y_axis', 'ticks', 'font_color', e.target.value)}
              className="w-full h-8 border rounded"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Format</label>
            <input
              type="text"
              value={getAxisConfig(sectionsState, 'y_axis', 'ticks', 'format') || ''}
              onChange={(e) => updateAxisSection('y_axis', 'ticks', 'format', e.target.value)}
              className="w-full text-sm border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Prefix</label>
            <input
              type="text"
              value={getAxisConfig(sectionsState, 'y_axis', 'ticks', 'prefix') || ''}
              onChange={(e) => updateAxisSection('y_axis', 'ticks', 'prefix', e.target.value)}
              className="w-full text-sm border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Suffix</label>
            <input
              type="text"
              value={getAxisConfig(sectionsState, 'y_axis', 'ticks', 'suffix') || ''}
              onChange={(e) => updateAxisSection('y_axis', 'ticks', 'suffix', e.target.value)}
              className="w-full text-sm border rounded px-2 py-1"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Title</p>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Text</label>
            <input
              type="text"
              value={getAxisConfig(sectionsState, 'y_axis', 'title', 'text') || ''}
              onChange={(e) => updateAxisSection('y_axis', 'title', 'text', e.target.value)}
              className="w-full text-sm border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Font</label>
            <select
              value={resolveBrandFont(getAxisConfig(sectionsState, 'y_axis', 'title', 'font_family'))}
              onChange={(e) => updateAxisSection('y_axis', 'title', 'font_family', e.target.value)}
              className="w-full text-sm border rounded px-2 py-1"
            >
              {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Size</label>
            <input
              type="number"
              value={getAxisConfig(sectionsState, 'y_axis', 'title', 'font_size') || 14}
              onChange={(e) => updateAxisSection('y_axis', 'title', 'font_size', parseInt(e.target.value) || 14)}
              className="w-full text-sm border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Color</label>
            <input
              type="color"
              value={getAxisConfig(sectionsState, 'y_axis', 'title', 'font_color') || '#000000'}
              onChange={(e) => updateAxisSection('y_axis', 'title', 'font_color', e.target.value)}
              className="w-full h-8 border rounded"
            />
          </div>
        </div>
      </div>
    )}
  </div>
)}

            {/* Data Editing */}
            {datasetSummary && (
              <div className="border rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('data')}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
                >
                  <span>Edit Data</span>
                  <span className={`transform transition-transform ${expandedSections.data ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {expandedSections.data && (
                  <div className="px-3 pb-3 space-y-2 border-t max-h-64 overflow-y-auto">
                    {datasetSummary.categories && datasetSummary.categories.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Categories</p>
                        <div className="space-y-1">
                          {datasetSummary.categories.map((cat, idx) => (
                            <input
                              key={idx}
                              type="text"
                              value={cat}
                              onChange={(e) => {
                                if (historyInitializedRef.current) saveToHistory()
                                const newCategories = [...datasetSummary.categories]
                                newCategories[idx] = e.target.value
                                const updatedData = { ...chartDataState }
                                if (updatedData.series) {
                                  updatedData.series.x = newCategories
                                  setChartDataState(updatedData)
                                  setRawChartDataInput(JSON.stringify(updatedData, null, 2))
                                  markDirty()
                                }
                              }}
                              className="w-full text-xs border rounded px-2 py-1"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {datasetSummary.dataset &&
                      Object.entries(datasetSummary.dataset).map(([seriesName, values]) => (
                        <div key={seriesName} className="mt-2">
                          <p className="text-xs font-medium text-gray-600 mb-1">{seriesName}</p>
                          <div className="space-y-1">
                            {values.map((val, idx) => (
                              <input
                                key={idx}
                                type="number"
                                value={val}
                                onChange={(e) => {
                                  if (historyInitializedRef.current) saveToHistory()
                                  const numVal = Number(e.target.value) || 0
                                  const updatedData = { ...chartDataState }
                                  if (updatedData.series?.data) {
                                    const seriesIdx = updatedData.series.data.findIndex((s) => s.name === seriesName)
                                    if (seriesIdx >= 0) {
                                      const newY = [...updatedData.series.data[seriesIdx].y]
                                      newY[idx] = numVal
                                      updatedData.series.data[seriesIdx].y = newY
                                      setChartDataState(updatedData)
                                      setRawChartDataInput(JSON.stringify(updatedData, null, 2))
                                      markDirty()
                                    }
                                  }
                                }}
                                className="w-full text-xs border rounded px-2 py-1"
                                step="any"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    {datasetSummary.values && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">Values</p>
                        <div className="space-y-1">
                          {datasetSummary.values.map((val, idx) => (
                            <input
                              key={idx}
                              type="number"
                              value={val}
                              onChange={(e) => {
                                if (historyInitializedRef.current) saveToHistory()
                                const numVal = Number(e.target.value) || 0
                                const updatedData = { ...chartDataState }
                                if (updatedData.series?.data?.[0]) {
                                  const newValues = [...updatedData.series.data[0].values]
                                  newValues[idx] = numVal
                                  updatedData.series.data[0].values = newValues
                                  setChartDataState(updatedData)
                                  setRawChartDataInput(JSON.stringify(updatedData, null, 2))
                                  markDirty()
                                }
                              }}
                              className="w-full text-xs border rounded px-2 py-1"
                              step="any"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {datasetSummary && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">Data Preview</p>
                <div className="space-y-2 text-sm text-gray-900">
                  {datasetSummary.categories && datasetSummary.categories.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 px-2 py-1">
                      <div className="font-medium text-xs text-gray-600">Categories</div>
                      <div className="text-xs text-gray-700 break-words">
                        {datasetSummary.categories.join(', ')}
                      </div>
                    </div>
                  )}
                  {datasetSummary.dataset &&
                    Object.entries(datasetSummary.dataset).map(([seriesName, values]) => (
                      <div key={seriesName} className="bg-white rounded-lg border border-gray-200 px-2 py-1">
                        <div className="font-medium text-xs text-gray-600">{seriesName}</div>
                        <div className="text-xs text-gray-700 break-words">{values.join(', ')}</div>
                      </div>
                    ))}
                  {datasetSummary.values && (
                    <div className="bg-white rounded-lg border border-gray-200 px-2 py-1">
                      <div className="font-medium text-xs text-gray-600">Values</div>
                      <div className="text-xs text-gray-700 break-words">
                        {datasetSummary.values.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Chart Data (JSON)</p>
                <textarea
                  value={rawChartDataInput}
                  onChange={handleRawChartDataInputChange}
                  className="w-full h-32 text-xs font-mono border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                  spellCheck={false}
                />
                {rawChartError && <p className="text-xs text-red-600 mt-1">{rawChartError}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyRawChartData}
                  className="flex-1 bg-[#13008B] text-white text-xs font-medium rounded-lg px-3 py-2 hover:bg-blue-800 transition-colors"
                >
                  Apply Data
                </button>
                <button
                  type="button"
                  onClick={handleResetEditor}
                  className="flex-1 border border-gray-300 text-xs font-medium rounded-lg px-3 py-2 hover:bg-gray-100"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">Description</p>
              <p className="text-sm text-gray-800 whitespace-pre-line">
                {sceneData?.desc || 'No description provided for this chart.'}
              </p>
            </div>
            {(error || saveError) && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {saveError || error}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Use the Plotly toolbar to drag, annotate, draw, and zoom. The JSON editor gives you full control over
              the chart data payload.
            </p>
          </aside>
          <div className="col-span-4 bg-gray-50" style={{ overflow: 'auto', padding: isVertical ? '1rem 1.5rem' : '1rem', maxHeight: isVertical ? 'calc(95vh - 120px)' : 'calc(90vh - 120px)' }}>
            <div className={`w-full flex ${isVertical ? 'justify-center' : 'items-center justify-center'}`} style={{ paddingTop: isVertical ? '1rem' : '0' }}>
              <div 
                className="bg-white rounded-lg shadow-sm"
                style={{ 
                  aspectRatio: aspectRatioCss,
                  ...(isVertical ? {
                    width: '100%',
                    maxWidth: '650px',  // Increased to accommodate Y-axis labels
                    minWidth: '500px',  // Increased minimum width
                    flexShrink: 0
                  } : {
                    width: '100%',
                    maxWidth: '100%'
                  }),
                  display: 'block',
                  position: 'relative',
                  // Ensure container maintains aspect ratio and doesn't get cut
                  boxSizing: 'border-box',
                  overflow: 'visible'
                }}
              >
                {figure ? (
                  <div style={{ 
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    padding: 0,
                    margin: 0
                  }}>
                    <Plot
                      key={`chart-${sceneNumber}-${figure.layout?.editrevision || 0}-yline-${figure.layout?.yaxis?.showline}-xline-${figure.layout?.xaxis?.showline}-aspect-${aspectRatioCss}`}
                      ref={plotRef}
                      data={figure.data}
                      layout={figure.layout}
                      config={figure.config}
                      style={{ width: '100%', height: '100%', display: 'block' }}
                      useResizeHandler
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm" style={{ minHeight: '300px', aspectRatio: aspectRatioCss }}>
                    {error || 'Chart will appear here once ready.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChartEditorModal