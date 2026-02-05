import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Usuario } from "@/lib/supabase";

interface AuthState {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (usuario: Usuario) => void;
  logout: () => void;
  updateUsuario: (updates: Partial<Usuario>) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      isAuthenticated: false,
      _hasHydrated: false,
      login: (usuario) => {
        console.log("Auth Store - Login:", usuario.nombre_completo);
        set({ usuario, isAuthenticated: true });
      },
      logout: () => {
        console.log("Auth Store - Logout");
        set({ usuario: null, isAuthenticated: false });
      },
      updateUsuario: (updates) =>
        set((state) => ({
          usuario: state.usuario ? { ...state.usuario, ...updates } : null,
        })),
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        usuario: state.usuario,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log("Auth Store - Rehydrated, isAuthenticated:", state?.isAuthenticated);
        state?.setHasHydrated(true);
      },
    },
  ),
);

// Hook para saber si el store ya está hidratado
export const useHasHydrated = () => {
  return useAuthStore((state) => state._hasHydrated);
};

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
