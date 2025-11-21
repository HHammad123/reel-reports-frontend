import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import Plot from 'react-plotly.js'
import { FaTimes } from 'react-icons/fa'

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
  const plotRef = useRef(null)
  const sceneNumber = sceneData?.scene_number || sceneData?.sceneNumber
  const chartTitle = sceneData?.chart_title || sceneData?.scene_title || 'Chart'

  const rebuildEditorStateFromScene = useCallback(() => {
    if (!sceneData) return
    const nextType = (sceneData?.chart_type || sceneData?.chartType || 'unknown').toLowerCase()
    const parsedData = safeParseJSON(sceneData?.chart_data ?? sceneData?.chartData ?? {}, {})
    const targets = computeColorTargets(nextType, parsedData)
    setChartTypeState(nextType)
    setChartDataState(parsedData)
    setSeriesColorOverrides(extractInitialColorOverrides(sceneData, targets))
    setRawChartDataInput(JSON.stringify(parsedData, null, 2))
    setRawChartError('')
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

  const handleColorOverrideChange = useCallback((target, color) => {
    setSeriesColorOverrides((prev) => ({
      ...prev,
      [target]: color
    }))
  }, [])

  const handleChartTypeChange = (event) => {
    setChartTypeState(event.target.value)
  }

  const handleRawChartDataInputChange = (event) => {
    setRawChartDataInput(event.target.value)
  }

  const handleApplyRawChartData = useCallback(() => {
    try {
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
    } catch (err) {
      setRawChartError(err?.message || 'Invalid chart_data JSON')
    }
  }, [chartTypeState, rawChartDataInput, sceneData])

  const handleResetEditor = useCallback(() => {
    rebuildEditorStateFromScene()
  }, [rebuildEditorStateFromScene])

  const colorControlsVisible = colorTargets.length > 0

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
  }, [sceneData, chartTypeState, chartDataState, seriesColorOverrides])

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
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
            aria-label="Close chart editor"
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="lg:flex-[1.2] min-h-[320px] p-4">
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
          <aside className="w-full lg:w-[560px] border-t lg:border-l border-gray-200 p-6 overflow-y-auto bg-gray-50 space-y-4">
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
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Use the Plotly toolbar to drag, annotate, draw, and zoom. The JSON editor gives you full control over
              the chart data payload.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default ChartEditorModal

