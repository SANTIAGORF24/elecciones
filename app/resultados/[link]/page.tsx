"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { 
  Trophy, 
  Medal, 
  Award, 
  Vote, 
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  Radio,
  Crown,
  TrendingUp,
  Sparkles,
  BarChart3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  obtenerEleccionPorLink, 
  obtenerResultados, 
  obtenerCargosPorEleccion,
  obtenerCandidatosPorCargo,
  supabase,
  type Eleccion,
  type Cargo,
  type Candidato
} from "@/lib/supabase"
import Image from "next/image"

interface Resultado {
  candidato: string
  cargo: string
  votos: number
}

interface CandidatoConVotos {
  id: string
  nombre: string
  numero_lista?: number | string
  votos: number
}

export default function ResultadosPublicosPage() {
  const params = useParams()
  const linkPublico = params.link as string
  const [eleccion, setEleccion] = useState<Eleccion | null>(null)
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [candidatosPorCargo, setCandidatosPorCargo] = useState<Record<string, Candidato[]>>({})
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isLive, setIsLive] = useState(false)
  const [selectedCargo, setSelectedCargo] = useState<string | null>(null)
  const [animateVotes, setAnimateVotes] = useState(false)

  const cargarResultados = useCallback(async (eleccionId?: string) => {
    const id = eleccionId || eleccion?.id
    if (!id) return

    const { data } = await obtenerResultados(id)
    if (data) {
      setResultados(data)
      setLastUpdate(new Date())
      setAnimateVotes(true)
      setTimeout(() => setAnimateVotes(false), 600)
    }
  }, [eleccion?.id])

  useEffect(() => {
    cargarDatos()
  }, [linkPublico])

  useEffect(() => {
    if (!eleccion?.id || eleccion.estado !== 'activa') return

    setIsLive(true)
    
    const channel = supabase
      .channel('resultados-tiempo-real')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votos_secretos',
          filter: `eleccion_id=eq.${eleccion.id}`
        },
        () => {
          cargarResultados()
        }
      )
      .subscribe()

    const interval = setInterval(() => {
      cargarResultados()
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      setIsLive(false)
    }
  }, [eleccion?.id, eleccion?.estado, cargarResultados])

  const cargarDatos = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: eleccionData, error: eleccionError } = await obtenerEleccionPorLink(linkPublico)
      
      if (eleccionError || !eleccionData) {
        setError("Elección no encontrada")
        setLoading(false)
        return
      }

      setEleccion(eleccionData)

      const { data: cargosData } = await obtenerCargosPorEleccion(eleccionData.id)
      if (cargosData) {
        setCargos(cargosData)
        if (cargosData.length > 0) {
          setSelectedCargo(cargosData[0].id)
        }
        
        const candidatosMap: Record<string, Candidato[]> = {}
        for (const cargo of cargosData) {
          const { data: candidatosData } = await obtenerCandidatosPorCargo(cargo.id)
          if (candidatosData) {
            candidatosMap[cargo.id] = candidatosData
          }
        }
        setCandidatosPorCargo(candidatosMap)
      }

      await cargarResultados(eleccionData.id)
    } catch (err) {
      setError("Error al cargar los datos")
    }

    setLoading(false)
  }

  const getResultadosPorCargo = (cargo: Cargo): CandidatoConVotos[] => {
    const candidatos = candidatosPorCargo[cargo.id] || []
    const votosDelCargo = resultados.filter(r => r.cargo === cargo.nombre)
    
    const votosMap: Record<string, number> = {}
    votosDelCargo.forEach(v => {
      votosMap[v.candidato] = v.votos
    })
    
    const candidatosConVotos = candidatos.map(c => ({
      id: c.id,
      nombre: c.nombre,
      numero_lista: c.numero_lista,
      votos: votosMap[c.nombre] || 0
    }))
    
    return candidatosConVotos.sort((a, b) => b.votos - a.votos)
  }

  const getTotalVotosEleccion = () => {
    return resultados.reduce((sum, r) => sum + r.votos, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#11357b] to-[#1a0a2e] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            <Vote className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-white/70 mt-6 text-lg">Cargando resultados...</p>
        </div>
      </div>
    )
  }

  if (error || !eleccion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#11357b] to-[#1a0a2e] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-10 text-center border border-white/10">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Elección no encontrada</h2>
          <p className="text-white/60">El enlace no es válido o la elección ya no está disponible.</p>
        </div>
      </div>
    )
  }

  const cargoSeleccionado = cargos.find(c => c.id === selectedCargo)
  const resultadosActuales = cargoSeleccionado ? getResultadosPorCargo(cargoSeleccionado) : []
  const totalVotosCargo = resultadosActuales.reduce((sum, r) => sum + r.votos, 0)

  const podio = resultadosActuales.slice(0, 3)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#11357b] to-[#1a0a2e] overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#11357b]/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <Image src="/logo.webp" alt="Logo" width={36} height={36} className="object-contain" />
              </div>
              <div>
                <h1 className="text-white font-bold text-sm">Colegio Nacional de Curadores Urbanos</h1>
                <p className="text-white/40 text-xs">Sistema de Votaciones</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLive && (
                <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1.5">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse" />
                  EN VIVO
                </Badge>
              )}
              <Badge className={`px-3 py-1.5 ${
                eleccion.estado === 'activa' 
                  ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                  : "bg-white/10 text-white/60 border border-white/20"
              }`}>
                {eleccion.estado === 'activa' ? 'Votación Activa' : 
                 eleccion.estado === 'finalizada' ? 'Finalizada' : 'Pendiente'}
              </Badge>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-white/50 hover:text-white hover:bg-white/10 rounded-xl"
                onClick={() => cargarResultados()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Election Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-white/60 text-xs uppercase tracking-widest">Resultados en tiempo real</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">
            {eleccion.nombre}
          </h2>
          {eleccion.descripcion && (
            <p className="text-white/50 text-lg max-w-2xl mx-auto">{eleccion.descripcion}</p>
          )}
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{getTotalVotosEleccion()}</div>
              <div className="text-white/40 text-xs uppercase tracking-wider">Votos totales</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{cargos.length}</div>
              <div className="text-white/40 text-xs uppercase tracking-wider">Cargos</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <div className="text-white/40 text-xs">{lastUpdate.toLocaleTimeString('es-CO')}</div>
            </div>
          </div>
        </div>

        {/* Cargo Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide">
          {cargos.map((cargo) => {
            const resultadosCargo = getResultadosPorCargo(cargo)
            const totalVotos = resultadosCargo.reduce((sum, r) => sum + r.votos, 0)
            const isSelected = cargo.id === selectedCargo
            
            return (
              <button
                key={cargo.id}
                onClick={() => setSelectedCargo(cargo.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                  isSelected
                    ? 'bg-white text-[#11357b] shadow-xl shadow-white/20 scale-105'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}
              >
                <Trophy className={`w-4 h-4 ${isSelected ? 'text-[#11357b]' : 'text-white/40'}`} />
                {cargo.nombre}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  isSelected ? 'bg-[#11357b]/10 text-[#11357b]' : 'bg-white/10 text-white/40'
                }`}>
                  {totalVotos}
                </span>
              </button>
            )
          })}
        </div>

        {/* Contenido del cargo */}
        {cargoSeleccionado && (
          <div>
            {resultadosActuales.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-12 text-center">
                <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg">No hay candidatos en este cargo</p>
              </div>
            ) : (
              <>
                {/* Podio visual */}
                {podio.length >= 2 && totalVotosCargo > 0 && (
                  <div className="mb-10">
                    <div className="flex items-end justify-center gap-3 md:gap-6 max-w-3xl mx-auto px-4">
                      {/* 2do lugar */}
                      {podio[1] && (
                        <div className="flex-1 max-w-[200px]">
                          <div className={`text-center mb-3 transition-all duration-500 ${animateVotes ? 'scale-105' : 'scale-100'}`}>
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xl shadow-gray-400/20">
                              <span className="text-xl md:text-2xl font-black text-gray-700">
                                {podio[1].numero_lista || '2'}
                              </span>
                            </div>
                            <h4 className="text-white font-bold text-sm md:text-base truncate px-1">{podio[1].nombre}</h4>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <TrendingUp className="w-3 h-3 text-gray-400" />
                              <span className="text-white/70 text-sm font-semibold">{podio[1].votos} votos</span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-t from-gray-400/30 to-gray-300/20 backdrop-blur-xl rounded-t-2xl border border-white/10 border-b-0 h-28 md:h-32 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-400/5 to-transparent" />
                            <div className="text-center relative z-10">
                              <Medal className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                              <span className="text-3xl font-black text-white/80">2°</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 1er lugar */}
                      {podio[0] && (
                        <div className="flex-1 max-w-[220px]">
                          <div className={`text-center mb-3 transition-all duration-500 ${animateVotes ? 'scale-110' : 'scale-100'}`}>
                            <div className="relative">
                              <div className="w-18 h-18 md:w-20 md:h-20 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xl shadow-yellow-400/30 ring-4 ring-yellow-400/20">
                                <span className="text-2xl md:text-3xl font-black text-yellow-900">
                                  {podio[0].numero_lista || '1'}
                                </span>
                              </div>
                              <Crown className="w-6 h-6 text-yellow-400 absolute -top-3 left-1/2 -translate-x-1/2 animate-bounce" />
                            </div>
                            <h4 className="text-white font-bold text-base md:text-lg truncate px-1">{podio[0].nombre}</h4>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                              <span className="text-yellow-300 text-base font-bold">{podio[0].votos} votos</span>
                            </div>
                            <div className="text-yellow-400/60 text-xs mt-0.5">
                              {totalVotosCargo > 0 ? `${((podio[0].votos / totalVotosCargo) * 100).toFixed(1)}%` : '0%'}
                            </div>
                          </div>
                          <div className="bg-gradient-to-t from-yellow-400/30 to-yellow-300/15 backdrop-blur-xl rounded-t-2xl border border-yellow-400/20 border-b-0 h-40 md:h-48 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/5 to-transparent" />
                            <div className="text-center relative z-10">
                              <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-1" />
                              <span className="text-4xl font-black text-white">1°</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3er lugar */}
                      {podio[2] && (
                        <div className="flex-1 max-w-[200px]">
                          <div className={`text-center mb-3 transition-all duration-500 ${animateVotes ? 'scale-105' : 'scale-100'}`}>
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xl shadow-amber-700/20">
                              <span className="text-xl md:text-2xl font-black text-amber-100">
                                {podio[2].numero_lista || '3'}
                              </span>
                            </div>
                            <h4 className="text-white font-bold text-sm md:text-base truncate px-1">{podio[2].nombre}</h4>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <TrendingUp className="w-3 h-3 text-amber-500" />
                              <span className="text-white/70 text-sm font-semibold">{podio[2].votos} votos</span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-t from-amber-700/30 to-amber-600/15 backdrop-blur-xl rounded-t-2xl border border-amber-600/20 border-b-0 h-20 md:h-24 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-amber-700/5 to-transparent" />
                            <div className="text-center relative z-10">
                              <Award className="w-7 h-7 text-amber-500 mx-auto mb-1" />
                              <span className="text-2xl font-black text-white/70">3°</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Base del podio */}
                    <div className="max-w-3xl mx-auto h-2 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
                  </div>
                )}

                {/* Barras detalladas */}
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-white/40" />
                      <h3 className="text-white font-semibold">Detalle de Resultados</h3>
                    </div>
                    <span className="text-white/40 text-sm">{totalVotosCargo} votos totales</span>
                  </div>
                  <div className="p-4 md:p-6 space-y-3">
                    {resultadosActuales.map((candidato, index) => {
                      const porcentaje = totalVotosCargo > 0 ? (candidato.votos / totalVotosCargo) * 100 : 0
                      const isFirst = index === 0 && candidato.votos > 0
                      
                      const colors = [
                        { bar: 'from-yellow-400 to-amber-500', text: 'text-yellow-400', bg: 'bg-yellow-400/10', ring: 'ring-yellow-400/30' },
                        { bar: 'from-gray-300 to-gray-400', text: 'text-gray-300', bg: 'bg-gray-300/10', ring: 'ring-gray-300/30' },
                        { bar: 'from-amber-600 to-amber-700', text: 'text-amber-500', bg: 'bg-amber-500/10', ring: 'ring-amber-500/30' },
                      ]
                      const color = colors[index] || { bar: 'from-blue-400 to-blue-500', text: 'text-blue-400', bg: 'bg-blue-400/10', ring: 'ring-blue-400/30' }

                      return (
                        <div 
                          key={candidato.id}
                          className={`group relative rounded-2xl p-4 transition-all duration-300 hover:bg-white/5 ${
                            isFirst ? `${color.bg} ring-1 ${color.ring}` : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Posición */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-lg ${
                              index < 3 
                                ? `bg-gradient-to-br ${color.bar} text-white shadow-lg` 
                                : 'bg-white/10 text-white/40'
                            }`}>
                              {index + 1}
                            </div>

                            {/* Número de lista */}
                            {candidato.numero_lista && (
                              <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center text-white/70 font-bold text-sm shrink-0 border border-white/10">
                                #{candidato.numero_lista}
                              </div>
                            )}

                            {/* Info + barra */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h4 className={`font-bold truncate ${isFirst ? 'text-white text-base' : 'text-white/80 text-sm'}`}>
                                    {candidato.nombre}
                                  </h4>
                                  {isFirst && (
                                    <Badge className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] px-2 shrink-0">
                                      <Crown className="w-3 h-3 mr-1" />
                                      Líder
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-3">
                                  <span className={`text-xs font-medium ${index < 3 ? color.text : 'text-white/40'}`}>
                                    {porcentaje.toFixed(1)}%
                                  </span>
                                  <span className={`text-lg font-black tabular-nums ${isFirst ? 'text-white' : candidato.votos > 0 ? 'text-white/70' : 'text-white/30'} ${
                                    animateVotes ? 'scale-110' : 'scale-100'
                                  } transition-transform duration-300`}>
                                    {candidato.votos}
                                  </span>
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full bg-gradient-to-r ${index < 3 ? color.bar : 'from-blue-400 to-blue-500'} transition-all duration-700 ease-out`}
                                  style={{ 
                                    width: `${porcentaje}%`,
                                    opacity: candidato.votos > 0 ? 1 : 0.3
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-16 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-white/30 text-sm">
            © 2026 Colegio Nacional de Curadores Urbanos
          </p>
          {isLive && (
            <div className="text-white/20 text-xs mt-2 flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Actualización automática cada 5 segundos
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}
