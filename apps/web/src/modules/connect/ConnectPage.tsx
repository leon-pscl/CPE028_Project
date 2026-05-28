import { useEffect, useRef, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import L from 'leaflet'
import { Wrench, Recycle, Search, Filter, Lock } from 'lucide-react'
import { HARDCODED_SHOPS } from './shopData'
import { useAuth } from '../../hooks/useAuth'
import type { AssessmentDirection } from '@/types'

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

const REPAIR_ICON = L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:#16a34a;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

const RECYCLE_ICON = L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:#d97706;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.293 13.596 4.875 7.97l4.303-2.483"/><path d="m10 4 4.103 2.483-3.417 5.626"/><path d="m14 16 3.417-5.626L21 12.5"/><path d="m18.103 8.374-3.417-5.626L10 4"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

// ---------------------------------------------------------------------------
// Auth Gate Modal
// ---------------------------------------------------------------------------
function AuthGateModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Card */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <Lock className="h-7 w-7 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Sign in to continue</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          Access our full directory of verified repair shops and recycling facilities. Sign in or create a free account.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/auth/login"
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/auth/register"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Create account
          </Link>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ConnectPage
// ---------------------------------------------------------------------------
export default function ConnectPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const state = location.state as { direction?: AssessmentDirection } | null

  const [showAuthGate, setShowAuthGate] = useState(false)
  const [filter, setFilter] = useState<'all' | 'repair' | 'recycling'>(
    state?.direction === 'REPAIR' ? 'repair' : state?.direction === 'RECYCLE' ? 'recycling' : 'all'
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Show modal immediately on mount if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthGate(true)
    }
  }, [authLoading, user])

  const filteredShops = HARDCODED_SHOPS.filter(shop => {
    const matchesType = filter === 'all' || shop.type === filter
    const matchesSearch = !searchQuery ||
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.address.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  // Init map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return
    const map = L.map(mapRef.current).setView([14.5873, 121.0470], 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map)
    leafletMap.current = map
    return () => {
      map.remove()
      leafletMap.current = null
    }
  }, [])

  // Update markers
  useEffect(() => {
    if (!leafletMap.current) return
    leafletMap.current.eachLayer(layer => {
      if (layer instanceof L.Marker) leafletMap.current?.removeLayer(layer)
    })
    filteredShops.forEach(shop => {
      const marker = L.marker([shop.lat, shop.lng], {
        icon: shop.type === 'repair' ? REPAIR_ICON : RECYCLE_ICON,
      }).addTo(leafletMap.current!)
      marker.bindPopup(`
        <div style="min-width:200px;">
          <strong style="font-size:14px;">${shop.name}</strong>
          <p style="margin:4px 0 0;font-size:12px;color:#666;">${shop.address}</p>
          <span style="display:inline-block;margin-top:6px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${shop.type === 'repair' ? '#dcfce7' : '#fef3c7'};color:${shop.type === 'repair' ? '#15803d' : '#b45309'};">
            ${shop.type === 'repair' ? 'Repair Shop' : 'Recycling Facility'}
          </span>
        </div>
      `)
    })
  }, [filteredShops])

  // Intercept search/filter interactions when logged out
  const handleFilterInteraction = () => {
    if (!user) setShowAuthGate(true)
  }

  return (
    <>
      {showAuthGate && <AuthGateModal onClose={() => setShowAuthGate(false)} />}

      <div className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 ${showAuthGate ? 'pointer-events-none select-none' : ''}`}>

        {/* Persistent sign-in banner when modal is dismissed but still logged out */}
        {!authLoading && !user && !showAuthGate && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Lock className="h-4 w-4 shrink-0" />
              <span>Sign in to search and filter verified shops near you.</span>
            </div>
            <button
              onClick={() => setShowAuthGate(true)}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              Sign in
            </button>
          </div>
        )}

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Connect</h1>
          <p className="mt-1 text-gray-600">Find verified repair shops and recycling facilities near you.</p>
        </div>

        {/* Filters — clicking when logged out triggers modal */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center" onClick={!user ? handleFilterInteraction : undefined}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or address..."
              className="input-field pl-9"
              value={searchQuery}
              onChange={e => {
                if (!user) { setShowAuthGate(true); return }
                setSearchQuery(e.target.value)
              }}
              readOnly={!user}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'repair', 'recycling'] as const).map(type => (
              <button
                key={type}
                onClick={() => {
                  if (!user) { setShowAuthGate(true); return }
                  setFilter(type)
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  filter === type
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                {type === 'all' ? 'All' : type === 'repair' ? 'Repair' : 'Recycling'}
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <div ref={mapRef} className="h-80 w-full sm:h-96 lg:h-[480px]" />
        </div>

        {/* Legend */}
        <div className="mb-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-brand-600" />
            <span className="text-gray-600">Repair Shop</span>
          </div>
          <div className="flex items-center gap-2">
            <Recycle className="h-4 w-4 text-recycle-600" />
            <span className="text-gray-600">Recycling Facility</span>
          </div>
        </div>

        {/* Shop list — blurred when logged out */}
        <div className={`space-y-3 ${!user ? 'relative' : ''}`}>
          {!user && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl">
              <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200 px-6 py-4 text-center shadow-lg">
                <Lock className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">Sign in to view the full directory</p>
                <button
                  onClick={() => setShowAuthGate(true)}
                  className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}

          <h2 className={`text-lg font-semibold text-gray-900 ${!user ? 'blur-sm' : ''}`}>
            {filteredShops.length} {filteredShops.length === 1 ? 'result' : 'results'}
          </h2>

          {filteredShops.length === 0 ? (
            <div className="card text-center text-gray-500">
              <Search className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm">No shops match your search. Try adjusting your filters.</p>
            </div>
          ) : (
            filteredShops.map((shop, i) => (
              <div
                key={shop.id}
                className={`card transition-all hover:shadow-md ${!user && i > 1 ? 'blur-sm' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{shop.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        shop.type === 'repair' ? 'bg-brand-100 text-brand-700' : 'bg-recycle-100 text-recycle-700'
                      }`}>
                        {shop.type === 'repair' ? 'Repair' : 'Recycling'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{shop.address}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
