export default function UsuariosLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-[#11357b] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-gray-500 text-sm animate-pulse">Cargando usuarios...</p>
      </div>
    </div>
  )
}
