"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Vote, 
  Check, 
  AlertCircle, 
  Loader2,
  CheckCircle,
  ChevronRight,
  Minus,
  Plus
} from "lucide-react"
import { useAuthStore } from "@/store/auth-store"
import { 
  obtenerElecciones, 
  obtenerCargosPorEleccion,
  obtenerCandidatosPorCargo,
  registrarVotoMultiple,
  supabase,
  type Eleccion,
  type Cargo,
  type Candidato
} from "@/lib/supabase"

export default function VotarPage() {
  const { usuario } = useAuthStore()
  const [elecciones, setElecciones] = useState<Eleccion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEleccion, setSelectedEleccion] = useState<Eleccion | null>(null)
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [candidatosPorCargo, setCandidatosPorCargo] = useState<Record<string, Candidato[]>>({})
  const [votosRealizadosPorCargo, setVotosRealizadosPorCargo] = useState<Record<string, number>>({})
  const [isVoting, setIsVoting] = useState(false)
  const [cantidadVotos, setCantidadVotos] = useState(1)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    cargo: Cargo | null
    candidato: Candidato | null
  }>({ open: false, cargo: null, candidato: null })
  const [successDialog, setSuccessDialog] = useState(false)

  const votosDisponibles = usuario ? usuario.votos_base + usuario.poderes : 0

  useEffect(() => {
    cargarElecciones()
  }, [])

  const cargarElecciones = async () => {
    setLoading(true)
    const { data } = await obtenerElecciones()
    if (data) {
      setElecciones(data.filter(e => e.estado === 'activa'))
    }
    setLoading(false)
  }

  const handleSeleccionarEleccion = async (eleccion: Eleccion) => {
    setSelectedEleccion(eleccion)
    setLoading(true)
    
    const { data: cargosData } = await obtenerCargosPorEleccion(eleccion.id)
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
      
      await verificarVotosRealizados(eleccion.id)
    }
    
    setLoading(false)
  }

  const verificarVotosRealizados = async (eleccionId: string) => {
    if (!usuario) return
    
    const { data } = await supabase
      .from('registro_votos')
      .select('cargo_id, votos_usados')
      .eq('eleccion_id', eleccionId)
      .eq('usuario_id', usuario.id)
    
    const votosMap: Record<string, number> = {}
    data?.forEach((voto: any) => {
      votosMap[voto.cargo_id] = (votosMap[voto.cargo_id] || 0) + voto.votos_usados
    })
    setVotosRealizadosPorCargo(votosMap)
  }

  const getVotosRestantesCargo = (cargoId: string) => {
    const usados = votosRealizadosPorCargo[cargoId] || 0
    return votosDisponibles - usados
  }

  const handleOpenConfirmDialog = (cargo: Cargo, candidato: Candidato) => {
    const restantes = getVotosRestantesCargo(cargo.id)
    if (restantes <= 0) return
    
    setCantidadVotos(1)
    setConfirmDialog({
      open: true,
      cargo,
      candidato
    })
  }

  const handleVotar = async () => {
    if (!confirmDialog.cargo || !confirmDialog.candidato || !selectedEleccion || !usuario) {
      return
    }

    const restantes = getVotosRestantesCargo(confirmDialog.cargo.id)
    if (cantidadVotos > restantes || cantidadVotos < 1) {
      alert(`Solo puedes usar entre 1 y ${restantes} votos`)
      return
    }

    setIsVoting(true)
    
    const { error } = await registrarVotoMultiple(
      selectedEleccion.id,
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
      setSuccessDialog(true)
    }

    setConfirmDialog({ open: false, cargo: null, candidato: null })
    setIsVoting(false)
  }

  const cargosConVotos = Object.keys(votosRealizadosPorCargo).filter(k => votosRealizadosPorCargo[k] > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Votar</h1>
        <p className="text-gray-500 mt-1">
          Selecciona una elección activa para emitir tu voto
        </p>
      </div>

      {/* Info de votos */}
      <Card className="border-[#11357b]/20 bg-[#11357b]/5">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Vote className="w-5 h-5 text-[#11357b]" />
              <span className="font-medium">Tus votos disponibles:</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <span className="text-2xl font-bold text-[#11357b]">{votosDisponibles}</span>
                <p className="text-xs text-gray-500">
                  ({usuario?.votos_base} base + {usuario?.poderes} poderes)
                </p>
              </div>
              {selectedEleccion && (
                <div className="text-center border-l pl-4">
                  <span className="text-lg font-semibold text-gray-600">por cargo</span>
                  <p className="text-xs text-gray-500">puedes usar todos</p>
                </div>
              )}
            </div>
          </div>
          {selectedEleccion && (
            <div className="mt-3 pt-3 border-t border-[#11357b]/20 text-sm text-gray-600">
              💡 <strong>Recuerda:</strong> Puedes usar tus {votosDisponibles} votos en <strong>cada cargo</strong> de la elección.
            </div>
          )}
        </CardContent>
      </Card>

      {loading && !selectedEleccion ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#11357b]" />
        </div>
      ) : !selectedEleccion ? (
        <>
          {elecciones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay elecciones activas en este momento</p>
                <p className="text-sm text-gray-400 mt-2">
                  Las elecciones aparecerán aquí cuando estén disponibles para votar
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {elecciones.map((eleccion) => (
                <Card 
                  key={eleccion.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSeleccionarEleccion(eleccion)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{eleccion.nombre}</CardTitle>
                      <Badge className="bg-green-100 text-green-700">Activa</Badge>
                    </div>
                    {eleccion.descripcion && (
                      <CardDescription className="line-clamp-2">
                        {eleccion.descripcion}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-[#11357b] hover:bg-[#0d2a63]">
                      <Vote className="w-4 h-4 mr-2" />
                      Votar en esta elección
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSelectedEleccion(null)
                  setVotosRealizadosPorCargo({})
                }}
                className="mb-2"
              >
                ← Volver a elecciones
              </Button>
              <h2 className="text-xl font-bold">{selectedEleccion.nombre}</h2>
              {selectedEleccion.descripcion && (
                <p className="text-gray-500">{selectedEleccion.descripcion}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Cargos en los que votaste</div>
              <div className="text-2xl font-bold text-[#11357b]">
                {cargosConVotos} / {cargos.length}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#11357b]" />
            </div>
          ) : cargos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Esta elección no tiene cargos configurados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {cargos.map((cargo) => {
                const votosUsadosEnCargo = votosRealizadosPorCargo[cargo.id] || 0
                const votosRestantes = votosDisponibles - votosUsadosEnCargo
                const yaUsoTodos = votosRestantes <= 0

                return (
                  <Card key={cargo.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="flex items-center gap-2">
                          {cargo.nombre}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {votosUsadosEnCargo > 0 && (
                            <Badge className="bg-green-100 text-green-700">
                              <Check className="w-3 h-3 mr-1" />
                              {votosUsadosEnCargo} voto(s) usado(s)
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[#11357b] border-[#11357b]">
                            {votosRestantes} restante(s)
                          </Badge>
                        </div>
                      </div>
                      {cargo.descripcion && (
                        <CardDescription>{cargo.descripcion}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {yaUsoTodos ? (
                        <div className="bg-green-50 text-green-700 p-4 rounded-lg text-center">
                          <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                          <p className="font-medium">Usaste todos tus votos en este cargo</p>
                          <p className="text-sm text-green-600">Has usado {votosUsadosEnCargo} de {votosDisponibles} votos</p>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {candidatosPorCargo[cargo.id]?.map((candidato) => (
                            <div
                              key={candidato.id}
                              onClick={() => handleOpenConfirmDialog(cargo, candidato)}
                              className="border rounded-lg p-4 hover:border-[#11357b] hover:bg-[#11357b]/5 cursor-pointer transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-[#11357b] rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0">
                                  {candidato.numero_lista || "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900">{candidato.nombre}</h4>
                                  {candidato.descripcion && (
                                    <p className="text-sm text-gray-500 line-clamp-2">{candidato.descripcion}</p>
                                  )}
                                </div>
                              </div>
                              <Button 
                                className="w-full mt-3 bg-[#11357b] hover:bg-[#0d2a63]"
                                size="sm"
                              >
                                <Vote className="w-4 h-4 mr-2" />
                                Votar
                              </Button>
                            </div>
                          ))}
                          {!candidatosPorCargo[cargo.id]?.length && (
                            <p className="text-gray-400 col-span-full text-center py-4">
                              No hay candidatos para este cargo
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Dialog de confirmación con selector de cantidad */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({...confirmDialog, open})}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Voto</DialogTitle>
            <DialogDescription>
              Selecciona cuántos votos quieres usar para este candidato
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Cargo</div>
              <div className="font-semibold text-lg">{confirmDialog.cargo?.nombre}</div>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-[#11357b] rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {confirmDialog.candidato?.numero_lista || "?"}
                </div>
                <div>
                  <div className="font-semibold text-lg">{confirmDialog.candidato?.nombre}</div>
                  {confirmDialog.candidato?.descripcion && (
                    <div className="text-sm text-gray-500">{confirmDialog.candidato.descripcion}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Selector de cantidad de votos */}
            <div className="bg-[#11357b]/5 p-4 rounded-lg">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                ¿Cuántos votos quieres usar?
              </Label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
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
                  onClick={() => setCantidadVotos(Math.min(
                    confirmDialog.cargo ? getVotosRestantesCargo(confirmDialog.cargo.id) : 1,
                    cantidadVotos + 1
                  ))}
                  disabled={confirmDialog.cargo ? cantidadVotos >= getVotosRestantesCargo(confirmDialog.cargo.id) : true}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex justify-center gap-2 mt-3">
                {[1, Math.ceil((confirmDialog.cargo ? getVotosRestantesCargo(confirmDialog.cargo.id) : 1) / 2), confirmDialog.cargo ? getVotosRestantesCargo(confirmDialog.cargo.id) : 1]
                  .filter((v, i, a) => a.indexOf(v) === i && v > 0)
                  .map(v => (
                    <Button
                      key={v}
                      variant={cantidadVotos === v ? "default" : "outline"}
                      size="sm"
                      className={cantidadVotos === v ? "bg-[#11357b]" : ""}
                      onClick={() => setCantidadVotos(v)}
                    >
                      {v === (confirmDialog.cargo ? getVotosRestantesCargo(confirmDialog.cargo.id) : 1) ? "Todos" : v}
                    </Button>
                  ))
                }
              </div>
            </div>

            <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
              <strong>Importante:</strong> Tu voto es secreto. Nadie podrá saber por quién votaste.
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({open: false, cargo: null, candidato: null})}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-[#11357b] hover:bg-[#0d2a63]"
              onClick={handleVotar}
              disabled={isVoting}
            >
              {isVoting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Votando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar {cantidadVotos} voto(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de éxito */}
      <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Voto(s) Registrado(s)!</h3>
            <p className="text-gray-500">
              Tus votos han sido registrados exitosamente de forma anónima y segura.
            </p>
          </div>
          <DialogFooter className="justify-center">
            <Button 
              className="bg-[#11357b] hover:bg-[#0d2a63]"
              onClick={() => setSuccessDialog(false)}
            >
              Continuar Votando
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
