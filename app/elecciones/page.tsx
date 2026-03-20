"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { 
  Plus, 
  Play, 
  Square, 
  Vote,
  Users, 
  Link as LinkIcon, 
  Loader2,
  ClipboardList,
  UserPlus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Search,
  ChevronsUpDown
} from "lucide-react"
import { useAuthStore, useIsAdmin } from "@/store/auth-store"
import { 
  obtenerElecciones, 
  crearEleccion, 
  actualizarEstadoEleccion,
  crearCargo,
  crearCandidato,
  eliminarEleccion,
  guardarUsuariosPermitidosPorEleccion,
  obtenerCargosPorEleccion,
  obtenerCandidatosPorEleccion,
  obtenerUsuarios,
  obtenerUsuariosPermitidosPorEleccion,
  supabase,
  type Eleccion,
  type Cargo,
  type Candidato,
  type Usuario
} from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

import { DashboardLayout } from "@/components/dashboard-layout"

function EleccionesPageContent() {
  const { usuario } = useAuthStore()
  const isAdmin = useIsAdmin()
  const router = useRouter()
  const [elecciones, setElecciones] = useState<Eleccion[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCargoDialogOpen, setIsCargoDialogOpen] = useState(false)
  const [isCandidatoDialogOpen, setIsCandidatoDialogOpen] = useState(false)
  const [isPermisosDialogOpen, setIsPermisosDialogOpen] = useState(false)
  const [selectedEleccion, setSelectedEleccion] = useState<Eleccion | null>(null)
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [usuarioSearchOpen, setUsuarioSearchOpen] = useState(false)
  const [usuarioSearch, setUsuarioSearch] = useState("")
  const [usuarioPermisoSearch, setUsuarioPermisoSearch] = useState("")
  const [usuarioFijaSearch, setUsuarioFijaSearch] = useState("")
  const [cargos, setCargos] = useState<Record<string, Cargo[]>>({})
  const [candidatos, setCandidatos] = useState<Record<string, any[]>>({})
  const [permitidosPorEleccion, setPermitidosPorEleccion] = useState<Record<string, string[]>>({})
  const [usuariosPermitidosSeleccionados, setUsuariosPermitidosSeleccionados] = useState<string[]>([])
  const [usuariosFijaSeleccionados, setUsuariosFijaSeleccionados] = useState<string[]>([])
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  
  const [eleccionForm, setEleccionForm] = useState({
    nombre: "",
    descripcion: "",
    tipo: "normal" as "normal" | "fija",
    votos_fijos_por_cargo: 1,
  })
  
  const [cargoForm, setCargoForm] = useState({
    nombre: "",
    descripcion: ""
  })
  
  const [candidatoForm, setCandidatoForm] = useState({
    cargo_id: "",
    usuario_id: "",
    descripcion: "",
    numero_lista: ""
  })

  useEffect(() => {
    if (!isAdmin) {
      router.push("/")
      return
    }
    cargarElecciones()
    cargarUsuarios()
  }, [isAdmin, router])

  const cargarUsuarios = async () => {
    const { data } = await obtenerUsuarios()
    if (data) {
      setUsuarios(data.filter(u => u.activo))
    }
  }

  const cargarElecciones = async () => {
    setLoading(true)
    const { data } = await obtenerElecciones()
    if (data) {
      setElecciones(data)
      for (const eleccion of data) {
        await cargarCargosYCandidatos(eleccion.id)
        await cargarPermitidosEleccion(eleccion.id)
      }
    }
    setLoading(false)
  }

  const cargarPermitidosEleccion = async (eleccionId: string) => {
    const { data } = await obtenerUsuariosPermitidosPorEleccion(eleccionId)
    if (data) {
      setPermitidosPorEleccion((prev) => ({ ...prev, [eleccionId]: data }))
    }
  }

  const cargarCargosYCandidatos = async (eleccionId: string) => {
    const { data: cargosData } = await obtenerCargosPorEleccion(eleccionId)
    if (cargosData) {
      setCargos(prev => ({ ...prev, [eleccionId]: cargosData }))
    }
    
    const { data: candidatosData } = await obtenerCandidatosPorEleccion(eleccionId)
    if (candidatosData) {
      setCandidatos(prev => ({ ...prev, [eleccionId]: candidatosData }))
    }
  }

  const handleCrearEleccion = async () => {
    if (!eleccionForm.nombre) {
      alert("Por favor ingresa el nombre de la elección")
      return
    }

    if (eleccionForm.tipo === "fija" && eleccionForm.votos_fijos_por_cargo < 1) {
      alert("En una elección fija debes asignar al menos 1 voto por cargo")
      return
    }

    if (eleccionForm.tipo === "fija" && usuariosFijaSeleccionados.length === 0) {
      alert("En una elección fija debes seleccionar los usuarios que participarán")
      return
    }

    setIsCreating(true)
    const { data, error } = await crearEleccion(
      eleccionForm.nombre,
      eleccionForm.descripcion,
      usuario?.id,
      eleccionForm.tipo,
      eleccionForm.tipo === "fija" ? eleccionForm.votos_fijos_por_cargo : undefined,
    )

    if (error) {
      alert("Error al crear elección: " + error.message)
    } else {
      if (data && eleccionForm.tipo === "fija") {
        const { error: permisosError } = await guardarUsuariosPermitidosPorEleccion(
          data.id,
          usuariosFijaSeleccionados,
        )
        if (permisosError) {
          alert("La elección se creó, pero falló la asignación de participantes: " + permisosError.message)
        }
      }

      setIsDialogOpen(false)
      setEleccionForm({ nombre: "", descripcion: "", tipo: "normal", votos_fijos_por_cargo: 1 })
      setUsuarioFijaSearch("")
      setUsuariosFijaSeleccionados([])
      cargarElecciones()
    }
    setIsCreating(false)
  }

  const handleToggleUsuarioFija = (usuarioId: string, checked: boolean) => {
    setUsuariosFijaSeleccionados((prev) => {
      if (checked) {
        return prev.includes(usuarioId) ? prev : [...prev, usuarioId]
      }
      return prev.filter((id) => id !== usuarioId)
    })
  }

  const handleSeleccionarTodosFija = () => {
    setUsuariosFijaSeleccionados(usuarios.map((u) => u.id))
  }

  const handleLimpiarSeleccionFija = () => {
    setUsuariosFijaSeleccionados([])
  }

  const handleCambiarEstado = async (eleccion: Eleccion, nuevoEstado: 'pendiente' | 'activa' | 'finalizada') => {
    const { error } = await actualizarEstadoEleccion(eleccion.id, nuevoEstado)
    if (error) {
      alert("Error al cambiar estado: " + error.message)
    } else {
      cargarElecciones()
    }
  }

  const handleEliminarEleccion = async (eleccion: Eleccion) => {
    const confirmado = window.confirm(
      `Vas a eliminar la eleccion "${eleccion.nombre}" y todos sus cargos, candidatos y votos. Esta accion no se puede deshacer.`,
    )

    if (!confirmado) return

    setIsCreating(true)
    const { error } = await eliminarEleccion(eleccion.id)

    if (error) {
      alert("Error al eliminar elección: " + error.message)
    } else {
      await cargarElecciones()
      alert("Elección eliminada correctamente")
    }

    setIsCreating(false)
  }

  const handleAbrirPermisos = async (eleccion: Eleccion) => {
    setSelectedEleccion(eleccion)
    setUsuarioPermisoSearch("")
    const permitidosActuales = permitidosPorEleccion[eleccion.id]
    if (permitidosActuales) {
      setUsuariosPermitidosSeleccionados(permitidosActuales)
    } else {
      const { data } = await obtenerUsuariosPermitidosPorEleccion(eleccion.id)
      setUsuariosPermitidosSeleccionados(data || [])
      if (data) {
        setPermitidosPorEleccion((prev) => ({ ...prev, [eleccion.id]: data }))
      }
    }
    setIsPermisosDialogOpen(true)
  }

  const handleTogglePermisoUsuario = (usuarioId: string, checked: boolean) => {
    setUsuariosPermitidosSeleccionados((prev) => {
      if (checked) {
        return prev.includes(usuarioId) ? prev : [...prev, usuarioId]
      }
      return prev.filter((id) => id !== usuarioId)
    })
  }

  const handleSeleccionarTodosPermisos = () => {
    setUsuariosPermitidosSeleccionados(usuarios.map((u) => u.id))
  }

  const handleLimpiarPermisos = () => {
    setUsuariosPermitidosSeleccionados([])
  }

  const handleGuardarPermisos = async () => {
    if (!selectedEleccion) return

    setIsCreating(true)
    const { error } = await guardarUsuariosPermitidosPorEleccion(
      selectedEleccion.id,
      usuariosPermitidosSeleccionados,
    )

    if (error) {
      alert("Error al guardar usuarios permitidos: " + error.message)
    } else {
      setPermitidosPorEleccion((prev) => ({
        ...prev,
        [selectedEleccion.id]: usuariosPermitidosSeleccionados,
      }))
      setIsPermisosDialogOpen(false)
      alert("Permisos de votación actualizados")
    }

    setIsCreating(false)
  }

  const handleCrearCargo = async () => {
    if (!selectedEleccion || !cargoForm.nombre) {
      alert("Por favor ingresa el nombre del cargo")
      return
    }

    setIsCreating(true)
    const { error } = await crearCargo(
      selectedEleccion.id,
      cargoForm.nombre,
      cargoForm.descripcion
    )

    if (error) {
      alert("Error al crear cargo: " + error.message)
    } else {
      setIsCargoDialogOpen(false)
      setCargoForm({ nombre: "", descripcion: "" })
      cargarCargosYCandidatos(selectedEleccion.id)
    }
    setIsCreating(false)
  }

  const handleCrearCandidato = async () => {
    if (!selectedEleccion || !candidatoForm.cargo_id || !selectedUsuario) {
      alert("Por favor selecciona un cargo y un usuario")
      return
    }

    setIsCreating(true)
    const { error } = await crearCandidato(
      selectedEleccion.id,
      candidatoForm.cargo_id,
      selectedUsuario.nombre_completo,
      candidatoForm.descripcion,
      candidatoForm.numero_lista ? parseInt(candidatoForm.numero_lista) : undefined,
      selectedUsuario.id
    )

    if (error) {
      alert("Error al crear candidato: " + error.message)
    } else {
      setIsCandidatoDialogOpen(false)
      setCandidatoForm({ cargo_id: "", usuario_id: "", descripcion: "", numero_lista: "" })
      setSelectedUsuario(null)
      setUsuarioSearch("")
      cargarCargosYCandidatos(selectedEleccion.id)
    }
    setIsCreating(false)
  }

  const filteredUsuarios = usuarios.filter(u => 
    u.nombre_completo.toLowerCase().includes(usuarioSearch.toLowerCase()) ||
    u.cedula.toLowerCase().includes(usuarioSearch.toLowerCase())
  )

  const usuariosFiltradosPermisos = usuarios.filter((u) =>
    u.nombre_completo.toLowerCase().includes(usuarioPermisoSearch.toLowerCase()) ||
    u.cedula.toLowerCase().includes(usuarioPermisoSearch.toLowerCase()),
  )

  const usuariosFiltradosFija = usuarios.filter((u) =>
    u.nombre_completo.toLowerCase().includes(usuarioFijaSearch.toLowerCase()) ||
    u.cedula.toLowerCase().includes(usuarioFijaSearch.toLowerCase()),
  )

  const handleCopyLink = (link: string) => {
    const fullUrl = `${window.location.origin}/resultados/${link}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedLink(`resultados-${link}`)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const handleCopyVotacionLink = (link: string) => {
    const fullUrl = `${window.location.origin}/votacion/${link}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedLink(`votacion-${link}`)
    setTimeout(() => setCopiedLink(null), 2000)
  }

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

  const getTipoBadge = (tipo: Eleccion["tipo"]) => {
    if (tipo === "fija") {
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Fija</Badge>
    }
    return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Normal</Badge>
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestión de Elecciones</h1>
          <p className="text-gray-500 mt-1">Crea y administra las elecciones del sistema</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEleccionForm({ nombre: "", descripcion: "", tipo: "normal", votos_fijos_por_cargo: 1 })
            setUsuarioFijaSearch("")
            setUsuariosFijaSeleccionados([])
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#11357b] hover:bg-[#0d2a63]">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Elección
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nueva Elección</DialogTitle>
              <DialogDescription>
                Ingresa los datos de la nueva elección
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Elección *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Elección de Junta Directiva 2025"
                  value={eleccionForm.nombre}
                  onChange={(e) => setEleccionForm({...eleccionForm, nombre: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción (opcional)</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Describe el propósito de esta elección..."
                  value={eleccionForm.descripcion}
                  onChange={(e) => setEleccionForm({...eleccionForm, descripcion: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoEleccion">Tipo de elección *</Label>
                <Select
                  value={eleccionForm.tipo}
                  onValueChange={(value: "normal" | "fija") => setEleccionForm({
                    ...eleccionForm,
                    tipo: value,
                  })}
                >
                  <SelectTrigger id="tipoEleccion">
                    <SelectValue placeholder="Selecciona el tipo de elección" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Elección normal</SelectItem>
                    <SelectItem value="fija">Elección fija</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {eleccionForm.tipo === "fija" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="votosFijos">Votos por cargo para cada participante *</Label>
                    <Input
                      id="votosFijos"
                      type="number"
                      min={1}
                      value={eleccionForm.votos_fijos_por_cargo}
                      onChange={(e) => setEleccionForm({
                        ...eleccionForm,
                        votos_fijos_por_cargo: Math.max(1, parseInt(e.target.value || "1", 10)),
                      })}
                    />
                    <p className="text-xs text-gray-500">
                      Todos los usuarios seleccionados tendrán esta misma cantidad de votos por cargo.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Usuarios que participarán *</Label>
                    <Input
                      placeholder="Buscar por nombre o cédula..."
                      value={usuarioFijaSearch}
                      onChange={(e) => setUsuarioFijaSearch(e.target.value)}
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleSeleccionarTodosFija}>
                        Seleccionar todos
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleLimpiarSeleccionFija}>
                        Limpiar selección
                      </Button>
                    </div>

                    <div className="max-h-56 overflow-y-auto border rounded-md p-2 space-y-2">
                      {usuariosFiltradosFija.length === 0 ? (
                        <p className="text-sm text-gray-500 px-2 py-4">No se encontraron usuarios.</p>
                      ) : (
                        usuariosFiltradosFija.map((u) => (
                          <label key={u.id} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer">
                            <Checkbox
                              checked={usuariosFijaSeleccionados.includes(u.id)}
                              onCheckedChange={(checked) => handleToggleUsuarioFija(u.id, checked === true)}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{u.nombre_completo}</span>
                              <span className="text-xs text-gray-500">Cédula: {u.cedula}</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>

                    <div className="text-sm text-gray-600">
                      Participantes seleccionados: <strong>{usuariosFijaSeleccionados.length}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-[#11357b] hover:bg-[#0d2a63]"
                onClick={handleCrearEleccion}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Elección"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Elecciones */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#11357b]" />
        </div>
      ) : elecciones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay elecciones registradas</p>
            <Button 
              className="mt-4 bg-[#11357b] hover:bg-[#0d2a63]"
              onClick={() => setIsDialogOpen(true)}
            >
              Crear primera elección
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-4">
          {elecciones.map((eleccion) => (
            <AccordionItem key={eleccion.id} value={eleccion.id} className="border rounded-lg bg-white">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-left w-full mr-4">
                  <span className="font-semibold text-lg">{eleccion.nombre}</span>
                  {getEstadoBadge(eleccion.estado)}
                  {getTipoBadge(eleccion.tipo)}
                  {eleccion.tipo === "fija" && (
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                      {eleccion.votos_fijos_por_cargo || 1} voto(s)/cargo
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  {eleccion.descripcion && (
                    <p className="text-gray-600">{eleccion.descripcion}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {eleccion.estado === 'pendiente' && (
                      <Button 
                        onClick={() => handleCambiarEstado(eleccion, 'activa')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Iniciar Elección
                      </Button>
                    )}
                    {eleccion.estado === 'activa' && (
                      <Button 
                        onClick={() => handleCambiarEstado(eleccion, 'finalizada')}
                        variant="destructive"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Finalizar Elección
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedEleccion(eleccion)
                        setIsCargoDialogOpen(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Cargo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedEleccion(eleccion)
                        setIsCandidatoDialogOpen(true)
                      }}
                      disabled={!cargos[eleccion.id]?.length}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Agregar Candidato
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAbrirPermisos(eleccion)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Permitir Usuarios
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleEliminarEleccion(eleccion)}
                      disabled={isCreating}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Elección
                    </Button>
                  </div>

                  {eleccion.link_publico && (
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <LinkIcon className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="text-sm text-gray-600 flex-1 break-all">
                          {typeof window !== 'undefined' && window.location.origin}/resultados/{eleccion.link_publico}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(eleccion.link_publico!)}
                          >
                            {copiedLink === `resultados-${eleccion.link_publico}` ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Link href={`/resultados/${eleccion.link_publico}`} target="_blank">
                            <Button size="sm" variant="outline">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <Vote className="w-4 h-4 text-[#11357b] shrink-0" />
                        <span className="text-sm text-[#11357b] flex-1 break-all">
                          {typeof window !== 'undefined' && window.location.origin}/votacion/{eleccion.link_publico}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyVotacionLink(eleccion.link_publico!)}
                          >
                            {copiedLink === `votacion-${eleccion.link_publico}` ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Link href={`/votacion/${eleccion.link_publico}`} target="_blank">
                            <Button size="sm" className="bg-[#11357b] hover:bg-[#0d2a63]">
                              Ir a votación
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Cargos y Candidatos</h4>
                    <div className="text-sm text-gray-500">
                      Usuarios permitidos: {permitidosPorEleccion[eleccion.id]?.length || 0}
                      {(eleccion.tipo !== "fija" && (!permitidosPorEleccion[eleccion.id] || permitidosPorEleccion[eleccion.id].length === 0)) && (
                        <span> (sin restricciones)</span>
                      )}
                      {(eleccion.tipo === "fija" && (!permitidosPorEleccion[eleccion.id] || permitidosPorEleccion[eleccion.id].length === 0)) && (
                        <span> (sin participantes, nadie puede votar)</span>
                      )}
                    </div>
                    {!cargos[eleccion.id]?.length ? (
                      <p className="text-gray-500 text-sm">No hay cargos registrados</p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {cargos[eleccion.id]?.map((cargo) => (
                          <Card key={cargo.id} className="border-gray-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">{cargo.nombre}</CardTitle>
                              {cargo.descripcion && (
                                <CardDescription>{cargo.descripcion}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {candidatos[eleccion.id]
                                  ?.filter((c: any) => c.cargo_id === cargo.id)
                                  .map((candidato: any) => (
                                    <div 
                                      key={candidato.id}
                                      className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                                    >
                                      <div className="w-8 h-8 bg-[#11357b] rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        {candidato.numero_lista || "?"}
                                      </div>
                                      <div>
                                        <div className="font-medium text-sm">{candidato.nombre}</div>
                                        {candidato.descripcion && (
                                          <div className="text-xs text-gray-500">{candidato.descripcion}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                {!candidatos[eleccion.id]?.filter((c: any) => c.cargo_id === cargo.id).length && (
                                  <p className="text-gray-400 text-sm">Sin candidatos</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Dialog para crear cargo */}
      <Dialog open={isCargoDialogOpen} onOpenChange={setIsCargoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Cargo</DialogTitle>
            <DialogDescription>
              Agrega un cargo a la elección: {selectedEleccion?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cargoNombre">Nombre del Cargo *</Label>
              <Input
                id="cargoNombre"
                placeholder="Ej: Presidente"
                value={cargoForm.nombre}
                onChange={(e) => setCargoForm({...cargoForm, nombre: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargoDescripcion">Descripción (opcional)</Label>
              <Input
                id="cargoDescripcion"
                placeholder="Descripción del cargo"
                value={cargoForm.descripcion}
                onChange={(e) => setCargoForm({...cargoForm, descripcion: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCargoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#11357b] hover:bg-[#0d2a63]"
              onClick={handleCrearCargo}
              disabled={isCreating}
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Agregar Cargo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear candidato */}
      <Dialog open={isCandidatoDialogOpen} onOpenChange={(open) => {
        setIsCandidatoDialogOpen(open)
        if (!open) {
          setSelectedUsuario(null)
          setUsuarioSearch("")
          setCandidatoForm({ cargo_id: "", usuario_id: "", descripcion: "", numero_lista: "" })
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Candidato</DialogTitle>
            <DialogDescription>
              Selecciona un usuario registrado como candidato para: {selectedEleccion?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="candidatoCargo">Cargo *</Label>
              <Select
                value={candidatoForm.cargo_id}
                onValueChange={(value) => setCandidatoForm({...candidatoForm, cargo_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cargo" />
                </SelectTrigger>
                <SelectContent>
                  {selectedEleccion && cargos[selectedEleccion.id]?.map((cargo) => (
                    <SelectItem key={cargo.id} value={cargo.id}>
                      {cargo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Usuario / Candidato *</Label>
              <Popover open={usuarioSearchOpen} onOpenChange={setUsuarioSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={usuarioSearchOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedUsuario ? (
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{selectedUsuario.nombre_completo}</span>
                        <span className="text-gray-500 text-xs">({selectedUsuario.cedula})</span>
                      </span>
                    ) : (
                      <span className="text-gray-500">Buscar usuario...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar por nombre o cédula..." 
                      value={usuarioSearch}
                      onValueChange={setUsuarioSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                      <CommandGroup>
                        {filteredUsuarios.slice(0, 10).map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.nombre_completo + user.cedula}
                            onSelect={() => {
                              setSelectedUsuario(user)
                              setUsuarioSearchOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUsuario?.id === user.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{user.nombre_completo}</span>
                              <span className="text-xs text-gray-500">Cédula: {user.cedula}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="candidatoNumero">Número de Lista</Label>
              <Input
                id="candidatoNumero"
                type="number"
                placeholder="Ej: 1"
                value={candidatoForm.numero_lista}
                onChange={(e) => setCandidatoForm({...candidatoForm, numero_lista: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidatoDescripcion">Propuesta / Descripción (opcional)</Label>
              <Textarea
                id="candidatoDescripcion"
                placeholder="Breve descripción o propuesta del candidato"
                value={candidatoForm.descripcion}
                onChange={(e) => setCandidatoForm({...candidatoForm, descripcion: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCandidatoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#11357b] hover:bg-[#0d2a63]"
              onClick={handleCrearCandidato}
              disabled={isCreating || !selectedUsuario}
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Agregar Candidato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para definir usuarios permitidos */}
      <Dialog open={isPermisosDialogOpen} onOpenChange={setIsPermisosDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Permitir Usuarios</DialogTitle>
            <DialogDescription>
              Selecciona quiénes pueden votar en: {selectedEleccion?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              placeholder="Buscar por nombre o cédula..."
              value={usuarioPermisoSearch}
              onChange={(e) => setUsuarioPermisoSearch(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleSeleccionarTodosPermisos}>
                Seleccionar todos
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleLimpiarPermisos}>
                Limpiar selección
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              Si no seleccionas ningún usuario, la elección quedará abierta para todos.
            </div>

            <div className="max-h-72 overflow-y-auto border rounded-md p-2 space-y-2">
              {usuariosFiltradosPermisos.length === 0 ? (
                <p className="text-sm text-gray-500 px-2 py-4">No se encontraron usuarios.</p>
              ) : (
                usuariosFiltradosPermisos.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={usuariosPermitidosSeleccionados.includes(u.id)}
                      onCheckedChange={(checked) => handleTogglePermisoUsuario(u.id, checked === true)}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{u.nombre_completo}</span>
                      <span className="text-xs text-gray-500">Cédula: {u.cedula}</span>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="text-sm text-gray-600">
              Seleccionados: <strong>{usuariosPermitidosSeleccionados.length}</strong>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermisosDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#11357b] hover:bg-[#0d2a63]"
              onClick={handleGuardarPermisos}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Permisos"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function EleccionesPage() {
  return (
    <DashboardLayout>
      <EleccionesPageContent />
    </DashboardLayout>
  )
}
