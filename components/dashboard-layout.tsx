"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Vote, 
  Home, 
  Users, 
  Settings, 
  ClipboardList, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  UserCircle,
  CheckSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useAuthStore, useIsAdmin } from "@/store/auth-store"
import { useState, useEffect } from "react"

const navigationAdmin = [
  { name: "Panel Principal", href: "/", icon: Home },
  { name: "Usuarios", href: "/usuarios", icon: Users },
  { name: "Elecciones", href: "/elecciones", icon: ClipboardList },
  { name: "Seguimiento", href: "/seguimiento", icon: BarChart3 },
  { name: "Votar", href: "/votar", icon: Vote },
  { name: "Configuración", href: "/configuracion", icon: Settings },
]

const navigationVotante = [
  { name: "Panel Principal", href: "/", icon: Home },
  { name: "Votar", href: "/votar", icon: Vote },
  { name: "Configuración", href: "/configuracion", icon: Settings },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { usuario, logout, isAuthenticated, isLoading } = useAuthStore()
  const isAdmin = useIsAdmin()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = isAdmin ? navigationAdmin : navigationVotante

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isLoading, isAuthenticated, router])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const getInitials = (nombre: string) => {
    return nombre
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getCurrentPageName = () => {
    const page = navigation.find((item) => item.href === pathname)
    return page?.name || "Panel"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#11357b] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Vote className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 bg-white px-4 md:px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 md:gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <div className="flex items-center gap-2">
            <img src="/logo.webp" alt="CNCU" className="w-8 h-8 object-contain" />
            <div className="hidden sm:block">
              <span className="font-semibold text-gray-900 text-sm md:text-base">
                Colegio Nacional de Curadores Urbanos
              </span>
            </div>
            <span className="sm:hidden font-semibold text-gray-900">CNCU</span>
          </div>
          
          <div className="hidden md:flex text-sm text-gray-500">
            <span className="mx-2">/</span>
            <span>{getCurrentPageName()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Rol badge */}
          <span className={`hidden sm:inline-flex px-2 py-1 rounded-full text-xs font-medium ${
            isAdmin 
              ? "bg-[#11357b]/10 text-[#11357b]" 
              : "bg-green-100 text-green-700"
          }`}>
            {isAdmin ? "Administrador" : "Votante"}
          </span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={usuario?.foto_url || ""} />
                  <AvatarFallback className="bg-[#11357b] text-white text-xs">
                    {usuario ? getInitials(usuario.nombre_completo) : "US"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium text-gray-700 max-w-32 truncate">
                  {usuario?.nombre_completo}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{usuario?.nombre_completo}</span>
                  <span className="text-xs font-normal text-gray-500">{usuario?.cedula}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/configuracion" className="cursor-pointer">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Mi Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed md:sticky top-16 left-0 z-40
          w-60 border-r border-gray-200 bg-white h-[calc(100vh-4rem)] overflow-y-auto
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          <div className="p-4">
            {/* Info de votos */}
            {usuario && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <CheckSquare className="w-4 h-4" />
                  <span>Tus votos disponibles</span>
                </div>
                <div className="text-2xl font-bold text-[#11357b]">
                  {usuario.votos_base + usuario.poderes}
                </div>
                <div className="text-xs text-gray-500">
                  {usuario.votos_base} base + {usuario.poderes} poderes
                </div>
              </div>
            )}

            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center w-full justify-start px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-[#11357b] text-white" 
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}
