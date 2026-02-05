"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Vote, Eye, EyeOff, Loader2, Shield, Users, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginUsuario } from "@/lib/supabase"
import { useAuthStore } from "@/store/auth-store"

export default function LoginPage() {
  const [cedula, setCedula] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await loginUsuario(cedula, password)
      
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      if (result.usuario) {
        login(result.usuario)
        router.push("/")
      }
    } catch (err) {
      setError("Error al iniciar sesión. Intente nuevamente.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Información */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#11357b] via-[#1a4a9e] to-[#0d2a63] p-12 flex-col justify-between relative overflow-hidden">
        {/* Patrón decorativo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <img src="/logo.webp" alt="CNCU" className="w-14 h-14 object-contain bg-white rounded-xl p-1 shadow-lg" />
            <div>
              <h1 className="text-white font-bold text-xl">CNCU</h1>
              <p className="text-white/60 text-sm">Sistema de Votaciones</p>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Colegio Nacional de<br />
              <span className="text-white/90">Curadores Urbanos</span>
            </h2>
            <p className="text-white/70 mt-4 text-lg max-w-md">
              Plataforma segura y transparente para la gestión de elecciones y votaciones institucionales.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Voto Secreto</h4>
                <p className="text-white/60 text-sm">Tu voto es 100% confidencial</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Múltiples Poderes</h4>
                <p className="text-white/60 text-sm">Gestión de votos y representaciones</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Resultados en Tiempo Real</h4>
                <p className="text-white/60 text-sm">Seguimiento instantáneo de votaciones</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative z-10">
          <p className="text-white/40 text-sm">
            © 2025 Colegio Nacional de Curadores Urbanos
          </p>
        </div>
      </div>

      {/* Panel derecho - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.webp" alt="CNCU" className="w-20 h-20 object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">CNCU</h1>
            <p className="text-gray-500">Sistema de Votaciones</p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Bienvenido</h2>
                <p className="text-gray-500 mt-2">Ingresa tus credenciales para continuar</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="cedula" className="text-gray-700 font-medium">
                    Cédula o Email
                  </Label>
                  <Input
                    id="cedula"
                    type="text"
                    placeholder="Ingresa tu cédula o email"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    className="h-12 bg-white border-gray-200 focus:border-[#11357b] focus:ring-[#11357b]/20 transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-white border-gray-200 focus:border-[#11357b] focus:ring-[#11357b]/20 pr-12 transition-all"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-gray-100"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-[#11357b] hover:bg-[#0d2a63] text-white font-semibold text-base shadow-lg shadow-[#11357b]/25 transition-all hover:shadow-xl hover:shadow-[#11357b]/30"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-center text-sm text-gray-500">
                  ¿Problemas para acceder? Contacta al administrador
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-gray-400 text-sm mt-6 lg:hidden">
            © 2025 Colegio Nacional de Curadores Urbanos
          </p>
        </div>
      </div>
    </div>
  )
}
