import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'
import { FaTimes, FaUndo, FaRedo } from 'react-icons/fa'

const deepClone = (value) => JSON.parse(JSON.stringify(value))

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
    const xValues = Array.isArray(seriesBlock.x) ? seriesBlock.x : []
    const dataEntries = Array.isArray(seriesBlock.data) ? seriesBlock.data : []
    const dataset = {}
    dataEntries.forEach((entry, idx) => {
      if (!entry || typeof entry !== 'object') return
      const name = entry.name ?? `Series ${idx + 1}`
      const yValues = Array.isArray(entry.y) ? entry.y : []
      if (yValues.length) dataset[name] = yValues
    })
    if (!Object.keys(dataset).length || !xValues.length) return null
    return { categories: xValues, dataset }
  }

  return null
}

const createPieChart = (data, presetData, chartData, sections) => {
  const labels = data.categories ?? []
  const values = data.values ?? []
  const effectiveSections = sections ?? presetData?.preset_definitions?.[0]?.sections ?? {}
  const colorMap = mapSeriesEntries(effectiveSections.colors ?? [])
  const markerColors = labels.map((label) => colorMap[label]?.color ?? null)
  const hasColors = markerColors.some((color) => Boolean(color))

  return [
    {
      type: 'pie',
      labels,
      values,
      marker: hasColors ? { colors: markerColors } : undefined
    }
  ]
}

const createBarChart = (data, presetData, chartData, chartType, sections) => {
  const categories = data.categories ?? []
  const dataset = data.dataset ?? {}
  const effectiveSections = sections ?? presetData?.preset_definitions?.[0]?.sections ?? {}
  const colorMap = mapSeriesEntries(effectiveSections.colors ?? [])
  const isStacked = chartType.includes('stacked')
  const isHorizontal = chartType.includes('bar') && !chartType.includes('column')

  const traces = Object.entries(dataset).map(([seriesName, yValues]) => {
    const seriesColor = colorMap[seriesName]?.color ?? colorMap.global?.color ?? '#333333'
    return {
      type: 'bar',
      name: seriesName,
      orientation: isHorizontal ? 'h' : 'v',
      x: isHorizontal ? yValues : categories,
      y: isHorizontal ? categories : yValues,
      marker: seriesColor ? { color: seriesColor } : undefined
    }
  })

  const layout = {
    barmode: isStacked ? 'stack' : 'group'
  }
  return { traces, layout }
}

const createLineChart = (data, presetData, chartData, chartType, sections) => {
  const categories = data.categories ?? []
  const dataset = data.dataset ?? {}
  const effectiveSections = sections ?? presetData?.preset_definitions?.[0]?.sections ?? {}
  const colorMap = mapSeriesEntries(effectiveSections.colors ?? [])
  const mode = 'lines+markers'
  const isArea = chartType === 'area'

  return Object.entries(dataset).map(([seriesName, yValues]) => {
    const seriesColor = colorMap[seriesName]?.color ?? colorMap.global?.color ?? '#636EFA'
    return {
      type: 'scatter',
      mode,
      name: seriesName,
      x: categories,
      y: yValues,
      line: seriesColor ? { color: seriesColor } : undefined,
      fill: isArea ? 'tozeroy' : undefined
    }
  })
}

const createScatterChart = (data, presetData, chartData, sections) => {
  const categories = data.categories ?? []
  const dataset = data.dataset ?? {}
  const effectiveSections = sections ?? presetData?.preset_definitions?.[0]?.sections ?? {}
  const colorMap = mapSeriesEntries(effectiveSections.colors ?? [])

  return Object.entries(dataset).map(([seriesName, yValues]) => {
    const seriesColor = colorMap[seriesName]?.color ?? colorMap.global?.color ?? '#636EFA'
    return {
      type: 'scatter',
      mode: 'markers',
      name: seriesName,
      x: categories,
      y: yValues,
      marker: seriesColor ? { color: seriesColor } : undefined
    }
  })
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
  const bg = getConfigDict(sections.background ?? [])
  if (Object.keys(bg).length) {
    fig.layout.paper_bgcolor = bg.paper_color ?? '#FFFFFF'
    fig.layout.plot_bgcolor = bg.plot_color ?? bg.color ?? '#FFFFFF'
  }
}

