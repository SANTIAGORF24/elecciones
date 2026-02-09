"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  Vote, 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  ChevronRight,
  Minus,
  Plus,
  Check,
  User,
  Shield,
  ArrowLeft,
  Zap,
  PartyPopper,
  BarChart3
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  buscarUsuarioPorCedula,
  obtenerEleccionPorLink,
  obtenerCargosPorEleccion,
  obtenerCandidatosPorCargo,
  registrarVotoMultiple,
  supabase,
  type Eleccion,
  type Cargo,
  type Candidato
} from "@/lib/supabase"
import Image from "next/image"

interface UsuarioVotante {
  id: string
  cedula: string
  nombre_completo: string
  votos_base: number
  poderes: number
  activo: boolean
  rol: string
}

type Step = 'cedula' | 'votando' | 'completado'

export default function VotacionPublicaPage() {
  const params = useParams()
  const router = useRouter()
  const linkPublico = params.link as string

  // Estados generales
  const [eleccion, setEleccion] = useState<Eleccion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('cedula')

  // Estados de cédula
  const [cedula, setCedula] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [errorCedula, setErrorCedula] = useState("")
  const [usuario, setUsuario] = useState<UsuarioVotante | null>(null)

  // Estados de votación
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [candidatosPorCargo, setCandidatosPorCargo] = useState<Record<string, Candidato[]>>({})
  const [votosRealizadosPorCargo, setVotosRealizadosPorCargo] = useState<Record<string, number>>({})
  const [cargoActualIndex, setCargoActualIndex] = useState(0)
  const [isVoting, setIsVoting] = useState(false)
  const [cantidadVotos, setCantidadVotos] = useState(1)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    cargo: Cargo | null
    candidato: Candidato | null
  }>({ open: false, cargo: null, candidato: null })
  const [successVotoDialog, setSuccessVotoDialog] = useState(false)
  const [animatingSuccess, setAnimatingSuccess] = useState(false)

  const votosDisponibles = usuario ? usuario.votos_base + usuario.poderes : 0

  // Cargar elección al montar
  useEffect(() => {
    cargarEleccion()
  }, [linkPublico])

  const cargarEleccion = async () => {
    setLoading(true)
    const { data, error } = await obtenerEleccionPorLink(linkPublico)
    
    if (error || !data) {
      setError("Elección no encontrada")
      setLoading(false)
      return
    }

    if (data.estado !== 'activa') {
      setError("Esta elección no está activa en este momento")
      setLoading(false)
      return
    }

    setEleccion(data)

    // Cargar cargos y candidatos
    const { data: cargosData } = await obtenerCargosPorEleccion(data.id)
    if (cargosData) {
      setCargos(cargosData)
      const candidatosMap: Record<string, Candidato[]> = {}
      for (const cargo of cargosData) {
        const { data: candidatosData } = await obtenerCandidatosPorCargo(cargo.id)
        if (candidatosData) {
          candidatosMap[cargo.id] = candidatosData
        }
      }
      setCandidatosPorCargo(candidatosMap)
    }

    setLoading(false)
  }

  // Buscar usuario por cédula
  const handleBuscarCedula = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cedula.trim()) return

    setErrorCedula("")
    setBuscando(true)

    const { data, error } = await buscarUsuarioPorCedula(cedula.trim())
    
    if (error || !data) {
      setErrorCedula("No se encontró un votante con esta cédula. Verifica e intenta de nuevo.")
      setBuscando(false)
      return
    }

    setUsuario(data as UsuarioVotante)

    // Verificar votos ya realizados
    if (eleccion) {
      const { data: votosUsados } = await supabase
        .from('registro_votos')
        .select('cargo_id, votos_usados')
        .eq('eleccion_id', eleccion.id)
        .eq('usuario_id', data.id)

      const votosMap: Record<string, number> = {}
      votosUsados?.forEach((voto: any) => {
        votosMap[voto.cargo_id] = (votosMap[voto.cargo_id] || 0) + voto.votos_usados
      })
      setVotosRealizadosPorCargo(votosMap)
    }

    setBuscando(false)
    setStep('votando')
  }

  const getVotosRestantesCargo = (cargoId: string) => {
    const usados = votosRealizadosPorCargo[cargoId] || 0
    return votosDisponibles - usados
  }

  const handleOpenConfirmDialog = (cargo: Cargo, candidato: Candidato) => {
    const restantes = getVotosRestantesCargo(cargo.id)
    if (restantes <= 0) return
    setCantidadVotos(1)
    setConfirmDialog({ open: true, cargo, candidato })
  }

  const handleVotar = async () => {
    if (!confirmDialog.cargo || !confirmDialog.candidato || !eleccion || !usuario) return

    const restantes = getVotosRestantesCargo(confirmDialog.cargo.id)
    if (cantidadVotos > restantes || cantidadVotos < 1) return

    setIsVoting(true)
    
    const { error } = await registrarVotoMultiple(
      eleccion.id,
      usuario.id,
      confirmDialog.cargo.id,
      confirmDialog.candidato.id,
      cantidadVotos
    )

    if (error) {
      alert(typeof error === 'string' ? error : 'Error al registrar voto')
    } else {
      setVotosRealizadosPorCargo(prev => ({
        ...prev,
        [confirmDialog.cargo!.id]: (prev[confirmDialog.cargo!.id] || 0) + cantidadVotos
      }))
      setSuccessVotoDialog(true)
    }

    setConfirmDialog({ open: false, cargo: null, candidato: null })
    setIsVoting(false)
  }

  const todosCargosVotados = cargos.length > 0 && cargos.every(c => {
    const usados = votosRealizadosPorCargo[c.id] || 0
    return usados >= votosDisponibles
  })

  const handleFinalizarVotacion = () => {
    setStep('completado')
    setAnimatingSuccess(true)
  }

  const handleVerResultados = () => {
    if (eleccion?.link_publico) {
      router.push(`/resultados/${eleccion.link_publico}`)
    }
  }

  const handleNuevoVotante = () => {
    setCedula("")
    setUsuario(null)
    setVotosRealizadosPorCargo({})
    setCargoActualIndex(0)
    setStep('cedula')
    setAnimatingSuccess(false)
  }

  // Loading inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-20 h-20 bg-[#11357b] rounded-3xl flex items-center justify-center mx-auto animate-pulse shadow-xl shadow-[#11357b]/30">
              <Vote className="w-10 h-10 text-white" />
            </div>
          </div>
          <p className="text-gray-500 mt-6 text-lg font-medium">Cargando votación...</p>
        </div>
      </div>
    )
  }

  // Error
  if (error || !eleccion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-0">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Votación no disponible</h2>
            <p className="text-gray-500">{error || "No se encontró la elección"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header compacto */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md border overflow-hidden">
                <Image src="/logo.webp" alt="Logo" width={32} height={32} className="object-contain" />
              </div>
              <div>
                <h1 className="font-bold text-sm text-[#11357b]">CNCU</h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Votación Digital</p>
              </div>
            </div>
            <Badge className="bg-green-50 text-green-700 border border-green-200 px-3">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse" />
              Votación Activa
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 md:py-10">

        {/* ====== PASO 1: Ingreso de cédula ====== */}
        {step === 'cedula' && (
          <div className="max-w-lg mx-auto">
            {/* Título de la elección */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#11357b] rounded-2xl shadow-xl shadow-[#11357b]/20 mb-4">
                <Vote className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {eleccion.nombre}
              </h2>
              {eleccion.descripcion && (
                <p className="text-gray-500">{eleccion.descripcion}</p>
              )}
            </div>

            <Card className="shadow-2xl border-0 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-[#11357b] via-blue-500 to-[#11357b]" />
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">Identificación del Votante</CardTitle>
                <CardDescription>
                  Ingresa tu número de cédula para comenzar
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <form onSubmit={handleBuscarCedula} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="cedula" className="text-sm font-medium">Número de Cédula</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="cedula"
                        type="text"
                        placeholder="Ej: 1234567890"
                        value={cedula}
                        onChange={(e) => {
                          setCedula(e.target.value)
                          setErrorCedula("")
                        }}
                        className="pl-11 h-12 text-lg border-gray-200 focus:border-[#11357b] focus:ring-[#11357b]"
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                    {errorCedula && (
                      <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {errorCedula}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#11357b] hover:bg-[#0d2a63] text-base font-semibold shadow-lg shadow-[#11357b]/25 transition-all hover:shadow-xl hover:shadow-[#11357b]/30"
                    disabled={buscando || !cedula.trim()}
                  >
                    {buscando ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5 mr-2" />
                        Buscar Votante
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-[#11357b] mt-0.5 shrink-0" />
                    <div className="text-sm text-gray-600">
                      <p className="font-medium text-[#11357b] mb-1">Voto 100% secreto</p>
                      <p>Solo se registra tu participación. Nadie podrá saber por quién votaste.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ====== PASO 2: Votación ====== */}
        {step === 'votando' && usuario && (
          <div className="space-y-6">
            {/* Info del votante */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-[#11357b] to-[#1e5a9a] text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="py-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white/60 text-xs uppercase tracking-wider">Votante</p>
                      <h3 className="font-bold text-lg">{usuario.nombre_completo}</h3>
                      <p className="text-white/70 text-sm">C.C. {usuario.cedula}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center bg-white/10 rounded-xl px-4 py-2">
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-yellow-300" />
                        <span className="text-2xl font-bold">{votosDisponibles}</span>
                      </div>
                      <p className="text-[10px] text-white/60 uppercase tracking-wider">votos/cargo</p>
                    </div>
                    <div className="text-xs text-white/50 text-right">
                      <p>{usuario.votos_base} base</p>
                      <p>+ {usuario.poderes} poderes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress de cargos */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {cargos.map((cargo, index) => {
                const usados = votosRealizadosPorCargo[cargo.id] || 0
                const completado = usados >= votosDisponibles
                return (
                  <button
                    key={cargo.id}
                    onClick={() => setCargoActualIndex(index)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      index === cargoActualIndex
                        ? 'bg-[#11357b] text-white shadow-lg shadow-[#11357b]/25'
                        : completado
                        ? 'bg-green-100 text-green-700'
                        : 'bg-white text-gray-500 hover:bg-gray-50 border'
                    }`}
                  >
                    {completado ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                        index === cargoActualIndex ? 'bg-white/20' : 'bg-gray-200'
                      }`}>
                        {index + 1}
                      </span>
                    )}
                    <span className="hidden sm:inline">{cargo.nombre}</span>
                    <span className="sm:hidden">{cargo.nombre.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>

            {/* Cargo actual */}
            {cargos.length > 0 && (() => {
              const cargo = cargos[cargoActualIndex]
              const votosUsados = votosRealizadosPorCargo[cargo.id] || 0
              const votosRestantes = votosDisponibles - votosUsados
              const yaUsoTodos = votosRestantes <= 0

              return (
                <Card className="border-0 shadow-xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Vote className="w-5 h-5 text-[#11357b]" />
                        {cargo.nombre}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {votosUsados > 0 && (
                          <Badge className="bg-green-50 text-green-700 border border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            {votosUsados} usado(s)
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[#11357b] border-[#11357b]/30">
                          {votosRestantes} restante(s)
                        </Badge>
                      </div>
                    </div>
                    {cargo.descripcion && (
                      <CardDescription>{cargo.descripcion}</CardDescription>
                    )}
                    {/* Barra de progreso visual */}
                    <div className="mt-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#11357b] to-blue-400 rounded-full transition-all duration-500"
                          style={{ width: `${(votosUsados / votosDisponibles) * 100}%` }}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {yaUsoTodos ? (
                      <div className="bg-green-50 border border-green-100 p-6 rounded-2xl text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="font-semibold text-green-800 text-lg">¡Completado!</p>
                        <p className="text-sm text-green-600 mt-1">Usaste todos tus votos en este cargo</p>
                        
                        {cargoActualIndex < cargos.length - 1 ? (
                          <Button 
                            className="mt-4 bg-[#11357b] hover:bg-[#0d2a63]"
                            onClick={() => setCargoActualIndex(prev => prev + 1)}
                          >
                            Siguiente cargo
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        ) : (
                          <Button 
                            className="mt-4 bg-green-600 hover:bg-green-700"
                            onClick={handleFinalizarVotacion}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Finalizar Votación
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {candidatosPorCargo[cargo.id]?.map((candidato) => (
                          <div
                            key={candidato.id}
                            onClick={() => handleOpenConfirmDialog(cargo, candidato)}
                            className="group border-2 border-gray-100 rounded-2xl p-4 hover:border-[#11357b] hover:shadow-lg cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-14 h-14 bg-gradient-to-br from-[#11357b] to-[#1e5a9a] rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:scale-105 transition-transform">
                                {candidato.numero_lista || "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 truncate">{candidato.nombre}</h4>
                                {candidato.descripcion && (
                                  <p className="text-sm text-gray-500 line-clamp-1">{candidato.descripcion}</p>
                                )}
                              </div>
                            </div>
                            <Button 
                              className="w-full bg-[#11357b]/10 text-[#11357b] hover:bg-[#11357b] hover:text-white font-semibold transition-all"
                              variant="ghost"
                            >
                              <Vote className="w-4 h-4 mr-2" />
                              Votar
                            </Button>
                          </div>
                        ))}
                        {!candidatosPorCargo[cargo.id]?.length && (
                          <p className="text-gray-400 col-span-full text-center py-8">
                            No hay candidatos para este cargo
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })()}

            {/* Botones de navegación */}
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={handleNuevoVotante}
                className="text-gray-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cambiar votante
              </Button>
              {!todosCargosVotados && Object.keys(votosRealizadosPorCargo).length > 0 && (
                <Button 
                  variant="outline"
                  onClick={handleFinalizarVotacion}
                  className="border-[#11357b] text-[#11357b]"
                >
                  Finalizar votación
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ====== PASO 3: Completado ====== */}
        {step === 'completado' && (
          <div className="max-w-lg mx-auto text-center">
            <div className={`transition-all duration-700 ${animatingSuccess ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <PartyPopper className="w-8 h-8 text-yellow-500 animate-bounce" />
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                ¡Votación Completada!
              </h2>
              <p className="text-gray-500 text-lg mb-2">
                Gracias por participar, <strong>{usuario?.nombre_completo}</strong>
              </p>
              <p className="text-gray-400 mb-8">
                Tus votos han sido registrados de forma segura y anónima
              </p>

              {/* Resumen */}
              <Card className="border-0 shadow-lg mb-6 text-left">
                <CardContent className="py-4">
                  <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">Resumen de votación</h4>
                  <div className="space-y-2">
                    {cargos.map(cargo => {
                      const votos = votosRealizadosPorCargo[cargo.id] || 0
                      return (
                        <div key={cargo.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <span className="text-gray-600">{cargo.nombre}</span>
                          <Badge className={votos > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                            {votos > 0 ? `${votos} voto(s)` : 'Sin votar'}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button
                  className="w-full h-12 bg-[#11357b] hover:bg-[#0d2a63] text-base font-semibold shadow-lg"
                  onClick={handleVerResultados}
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Ver Resultados en Vivo
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={handleNuevoVotante}
                >
                  <User className="w-5 h-5 mr-2" />
                  Siguiente Votante
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Dialog de confirmación */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({...confirmDialog, open})}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Confirmar Voto</DialogTitle>
            <DialogDescription>
              Selecciona cuántos votos usar para este candidato
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Cargo</div>
              <div className="font-semibold">{confirmDialog.cargo?.nombre}</div>
            </div>
            
            <div className="border-2 border-[#11357b]/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#11357b] to-[#1e5a9a] rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg">
                  {confirmDialog.candidato?.numero_lista || "?"}
                </div>
                <div>
                  <div className="font-semibold">{confirmDialog.candidato?.nombre}</div>
                  {confirmDialog.candidato?.descripcion && (
                    <div className="text-sm text-gray-500">{confirmDialog.candidato.descripcion}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Selector de cantidad */}
            <div className="bg-blue-50 p-4 rounded-xl">
              <Label className="text-sm font-medium text-gray-700 mb-3 block text-center">
                ¿Cuántos votos?
              </Label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-10 h-10"
                  onClick={() => setCantidadVotos(Math.max(1, cantidadVotos - 1))}
                  disabled={cantidadVotos <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <span className="text-4xl font-bold text-[#11357b]">{cantidadVotos}</span>
                  <p className="text-xs text-gray-500 mt-1">
                    de {confirmDialog.cargo ? getVotosRestantesCargo(confirmDialog.cargo.id) : 0} disponibles
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-10 h-10"
                  onClick={() => setCantidadVotos(Math.min(
                    confirmDialog.cargo ? getVotosRestantesCargo(confirmDialog.cargo.id) : 1,
                    cantidadVotos + 1
                  ))}
                  disabled={confirmDialog.cargo ? cantidadVotos >= getVotosRestantesCargo(confirmDialog.cargo.id) : true}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {/* Quick select buttons */}
              <div className="flex justify-center gap-2 mt-3">
                {[1, Math.ceil((confirmDialog.cargo ? getVotosRestantesCargo(confirmDialog.cargo.id) : 1) / 2), confirmDialog.cargo ? getVotosRestantesCargo(confirmDialog.cargo.id) : 1]
                  .filter((v, i, a) => a.indexOf(v) === i && v > 0)
                  .map(v => (
                    <Button
                      key={v}
                      variant={cantidadVotos === v ? "default" : "outline"}
                      size="sm"
                      className={`rounded-full ${cantidadVotos === v ? "bg-[#11357b]" : ""}`}
                      onClick={() => setCantidadVotos(v)}
                    >
                      {v === (confirmDialog.cargo ? getVotosRestantesCargo(confirmDialog.cargo.id) : 1) ? `Todos (${v})` : v}
                    </Button>
                  ))
                }
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({open: false, cargo: null, candidato: null})}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#11357b] hover:bg-[#0d2a63]"
              onClick={handleVotar}
              disabled={isVoting}
            >
              {isVoting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Votando...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" /> Confirmar {cantidadVotos} voto(s)</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de voto exitoso */}
      <Dialog open={successVotoDialog} onOpenChange={setSuccessVotoDialog}>
        <DialogContent className="sm:max-w-sm text-center mx-4">
          <div className="py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Voto Registrado!</h3>
            <p className="text-gray-500 text-sm">Tu voto se registró de forma anónima y segura.</p>
          </div>
          <DialogFooter className="justify-center">
            <Button className="bg-[#11357b] hover:bg-[#0d2a63]" onClick={() => setSuccessVotoDialog(false)}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center border-t border-gray-100">
        <p className="text-gray-400 text-xs">
          © 2026 Colegio Nacional de Curadores Urbanos • Votación segura y anónima
        </p>
      </footer>
    </div>
  )
}
