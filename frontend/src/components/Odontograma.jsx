import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

// ─── Constants ───────────────────────────────────────────────────────────────

const SURFACE_STATES = ['sano', 'caries', 'obturacion', 'sellante', 'fractura', 'corona']
const TOOTH_STATES = ['normal', 'ausente', 'extraccion', 'implante', 'protesis']

const SURFACE_COLORS = {
  sano:       { fill: '#2a2f3a', stroke: '#4a5568' },
  caries:     { fill: '#e53e3e', stroke: '#fc8181' },
  obturacion: { fill: '#3182ce', stroke: '#63b3ed' },
  sellante:   { fill: '#38a169', stroke: '#68d391' },
  fractura:   { fill: '#ed8936', stroke: '#fbd38d' },
  corona:     { fill: '#d69e2e', stroke: '#fefcbf' },
}

const SURFACE_LABELS = {
  sano: 'Sano',
  caries: 'Caries',
  obturacion: 'Obturación',
  sellante: 'Sellante',
  fractura: 'Fractura',
  corona: 'Corona',
}

const TOOTH_STATE_LABELS = {
  normal: 'Normal',
  ausente: 'Ausente',
  extraccion: 'Extracción Indicada',
  implante: 'Implante',
  protesis: 'Prótesis',
}

// Tooth numbering: FDI system
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]
const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38]
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41]

const ALL_TEETH = [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_LEFT, ...LOWER_RIGHT]

const SURFACES = ['vestibular', 'lingual', 'mesial', 'distal', 'oclusal']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createInitialState() {
  const state = {}
  ALL_TEETH.forEach(tooth => {
    state[tooth] = {
      toothState: 'normal',
      surfaces: {}
    }
    SURFACES.forEach(s => {
      state[tooth].surfaces[s] = 'sano'
    })
  })
  return state
}

// ─── Single Tooth SVG ────────────────────────────────────────────────────────

const TOOTH_SIZE = 44
const PADDING = 6
const CELL = TOOTH_SIZE + PADDING

