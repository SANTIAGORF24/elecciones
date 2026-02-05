"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Vote, 
  ClipboardList, 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react"
import { useAuthStore, useIsAdmin } from "@/store/auth-store"
import { obtenerUsuarios, obtenerElecciones, type Eleccion } from "@/lib/supabase"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"

function DashboardContent() {
  const { usuario } = useAuthStore()
  const isAdmin = useIsAdmin()
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    eleccionesActivas: 0,
    eleccionesPendientes: 0,
    eleccionesFinalizadas: 0
  })
  const [elecciones, setElecciones] = useState<Eleccion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [usuariosRes, eleccionesRes] = await Promise.all([
          obtenerUsuarios(),
          obtenerElecciones()
        ])

        if (usuariosRes.data) {
          setStats(prev => ({ ...prev, totalUsuarios: usuariosRes.data!.length }))
        }

        if (eleccionesRes.data) {
          setElecciones(eleccionesRes.data)
          const activas = eleccionesRes.data.filter(e => e.estado === 'activa').length
          const pendientes = eleccionesRes.data.filter(e => e.estado === 'pendiente').length
          const finalizadas = eleccionesRes.data.filter(e => e.estado === 'finalizada').length
          setStats(prev => ({
            ...prev,
            eleccionesActivas: activas,
            eleccionesPendientes: pendientes,
            eleccionesFinalizadas: finalizadas
          }))
        }
      } catch (error) {
        console.error('Error cargando datos:', error)
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [])

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activa':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Activa</Badge>
      case 'pendiente':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pendiente</Badge>
      case 'finalizada':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Finalizada</Badge>
      default:
        return <Badge>{estado}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          ¡Bienvenido, {usuario?.nombre_completo.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 mt-1">
          {isAdmin 
            ? "Panel de administración del sistema de votaciones" 
            : "Consulta las elecciones disponibles y ejerce tu voto"
          }
        </p>
      </div>

      {/* Stats Cards - Solo para admin */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Usuarios
              </CardTitle>
              <Users className="h-4 w-4 text-[#11357b]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
              <p className="text-xs text-gray-500 mt-1">Usuarios registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Elecciones Activas
              </CardTitle>
              <Vote className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.eleccionesActivas}</div>
              <p className="text-xs text-gray-500 mt-1">En proceso de votación</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Elecciones Pendientes
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.eleccionesPendientes}</div>
              <p className="text-xs text-gray-500 mt-1">Por iniciar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Elecciones Finalizadas
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.eleccionesFinalizadas}</div>
              <p className="text-xs text-gray-500 mt-1">Completadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info de votos para votante */}
      {!isAdmin && (
        <Card className="border-[#11357b]/20 bg-[#11357b]/5">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Tus votos disponibles</h3>
                <p className="text-gray-600">
                  Tienes <span className="font-bold text-[#11357b]">{(usuario?.votos_base || 1) + (usuario?.poderes || 0)}</span> votos 
                  ({usuario?.votos_base || 1} base + {usuario?.poderes || 0} poderes)
                </p>
              </div>
              <Link href="/votar">
                <Button className="bg-[#11357b] hover:bg-[#0d2a63]">
                  <Vote className="w-4 h-4 mr-2" />
                  Ir a Votar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de elecciones */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Elecciones
              </CardTitle>
              <CardDescription>
                {isAdmin ? "Gestiona las elecciones del sistema" : "Elecciones disponibles"}
              </CardDescription>
            </div>
            {isAdmin && (
              <Link href="/elecciones">
                <Button variant="outline" size="sm">
                  Ver todas
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando elecciones...</div>
          ) : elecciones.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay elecciones registradas</p>
              {isAdmin && (
                <Link href="/elecciones">
                  <Button className="mt-4 bg-[#11357b] hover:bg-[#0d2a63]">
                    Crear primera elección
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {elecciones.slice(0, 5).map((eleccion) => (
                <div 
                  key={eleccion.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-gray-900">{eleccion.nombre}</h4>
                      {getEstadoBadge(eleccion.estado)}
                    </div>
                    {eleccion.descripcion && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {eleccion.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {eleccion.estado === 'activa' && (
                      <Link href="/votar">
                        <Button size="sm" className="bg-[#11357b] hover:bg-[#0d2a63]">
                          <Vote className="w-4 h-4 mr-1" />
                          Votar
                        </Button>
                      </Link>
                    )}
                    {eleccion.link_publico && (
                      <Link href={`/resultados/${eleccion.link_publico}`}>
                        <Button size="sm" variant="outline">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Resultados
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accesos rápidos para admin */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/usuarios">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#11357b]/10">
                    <Users className="w-6 h-6 text-[#11357b]" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Gestionar Usuarios</h3>
                    <p className="text-sm text-gray-500">Crear, editar y asignar poderes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/elecciones">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-100">
                    <ClipboardList className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Gestionar Elecciones</h3>
                    <p className="text-sm text-gray-500">Crear elecciones y candidatos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/seguimiento">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-yellow-100">
                    <TrendingUp className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Seguimiento de Votos</h3>
                    <p className="text-sm text-gray-500">Ver participación en elecciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  )
}