const applyTitle = (fig, sections) => {
  const title = getConfigDict(sections.title ?? [])
  if (Object.keys(title).length) {
    const xAlign = title.x_align ?? 'left'
    fig.layout.title = {
      text: title.text ?? '',
      font: {
        family: title.font_family ?? 'Arial',
        size: title.font_size ?? 20,
        color: title.font_color ?? '#000000'
      },
      xanchor: xAlign,
      x: xAlign === 'left' ? 0 : 0.5
    }
  }
}

const applyLegend = (fig, sections) => {
  const legend = getConfigDict(sections.legend ?? [])
  if (!Object.keys(legend).length) return
  const orientation = legend.orientation === 'horizontal' ? 'h' : 'v'
  fig.layout.showlegend = legend.show ?? true
  fig.layout.legend = {
    orientation,
    x: legend.x ?? 1.02,
    y: legend.y ?? 0.5,
    xanchor: 'left',
    yanchor: 'middle',
    font: {
      family: legend.font_family ?? 'Arial',
      size: legend.font_size ?? 12,
      color: legend.font_color ?? '#000000'
    },
    borderwidth: legend.border_width ?? 0,
    bordercolor: legend.border_color ?? '#000000',
    bgcolor: legend.background_color ?? 'rgba(255,255,255,0)'
  }
}

const applyPresetFormatting = (fig, sections, chartType, chartData) => {
  if (!sections) return

  applyDimensions(fig, sections)
  applyMargins(fig, sections)
  applyBackground(fig, sections)
  applyTitle(fig, sections)
  applyLegend(fig, sections)

  // Additional formatting hooks could be added here if needed
  // For now we rely on colors applied inline
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
  { value: 'bar', label: 'Bar' },
  { value: 'column', label: 'Column' },
  { value: 'stacked_bar', label: 'Stacked Bar' },
  { value: 'stacked_column', label: 'Stacked Column' },
  { value: 'clustered_bar', label: 'Clustered Bar' },
  { value: 'clustered_column', label: 'Clustered Column' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'pie', label: 'Pie' },
  { value: 'donut', label: 'Donut' }
]

const computeColorTargets = (chartType, chartData) => {
  if (!chartData || typeof chartData !== 'object') return []
  const isPie = chartType === 'pie' || chartType === 'donut'
  if (isPie) {
    return Array.isArray(chartData?.series?.labels) ? chartData.series.labels.filter(Boolean) : []
  }
  const dataEntries = Array.isArray(chartData?.series?.data) ? chartData.series.data : []
  return dataEntries
    .map((entry, idx) => entry?.name || `Series ${idx + 1}`)
    .filter(Boolean)
}

const extractInitialColorOverrides = (sceneData, targets = []) => {
  if (!sceneData || !targets.length) return {}
  const sections = sceneData?.preset?.preset_definitions?.[0]?.sections ?? {}
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
  const makeKey = (item) => `${item?.series || 'global'}::${item?.name || ''}`
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

const buildSectionsOverrideFromColors = (colorOverrides = {}) => {
  const entries = Object.entries(colorOverrides || {}).filter(([_, color]) => Boolean(color))
  if (!entries.length) return null
  const colors = entries.map(([series, color]) => ({
    series: series || 'global',
    name: 'color',
    value: color
  }))
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
    fig.data = createPieChart(data, presetData, chartData, sections)
  } else if (
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
  } else {
    throw new Error(`Unsupported chart type: ${chartType}`)
  }

  applyPresetFormatting(fig, sections, chartType, chartData)
  return fig
}