function ToothSVG({ toothNum, toothData, onSurfaceClick, onToothContext, isUpper }) {
  const [hoveredSurface, setHoveredSurface] = useState(null)
  const { toothState, surfaces } = toothData
  
  const cx = TOOTH_SIZE / 2
  const cy = TOOTH_SIZE / 2
  const outer = TOOTH_SIZE / 2 - 1
  const inner = outer * 0.42

  // Surface path definitions using a cross-shaped inner region
  // Each surface is a trapezoid between outer edge and inner square
  const getSurfacePath = (surface) => {
    const o = outer
    const i = inner
    switch (surface) {
      case 'oclusal':
        return `M ${cx-i} ${cy-i} L ${cx+i} ${cy-i} L ${cx+i} ${cy+i} L ${cx-i} ${cy+i} Z`
      case 'vestibular': // top for upper, bottom for lower
        if (isUpper) {
          return `M ${cx-o} ${cy-o} L ${cx+o} ${cy-o} L ${cx+i} ${cy-i} L ${cx-i} ${cy-i} Z`
        } else {
          return `M ${cx-i} ${cy+i} L ${cx+i} ${cy+i} L ${cx+o} ${cy+o} L ${cx-o} ${cy+o} Z`
        }
      case 'lingual': // bottom for upper, top for lower
        if (isUpper) {
          return `M ${cx-i} ${cy+i} L ${cx+i} ${cy+i} L ${cx+o} ${cy+o} L ${cx-o} ${cy+o} Z`
        } else {
          return `M ${cx-o} ${cy-o} L ${cx+o} ${cy-o} L ${cx+i} ${cy-i} L ${cx-i} ${cy-i} Z`
        }
      case 'mesial': // left
        return `M ${cx-o} ${cy-o} L ${cx-i} ${cy-i} L ${cx-i} ${cy+i} L ${cx-o} ${cy+o} Z`
      case 'distal': // right
        return `M ${cx+i} ${cy-i} L ${cx+o} ${cy-o} L ${cx+o} ${cy+o} L ${cx+i} ${cy+i} Z`
      default:
        return ''
    }
  }

  const getSurfaceLabel = (surface) => {
    switch (surface) {
      case 'vestibular': return 'V'
      case 'lingual': return isUpper ? 'P' : 'L'
      case 'mesial': return 'M'
      case 'distal': return 'D'
      case 'oclusal': return 'O'
      default: return ''
    }
  }

  if (toothState === 'ausente') {
    return (
      <g onContextMenu={(e) => { e.preventDefault(); onToothContext(toothNum, e) }}>
        <rect x={0} y={0} width={TOOTH_SIZE} height={TOOTH_SIZE} rx={4} fill="transparent" />
        <line x1={6} y1={6} x2={TOOTH_SIZE - 6} y2={TOOTH_SIZE - 6} stroke="#718096" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={TOOTH_SIZE - 6} y1={6} x2={6} y2={TOOTH_SIZE - 6} stroke="#718096" strokeWidth={2.5} strokeLinecap="round" />
      </g>
    )
  }

  if (toothState === 'extraccion') {
    return (
      <g onContextMenu={(e) => { e.preventDefault(); onToothContext(toothNum, e) }}>
        {SURFACES.map(surface => (
          <path
            key={surface}
            d={getSurfacePath(surface)}
            fill={SURFACE_COLORS[surfaces[surface]].fill}
            stroke={SURFACE_COLORS[surfaces[surface]].stroke}
            strokeWidth={0.8}
            style={{ cursor: 'pointer', transition: 'fill 0.2s ease, stroke 0.2s ease' }}
            onClick={() => onSurfaceClick(toothNum, surface)}
            onMouseEnter={() => setHoveredSurface(surface)}
            onMouseLeave={() => setHoveredSurface(null)}
            opacity={hoveredSurface === surface ? 0.85 : 1}
          />
        ))}
        <line x1={8} y1={8} x2={TOOTH_SIZE - 8} y2={TOOTH_SIZE - 8} stroke="#e53e3e" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
        <line x1={TOOTH_SIZE - 8} y1={8} x2={8} y2={TOOTH_SIZE - 8} stroke="#e53e3e" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
      </g>
    )
  }

  const outlineColor = toothState === 'implante' ? '#9f7aea' : toothState === 'protesis' ? '#d69e2e' : null
  const outlineWidth = outlineColor ? 2.5 : 0

  return (
    <g onContextMenu={(e) => { e.preventDefault(); onToothContext(toothNum, e) }}>
      {SURFACES.map(surface => (
        <path
          key={surface}
          d={getSurfacePath(surface)}
          fill={SURFACE_COLORS[surfaces[surface]].fill}
          stroke={SURFACE_COLORS[surfaces[surface]].stroke}
          strokeWidth={0.8}
          style={{ cursor: 'pointer', transition: 'fill 0.25s ease, stroke 0.25s ease' }}
          onClick={() => onSurfaceClick(toothNum, surface)}
          onMouseEnter={() => setHoveredSurface(surface)}
          onMouseLeave={() => setHoveredSurface(null)}
          opacity={hoveredSurface === surface ? 0.8 : 1}
        />
      ))}
      {/* Surface micro-labels */}
      {SURFACES.map(surface => {
        let lx, ly
        const offset = (outer + inner) / 2
        switch (surface) {
          case 'oclusal': lx = cx; ly = cy; break
          case 'vestibular': lx = cx; ly = isUpper ? cy - offset : cy + offset; break
          case 'lingual': lx = cx; ly = isUpper ? cy + offset : cy - offset; break
          case 'mesial': lx = cx - offset; ly = cy; break
          case 'distal': lx = cx + offset; ly = cy; break
        }
        return (
          <text
            key={`label-${surface}`}
            x={lx} y={ly}
            textAnchor="middle"
            dominantBaseline="central"
            fill={surfaces[surface] === 'sano' ? '#718096' : '#fff'}
            fontSize={7}
            fontWeight={500}
            style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.25s ease' }}
          >
            {getSurfaceLabel(surface)}
          </text>
        )
      })}
      {/* Special outline for implante/protesis */}
      {outlineColor && (
        <circle
          cx={cx} cy={cy} r={outer - 1}
          fill="none"
          stroke={outlineColor}
          strokeWidth={outlineWidth}
          strokeDasharray={toothState === 'implante' ? '4 2' : 'none'}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Hover tooltip zone */}
      {hoveredSurface && (
        <title>{`Diente ${toothNum} - ${hoveredSurface.charAt(0).toUpperCase() + hoveredSurface.slice(1)}: ${SURFACE_LABELS[surfaces[hoveredSurface]]}`}</title>
      )}
    </g>
  )
}

// ─── Context Menu ────────────────────────────────────────────────────────────

function ContextMenu({ x, y, toothNum, currentState, onSelect, onClose }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] glass rounded-xl border border-white/10 shadow-2xl py-2 min-w-[200px]"
      style={{ left: x, top: y, animation: 'fadeInScale 0.15s ease-out' }}
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/5 mb-1">
        Diente {toothNum} — Estado
      </div>
      {TOOTH_STATES.map(state => (
        <button
          key={state}
          onClick={() => onSelect(state)}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center gap-2.5 ${
            currentState === state ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-200'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${
            state === 'normal' ? 'bg-zinc-500' :
            state === 'ausente' ? 'bg-zinc-600' :
            state === 'extraccion' ? 'bg-red-500' :
            state === 'implante' ? 'bg-purple-500' :
            'bg-yellow-500'
          }`} />
          {TOOTH_STATE_LABELS[state]}
          {currentState === state && <span className="ml-auto text-blue-400">✓</span>}
        </button>
      ))}
    </div>
  )
}

// ─── Main Odontograma Component ──────────────────────────────────────────────

const Odontograma = forwardRef(function Odontograma({ initialState, onChange }, ref) {
  const [teethState, setTeethState] = useState(() => {
    if (initialState && typeof initialState === 'object' && Object.keys(initialState).length > 0) {
      // Merge with defaults so any missing teeth/surfaces are filled
      const base = createInitialState()
      Object.keys(initialState).forEach(tooth => {
        if (base[tooth]) {
          base[tooth].toothState = initialState[tooth].toothState || 'normal'
          if (initialState[tooth].surfaces) {
            SURFACES.forEach(s => {
              if (initialState[tooth].surfaces[s]) {
                base[tooth].surfaces[s] = initialState[tooth].surfaces[s]
              }
            })
          }
        }
      })
      return base
    }
    return createInitialState()
  })

  const [contextMenu, setContextMenu] = useState(null)

  // Expose getState to parent
  useImperativeHandle(ref, () => ({
    getState: () => teethState,
  }))

  // Notify parent of changes
  useEffect(() => {
    onChange?.(teethState)
  }, [teethState])

  const handleSurfaceClick = useCallback((toothNum, surface) => {
    setTeethState(prev => {
      const tooth = prev[toothNum]
      const currentIdx = SURFACE_STATES.indexOf(tooth.surfaces[surface])
      const nextIdx = (currentIdx + 1) % SURFACE_STATES.length
      return {
        ...prev,
        [toothNum]: {
          ...tooth,
          surfaces: {
            ...tooth.surfaces,
            [surface]: SURFACE_STATES[nextIdx]
          }
        }
      }
    })
  }, [])

  const handleToothContext = useCallback((toothNum, event) => {
    setContextMenu({
      toothNum,
      x: event.clientX,
      y: event.clientY,
    })
  }, [])

  const handleToothStateChange = useCallback((state) => {
    if (!contextMenu) return
    const toothNum = contextMenu.toothNum
    setTeethState(prev => ({
      ...prev,
      [toothNum]: {
        ...prev[toothNum],
        toothState: state,
      }
    }))
    setContextMenu(null)
  }, [contextMenu])

  const renderRow = (teeth, isUpper, label) => {
    const archWidth = teeth.length * CELL + PADDING
    return (
      <div className="flex flex-col items-center">
        {/* Arch label */}
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/20" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/20" />
        </div>
        {/* Tooth numbers */}
        <div className="flex" style={{ gap: PADDING }}>
          {teeth.map((t, i) => (
            <div key={t} className="flex flex-col items-center" style={{ width: TOOTH_SIZE }}>
              {isUpper && (
                <span className={`text-[10px] font-mono mb-1 transition-colors ${
                  teethState[t]?.toothState !== 'normal' ? 'text-yellow-400 font-bold' : 'text-zinc-500'
                }`}>{t}</span>
              )}
            </div>
          ))}
        </div>
        {/* Teeth SVG */}
        <svg
          width={archWidth}
          height={TOOTH_SIZE + 4}
          viewBox={`0 0 ${archWidth} ${TOOTH_SIZE + 4}`}
          className="drop-shadow-lg"
        >
          {/* Subtle glow behind teeth */}
          <defs>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {teeth.map((t, i) => (
            <g key={t} transform={`translate(${i * CELL + PADDING / 2}, 2)`}>
              <ToothSVG
                toothNum={t}
                toothData={teethState[t]}
                onSurfaceClick={handleSurfaceClick}
                onToothContext={handleToothContext}
                isUpper={isUpper}
              />
            </g>
          ))}
          {/* Center divider line */}
          <line
            x1={archWidth / 2}
            y1={0}
            x2={archWidth / 2}
            y2={TOOTH_SIZE + 4}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </svg>
        {/* Bottom tooth numbers */}
        <div className="flex" style={{ gap: PADDING }}>
          {teeth.map((t) => (
            <div key={t} className="flex flex-col items-center" style={{ width: TOOTH_SIZE }}>
              {!isUpper && (
                <span className={`text-[10px] font-mono mt-1 transition-colors ${
                  teethState[t]?.toothState !== 'normal' ? 'text-yellow-400 font-bold' : 'text-zinc-500'
                }`}>{t}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Dental Arch */}
      <div className="flex flex-col items-center gap-1">
        {/* Upper Arch */}
        <div className="flex items-end gap-0">
          {renderRow(UPPER_RIGHT, true, 'Superior Derecho')}
          <div className="w-px h-12 bg-gradient-to-b from-white/10 to-transparent mx-1" />
          {renderRow(UPPER_LEFT, true, 'Superior Izquierdo')}
        </div>

        {/* Arch Separator */}
        <div className="w-full flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Línea Oclusal</span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>

        {/* Lower Arch */}
        <div className="flex items-start gap-0">
          {renderRow(LOWER_LEFT, false, 'Inferior Izquierdo')}
          <div className="w-px h-12 bg-gradient-to-t from-white/10 to-transparent mx-1" />
          {renderRow(LOWER_RIGHT, false, 'Inferior Derecho')}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          toothNum={contextMenu.toothNum}
          currentState={teethState[contextMenu.toothNum]?.toothState}
          onSelect={handleToothStateChange}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Inline animation style */}
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
})

export default Odontograma
export { createInitialState, SURFACE_COLORS, SURFACE_LABELS, TOOTH_STATE_LABELS, TOOTH_STATES }
