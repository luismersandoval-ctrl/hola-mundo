import { useState, useCallback, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'

// ─── Constants ───────────────────────────────────────────────────────────────

const SURFACE_STATES = ['sano', 'caries', 'obturacion', 'sellante', 'fractura']
const TOOTH_STATES = ['normal', 'ausente', 'extraccion', 'implante_indicado', 'implante_existente', 'protesis', 'endodonciado', 'conducto_pendiente']
const TOOTH_TOOL_STATES = TOOTH_STATES.filter(state => state !== 'normal')
const ENDODONTIC_STATES = ['endodonciado', 'conducto_pendiente']
const IMPLANT_STATES = ['implante_indicado', 'implante_existente']

const CLINICAL_FEATURES = {
  furca_1: 'Furca grado I', furca_2: 'Furca grado II', furca_3: 'Furca grado III',
  movilidad_1: 'Movilidad grado I', movilidad_2: 'Movilidad grado II', movilidad_3: 'Movilidad grado III',
  en_erupcion: 'En erupción', sin_erupcionar: 'Sin erupcionar', impactado: 'Impactado', incluido: 'Incluido',
  inclinado: 'Inclinado', lingualizado: 'Lingualizado', rotado: 'Rotado', supernumerario: 'Supernumerario',
}

const CLINICAL_FEATURE_SYMBOLS = {
  furca_1: {symbol: '△1', color: '#b45309'}, furca_2: {symbol: '△2', color: '#b45309'}, furca_3: {symbol: '△3', color: '#b45309'},
  movilidad_1: {symbol: '↔1', color: '#2563eb'}, movilidad_2: {symbol: '↔2', color: '#2563eb'}, movilidad_3: {symbol: '↔3', color: '#2563eb'},
  en_erupcion: {symbol: '↑', color: '#16a34a'}, sin_erupcionar: {symbol: '◌', color: '#64748b'},
  impactado: {symbol: '⊥', color: '#dc2626'}, incluido: {symbol: '◎', color: '#9333ea'},
  inclinado: {symbol: '∕', color: '#ea580c'}, lingualizado: {symbol: 'L', color: '#0891b2'}, rotado: {symbol: '↻', color: '#7c3aed'},
  supernumerario: {symbol: '★', color: '#db2777'},
}

const CLINICAL_FEATURE_GROUPS = [
  {
    title: 'Hallazgos periodontales',
    description: 'Compromiso de furca y grado de movilidad dental.',
    features: ['furca_1', 'furca_2', 'furca_3', 'movilidad_1', 'movilidad_2', 'movilidad_3'],
  },
  {
    title: 'Estado de erupción y retención',
    description: 'Situación eruptiva o retención de la pieza dental.',
    features: ['en_erupcion', 'sin_erupcionar', 'impactado', 'incluido'],
  },
  {
    title: 'Alteraciones de posición',
    description: 'Variaciones en la orientación o ubicación de la pieza.',
    features: ['inclinado', 'lingualizado', 'rotado'],
  },
  {
    title: 'Alteraciones de número',
    description: 'Piezas adicionales a la fórmula dental habitual.',
    features: ['supernumerario'],
  },
]

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
const PERMANENT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]
const PERMANENT_UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28]
const PERMANENT_LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38]
const PERMANENT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41]
const TEMPORARY_UPPER_RIGHT = [55, 54, 53, 52, 51]
const TEMPORARY_UPPER_LEFT  = [61, 62, 63, 64, 65]
const TEMPORARY_LOWER_LEFT  = [71, 72, 73, 74, 75]
const TEMPORARY_LOWER_RIGHT = [85, 84, 83, 82, 81]

const PERMANENT_TEETH = [...PERMANENT_UPPER_RIGHT, ...PERMANENT_UPPER_LEFT, ...PERMANENT_LOWER_LEFT, ...PERMANENT_LOWER_RIGHT]
const TEMPORARY_TEETH = [...TEMPORARY_UPPER_RIGHT, ...TEMPORARY_UPPER_LEFT, ...TEMPORARY_LOWER_LEFT, ...TEMPORARY_LOWER_RIGHT]
const ALL_TEETH = [...PERMANENT_TEETH, ...TEMPORARY_TEETH]

const SURFACES = ['vestibular', 'lingual', 'mesial', 'distal', 'oclusal']

function getDentitionForBirthDate(birthDate) {
  if (!birthDate) return null
  const parts = String(birthDate).slice(0, 10).split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null
  const [year, month, day] = parts
  const today = new Date()
  const birth = new Date(year, month - 1, day)
  if (Number.isNaN(birth.getTime()) || birth > today) return null
  let age = today.getFullYear() - year
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age -= 1
  return {age, type: age < 6 ? 'temporary' : age <= 13 ? 'mixed' : 'permanent'}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createInitialState() {
  const state = {}
  ALL_TEETH.forEach(tooth => {
    state[tooth] = {
      toothState: 'normal',
      endodonticState: 'none',
      implantState: 'none',
      hasCrown: false,
      features: [],
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
  const { toothState, surfaces, endodonticState = 'none', implantState = 'none', hasCrown = false, features = [] } = toothData
  
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
      {/* Each clinical finding keeps its own symbol; never collapse them into a counter. */}
      {features.map((feature, index) => {
        const marker = CLINICAL_FEATURE_SYMBOLS[feature]
        if (!marker) return null
        const column = index % 3
        const row = Math.floor(index / 3)
        const x = 7 + column * 15
        const y = 6 + row * 11
        return (
          <g key={feature} style={{pointerEvents:'none'}}>
            <rect x={x - 7} y={y - 5} width={14} height={10} rx={3} fill="#fff" stroke={marker.color} strokeWidth={1.2} />
            <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fill={marker.color} fontSize={6.5} fontWeight={800}>{marker.symbol}</text>
            <title>{CLINICAL_FEATURES[feature]}</title>
          </g>
        )
      })}
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

const Odontograma = forwardRef(function Odontograma({ initialState, onChange, birthDate }, ref) {
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
          base[tooth].features = Array.isArray(initialState[tooth].features) ? initialState[tooth].features.filter(feature => CLINICAL_FEATURES[feature]) : []
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

  const dentitionRule = useMemo(() => getDentitionForBirthDate(birthDate), [birthDate])
  const [contextMenu, setContextMenu] = useState(null)
  const [dentition, setDentition] = useState(() => getDentitionForBirthDate(birthDate)?.type || 'permanent')
  const [activeSurfaceState, setActiveSurfaceState] = useState('caries')
  const [activeToothAction, setActiveToothAction] = useState(null)
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
      if (activeToothAction?.type === 'state') {
        const state = activeToothAction.value
        const changes = ENDODONTIC_STATES.includes(state)
          ? {endodonticState:tooth.endodonticState===state?'none':state}
          : IMPLANT_STATES.includes(state)
            ? tooth.toothState==='ausente' ? {implantState:tooth.implantState===state?'none':state} : {}
            : state === 'protesis'
              ? {hasCrown:!tooth.hasCrown}
              : state === 'normal'
                ? {toothState:'normal',implantState:'none',endodonticState:'none',hasCrown:false,features:[]}
                : state === 'ausente'
                  ? {toothState:'ausente'}
                  : {toothState:state,implantState:'none'}
        return {...prev,[toothNum]:{...tooth,...changes}}
      }
      if (activeToothAction?.type === 'feature') {
        const feature = activeToothAction.value
        const features = tooth.features || []
        const exclusiveGroup = feature.startsWith('furca_') ? 'furca_' : feature.startsWith('movilidad_') ? 'movilidad_' : ['en_erupcion','sin_erupcionar'].includes(feature) ? 'erupcion' : null
        const withoutGroup = exclusiveGroup === 'erupcion' ? features.filter(item => !['en_erupcion','sin_erupcionar'].includes(item)) : exclusiveGroup ? features.filter(item => !item.startsWith(exclusiveGroup)) : features
        const nextFeatures = features.includes(feature) ? features.filter(item => item !== feature) : [...withoutGroup, feature]
        return {...prev,[toothNum]:{...tooth,features:nextFeatures}}
      }
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
  }, [activeSurfaceState, activeToothAction])

  const handleToothContext = useCallback((toothNum) => {
    setSelectedTooth(toothNum)
    setContextMenu({
      toothNum,
    })
  }, [])

  const handleToothSelect = useCallback((toothNum) => {
    if (activeToothAction) handleSurfaceClick(toothNum, 'oclusal')
    else setSelectedTooth(toothNum)
  }, [activeToothAction, handleSurfaceClick])

  const observations = useMemo(() => {
    const entries = []
    ALL_TEETH.forEach(toothNum => {
      const tooth = teethState[toothNum]
      if (!tooth) return
      if (tooth.toothState !== 'normal') entries.push(`${toothNum} · ${TOOTH_STATE_LABELS[tooth.toothState] || tooth.toothState}`)
      if (tooth.hasCrown) entries.push(`${toothNum} · Corona`)
      if (tooth.endodonticState !== 'none') entries.push(`${toothNum} · ${TOOTH_STATE_LABELS[tooth.endodonticState]}`)
      if (tooth.implantState !== 'none') entries.push(`${toothNum} · ${TOOTH_STATE_LABELS[tooth.implantState]}`)
      SURFACES.forEach(surface => {
        const state = tooth.surfaces[surface]
        if (state !== 'sano') entries.push(`${toothNum} · ${SURFACE_LABELS[state]} (${surface})`)
      })
      ;(tooth.features || []).forEach(feature => entries.push(`${toothNum} · ${CLINICAL_FEATURES[feature]}`))
    })
    return entries
  }, [teethState])

  const visibleArches = dentition === 'temporary'
    ? {upperRight:TEMPORARY_UPPER_RIGHT,upperLeft:TEMPORARY_UPPER_LEFT,lowerLeft:TEMPORARY_LOWER_LEFT,lowerRight:TEMPORARY_LOWER_RIGHT}
    : {upperRight:PERMANENT_UPPER_RIGHT,upperLeft:PERMANENT_UPPER_LEFT,lowerLeft:PERMANENT_LOWER_LEFT,lowerRight:PERMANENT_LOWER_RIGHT}

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
          <div>
            <p className="text-sm font-semibold">Tipo de dentición</p>
            {dentitionRule ? (
              <p className="text-[10px] text-zinc-500">Vista asignada automáticamente según la edad del paciente: {dentitionRule.age} años.</p>
            ) : (
              <p className="text-[10px] font-medium text-amber-700">Registra una fecha de nacimiento válida para asignar y bloquear el tipo automáticamente.</p>
            )}
          </div>
          <div className="flex flex-wrap rounded-xl border border-zinc-200 bg-white p-1">
            <button type="button" disabled={dentitionRule && dentitionRule.type !== 'permanent'} onClick={()=>{setDentition('permanent');setSelectedTooth(null)}} className={`rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${dentition==='permanent'?'bg-blue-600 text-white shadow':'text-zinc-600 hover:bg-zinc-100'}`}>Permanente · 32 piezas</button>
            <button type="button" disabled={dentitionRule && dentitionRule.type !== 'mixed'} onClick={()=>{setDentition('mixed');setSelectedTooth(null)}} className={`rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${dentition==='mixed'?'bg-cyan-600 text-white shadow':'text-zinc-600 hover:bg-zinc-100'}`}>Mixta · combinada</button>
            <button type="button" disabled={dentitionRule && dentitionRule.type !== 'temporary'} onClick={()=>{setDentition('temporary');setSelectedTooth(null)}} className={`rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${dentition==='temporary'?'bg-violet-600 text-white shadow':'text-zinc-600 hover:bg-zinc-100'}`}>Temporal · 20 piezas</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><div><p className="text-sm font-semibold">1. Selecciona una condición</p><p className="text-xs text-zinc-500">2. Haz clic sobre la superficie del diente que deseas marcar.</p></div>{selectedTooth && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Pieza seleccionada: {selectedTooth}</span>}</div>
        <div className="flex flex-wrap gap-2">{SURFACE_STATES.map((state)=><button key={state} type="button" onClick={()=>{setActiveSurfaceState(state);setActiveToothAction(null)}} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${!activeToothAction&&activeSurfaceState===state?'border-blue-500 bg-blue-50 ring-2 ring-blue-200':'border-zinc-200 bg-white hover:bg-zinc-100'}`}><span className="h-3 w-3 rounded-sm border" style={{backgroundColor:SURFACE_COLORS[state].fill,borderColor:SURFACE_COLORS[state].stroke}} />{SURFACE_LABELS[state]}</button>)}</div>
        <div className="mt-4 border-t border-zinc-200 pt-3"><p className="mb-2 text-xs font-semibold">Estado general de la pieza</p><div className="flex flex-wrap gap-2">{TOOTH_TOOL_STATES.map((state)=>{const active=activeToothAction?.type==='state'&&activeToothAction.value===state;return <button key={state} type="button" onClick={()=>setActiveToothAction({type:'state',value:state})} className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${active?'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200':'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'}`}>{TOOTH_STATE_LABELS[state]}</button>})}</div><p className="mt-2 text-[10px] text-zinc-500">Selecciona un estado y después haz clic sobre la pieza. Para implantes, marca primero la pieza como ausente.</p></div>
        <div className="mt-4 border-t border-zinc-200 pt-3">
          <p className="text-xs font-semibold">Hallazgos clínicos por categoría</p>
          <p className="mb-3 text-[10px] text-zinc-500">Selecciona un hallazgo y aplícalo sobre una o varias piezas.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {CLINICAL_FEATURE_GROUPS.map(group => (
              <section key={group.title} className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-zinc-800">{group.title}</p>
                <p className="mb-2 text-[10px] text-zinc-500">{group.description}</p>
                <div className="flex flex-wrap gap-2">
                  {group.features.map(feature => {
                    const active = activeToothAction?.type === 'feature' && activeToothAction.value === feature
                    return (
                      <button key={feature} type="button" onClick={() => setActiveToothAction({type:'feature', value:feature})} className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${active?'border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-200':'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'}`}>
                        {CLINICAL_FEATURES[feature]}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
      {/* Dental Arch */}
      <div className="flex flex-col items-center gap-1">
        {dentition==='mixed'&&<div className="mb-2 rounded-full bg-cyan-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-700">Vista combinada · dentición mixta</div>}
        {/* Upper Arch */}
        <div className="flex items-end gap-0">
          {renderRow(dentition==='mixed'?PERMANENT_UPPER_RIGHT:visibleArches.upperRight, true, dentition==='mixed'?'Permanente superior derecho':'Superior Derecho')}
          <div className="w-px h-12 bg-gradient-to-b from-zinc-300 to-transparent mx-1" />
          {renderRow(dentition==='mixed'?PERMANENT_UPPER_LEFT:visibleArches.upperLeft, true, dentition==='mixed'?'Permanente superior izquierdo':'Superior Izquierdo')}
        </div>
        {dentition==='mixed'&&<div className="flex items-end gap-0 rounded-xl bg-violet-50/60 px-4 py-2"><div>{renderRow(TEMPORARY_UPPER_RIGHT,true,'Temporal superior derecho')}</div><div className="mx-1 h-12 w-px bg-gradient-to-b from-violet-300 to-transparent"/><div>{renderRow(TEMPORARY_UPPER_LEFT,true,'Temporal superior izquierdo')}</div></div>}

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
        {dentition==='mixed'&&<div className="flex items-start gap-0 rounded-xl bg-violet-50/60 px-4 py-2"><div>{renderRow(TEMPORARY_LOWER_RIGHT,false,'Temporal inferior derecho')}</div><div className="mx-1 h-12 w-px bg-gradient-to-t from-violet-300 to-transparent"/><div>{renderRow(TEMPORARY_LOWER_LEFT,false,'Temporal inferior izquierdo')}</div></div>}
        <div className="flex items-start gap-0">
          {renderRow(dentition==='mixed'?PERMANENT_LOWER_RIGHT:visibleArches.lowerRight, false, dentition==='mixed'?'Permanente inferior derecho':'Inferior Derecho')}
          <div className="w-px h-12 bg-gradient-to-t from-zinc-300 to-transparent mx-1" />
          {renderRow(dentition==='mixed'?PERMANENT_LOWER_LEFT:visibleArches.lowerLeft, false, dentition==='mixed'?'Permanente inferior izquierdo':'Inferior Izquierdo')}
        </div>
      </div>

      <div className="mt-7 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-800">
        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Observaciones generadas</p><p className="text-[10px] text-zinc-500">Resumen automático de convenciones, superficies y hallazgos registrados.</p></div><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{observations.length}</span></div>
        {observations.length===0?<p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500">Aún no hay hallazgos registrados.</p>:<div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{observations.map((observation,index)=><div key={`${observation}-${index}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs">{observation}</div>)}</div>}
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
          <span><strong className="text-red-600">X roja:</strong> extracción indicada</span>
          <span><strong className="text-red-600">IMP rojo:</strong> implante indicado / planeado</span>
          <span><strong className="text-blue-600">IMP azul:</strong> implante existente / realizado</span>
          <span><strong className="text-yellow-500">Círculo amarillo:</strong> corona</span>
          <span><strong className="text-blue-600">Línea azul:</strong> endodoncia realizada</span>
          <span><strong className="text-red-600">Línea roja:</strong> endodoncia por realizar</span>
        </div>
        <div className="mt-4 border-t border-zinc-200 pt-4">
          <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Símbolos de hallazgos clínicos</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-zinc-600">
            {Object.entries(CLINICAL_FEATURE_SYMBOLS).map(([feature, marker]) => (
              <span key={feature} className="flex items-center gap-1.5">
                <strong className="inline-flex min-w-6 items-center justify-center rounded border bg-white px-1" style={{color:marker.color, borderColor:marker.color}}>{marker.symbol}</strong>
                {CLINICAL_FEATURES[feature]}
              </span>
            ))}
          </div>
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