const ChartEditorModal = ({ sceneData, isOpen = false, onClose }) => {
  const [figure, setFigure] = useState(null)
  const [error, setError] = useState('')
  const [seriesColorOverrides, setSeriesColorOverrides] = useState({})
  const [rawChartDataInput, setRawChartDataInput] = useState('')
  const [rawChartError, setRawChartError] = useState('')
  const [chartTypeState, setChartTypeState] = useState(
    (sceneData?.chart_type || sceneData?.chartType || 'unknown').toLowerCase()
  )
  const [chartDataState, setChartDataState] = useState(
    safeParseJSON(sceneData?.chart_data ?? sceneData?.chartData ?? {}, {})
  )
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [layoutOverrides, setLayoutOverrides] = useState({
    title: { text: '', font: { size: 20, color: '#000000', family: 'Arial' }, x: 0.5, xanchor: 'center' },
    showlegend: true,
    legend: { orientation: 'v', x: 1.02, y: 0.5, font: { size: 12, color: '#000000', family: 'Arial' } },
    paper_bgcolor: '#FFFFFF',
    plot_bgcolor: '#FFFFFF',
    xaxis: { title: { text: '' }, showgrid: true, gridcolor: '#E5E5E5', showline: true, linecolor: '#000000', linewidth: 1 },
    yaxis: { title: { text: '' }, showgrid: true, gridcolor: '#E5E5E5', showline: true, linecolor: '#000000', linewidth: 1 }
  })
  const [expandedSections, setExpandedSections] = useState({
    title: false,
    legend: false,
    background: false,
    axes: false,
    data: false
  })
  const [history, setHistory] = useState([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const historyInitializedRef = useRef(false)
  const currentHistoryIndexRef = useRef(-1)
  const plotRef = useRef(null)
  const sceneNumber = sceneData?.scene_number || sceneData?.sceneNumber
  const chartTitle = sceneData?.chart_title || sceneData?.scene_title || 'Chart'

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
    if (!sceneData) return
    const nextType = (sceneData?.chart_type || sceneData?.chartType || 'unknown').toLowerCase()
    const parsedData = safeParseJSON(sceneData?.chart_data ?? sceneData?.chartData ?? {}, {})
    const targets = computeColorTargets(nextType, parsedData)
    const presetSections = sceneData?.preset?.preset_definitions?.[0]?.sections ?? {}
    const titleConfig = getConfigDict(presetSections.title ?? [])
    const legendConfig = getConfigDict(presetSections.legend ?? [])
    const bgConfig = getConfigDict(presetSections.background ?? [])
    
    setChartTypeState(nextType)
    setChartDataState(parsedData)
    setSeriesColorOverrides(extractInitialColorOverrides(sceneData, targets))
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
          family: titleConfig.font_family || 'Arial'
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
          family: legendConfig.font_family || 'Arial'
        }
      },
      paper_bgcolor: bgConfig.paper_color || '#FFFFFF',
      plot_bgcolor: bgConfig.plot_color || bgConfig.color || '#FFFFFF',
      xaxis: { title: { text: '' }, showgrid: true, gridcolor: '#E5E5E5', showline: true, linecolor: '#000000', linewidth: 1 },
      yaxis: { title: { text: '' }, showgrid: true, gridcolor: '#E5E5E5', showline: true, linecolor: '#000000', linewidth: 1 }
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
            family: titleConfig.font_family || 'Arial'
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
            family: legendConfig.font_family || 'Arial'
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
  }, [sceneData])

  useEffect(() => {
    rebuildEditorStateFromScene()
  }, [rebuildEditorStateFromScene])

  const colorTargets = useMemo(
    () => computeColorTargets(chartTypeState, chartDataState),
    [chartTypeState, chartDataState]
  )

  useEffect(() => {
    if (!sceneData) return
    setSeriesColorOverrides((prev) => {
      const baseColors = extractInitialColorOverrides(sceneData, colorTargets)
      const next = {}
      colorTargets.forEach((target) => {
        if (Object.prototype.hasOwnProperty.call(prev, target)) {
          next[target] = prev[target]
        } else if (baseColors[target]) {
          next[target] = baseColors[target]
        }
      })
      return next
    })
  }, [colorTargets, sceneData])

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
    if (historyInitializedRef.current) saveToHistory()
    setSeriesColorOverrides((prev) => ({
      ...prev,
      [target]: color
    }))
    markDirty()
  }, [markDirty, saveToHistory])

  const handleChartTypeChange = (event) => {
    if (historyInitializedRef.current) saveToHistory()
    setChartTypeState(event.target.value)
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
      const baseColors = extractInitialColorOverrides(sceneData, targets)
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
      
      // Get dimensions - prefer figure layout dimensions if available, otherwise use DOM dimensions
      const plotWidth = figure?.layout?.width || plotElement.offsetWidth || 960
      const plotHeight = figure?.layout?.height || plotElement.offsetHeight || 540
      
      console.log(`📐 Export dimensions: ${plotWidth}x${plotHeight}`)
      
      // Use Plotly's built-in toImage method (same as download as PNG feature)
      // This uses Plotly's native export functionality that handles all scaling automatically
      // Use scale: 3 for high-resolution export with proper font scaling
      // Note: width/height are optional - if omitted, Plotly uses the element's dimensions
      const imageDataUrl = await Plotly.toImage(plotElement, {
        format: 'png',
        width: plotWidth,
        height: plotHeight,
        scale: 3 // High resolution - Plotly automatically scales fonts, labels, titles, etc.
      })
      
      console.log('✅ Chart exported to data URL, converting to blob...')
      
      // Convert data URL to blob (matching ImageList.js pattern)
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
      
      // Create a File object from the blob (matching ImageList.js pattern)
      const file = new File([blob], fileName, {
        type: 'image/png',
        lastModified: Date.now()
      })
      
      // First, save to temp folder via backend API (matching ImageList.js pattern)
      console.log(`📤 Saving chart to temp folder: ${fileName}...`)
      const tempFormData = new FormData()
      tempFormData.append('image', file)
      tempFormData.append('fileName', fileName)
      tempFormData.append('sceneNumber', sceneNumber)
      tempFormData.append('imageIndex', 0) // Charts are typically index 0
      
      const saveTempResponse = await fetch('/api/save-temp-image', {
        method: 'POST',
        body: tempFormData
      })
      
      if (!saveTempResponse.ok) {
        const errorText = await saveTempResponse.text()
        console.warn(`⚠️ Failed to save to temp folder (${saveTempResponse.status}): ${errorText}`)
        // Continue anyway - we can still upload directly
      } else {
        console.log(`✅ Chart saved to temp folder successfully`)
      }
      
      // Now upload the chart image to the upload_chart API using the file from temp folder
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
      
      if (!uploadResponse.ok) {
        const text = await uploadResponse.text()
        throw new Error(text || 'Failed to upload chart')
      }
      
      console.log('✅ Chart uploaded successfully')
      
      // Delete the image from temp folder after successful upload (matching ImageList.js pattern)
      console.log(`🗑️ Deleting chart from temp folder: ${fileName}...`)
      try {
        const deleteResponse = await fetch(`/api/delete-temp-image?fileName=${encodeURIComponent(fileName)}`, {
          method: 'DELETE'
        })
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted ${fileName} from temp folder`)
        } else {
          console.warn(`⚠️ Could not delete ${fileName} from temp folder (${deleteResponse.status})`)
        }
      } catch (deleteError) {
        console.warn(`⚠️ Error deleting ${fileName} from temp folder:`, deleteError)
        // Don't fail the whole operation if deletion fails
      }
      
      setIsDirty(false)
      window.location.reload()
    } catch (err) {
      console.error('❌ Error saving chart:', err)
      setSaveError(err?.message || 'Failed to save chart')
    } finally {
      setIsSaving(false)
    }
  }, [sceneNumber, figure])

  useEffect(() => {
    if (!sceneData) return
    try {
      const baseSections = sceneData?.preset?.preset_definitions?.[0]?.sections ?? {}
      const overrideSections = buildSectionsOverrideFromColors(seriesColorOverrides)
      const mergedSections = mergeSectionsWithOverrides(baseSections, overrideSections)
      const preparedPreset = sceneData?.preset
        ? {
            ...sceneData.preset,
            preset_definitions: [
              {
                ...(sceneData.preset?.preset_definitions?.[0] ?? {}),
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
      fig.layout = {
        ...fig.layout,
        ...layoutOverrides,
        dragmode: 'zoom',
        hovermode: 'closest',
        newshape: {
          line: {
            color: '#13008B',
            width: 2
          }
        },
        editrevision: (fig.layout?.editrevision || 0) + 1
      }
      setFigure(fig)
      setError('')
    } catch (err) {
      setFigure(null)
      setError(err?.message || 'Unable to render chart')
    }
  }, [sceneData, chartTypeState, chartDataState, seriesColorOverrides, layoutOverrides])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] max-h-[90vh] flex flex-col overflow-hidden">
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
          <aside className=" border-t lg:border-r border-gray-200 p-6 overflow-y-auto bg-gray-50 space-y-4">
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

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Preset</p>
              <p className="text-sm text-gray-900">
                {sceneData?.preset?.preset_definitions?.[0]?.name || 'Default'}
              </p>
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
                    <label className="text-xs text-gray-600 block mb-1">Title Text</label>
                    <input
                      type="text"
                      value={layoutOverrides.title.text}
                      onChange={(e) => updateLayoutOverride('title.text', e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1"
                      placeholder="Chart Title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Font Size</label>
                      <input
                        type="number"
                        value={layoutOverrides.title.font.size}
                        onChange={(e) => updateLayoutOverride('title.font.size', Number(e.target.value) || 20)}
                        className="w-full text-sm border rounded px-2 py-1"
                        min="8"
                        max="48"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Color</label>
                      <input
                        type="color"
                        value={layoutOverrides.title.font.color}
                        onChange={(e) => updateLayoutOverride('title.font.color', e.target.value)}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Alignment</label>
                    <select
                      value={layoutOverrides.title.xanchor}
                      onChange={(e) => {
                        updateLayoutOverride('title.xanchor', e.target.value)
                        updateLayoutOverride('title.x', e.target.value === 'left' ? 0 : 0.5)
                      }}
                      className="w-full text-sm border rounded px-2 py-1"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                    </select>
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
                    <label className="text-xs text-gray-600 block mb-1">Paper Color</label>
                    <input
                      type="color"
                      value={layoutOverrides.paper_bgcolor}
                      onChange={(e) => updateLayoutOverride('paper_bgcolor', e.target.value)}
                      className="w-full h-8 border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Plot Color</label>
                    <input
                      type="color"
                      value={layoutOverrides.plot_bgcolor}
                      onChange={(e) => updateLayoutOverride('plot_bgcolor', e.target.value)}
                      className="w-full h-8 border rounded"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Axes Settings */}
            <div className="border rounded-lg bg-white">
              <button
                type="button"
                onClick={() => toggleSection('axes')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
              >
                <span>Axes & Grid</span>
                <span className={`transform transition-transform ${expandedSections.axes ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {expandedSections.axes && (
                <div className="px-3 pb-3 space-y-3 border-t">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">X-Axis Title</label>
                    <input
                      type="text"
                      value={layoutOverrides.xaxis.title.text}
                      onChange={(e) => updateLayoutOverride('xaxis.title.text', e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1"
                      placeholder="X-Axis Label"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Y-Axis Title</label>
                    <input
                      type="text"
                      value={layoutOverrides.yaxis.title.text}
                      onChange={(e) => updateLayoutOverride('yaxis.title.text', e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1"
                      placeholder="Y-Axis Label"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layoutOverrides.xaxis.showgrid}
                        onChange={(e) => updateLayoutOverride('xaxis.showgrid', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-gray-700">Show X Grid</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layoutOverrides.yaxis.showgrid}
                        onChange={(e) => updateLayoutOverride('yaxis.showgrid', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-gray-700">Show Y Grid</span>
                    </label>
                  </div>
                  {(layoutOverrides.xaxis.showgrid || layoutOverrides.yaxis.showgrid) && (
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Grid Color</label>
                      <input
                        type="color"
                        value={layoutOverrides.xaxis.gridcolor}
                        onChange={(e) => {
                          updateLayoutOverride('xaxis.gridcolor', e.target.value)
                          updateLayoutOverride('yaxis.gridcolor', e.target.value)
                        }}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                  )}
                  
                  {/* Axis Borders */}
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-gray-700 mb-2">Axis Borders</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={layoutOverrides.xaxis.showline}
                          onChange={(e) => updateLayoutOverride('xaxis.showline', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs text-gray-700">Show X-Axis Border</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={layoutOverrides.yaxis.showline}
                          onChange={(e) => updateLayoutOverride('yaxis.showline', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs text-gray-700">Show Y-Axis Border</span>
                      </label>
                    </div>
                    {(layoutOverrides.xaxis.showline || layoutOverrides.yaxis.showline) && (
                      <>
                        <div className="mt-2">
                          <label className="text-xs text-gray-600 block mb-1">Border Color</label>
                          <input
                            type="color"
                            value={layoutOverrides.xaxis.linecolor}
                            onChange={(e) => {
                              updateLayoutOverride('xaxis.linecolor', e.target.value)
                              updateLayoutOverride('yaxis.linecolor', e.target.value)
                            }}
                            className="w-full h-8 border rounded"
                          />
                        </div>
                        <div className="mt-2">
                          <label className="text-xs text-gray-600 block mb-1">Border Width</label>
                          <input
                            type="number"
                            value={layoutOverrides.xaxis.linewidth}
                            onChange={(e) => {
                              const width = Number(e.target.value) || 1
                              updateLayoutOverride('xaxis.linewidth', width)
                              updateLayoutOverride('yaxis.linewidth', width)
                            }}
                            className="w-full text-sm border rounded px-2 py-1"
                            min="1"
                            max="10"
                            step="1"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

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
          <div className="lg:flex-[0.4] min-h-[320px] p-4">
            {figure ? (
              <Plot
                ref={plotRef}
                data={figure.data}
                layout={figure.layout}
                config={figure.config}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                {error || 'Chart will appear here once ready.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChartEditorModal

