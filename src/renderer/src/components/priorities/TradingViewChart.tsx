import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { createChart, ColorType, CrosshairMode, LineStyle, IChartApi, ISeriesApi } from 'lightweight-charts'
import { cn } from '@/lib/utils'
import type { OHLCVCandle } from '@/hooks/useOHLCV'
import type { TradeSignal } from './AITradeSignals'
import { type HighlightTarget } from './ChartTutorial'

// ─── Helpers ────────────────────────────────────────────────────────────────
export const toChartTime = (time: string | number): number => Math.floor(new Date(time).getTime() / 1000)

export function calcSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    let sum = 0
    for (let j = 0; j < period; j++) sum += data[i - j]
    result.push(sum / period)
  }
  return result
}

export function calcEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const k = 2 / (period + 1)
  let ema: number | null = null
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    if (ema === null) {
      let sum = 0
      for (let j = 0; j < period; j++) sum += data[i - j]
      ema = sum / period
    } else {
      ema = data[i] * k + ema * (1 - k)
    }
    result.push(ema)
  }
  return result
}

export function calcRSI(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = []
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1]
    if (diff > 0) gains += diff; else losses -= diff
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  for (let i = 0; i < data.length; i++) {
    if (i <= period) { result.push(null); continue }
    const diff = data[i] - data[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs))
  }
  return result
}

export function calcBollinger(data: number[], period = 20, stdDev = 2): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const sma = calcSMA(data, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { upper.push(null); lower.push(null); continue }
    let sumSq = 0
    for (let j = 0; j < period; j++) {
      const diff = data[i - j] - (sma[i] as number)
      sumSq += diff * diff
    }
    const sd = Math.sqrt(sumSq / period)
    upper.push((sma[i] as number) + stdDev * sd)
    lower.push((sma[i] as number) - stdDev * sd)
  }
  return { upper, middle: sma, lower }
}

export function calcMACD(data: number[], fast = 12, slow = 26, signal = 9): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const emaFast = calcEMA(data, fast).map(v => v ?? 0)
  const emaSlow = calcEMA(data, slow).map(v => v ?? 0)
  const macdLine = emaFast.map((v, i) => (i < slow - 1 ? null : v - emaSlow[i]))
  const validMacd = macdLine.filter((v): v is number => v !== null)
  const signalEma = calcEMA(validMacd, signal)
  const signalLine: (number | null)[] = Array(slow - 1).fill(null).concat(signalEma)
  const histogram = macdLine.map((v, i) => (v === null || signalLine[i] === null ? null : v - (signalLine[i] as number)))
  return { macd: macdLine, signal: signalLine, histogram }
}

function calcHeikinAshi(data: OHLCVCandle[]): OHLCVCandle[] {
  const result: OHLCVCandle[] = []
  for (let i = 0; i < data.length; i++) {
    const close = (data[i].open + data[i].high + data[i].low + data[i].close) / 4
    const open = i === 0 ? (data[i].open + data[i].close) / 2 : (result[i - 1].open + result[i - 1].close) / 2
    const high = Math.max(data[i].high, open, close)
    const low = Math.min(data[i].low, open, close)
    result.push({ ...data[i], open, high, low, close })
  }
  return result
}

// ─── Types ──────────────────────────────────────────────────────────────────
export type AdvancedChartType = 'candlestick' | 'line' | 'bar' | 'area' | 'heikin-ashi'

export interface ChartViewHandle {
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
}

interface LightweightChartViewProps {
  data: OHLCVCandle[]
  theme: 'dark' | 'light'
  livePrice?: number | null
  signals?: TradeSignal[]
  pinnedSignals?: TradeSignal[]
  supportLevels?: number[]
  resistanceLevels?: number[]
  fillHeight?: boolean
  showSma: boolean
  showEma: boolean
  showBollinger: boolean
  chartType: AdvancedChartType
  tutorialHighlight?: HighlightTarget | null
}

