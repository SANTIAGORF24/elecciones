"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Mail, 
  CreditCard, 
  Shield, 
  Camera,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Save,
  Zap
} from "lucide-react"
import { useAuthStore } from "@/store/auth-store"
import { actualizarUsuario, subirFoto, supabase } from "@/lib/supabase"
import bcrypt from 'bcryptjs'

export default function ConfiguracionPage() {
  const { usuario, updateUsuario } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    nombre_completo: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  useEffect(() => {
    if (usuario) {
      setFormData({
        nombre_completo: usuario.nombre_completo,
        email: usuario.email || "",
        password: "",
        confirmPassword: ""
      })
    }
  }, [usuario])

  const handleSave = async () => {
    if (!usuario) return

    if (formData.password && formData.password !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden")
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      const updates: any = {
        nombre_completo: formData.nombre_completo,
        email: formData.email || null
      }

      if (formData.password) {
        updates.password_hash = await bcrypt.hash(formData.password, 10)
      }

      const { error } = await actualizarUsuario(usuario.id, updates)

      if (error) {
        alert("Error al guardar: " + error.message)
      } else {
        updateUsuario({
          nombre_completo: formData.nombre_completo,
          email: formData.email || undefined
        })
        setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }))
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      alert("Error al guardar los cambios")
    }

    setLoading(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !usuario) return

    if (!file.type.startsWith('image/')) {
      alert("Por favor selecciona una imagen")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen debe ser menor a 5MB")
      return
    }

    setUploadingPhoto(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${usuario.id}-${Date.now()}.${fileExt}`
      const filePath = `usuarios/${fileName}`

      const { url, error } = await subirFoto(file, filePath)

      if (error) {
        alert("Error al subir la foto")
      } else if (url) {
        await actualizarUsuario(usuario.id, { foto_url: url })
        updateUsuario({ foto_url: url })
      }
    } catch (err) {
      alert("Error al procesar la imagen")
    }

    setUploadingPhoto(false)
  }

  const getInitials = (nombre: string) => {
    return nombre
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!usuario) {
    return null
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Administra tu información personal</p>
      </div>

      {/* Foto de perfil */}
      <Card>
        <CardHeader>
          <CardTitle>Foto de Perfil</CardTitle>
          <CardDescription>
            Tu foto se mostrará en el sistema. No es obligatoria pero ayuda a identificarte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={usuario.foto_url || ""} />
                <AvatarFallback className="bg-[#11357b] text-white text-2xl">
                  {getInitials(usuario.nombre_completo)}
                </AvatarFallback>
              </Avatar>
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="text-center sm:text-left">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <Camera className="w-4 h-4 mr-2" />
                {uploadingPhoto ? "Subiendo..." : "Cambiar foto"}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG o GIF. Máximo 5MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de cuenta */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Cuenta</CardTitle>
          <CardDescription>
            Datos básicos de tu cuenta en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Cédula
            </Label>
            <Input 
              value={usuario.cedula} 
              disabled 
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">La cédula no se puede modificar</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Rol
            </Label>
            <div className="flex items-center gap-2">
              <Badge className={usuario.rol === 'admin' ? "bg-[#11357b]" : ""}>
                {usuario.rol === 'admin' ? "Administrador" : "Votante"}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Votos Disponibles
            </Label>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-[#11357b]">
                {usuario.votos_base + usuario.poderes}
              </span>
              <span className="text-sm text-gray-500">
                ({usuario.votos_base} base + {usuario.poderes} poderes)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editar información */}
      <Card>
        <CardHeader>
          <CardTitle>Editar Información</CardTitle>
          <CardDescription>
            Actualiza tu nombre, email o contraseña
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">
              <User className="w-4 h-4 inline mr-2" />
              Nombre Completo
            </Label>
            <Input
              id="nombre"
              value={formData.nombre_completo}
              onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
              placeholder="Tu nombre completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="w-4 h-4 inline mr-2" />
              Email (opcional)
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <Separator className="my-6" />

          <h4 className="font-medium text-gray-900">Cambiar Contraseña</h4>
          <p className="text-sm text-gray-500">Deja en blanco si no deseas cambiarla</p>

          <div className="space-y-2">
            <Label htmlFor="password">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Nueva contraseña"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="Confirma la nueva contraseña"
            />
          </div>

          <div className="flex items-center gap-4 pt-4">
            <Button 
              className="bg-[#11357b] hover:bg-[#0d2a63]"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
            {success && (
              <span className="flex items-center text-green-600 text-sm">
                <Check className="w-4 h-4 mr-1" />
                Guardado exitosamente
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
