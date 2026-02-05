"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  UserPlus, 
  Shield, 
  Edit, 
  Trash2,
  Zap,
  Loader2,
  Users,
  Key,
  AlertTriangle
} from "lucide-react"
import { useAuthStore, useIsAdmin } from "@/store/auth-store"
import { 
  obtenerUsuarios, 
  crearUsuario, 
  actualizarUsuario, 
  asignarPoderes,
  eliminarUsuario,
  cambiarContrasena,
  type Usuario 
} from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"

function UsuariosPageContent() {
  const { usuario: currentUser } = useAuthStore()
  const isAdmin = useIsAdmin()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPoderesDialogOpen, setIsPoderesDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  
  const [formData, setFormData] = useState({
    cedula: "",
    nombre_completo: "",
    email: "",
    password: "",
    rol: "votante" as "admin" | "votante"
  })
  
  const [poderesData, setPoderesData] = useState({
    cantidad: 1,
    motivo: ""
  })

  const [nuevaContrasena, setNuevaContrasena] = useState("")

  useEffect(() => {
    if (!isAdmin) {
      router.push("/")
      return
    }
    cargarUsuarios()
  }, [isAdmin, router])

  const cargarUsuarios = async () => {
    setLoading(true)
    const { data, error } = await obtenerUsuarios()
    if (data) {
      setUsuarios(data)
    }
    setLoading(false)
  }

  const handleCrearUsuario = async () => {
    if (!formData.cedula || !formData.nombre_completo || !formData.password) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    setIsCreating(true)
    const { data, error } = await crearUsuario(
      formData.cedula,
      formData.nombre_completo,
      formData.password,
      formData.rol,
      formData.email || undefined
    )

    if (error) {
      alert("Error al crear usuario: " + error.message)
    } else {
      setIsDialogOpen(false)
      setFormData({
        cedula: "",
        nombre_completo: "",
        email: "",
        password: "",
        rol: "votante"
      })
      cargarUsuarios()
    }
    setIsCreating(false)
  }

  const handleAsignarPoderes = async () => {
    if (!selectedUsuario || !poderesData.motivo) {
      alert("Por favor ingresa el motivo")
      return
    }

    setIsCreating(true)
    const { error } = await asignarPoderes(
      selectedUsuario.id,
      poderesData.cantidad,
      poderesData.motivo,
      currentUser!.id
    )

    if (error) {
      alert("Error al asignar poderes: " + error.message)
    } else {
      setIsPoderesDialogOpen(false)
      setPoderesData({ cantidad: 1, motivo: "" })
      setSelectedUsuario(null)
      cargarUsuarios()
    }
    setIsCreating(false)
  }

  const handleToggleActivo = async (usuario: Usuario) => {
    await actualizarUsuario(usuario.id, { activo: !usuario.activo })
    cargarUsuarios()
  }

  const handleCambiarRol = async (usuario: Usuario, nuevoRol: "admin" | "votante") => {
    await actualizarUsuario(usuario.id, { rol: nuevoRol })
    cargarUsuarios()
  }

  const handleCambiarContrasena = async () => {
    if (!selectedUsuario || !nuevaContrasena || nuevaContrasena.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setIsCreating(true)
    const { error } = await cambiarContrasena(selectedUsuario.id, nuevaContrasena)
    
    if (error) {
      alert("Error al cambiar contraseña: " + error.message)
    } else {
      alert("Contraseña actualizada correctamente")
      setIsPasswordDialogOpen(false)
      setNuevaContrasena("")
      setSelectedUsuario(null)
    }
    setIsCreating(false)
  }

  const handleEliminarUsuario = async () => {
    if (!selectedUsuario) return

    // No permitir eliminar al usuario actual
    if (selectedUsuario.id === currentUser?.id) {
      alert("No puedes eliminar tu propio usuario")
      return
    }

    setIsCreating(true)
    const { error } = await eliminarUsuario(selectedUsuario.id)
    
    if (error) {
      alert("Error al eliminar usuario: " + error.message)
    } else {
      setIsDeleteDialogOpen(false)
      setSelectedUsuario(null)
      cargarUsuarios()
    }
    setIsCreating(false)
  }

  const filteredUsuarios = usuarios.filter(u => 
    u.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Administra los usuarios del sistema de votaciones</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#11357b] hover:bg-[#0d2a63]">
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo usuario. Todos los campos marcados con * son obligatorios.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cedula">Cédula *</Label>
                <Input
                  id="cedula"
                  placeholder="Número de cédula"
                  value={formData.cedula}
                  onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo *</Label>
                <Input
                  id="nombre"
                  placeholder="Nombre completo del usuario"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Contraseña segura"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rol">Rol</Label>
                <Select
                  value={formData.rol}
                  onValueChange={(value: "admin" | "votante") => setFormData({...formData, rol: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="votante">Votante</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-[#11357b] hover:bg-[#0d2a63]"
                onClick={handleCrearUsuario}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Usuario"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nombre, cédula o email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Lista de Usuarios
          </CardTitle>
          <CardDescription>
            {filteredUsuarios.length} usuarios registrados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#11357b]" />
            </div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No se encontraron usuarios
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Usuario</TableHead>
                    <TableHead className="hidden md:table-cell">Cédula</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-center">Votos</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Estado</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{usuario.nombre_completo}</div>
                          <div className="text-sm text-gray-500">{usuario.email || "-"}</div>
                          <div className="text-sm text-gray-400 md:hidden">{usuario.cedula}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono">
                        {usuario.cedula}
                      </TableCell>
                      <TableCell>
                        <Badge variant={usuario.rol === "admin" ? "default" : "secondary"}
                          className={usuario.rol === "admin" ? "bg-[#11357b]" : ""}>
                          {usuario.rol === "admin" ? "Admin" : "Votante"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-lg text-[#11357b]">
                            {usuario.votos_base + usuario.poderes}
                          </span>
                          <span className="text-xs text-gray-500">
                            {usuario.votos_base}+{usuario.poderes}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <Badge variant={usuario.activo ? "default" : "secondary"}
                          className={usuario.activo ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700"}>
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedUsuario(usuario)
                                setIsPoderesDialogOpen(true)
                              }}
                            >
                              <Zap className="w-4 h-4 mr-2" />
                              Asignar Poderes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUsuario(usuario)
                                setNuevaContrasena("")
                                setIsPasswordDialogOpen(true)
                              }}
                            >
                              <Key className="w-4 h-4 mr-2" />
                              Cambiar Contraseña
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCambiarRol(
                                usuario, 
                                usuario.rol === "admin" ? "votante" : "admin"
                              )}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Cambiar a {usuario.rol === "admin" ? "Votante" : "Admin"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleActivo(usuario)}
                              className={usuario.activo ? "text-orange-600" : "text-green-600"}
                            >
                              {usuario.activo ? (
                                <>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUsuario(usuario)
                                setIsDeleteDialogOpen(true)
                              }}
                              className="text-red-600"
                              disabled={usuario.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar Usuario
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para asignar poderes */}
      <Dialog open={isPoderesDialogOpen} onOpenChange={setIsPoderesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Poderes</DialogTitle>
            <DialogDescription>
              Asigna votos extra a {selectedUsuario?.nombre_completo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Votos actuales</div>
              <div className="text-2xl font-bold text-[#11357b]">
                {selectedUsuario ? selectedUsuario.votos_base + selectedUsuario.poderes : 0}
              </div>
              <div className="text-xs text-gray-400">
                {selectedUsuario?.votos_base} base + {selectedUsuario?.poderes} poderes
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad de poderes a agregar</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                value={poderesData.cantidad}
                onChange={(e) => setPoderesData({...poderesData, cantidad: parseInt(e.target.value) || 1})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo *</Label>
              <Input
                id="motivo"
                placeholder="Ej: Representante de comité"
                value={poderesData.motivo}
                onChange={(e) => setPoderesData({...poderesData, motivo: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPoderesDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#11357b] hover:bg-[#0d2a63]"
              onClick={handleAsignarPoderes}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Asignar {poderesData.cantidad} poder(es)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para cambiar contraseña */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription>
              Establece una nueva contraseña para {selectedUsuario?.nombre_completo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 rounded-lg text-blue-700 text-sm">
              <strong>Usuario:</strong> {selectedUsuario?.nombre_completo}
              <br />
              <strong>Cédula:</strong> {selectedUsuario?.cedula}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevaContrasena">Nueva Contraseña *</Label>
              <Input
                id="nuevaContrasena"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#11357b] hover:bg-[#0d2a63]"
              onClick={handleCambiarContrasena}
              disabled={isCreating || nuevaContrasena.length < 6}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cambiando...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Cambiar Contraseña
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para eliminar usuario */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Eliminar Usuario
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar este usuario?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="font-semibold text-gray-900">{selectedUsuario?.nombre_completo}</div>
              <div className="text-sm text-gray-500">Cédula: {selectedUsuario?.cedula}</div>
              <div className="text-sm text-gray-500">Rol: {selectedUsuario?.rol}</div>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
              <strong>⚠️ Advertencia:</strong> Se eliminarán todos los datos asociados a este usuario, incluyendo el historial de poderes asignados.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleEliminarUsuario}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sí, Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function UsuariosPage() {
  return (
    <DashboardLayout>
      <UsuariosPageContent />
    </DashboardLayout>
  )
}