// ─── Main Chart Component ───────────────────────────────────────────────────
export const LightweightChartView = forwardRef<ChartViewHandle, LightweightChartViewProps>(function LightweightChartView({
  data,
  theme,
  livePrice,
  signals,
  pinnedSignals = [],
  supportLevels,
  resistanceLevels,
  fillHeight,
  showSma,
  showEma,
  showBollinger,
  chartType,
  tutorialHighlight,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<{
    main?: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | ISeriesApi<'Histogram'>
    volume?: ISeriesApi<'Histogram'>
    sma?: ISeriesApi<'Line'>
    ema?: ISeriesApi<'Line'>
    bbUpper?: ISeriesApi<'Line'>
    bbLower?: ISeriesApi<'Line'>
    livePriceLine?: ReturnType<ISeriesApi<any>['createPriceLine']>
    priceLines: ReturnType<ISeriesApi<any>['createPriceLine']>[]
  }>({ priceLines: [] })

  // Expose zoom methods via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (!chartRef.current) return
      const range = chartRef.current.timeScale().getVisibleLogicalRange()
      if (!range) return
      const center = (range.from + range.to) / 2
      const halfSpan = (range.to - range.from) / 2 / 1.25
      chartRef.current.timeScale().setVisibleLogicalRange({ from: center - halfSpan, to: center + halfSpan })
    },
    zoomOut: () => {
      if (!chartRef.current) return
      const range = chartRef.current.timeScale().getVisibleLogicalRange()
      if (!range) return
      const center = (range.from + range.to) / 2
      const halfSpan = (range.to - range.from) / 2 * 1.25
      chartRef.current.timeScale().setVisibleLogicalRange({ from: center - halfSpan, to: center + halfSpan })
    },
    zoomReset: () => {
      chartRef.current?.timeScale().fitContent()
    },
  }))

  // Create/destroy chart when chartType or theme changes
  useEffect(() => {
    if (!containerRef.current) return
    const isDark = theme === 'dark'

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0f172a' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#64748b',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
        horzLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: isDark ? '#475569' : '#94a3b8',
          width: 0.5,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#1e293b' : '#ffffff',
        },
        horzLine: {
          color: isDark ? '#475569' : '#94a3b8',
          width: 0.5,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#1e293b' : '#ffffff',
        },
      },
      rightPriceScale: {
        borderColor: isDark ? '#334155' : '#e2e8f0',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: isDark ? '#334155' : '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    })
    chartRef.current = chart

    // Main series based on chart type
    let mainSeries
    switch (chartType) {
      case 'candlestick':
      case 'heikin-ashi':
        mainSeries = chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        })
        break
      case 'line':
        mainSeries = chart.addLineSeries({ color: '#60a5fa', lineWidth: 2 })
        break
      case 'area':
        mainSeries = chart.addAreaSeries({
          lineColor: '#60a5fa',
          topColor: 'rgba(96, 165, 250, 0.3)',
          bottomColor: 'rgba(96, 165, 250, 0)',
          lineWidth: 2,
        })
        break
      case 'bar':
        mainSeries = chart.addHistogramSeries({
          color: '#60a5fa',
          priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
        })
        break
    }

    // Volume histogram at bottom
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    // Indicator line series
    const smaSeries = showSma ? chart.addLineSeries({
      color: '#fbbf24', lineWidth: 1.5, title: 'SMA 20',
    }) : undefined
    const emaSeries = showEma ? chart.addLineSeries({
      color: '#a78bfa', lineWidth: 1.5, title: 'EMA 20',
    }) : undefined
    const bbUpperSeries = showBollinger ? chart.addLineSeries({
      color: '#34d399', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Upper',
    }) : undefined
    const bbLowerSeries = showBollinger ? chart.addLineSeries({
      color: '#34d399', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Lower',
    }) : undefined

    seriesRef.current = {
      main: mainSeries,
      volume: volumeSeries,
      sma: smaSeries,
      ema: emaSeries,
      bbUpper: bbUpperSeries,
      bbLower: bbLowerSeries,
      priceLines: [],
    }

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = { priceLines: [] }
    }
  }, [chartType, theme, showSma, showEma, showBollinger])

  // Update data, indicators, overlays
  useEffect(() => {
    const chart = chartRef.current
    const s = seriesRef.current
    if (!chart || !s.main) return

    const processedData = chartType === 'heikin-ashi' ? calcHeikinAshi(data) : data

    // Main series data
    if (chartType === 'candlestick' || chartType === 'heikin-ashi') {
      const candleData = processedData.map(d => ({
        time: toChartTime(d.time),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
      ;(s.main as ISeriesApi<'Candlestick'>).setData(candleData)
    } else if (chartType === 'line' || chartType === 'area') {
      const lineData = processedData.map(d => ({
        time: toChartTime(d.time),
        value: d.close,
      }))
      ;(s.main as ISeriesApi<'Line'> | ISeriesApi<'Area'>).setData(lineData)
    } else if (chartType === 'bar') {
      const barData = processedData.map(d => ({
        time: toChartTime(d.time),
        value: d.close,
        color: d.close >= d.open ? '#22c55e' : '#ef4444',
      }))
      ;(s.main as ISeriesApi<'Histogram'>).setData(barData)
    }

    // Volume
    const volumeData = processedData.map(d => ({
      time: toChartTime(d.time),
      value: d.volume,
      color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
    }))
    s.volume?.setData(volumeData)

    // Update last candle with live price
    if (livePrice !== null && processedData.length > 0) {
      const last = processedData[processedData.length - 1]
      const time = toChartTime(last.time)
      if (chartType === 'candlestick' || chartType === 'heikin-ashi') {
        ;(s.main as ISeriesApi<'Candlestick'>).update({
          time,
          open: last.open,
          high: Math.max(last.high, livePrice),
          low: Math.min(last.low, livePrice),
          close: livePrice,
        })
      } else if (chartType === 'line' || chartType === 'area') {
        ;(s.main as ISeriesApi<'Line'>).update({ time, value: livePrice })
      } else if (chartType === 'bar') {
        ;(s.main as ISeriesApi<'Histogram'>).update({
          time,
          value: livePrice,
          color: livePrice >= last.open ? '#22c55e' : '#ef4444',
        })
      }
    }

    // Live price line
    if (livePrice !== null) {
      if (s.livePriceLine) {
        s.livePriceLine.applyOptions({ price: livePrice, title: `LIVE ${livePrice.toFixed(2)}` })
      } else {
        s.livePriceLine = s.main.createPriceLine({
          price: livePrice,
          color: '#3b82f6',
          lineWidth: 1.5,
          lineStyle: LineStyle.Dashed,
          title: `LIVE ${livePrice.toFixed(2)}`,
        })
      }
    } else if (s.livePriceLine) {
      s.main?.removePriceLine(s.livePriceLine)
      s.livePriceLine = undefined
    }

    // Indicators
    const closes = processedData.map(d => d.close)
    const times = processedData.map(d => toChartTime(d.time))

    if (s.sma) {
      const sma = calcSMA(closes, 20)
      s.sma.setData(sma.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as any)
    }
    if (s.ema) {
      const ema = calcEMA(closes, 20)
      s.ema.setData(ema.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as any)
    }
    if (s.bbUpper && s.bbLower) {
      const bb = calcBollinger(closes, 20, 2)
      s.bbUpper.setData(bb.upper.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as any)
      s.bbLower.setData(bb.lower.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as any)
    }

    // Clear old price lines
    s.priceLines.forEach(pl => s.main?.removePriceLine(pl))
    s.priceLines = []

    // Signal overlays
    signals?.forEach(sig => {
      s.priceLines.push(s.main!.createPriceLine({
        price: sig.entry_price,
        color: sig.direction === 'long' ? '#16a34a' : '#dc2626',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: `ENTRY ${sig.entry_price.toFixed(2)}`,
      }))
      sig.take_profits.forEach(tp => {
        s.priceLines.push(s.main!.createPriceLine({
          price: tp.price,
          color: '#22c55e',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          title: `TP ${tp.price.toFixed(2)}`,
        }))
      })
      s.priceLines.push(s.main!.createPriceLine({
        price: sig.stop_loss,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        title: `SL ${sig.stop_loss.toFixed(2)}`,
      }))
    })

    // Pinned alerts
    pinnedSignals.forEach(sig => {
      s.priceLines.push(s.main!.createPriceLine({
        price: sig.entry_price,
        color: sig.direction === 'long' ? '#22c55e' : '#ef4444',
        lineWidth: 2.5,
        lineStyle: LineStyle.Solid,
        title: `ALERT ENTRY ${sig.entry_price.toFixed(2)}`,
      }))
      s.priceLines.push(s.main!.createPriceLine({
        price: sig.stop_loss,
        color: '#dc2626',
        lineWidth: 2.5,
        lineStyle: LineStyle.Solid,
        title: `ALERT SL ${sig.stop_loss.toFixed(2)}`,
      }))
    })

    // Support/Resistance
    supportLevels?.forEach((sl, i) => {
      s.priceLines.push(s.main!.createPriceLine({
        price: sl,
        color: '#60a5fa',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: `S${i + 1}`,
      }))
    })
    resistanceLevels?.forEach((rl, i) => {
      s.priceLines.push(s.main!.createPriceLine({
        price: rl,
        color: '#f97316',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: `R${i + 1}`,
      }))
    })
  }, [data, livePrice, signals, pinnedSignals, supportLevels, resistanceLevels, chartType, showSma, showEma, showBollinger])

  // ─── Tutorial Overlay ─────────────────────────────────────────────────────
  const [overlay, setOverlay] = useState<{
    w: number
    h: number
    items: Array<{
      type: string
      x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number
      rx?: number; ry?: number
      label?: string; color?: string; width?: number; height?: number
    }>
  } | null>(null)

  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current.main
    const container = containerRef.current
    if (!chart || !series || !container || !tutorialHighlight) {
      setOverlay(null)
      return
    }

    const compute = () => {
      const rect = container.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const ts = chart.timeScale()

      const items: Array<{
        type: string
        x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number
        rx?: number; ry?: number
        label?: string; color?: string; width?: number; height?: number
      }> = []

      switch (tutorialHighlight.type) {
        case 'candle': {
          const idx = tutorialHighlight.index
          if (idx >= 0 && idx < data.length) {
            const d = data[idx]
            const x = ts.timeToCoordinate(toChartTime(d.time) as any)
            const yHigh = series.priceToCoordinate(d.high)
            const yLow = series.priceToCoordinate(d.low)
            if (x !== null && yHigh !== null && yLow !== null) {
              items.push({
                type: 'ellipse', x, y: (yHigh + yLow) / 2,
                rx: 16, ry: Math.max(Math.abs(yLow - yHigh) / 2 + 12, 18),
                label: tutorialHighlight.label,
              })
            }
          }
          break
        }
        case 'price-level': {
          const y = series.priceToCoordinate(tutorialHighlight.price)
          if (y !== null) {
            items.push({
              type: 'hline', y,
              label: tutorialHighlight.label || tutorialHighlight.price.toFixed(2),
              color: '#f59e0b',
            })
          }
          break
        }
        case 'live-price': {
          const price = livePrice ?? data[data.length - 1]?.close ?? 0
          const y = series.priceToCoordinate(price)
          if (y !== null) {
            items.push({
              type: 'hline', y,
              label: tutorialHighlight.label || `Live: ${price.toFixed(2)}`,
              color: '#10b981',
            })
          }
          break
        }
        case 'pattern': {
          const si = Math.max(0, tutorialHighlight.startIndex)
          const ei = Math.min(data.length - 1, tutorialHighlight.endIndex)
          const x1c = ts.timeToCoordinate(toChartTime(data[si].time) as any)
          const x2c = ts.timeToCoordinate(toChartTime(data[ei].time) as any)
          const highs = data.slice(si, ei + 1).map(d => d.high)
          const lows = data.slice(si, ei + 1).map(d => d.low)
          const y1c = series.priceToCoordinate(Math.max(...highs))
          const y2c = series.priceToCoordinate(Math.min(...lows))
          if (x1c !== null && x2c !== null && y1c !== null && y2c !== null) {
            items.push({
              type: 'rect',
              x1: x1c - 10, y1: y1c - 10,
              x2: x2c + 10, y2: y2c + 10,
              label: tutorialHighlight.label || tutorialHighlight.pattern,
            })
          }
          break
        }
        case 'trade-example': {
          const { entryPrice, stopLoss, takeProfit, direction } = tutorialHighlight
          const entryY = series.priceToCoordinate(entryPrice)
          const slY = series.priceToCoordinate(stopLoss)
          const tpY = series.priceToCoordinate(takeProfit)
          const isLong = direction === 'long'
          const color = isLong ? '#22c55e' : '#ef4444'
          if (entryY !== null) items.push({ type: 'hline', y: entryY, label: `ENTRY ${entryPrice.toFixed(2)}`, color })
          if (slY !== null) items.push({ type: 'hline', y: slY, label: `SL ${stopLoss.toFixed(2)}`, color: '#dc2626' })
          if (tpY !== null) items.push({ type: 'hline', y: tpY, label: `TP ${takeProfit.toFixed(2)}`, color: '#2563eb' })
          if (entryY !== null && tpY !== null) {
            items.push({ type: 'zone', y1: Math.min(entryY, tpY), y2: Math.max(entryY, tpY), color: isLong ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)' })
          }
          if (entryY !== null && slY !== null) {
            items.push({ type: 'zone', y1: Math.min(entryY, slY), y2: Math.max(entryY, slY), color: 'rgba(220,38,38,0.06)' })
          }
          break
        }
        case 'indicator': {
          items.push({ type: 'label', x: w / 2, y: 20, label: tutorialHighlight.label || tutorialHighlight.name })
          break
        }
        case 'region': {
          items.push({
            type: 'rect',
            x1: tutorialHighlight.x1, y1: tutorialHighlight.y1,
            x2: tutorialHighlight.x2, y2: tutorialHighlight.y2,
            label: tutorialHighlight.label,
          })
          break
        }
      }

      setOverlay({ w, h, items })
    }

    compute()
    const handleChange = () => requestAnimationFrame(compute)
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleChange)
    chart.subscribeCrosshairMove(handleChange)

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleChange)
      chart.unsubscribeCrosshairMove(handleChange)
    }
  }, [tutorialHighlight, data, livePrice])

  return (
    <div
      ref={containerRef}
      className={cn('w-full relative', fillHeight && 'h-full')}
      style={{ height: fillHeight ? '100%' : 280 }}
    >
      {overlay && (
        <svg
          className="absolute inset-0 pointer-events-none z-10 overflow-visible"
          width={overlay.w}
          height={overlay.h}
        >
          {overlay.items.map((item, i) => {
            switch (item.type) {
              case 'ellipse':
                return (
                  <g key={i}>
                    <ellipse
                      cx={item.x} cy={item.y} rx={item.rx} ry={item.ry}
                      fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" opacity={0.9}
                    />
                    <circle cx={item.x} cy={item.y} r={3} fill="#f59e0b" />
                    {item.label && (
                      <g>
                        <rect x={(item.x || 0) + 10} y={(item.y || 0) - (item.ry || 0) - 22} width={120} height={18} rx={4} fill="#f59e0b" opacity={0.95} />
                        <text x={(item.x || 0) + 16} y={(item.y || 0) - (item.ry || 0) - 10} fill="#1f2937" fontSize={9} fontWeight="bold">{item.label}</text>
                      </g>
                    )}
                  </g>
                )
              case 'hline':
                return (
                  <g key={i}>
                    <line x1={0} y1={item.y} x2={overlay.w} y2={item.y} stroke={item.color || '#f59e0b'} strokeWidth={2.5} strokeDasharray="6 3" opacity={0.85} />
                    <rect x={4} y={(item.y || 0) - 20} width={140} height={18} rx={4} fill={item.color || '#f59e0b'} opacity={0.95} />
                    <text x={8} y={(item.y || 0) - 8} fill="#ffffff" fontSize={9} fontWeight="bold">{item.label}</text>
                  </g>
                )
              case 'rect':
                return (
                  <g key={i}>
                    <rect
                      x={item.x1} y={item.y1}
                      width={(item.x2 || 0) - (item.x1 || 0)}
                      height={(item.y2 || 0) - (item.y1 || 0)}
                      fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" rx={6} opacity={0.9}
                    />
                    {item.label && (
                      <>
                        <rect x={item.x1} y={(item.y1 || 0) - 20} width={140} height={18} rx={4} fill="#f59e0b" opacity={0.95} />
                        <text x={(item.x1 || 0) + 6} y={(item.y1 || 0) - 8} fill="#1f2937" fontSize={9} fontWeight="bold">{item.label}</text>
                      </>
                    )}
                  </g>
                )
              case 'zone':
                return (
                  <rect
                    key={i} x={0} y={item.y1}
                    width={overlay.w} height={(item.y2 || 0) - (item.y1 || 0)}
                    fill={item.color}
                  />
                )
              case 'label':
                return (
                  <g key={i}>
                    <rect x={(item.x || 0) - 70} y={(item.y || 0) - 9} width={140} height={18} rx={4} fill="#f59e0b" opacity={0.95} />
                    <text x={item.x} y={(item.y || 0) + 3} textAnchor="middle" fill="#1f2937" fontSize={9} fontWeight="bold">{item.label}</text>
                  </g>
                )
              default:
                return null
            }
          })}
        </svg>
      )}
    </div>
  )
})
