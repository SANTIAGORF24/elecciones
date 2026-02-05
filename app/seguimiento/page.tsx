"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  Users, 
  Check, 
  X, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"
import { useIsAdmin } from "@/store/auth-store"
import { 
  obtenerElecciones, 
  obtenerEstadisticasVotacion,
  type Eleccion
} from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface EstadisticaUsuario {
  usuario_id: string
  nombre: string
  votos_disponibles: number
  votos_usados: number
  ha_votado: boolean
  cargos_votados: number
}

import { DashboardLayout } from "@/components/dashboard-layout"

function SeguimientoPageContent() {
  const isAdmin = useIsAdmin()
  const router = useRouter()
  const [elecciones, setElecciones] = useState<Eleccion[]>([])
  const [selectedEleccion, setSelectedEleccion] = useState<string>("")
  const [estadisticas, setEstadisticas] = useState<EstadisticaUsuario[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      router.push("/")
      return
    }
    cargarElecciones()
  }, [isAdmin, router])

  const cargarElecciones = async () => {
    setLoading(true)
    const { data } = await obtenerElecciones()
    if (data) {
      setElecciones(data)
      if (data.length > 0) {
        const primeraActiva = data.find(e => e.estado === 'activa') || data[0]
        setSelectedEleccion(primeraActiva.id)
        await cargarEstadisticas(primeraActiva.id)
      }
    }
    setLoading(false)
  }

  const cargarEstadisticas = async (eleccionId: string) => {
    setLoadingStats(true)
    const { data } = await obtenerEstadisticasVotacion(eleccionId)
    if (data) {
      setEstadisticas(data)
    }
    setLoadingStats(false)
  }

  const handleEleccionChange = async (value: string) => {
    setSelectedEleccion(value)
    await cargarEstadisticas(value)
  }

  const eleccionActual = elecciones.find(e => e.id === selectedEleccion)
  
  const totalUsuarios = estadisticas.length
  const usuariosQueVotaron = estadisticas.filter(e => e.ha_votado).length
  const participacion = totalUsuarios > 0 ? (usuariosQueVotaron / totalUsuarios) * 100 : 0

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Seguimiento de Votos</h1>
          <p className="text-gray-500 mt-1">
            Monitorea la participación en las elecciones (sin revelar por quién votaron)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#11357b]" />
        </div>
      ) : elecciones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay elecciones registradas</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selector de elección */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Seleccionar elección:</label>
                <Select value={selectedEleccion} onValueChange={handleEleccionChange}>
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue placeholder="Selecciona una elección" />
                  </SelectTrigger>
                  <SelectContent>
                    {elecciones.map((eleccion) => (
                      <SelectItem key={eleccion.id} value={eleccion.id}>
                        <div className="flex items-center gap-2">
                          {eleccion.nombre}
                          {eleccion.estado === 'activa' && (
                            <Badge className="bg-green-100 text-green-700 text-xs">Activa</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Usuarios
                </CardTitle>
                <Users className="h-4 w-4 text-[#11357b]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsuarios}</div>
                <p className="text-xs text-gray-500 mt-1">Usuarios activos en el sistema</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Han Votado
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{usuariosQueVotaron}</div>
                <p className="text-xs text-gray-500 mt-1">Usuarios que han emitido al menos un voto</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Pendientes
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{totalUsuarios - usuariosQueVotaron}</div>
                <p className="text-xs text-gray-500 mt-1">Usuarios que aún no han votado</p>
              </CardContent>
            </Card>
          </div>

          {/* Barra de progreso */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Participación General
              </CardTitle>
              <CardDescription>
                Porcentaje de usuarios que han participado en {eleccionActual?.nombre}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progreso de votación</span>
                  <span className="font-semibold">{participacion.toFixed(1)}%</span>
                </div>
                <Progress value={participacion} className="h-3" />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{usuariosQueVotaron} votaron</span>
                  <span>{totalUsuarios - usuariosQueVotaron} pendientes</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de usuarios */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle por Usuario</CardTitle>
              <CardDescription>
                Estado de participación de cada usuario (NO se muestra por quién votaron)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingStats ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#11357b]" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Usuario</TableHead>
                        <TableHead className="text-center">Votos Disponibles</TableHead>
                        <TableHead className="text-center">Cargos Votados</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estadisticas.map((est) => (
                        <TableRow key={est.usuario_id}>
                          <TableCell className="font-medium">{est.nombre}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-[#11357b]">{est.votos_disponibles}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {est.cargos_votados} cargo(s)
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {est.ha_votado ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                <Check className="w-3 h-3 mr-1" />
                                Votó
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                                <Clock className="w-3 h-3 mr-1" />
                                Pendiente
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {estadisticas.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            No hay datos de participación
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nota importante */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Voto Secreto</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Este reporte solo muestra si los usuarios han votado o no, pero 
                    <strong> nunca revela por quién votaron</strong>. El sistema garantiza 
                    la confidencialidad del voto.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default function SeguimientoPage() {
  return (
    <DashboardLayout>
      <SeguimientoPageContent />
    </DashboardLayout>
  )
}
