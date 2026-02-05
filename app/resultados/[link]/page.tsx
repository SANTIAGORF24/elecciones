"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  Crown
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

  const cargarResultados = useCallback(async (eleccionId?: string) => {
    const id = eleccionId || eleccion?.id
    if (!id) return

    const { data } = await obtenerResultados(id)
    if (data) {
      setResultados(data)
      setLastUpdate(new Date())
    }
  }, [eleccion?.id])

  useEffect(() => {
    cargarDatos()
  }, [linkPublico])

  // Suscripción en tiempo real
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

    // Backup: actualizar cada 5 segundos también
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
        
        // Cargar todos los candidatos de cada cargo
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

  // Combinar candidatos con sus votos (siempre mostrar todos)
  const getResultadosPorCargo = (cargo: Cargo): CandidatoConVotos[] => {
    const candidatos = candidatosPorCargo[cargo.id] || []
    const votosDelCargo = resultados.filter(r => r.cargo === cargo.nombre)
    
    // Crear mapa de votos por nombre de candidato
    const votosMap: Record<string, number> = {}
    votosDelCargo.forEach(v => {
      votosMap[v.candidato] = v.votos
    })
    
    // Combinar candidatos con sus votos
    const candidatosConVotos = candidatos.map(c => ({
      id: c.id,
      nombre: c.nombre,
      numero_lista: c.numero_lista,
      votos: votosMap[c.nombre] || 0
    }))
    
    // Ordenar por votos (mayor a menor)
    return candidatosConVotos.sort((a, b) => b.votos - a.votos)
  }

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return { bg: "bg-gradient-to-br from-yellow-400 to-amber-500", text: "text-yellow-900", icon: Crown }
      case 1: return { bg: "bg-gradient-to-br from-gray-300 to-gray-400", text: "text-gray-700", icon: Medal }
      case 2: return { bg: "bg-gradient-to-br from-amber-600 to-amber-700", text: "text-amber-100", icon: Award }
      default: return { bg: "bg-gray-100", text: "text-gray-600", icon: null }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <Vote className="w-16 h-16 text-[#11357b]/30 mx-auto" />
            </div>
            <Vote className="w-16 h-16 text-[#11357b] mx-auto relative" />
          </div>
          <p className="text-gray-500 mt-6 text-lg">Cargando resultados...</p>
        </div>
      </div>
    )
  }

  if (error || !eleccion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border shadow-xl">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Elección no encontrada</h2>
            <p className="text-gray-500">
              El enlace que utilizaste no es válido o la elección ya no está disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#11357b] sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <Image src="/logo.webp" alt="Logo" width={40} height={40} className="object-contain" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Colegio Nacional de Curadores Urbanos</h1>
                <p className="text-white/70 text-sm">Resultados de Votación</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {eleccion.estado === 'activa' && isLive && (
                <Badge className="bg-red-500 text-white animate-pulse px-3 py-1">
                  <Radio className="w-3 h-3 mr-2" />
                  EN VIVO
                </Badge>
              )}
              <Badge className={
                eleccion.estado === 'activa' 
                  ? "bg-green-500 text-white" 
                  : eleccion.estado === 'finalizada'
                  ? "bg-white/20 text-white"
                  : "bg-yellow-500 text-white"
              }>
                {eleccion.estado === 'activa' ? 'Votación Activa' : 
                 eleccion.estado === 'finalizada' ? 'Finalizada' : 'Pendiente'}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
                onClick={() => cargarResultados()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Título de la elección */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-[#11357b] mb-4 tracking-tight">
            {eleccion.nombre}
          </h2>
          {eleccion.descripcion && (
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">{eleccion.descripcion}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-500 text-sm">
              Actualizado: {lastUpdate.toLocaleTimeString('es-CO')}
            </span>
          </div>
        </div>

        {/* Resultados por cargo */}
        {cargos.length === 0 ? (
          <Card className="max-w-md mx-auto border-0 shadow-2xl">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay cargos configurados en esta elección</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {cargos.map((cargo) => {
              const resultadosCargo = getResultadosPorCargo(cargo)
              const totalVotos = resultadosCargo.reduce((sum, r) => sum + r.votos, 0)

              return (
                <Card key={cargo.id} className="border shadow-xl overflow-hidden bg-white">
                  <CardHeader className="bg-gradient-to-r from-[#11357b] to-[#1e5a9a] text-white py-6">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-3 text-xl">
                        <Trophy className="w-6 h-6" />
                        {cargo.nombre}
                      </span>
                      <Badge className="bg-white/20 text-white text-sm font-normal">
                        {totalVotos} votos totales
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {resultadosCargo.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg">No hay candidatos configurados</p>
                        <p className="text-sm">Agregue candidatos a este cargo</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {resultadosCargo.map((candidato, index) => {
                          const porcentaje = totalVotos > 0 ? (candidato.votos / totalVotos) * 100 : 0
                          const { bg, text, icon: IconComponent } = getMedalColor(index)
                          const isWinner = index === 0 && candidato.votos > 0

                          return (
                            <div 
                              key={candidato.id}
                              className={`relative rounded-xl p-4 transition-all hover:scale-[1.01] ${
                                isWinner 
                                  ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 shadow-lg" 
                                  : index < 3 
                                  ? "bg-gray-50 border border-gray-100" 
                                  : "bg-gray-50/50 border border-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                {/* Posición / Medalla */}
                                <div className={`w-12 h-12 ${bg} rounded-full flex items-center justify-center shadow-lg shrink-0`}>
                                  {IconComponent ? (
                                    <IconComponent className={`w-6 h-6 ${text}`} />
                                  ) : (
                                    <span className={`font-bold text-lg ${text}`}>{index + 1}</span>
                                  )}
                                </div>

                                {/* Número de lista */}
                                {candidato.numero_lista && (
                                  <div className="w-10 h-10 bg-[#11357b] rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                                    {candidato.numero_lista}
                                  </div>
                                )}

                                {/* Info del candidato */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-bold truncate ${isWinner ? "text-lg text-gray-900" : "text-gray-800"}`}>
                                      {candidato.nombre}
                                    </h4>
                                    {isWinner && (
                                      <Badge className="bg-yellow-400 text-yellow-900 text-xs">
                                        Líder
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Progress 
                                      value={porcentaje} 
                                      className={`h-2 flex-1 ${isWinner ? "bg-yellow-100" : "bg-gray-200"}`}
                                    />
                                    <span className="text-sm font-medium text-gray-500 w-14 text-right">
                                      {totalVotos > 0 ? `${porcentaje.toFixed(1)}%` : "0%"}
                                    </span>
                                  </div>
                                </div>

                                {/* Votos */}
                                <div className="text-right shrink-0">
                                  <div className={`text-2xl font-bold ${isWinner ? "text-[#11357b]" : candidato.votos > 0 ? "text-gray-700" : "text-gray-400"}`}>
                                    {candidato.votos}
                                  </div>
                                  <div className="text-xs text-gray-400 uppercase tracking-wide">votos</div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#11357b] mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-white/80 text-sm">
            © 2025 Colegio Nacional de Curadores Urbanos
          </p>
          {eleccion.estado === 'activa' && (
            <p className="text-white/60 text-xs mt-2 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Resultados en tiempo real
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}
