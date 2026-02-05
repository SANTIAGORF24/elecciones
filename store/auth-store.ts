import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Usuario } from "@/lib/supabase";

interface AuthState {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usuario: Usuario) => void;
  logout: () => void;
  updateUsuario: (updates: Partial<Usuario>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      isAuthenticated: false,
      isLoading: true,
      login: (usuario) =>
        set({ usuario, isAuthenticated: true, isLoading: false }),
      logout: () =>
        set({ usuario: null, isAuthenticated: false, isLoading: false }),
      updateUsuario: (updates) =>
        set((state) => ({
          usuario: state.usuario ? { ...state.usuario, ...updates } : null,
        })),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
      },
    },
  ),
);

// Hook para verificar si es admin
export const useIsAdmin = () => {
  const usuario = useAuthStore((state) => state.usuario);
  return usuario?.rol === "admin";
};

// Hook para obtener votos disponibles
export const useVotosDisponibles = () => {
  const usuario = useAuthStore((state) => state.usuario);
  if (!usuario) return 0;
  return usuario.votos_base + usuario.poderes;
};
