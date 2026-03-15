'use client'

/**
 * WheelPicker — iOS-style vertical scroll-snap picker.
 * Scroll to select; opacity fades items away from center.
 * Selected item: 18px bold. ±1: 60%, ±2: 30%, ±3+: 15%.
 */

import { useRef, useEffect, useCallback, useState } from 'react'

interface WheelPickerProps {
  items:       (string | number)[]
  value:       string | number
  onChange:    (val: string | number) => void
  itemHeight?: number
  width?:      number | string
  label?:      string   // optional unit label shown below
}

const SIDE = 2  // items visible above/below center
const OPACITIES   = [1, 0.6, 0.3, 0.15] as const
const FONT_SIZES  = [18, 15, 14, 13]     as const
const FONT_WEIGHTS= ['700', '400', '400', '400'] as const

export default function WheelPicker({
  items,
  value,
  onChange,
  itemHeight = 44,
  width = 80,
  label,
}: WheelPickerProps) {
  const listRef    = useRef<HTMLDivElement>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout>>()
  const [visualIdx, setVisualIdx] = useState(() =>
    Math.max(0, items.indexOf(value)),
  )
  const visibleH = (SIDE * 2 + 1) * itemHeight

  // Scroll to a given index
  const scrollTo = useCallback(
    (idx: number, behavior: ScrollBehavior = 'smooth') => {
      listRef.current?.scrollTo({ top: idx * itemHeight, behavior })
    },
    [itemHeight],
  )

  // Sync on mount (instant)
  useEffect(() => {
    const idx = Math.max(0, items.indexOf(value))
    scrollTo(idx, 'instant' as ScrollBehavior)
    setVisualIdx(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync when value changes from outside
  useEffect(() => {
    const idx = items.indexOf(value)
    if (idx >= 0) {
      setVisualIdx(idx)
      scrollTo(idx, 'smooth')
    }
  }, [value, items, scrollTo])

  const handleScroll = useCallback(() => {
    if (!listRef.current) return
    const raw = listRef.current.scrollTop / itemHeight
    const near = Math.max(0, Math.min(Math.round(raw), items.length - 1))
    setVisualIdx(near)

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!listRef.current) return
      const settled = Math.max(
        0,
        Math.min(
          Math.round(listRef.current.scrollTop / itemHeight),
          items.length - 1,
        ),
      )
      scrollTo(settled, 'smooth')
      if (items[settled] !== value) onChange(items[settled])
    }, 150)
  }, [itemHeight, items, onChange, scrollTo, value])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width, height: visibleH, overflow: 'hidden' }}>

        {/* Centre highlight */}
        <div style={{
          position: 'absolute', top: SIDE * itemHeight, left: 4, right: 4,
          height: itemHeight, background: '#F0F0F0', borderRadius: 8,
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Top fade */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: SIDE * itemHeight,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), transparent)',
          pointerEvents: 'none', zIndex: 3,
        }} />

        {/* Bottom fade */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: SIDE * itemHeight,
          background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)',
          pointerEvents: 'none', zIndex: 3,
        }} />

        {/* Scrollable list */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          style={{
            height:                 visibleH,
            overflowY:              'scroll',
            scrollSnapType:         'y mandatory',
            scrollbarWidth:         'none',
            WebkitOverflowScrolling:'touch',
            paddingTop:             SIDE * itemHeight,
            paddingBottom:          SIDE * itemHeight,
            position:               'relative',
            zIndex:                 2,
            boxSizing:              'content-box',
          } as React.CSSProperties}
        >
          {items.map((item, idx) => {
            const dist = Math.min(Math.abs(idx - visualIdx), 3)
            return (
              <div
                key={idx}
                onClick={() => { onChange(item); scrollTo(idx) }}
                style={{
                  height:          itemHeight,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  scrollSnapAlign: 'center',
                  fontSize:        FONT_SIZES[dist],
                  fontWeight:      FONT_WEIGHTS[dist],
                  opacity:         OPACITIES[dist],
                  cursor:          'pointer',
                  color:           '#1A1A1A',
                  fontFamily:      'var(--font-dm-sans)',
                  userSelect:      'none',
                  transition:      'opacity 0.1s, font-size 0.1s',
                }}
              >
                {item}
              </div>
            )
          })}
        </div>
      </div>

      {label && (
        <span style={{ fontSize: 12, color: '#9A9A9A', fontFamily: 'var(--font-dm-sans)' }}>
          {label}
        </span>
      )}
    </div>
  )
}
