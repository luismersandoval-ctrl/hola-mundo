import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

// ─── Constants ───────────────────────────────────────────────────────────────

const SURFACE_STATES = ['sano', 'caries', 'obturacion', 'sellante', 'fractura']
const TOOTH_STATES = ['normal', 'ausente', 'extraccion', 'implante_indicado', 'implante_existente', 'protesis', 'endodonciado', 'conducto_pendiente']
const ENDODONTIC_STATES = ['endodonciado', 'conducto_pendiente']
const IMPLANT_STATES = ['implante_indicado', 'implante_existente']

const SURFACE_COLORS = {
  sano:       { fill: '#ffffff', stroke: '#94a3b8' },
  caries:     { fill: '#e53e3e', stroke: '#fc8181' },
  obturacion: { fill: '#3182ce', stroke: '#63b3ed' },
  sellante:   { fill: '#38a169', stroke: '#68d391' },
  fractura:   { fill: '#3182ce', stroke: '#ef4444' },
}

const SURFACE_LABELS = {
  sano: 'Sano',
  caries: 'Caries',
  obturacion: 'Restauración en buen estado',
  sellante: 'Sellante',
  fractura: 'Restauración defectuosa',
}

const TOOTH_STATE_LABELS = {
  normal: 'Normal',
  ausente: 'Ausente',
  extraccion: 'Extracción Indicada',
  implante_indicado: 'Implante indicado',
  implante_existente: 'Implante existente',
  protesis: 'Corona',
  endodonciado: 'Endodoncia realizada',
  conducto_pendiente: 'Endodoncia por realizar',
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
      endodonticState: 'none',
      implantState: 'none',
      hasCrown: false,
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

function ToothSVG({ toothNum, toothData, onSurfaceClick, onToothSelect, onToothContext, isUpper }) {
  const [hoveredSurface, setHoveredSurface] = useState(null)
  const { toothState, surfaces, endodonticState = 'none', implantState = 'none', hasCrown = false } = toothData
  
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
      <g onClick={() => onToothSelect(toothNum)} onContextMenu={(e) => { e.preventDefault(); onToothContext(toothNum, e) }} style={{ cursor: 'pointer' }}>
        <rect x={0} y={0} width={TOOTH_SIZE} height={TOOTH_SIZE} rx={4} fill="transparent" stroke="transparent" />
        <line x1={6} y1={6} x2={TOOTH_SIZE - 6} y2={TOOTH_SIZE - 6} stroke="#2563eb" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={TOOTH_SIZE - 6} y1={6} x2={6} y2={TOOTH_SIZE - 6} stroke="#2563eb" strokeWidth={2.5} strokeLinecap="round" />
        {implantState !== 'none' && <text x={TOOTH_SIZE/2} y={TOOTH_SIZE/2+1} textAnchor="middle" dominantBaseline="central" fill={implantState==='implante_indicado'?'#dc2626':'#2563eb'} stroke="#ffffff" strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={800} style={{pointerEvents:'none'}}>IMP</text>}
        {hasCrown && <circle cx={TOOTH_SIZE/2} cy={TOOTH_SIZE/2} r={TOOTH_SIZE/2-5} fill="none" stroke="#d69e2e" strokeWidth={2.5} style={{pointerEvents:'none'}} />}
        <title>{`Diente ${toothNum} ausente — haz clic para seleccionarlo`}</title>
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
            strokeWidth={surfaces[surface] === 'fractura' ? 2 : 0.8}
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

  const crownVisible = hasCrown || toothState === 'protesis'

  return (
    <g onContextMenu={(e) => { e.preventDefault(); onToothContext(toothNum, e) }}>
      {SURFACES.map(surface => (
        <path
          key={surface}
          d={getSurfacePath(surface)}
          fill={SURFACE_COLORS[surfaces[surface]].fill}
          stroke={SURFACE_COLORS[surfaces[surface]].stroke}
          strokeWidth={surfaces[surface] === 'fractura' ? 2 : 0.8}
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
      {/* Crown is independent and may be combined with endodontic states. */}
      {crownVisible && (
        <circle
          cx={cx} cy={cy} r={outer - 5}
          fill="none"
          stroke="#d69e2e"
          strokeWidth={2.5}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Endodontic treatment marker */}
      {(endodonticState === 'endodonciado' || endodonticState === 'conducto_pendiente') && (
        <line
          x1={cx}
          y1={5}
          x2={cx}
          y2={TOOTH_SIZE - 5}
          stroke={endodonticState === 'endodonciado' ? '#2563eb' : '#dc2626'}
          strokeWidth={3.5}
          strokeLinecap="round"
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

function ContextMenu({ toothNum, currentState, implantState, hasCrown, onSelect, onClose }) {
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
      className="fixed z-[9999] right-4 md:right-8 top-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white shadow-2xl py-2 w-[260px] max-h-[calc(100vh-2rem)] overflow-y-auto text-zinc-800"
      style={{ animation: 'fadeInScaleFixed 0.15s ease-out' }}
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wider border-b border-zinc-200 mb-1">
        Diente {toothNum} — Estado
      </div>
      {TOOTH_STATES.map(state => {
        const active = state === 'protesis' ? hasCrown : IMPLANT_STATES.includes(state) ? implantState === state : currentState === state
        const implantDisabled = IMPLANT_STATES.includes(state) && currentState !== 'ausente'
        return (
        <button
          key={state}
          disabled={implantDisabled}
          onClick={() => onSelect(state)}
          title={implantDisabled?'Primero marca la pieza como ausente':undefined}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 transition-colors flex items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-40 ${
            active ? 'text-blue-700 bg-blue-50 font-medium' : 'text-zinc-800'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${
            state === 'normal' ? 'bg-zinc-500' :
            state === 'ausente' ? 'bg-blue-600' :
            state === 'extraccion' ? 'bg-red-500' :
            state === 'implante_indicado' ? 'bg-red-600' :
            state === 'implante_existente' ? 'bg-blue-600' :
            state === 'protesis' ? 'bg-yellow-500' :
            state === 'endodonciado' ? 'bg-blue-600' :
            'bg-red-600'
          }`} />
          {TOOTH_STATE_LABELS[state]}
          {active && <span className="ml-auto text-blue-700">✓</span>}
        </button>
      )})}
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
          const savedState = initialState[tooth].toothState || 'normal'
          const legacyImplant = savedState === 'implante'
          base[tooth].toothState = legacyImplant ? 'ausente' : ENDODONTIC_STATES.includes(savedState) || savedState === 'protesis' || IMPLANT_STATES.includes(savedState) ? 'normal' : savedState
          base[tooth].endodonticState = initialState[tooth].endodonticState || (ENDODONTIC_STATES.includes(savedState) ? savedState : 'none')
          base[tooth].implantState = initialState[tooth].implantState || (legacyImplant ? 'implante_existente' : IMPLANT_STATES.includes(savedState) ? savedState : 'none')
          base[tooth].hasCrown = Boolean(initialState[tooth].hasCrown || savedState === 'protesis')
          if (initialState[tooth].surfaces) {
            const hadLegacyCrown = SURFACES.some(s => initialState[tooth].surfaces[s] === 'corona')
            if (hadLegacyCrown) base[tooth].hasCrown = true
            SURFACES.forEach(s => {
              if (initialState[tooth].surfaces[s]) {
                base[tooth].surfaces[s] = initialState[tooth].surfaces[s] === 'corona' ? 'sano' : initialState[tooth].surfaces[s]
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
  const [activeSurfaceState, setActiveSurfaceState] = useState('caries')
  const [selectedTooth, setSelectedTooth] = useState(null)

  // Expose getState to parent
  useImperativeHandle(ref, () => ({
    getState: () => teethState,
  }))

  // Notify parent of changes
  useEffect(() => {
    onChange?.(teethState)
  }, [onChange, teethState])

  const handleSurfaceClick = useCallback((toothNum, surface) => {
    setSelectedTooth(toothNum)
    setTeethState(prev => {
      const tooth = prev[toothNum]
      const nextState = activeSurfaceState
      const nextSurfaces = {...tooth.surfaces,[surface]:nextState}

      return {
        ...prev,
        [toothNum]: {
          ...tooth,
          surfaces: nextSurfaces,
        }
      }
    })
  }, [activeSurfaceState])

  const handleToothContext = useCallback((toothNum) => {
    setSelectedTooth(toothNum)
    setContextMenu({
      toothNum,
    })
  }, [])

  const handleToothSelect = useCallback((toothNum) => {
    setSelectedTooth(toothNum)
  }, [])

  const setSelectedToothState = useCallback((state) => {
    if (!selectedTooth) return
    setTeethState((previous) => {
      const tooth = previous[selectedTooth]
      const changes = ENDODONTIC_STATES.includes(state)
        ? {endodonticState:tooth.endodonticState===state?'none':state}
        : IMPLANT_STATES.includes(state)
          ? tooth.toothState==='ausente' ? {implantState:tooth.implantState===state?'none':state} : {}
        : state === 'protesis'
          ? {hasCrown:!tooth.hasCrown}
          : state === 'normal'
            ? {toothState:'normal',implantState:'none',hasCrown:false}
            : state === 'ausente'
              ? {toothState:'ausente'}
              : {toothState:state,implantState:'none'}
      return {...previous,[selectedTooth]:{...tooth,...changes}}
    })
  }, [selectedTooth])

  const handleToothStateChange = useCallback((state) => {
    if (!contextMenu) return
    const toothNum = contextMenu.toothNum
    setTeethState(prev => {
      const tooth=prev[toothNum]
      const changes=ENDODONTIC_STATES.includes(state)
        ? {endodonticState:tooth.endodonticState===state?'none':state}
        : IMPLANT_STATES.includes(state)
          ? tooth.toothState==='ausente' ? {implantState:tooth.implantState===state?'none':state} : {}
        : state==='protesis'
          ? {hasCrown:!tooth.hasCrown}
          : state==='normal'
            ? {toothState:'normal',implantState:'none',hasCrown:false}
            : state==='ausente'
              ? {toothState:'ausente'}
              : {toothState:state,implantState:'none'}
      return {...prev,[toothNum]:{...tooth,...changes}}
    })
    setContextMenu(null)
  }, [contextMenu])

  const renderRow = (teeth, isUpper, label) => {
    const archWidth = teeth.length * CELL + PADDING
    return (
      <div className="flex flex-col items-center">
        {/* Arch label */}
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-zinc-300" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-zinc-300" />
        </div>
        {/* Tooth numbers */}
        <div className="flex" style={{ gap: PADDING }}>
          {teeth.map((t) => (
            <div key={t} className="flex flex-col items-center" style={{ width: TOOTH_SIZE }}>
              {isUpper && (
                <span className={`text-[10px] font-mono mb-1 transition-colors ${
                  teethState[t]?.toothState !== 'normal' || teethState[t]?.hasCrown ? 'text-yellow-400 font-bold' : 'text-zinc-500'
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
                onToothSelect={handleToothSelect}
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
            stroke="rgba(63,63,70,0.18)"
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
                  teethState[t]?.toothState !== 'normal' || teethState[t]?.hasCrown ? 'text-yellow-400 font-bold' : 'text-zinc-500'
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
      <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><div><p className="text-sm font-semibold">1. Selecciona una condición</p><p className="text-xs text-zinc-500">2. Haz clic sobre la superficie del diente que deseas marcar.</p></div>{selectedTooth && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Pieza seleccionada: {selectedTooth}</span>}</div>
        <div className="flex flex-wrap gap-2">{SURFACE_STATES.map((state)=><button key={state} type="button" onClick={()=>setActiveSurfaceState(state)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${activeSurfaceState===state?'border-blue-500 bg-blue-50 ring-2 ring-blue-200':'border-zinc-200 bg-white hover:bg-zinc-100'}`}><span className="h-3 w-3 rounded-sm border" style={{backgroundColor:SURFACE_COLORS[state].fill,borderColor:SURFACE_COLORS[state].stroke}} />{SURFACE_LABELS[state]}</button>)}</div>
        <div className="mt-4 border-t border-zinc-200 pt-3"><p className="mb-2 text-xs font-semibold">Estado general de la pieza {selectedTooth ? selectedTooth : '(selecciona una superficie)'}</p><div className="flex flex-wrap gap-2">{TOOTH_STATES.map((state)=>{const tooth=selectedTooth?teethState[selectedTooth]:null;const active=tooth&&(ENDODONTIC_STATES.includes(state)?tooth.endodonticState===state:IMPLANT_STATES.includes(state)?tooth.implantState===state:state==='protesis'?tooth.hasCrown:tooth.toothState===state);const implantDisabled=IMPLANT_STATES.includes(state)&&tooth?.toothState!=='ausente';return <button key={state} type="button" disabled={!selectedTooth||implantDisabled} title={implantDisabled?'Primero marca la pieza como ausente':undefined} onClick={()=>setSelectedToothState(state)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-40 ${active?'border-blue-500 bg-blue-50 text-blue-700':'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'}`}>{TOOTH_STATE_LABELS[state]}</button>})}</div><p className="mt-2 text-[10px] text-zinc-500">Marca primero la pieza como ausente. Luego puedes indicar un implante planeado o existente y combinarlo con una corona.</p></div>
      </div>
      {/* Dental Arch */}
      <div className="flex flex-col items-center gap-1">
        {/* Upper Arch */}
        <div className="flex items-end gap-0">
          {renderRow(UPPER_RIGHT, true, 'Superior Derecho')}
          <div className="w-px h-12 bg-gradient-to-b from-zinc-300 to-transparent mx-1" />
          {renderRow(UPPER_LEFT, true, 'Superior Izquierdo')}
        </div>

        {/* Arch Separator */}
        <div className="w-full flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Línea Oclusal</span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />
        </div>

        {/* Lower Arch */}
        <div className="flex items-start gap-0">
          {renderRow(LOWER_LEFT, false, 'Inferior Izquierdo')}
          <div className="w-px h-12 bg-gradient-to-t from-zinc-300 to-transparent mx-1" />
          {renderRow(LOWER_RIGHT, false, 'Inferior Derecho')}
        </div>
      </div>

      {/* Clinical color legend */}
      <div className="mt-8 border-t border-zinc-200 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 text-center">
          Convenciones del odontograma
        </p>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-3">
          {SURFACE_STATES.map((state) => (
            <div key={state} className="flex items-center gap-2 text-xs text-zinc-700">
              <span
                className="w-3.5 h-3.5 rounded-sm border shrink-0"
                style={{
                  backgroundColor: SURFACE_COLORS[state].fill,
                  borderColor: SURFACE_COLORS[state].stroke,
                }}
              />
              <span>{SURFACE_LABELS[state]}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-zinc-200 text-[11px] text-zinc-500">
          <span><strong className="text-blue-600">X azul:</strong> pieza ausente</span>
          <span><strong className="text-red-400">X roja:</strong> extracción indicada</span>
          <span><strong className="text-red-600">IMP rojo:</strong> implante indicado / planeado</span>
          <span><strong className="text-blue-600">IMP azul:</strong> implante existente / realizado</span>
          <span><strong className="text-yellow-500">Círculo amarillo:</strong> corona</span>
          <span><strong className="text-blue-600">Línea azul:</strong> endodoncia realizada</span>
          <span><strong className="text-red-600">Línea roja:</strong> endodoncia por realizar</span>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          toothNum={contextMenu.toothNum}
          currentState={teethState[contextMenu.toothNum]?.toothState}
          implantState={teethState[contextMenu.toothNum]?.implantState}
          hasCrown={teethState[contextMenu.toothNum]?.hasCrown}
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
        @keyframes fadeInScaleFixed {
          from { opacity: 0; transform: translateY(-50%) scale(0.96); }
          to { opacity: 1; transform: translateY(-50%) scale(1); }
        }
      `}</style>
    </div>
  )
})

export default Odontograma
