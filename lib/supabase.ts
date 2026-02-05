import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para la base de datos
export interface Usuario {
  id: string;
  cedula: string;
  nombre_completo: string;
  email?: string;
  password_hash: string;
  rol: "admin" | "votante";
  votos_base: number;
  poderes: number;
  foto_url?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Eleccion {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: "pendiente" | "activa" | "finalizada";
  fecha_inicio?: string;
  fecha_fin?: string;
  link_publico?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Cargo {
  id: string;
  eleccion_id: string;
  nombre: string;
  descripcion?: string;
  max_votos_por_usuario: number;
  created_at: string;
}

export interface Candidato {
  id: string;
  eleccion_id: string;
  cargo_id: string;
  nombre: string;
  descripcion?: string;
  foto_url?: string;
  numero_lista?: number;
  created_at: string;
}

export interface RegistroVoto {
  id: string;
  eleccion_id: string;
  usuario_id: string;
  cargo_id: string;
  votos_usados: number;
  voted_at: string;
}

export interface VotoSecreto {
  id: string;
  eleccion_id: string;
  cargo_id: string;
  candidato_id: string;
  cantidad: number;
  created_at: string;
}

export interface HistorialPoderes {
  id: string;
  usuario_id: string;
  poderes_asignados: number;
  motivo?: string;
  asignado_por?: string;
  created_at: string;
}

// Funciones de autenticación
export async function loginUsuario(cedula: string, password: string) {
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("cedula", cedula)
    .eq("activo", true)
    .single();

  if (error || !usuario) {
    // Intentar con email
    const { data: usuarioEmail, error: errorEmail } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", cedula)
      .eq("activo", true)
      .single();

    if (errorEmail || !usuarioEmail) {
      return { error: "Usuario no encontrado o inactivo" };
    }

    // Verificar contraseña
    const bcrypt = await import("bcryptjs");
    const isValid = await bcrypt.compare(password, usuarioEmail.password_hash);

    if (!isValid) {
      return { error: "Contraseña incorrecta" };
    }

    return { usuario: usuarioEmail as Usuario };
  }

  // Verificar contraseña
  const bcrypt = await import("bcryptjs");
  const isValid = await bcrypt.compare(password, usuario.password_hash);

  if (!isValid) {
    return { error: "Contraseña incorrecta" };
  }

  return { usuario: usuario as Usuario };
}

// Funciones de usuarios
export async function crearUsuario(
  cedula: string,
  nombre_completo: string,
  password: string,
  rol: "admin" | "votante" = "votante",
  email?: string,
) {
  const bcrypt = await import("bcryptjs");
  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("usuarios")
    .insert({
      cedula,
      nombre_completo,
      email,
      password_hash,
      rol,
      votos_base: 1,
      poderes: 0,
      activo: true,
    })
    .select()
    .single();

  return { data, error };
}

export async function obtenerUsuarios() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("created_at", { ascending: false });

  return { data: data as Usuario[] | null, error };
}

export async function actualizarUsuario(id: string, updates: Partial<Usuario>) {
  const { data, error } = await supabase
    .from("usuarios")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

export async function eliminarUsuario(id: string) {
  const { error } = await supabase.from("usuarios").delete().eq("id", id);

  return { error };
}

export async function cambiarContrasena(id: string, nuevaContrasena: string) {
  const bcrypt = await import("bcryptjs");
  const password_hash = await bcrypt.hash(nuevaContrasena, 10);

  const { data, error } = await supabase
    .from("usuarios")
    .update({ password_hash })
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

export async function asignarPoderes(
  usuario_id: string,
  poderes: number,
  motivo: string,
  asignado_por: string,
) {
  // Obtener poderes actuales
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("poderes")
    .eq("id", usuario_id)
    .single();

  const nuevos_poderes = (usuario?.poderes || 0) + poderes;

  // Actualizar usuario
  const { error: updateError } = await supabase
    .from("usuarios")
    .update({ poderes: nuevos_poderes })
    .eq("id", usuario_id);

  if (updateError) return { error: updateError };

  // Registrar en historial
  const { data, error } = await supabase
    .from("historial_poderes")
    .insert({
      usuario_id,
      poderes_asignados: poderes,
      motivo,
      asignado_por,
    })
    .select()
    .single();

  return { data, error };
}

// Funciones de elecciones
export async function crearEleccion(
  nombre: string,
  descripcion?: string,
  created_by?: string,
) {
  const link_publico = `eleccion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from("elecciones")
    .insert({
      nombre,
      descripcion,
      estado: "pendiente",
      link_publico,
      created_by,
    })
    .select()
    .single();

  return { data, error };
}

export async function obtenerElecciones() {
  const { data, error } = await supabase
    .from("elecciones")
    .select("*")
    .order("created_at", { ascending: false });

  return { data: data as Eleccion[] | null, error };
}

export async function obtenerEleccionPorLink(link_publico: string) {
  const { data, error } = await supabase
    .from("elecciones")
    .select("*")
    .eq("link_publico", link_publico)
    .single();

  return { data: data as Eleccion | null, error };
}

export async function actualizarEstadoEleccion(
  id: string,
  estado: "pendiente" | "activa" | "finalizada",
) {
  const updates: Partial<Eleccion> = { estado };

  if (estado === "activa") {
    updates.fecha_inicio = new Date().toISOString();
  } else if (estado === "finalizada") {
    updates.fecha_fin = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("elecciones")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

// Funciones de cargos
export async function crearCargo(
  eleccion_id: string,
  nombre: string,
  descripcion?: string,
) {
  const { data, error } = await supabase
    .from("cargos")
    .insert({
      eleccion_id,
      nombre,
      descripcion,
      max_votos_por_usuario: 1,
    })
    .select()
    .single();

  return { data, error };
}

export async function obtenerCargosPorEleccion(eleccion_id: string) {
  const { data, error } = await supabase
    .from("cargos")
    .select("*")
    .eq("eleccion_id", eleccion_id);

  return { data: data as Cargo[] | null, error };
}

// Funciones de candidatos
export async function crearCandidato(
  eleccion_id: string,
  cargo_id: string,
  nombre: string,
  descripcion?: string,
  numero_lista?: number,
  usuario_id?: string,
) {
  const { data, error } = await supabase
    .from("candidatos")
    .insert({
      eleccion_id,
      cargo_id,
      nombre,
      descripcion,
      numero_lista,
      usuario_id,
    })
    .select()
    .single();

  return { data, error };
}

export async function obtenerCandidatosPorEleccion(eleccion_id: string) {
  const { data, error } = await supabase
    .from("candidatos")
    .select("*, cargos(nombre)")
    .eq("eleccion_id", eleccion_id);

  return { data, error };
}

export async function obtenerCandidatosPorCargo(cargo_id: string) {
  const { data, error } = await supabase
    .from("candidatos")
    .select("*")
    .eq("cargo_id", cargo_id);

  return { data: data as Candidato[] | null, error };
}

// Funciones de votación
export async function registrarVoto(
  eleccion_id: string,
  usuario_id: string,
  cargo_id: string,
  candidato_id: string,
  cantidad_votos: number,
) {
  // Verificar si ya votó en este cargo
  const { data: votoExistente } = await supabase
    .from("registro_votos")
    .select("*")
    .eq("eleccion_id", eleccion_id)
    .eq("usuario_id", usuario_id)
    .eq("cargo_id", cargo_id)
    .single();

  if (votoExistente) {
    return { error: "Ya has votado en este cargo" };
  }

  // Registrar participación (SIN revelar por quién votó)
  const { error: registroError } = await supabase
    .from("registro_votos")
    .insert({
      eleccion_id,
      usuario_id,
      cargo_id,
      votos_usados: cantidad_votos,
    });

  if (registroError) return { error: registroError };

  // Registrar voto secreto (ANÓNIMO)
  const { data, error } = await supabase
    .from("votos_secretos")
    .insert({
      eleccion_id,
      cargo_id,
      candidato_id,
      cantidad: cantidad_votos,
    })
    .select()
    .single();

  return { data, error };
}

// Función para votos múltiples (permite votar varias veces por cargo)
export async function registrarVotoMultiple(
  eleccion_id: string,
  usuario_id: string,
  cargo_id: string,
  candidato_id: string,
  cantidad_votos: number,
) {
  // Obtener el usuario para saber sus votos disponibles
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("votos_base, poderes")
    .eq("id", usuario_id)
    .single();

  if (!usuario) {
    return { error: "Usuario no encontrado" };
  }

  const votosDisponibles = usuario.votos_base + usuario.poderes;

  // Obtener cuántos votos ya usó en este cargo
  const { data: votosUsados } = await supabase
    .from("registro_votos")
    .select("votos_usados")
    .eq("eleccion_id", eleccion_id)
    .eq("usuario_id", usuario_id)
    .eq("cargo_id", cargo_id);

  const totalUsados =
    votosUsados?.reduce((sum: number, v: any) => sum + v.votos_usados, 0) || 0;
  const votosRestantes = votosDisponibles - totalUsados;

  if (cantidad_votos > votosRestantes) {
    return {
      error: `Solo te quedan ${votosRestantes} votos disponibles para este cargo`,
    };
  }

  if (cantidad_votos < 1) {
    return { error: "Debes usar al menos 1 voto" };
  }

  // Verificar si ya existe un registro para este usuario/cargo/elección
  const { data: registroExistente } = await supabase
    .from("registro_votos")
    .select("id, votos_usados")
    .eq("eleccion_id", eleccion_id)
    .eq("usuario_id", usuario_id)
    .eq("cargo_id", cargo_id)
    .single();

  if (registroExistente) {
    // Actualizar el registro existente sumando los nuevos votos
    const { error: updateError } = await supabase
      .from("registro_votos")
      .update({
        votos_usados: registroExistente.votos_usados + cantidad_votos,
      })
      .eq("id", registroExistente.id);

    if (updateError) return { error: updateError };
  } else {
    // Crear nuevo registro
    const { error: registroError } = await supabase
      .from("registro_votos")
      .insert({
        eleccion_id,
        usuario_id,
        cargo_id,
        votos_usados: cantidad_votos,
      });

    if (registroError) return { error: registroError };
  }

  // Registrar voto secreto (ANÓNIMO)
  const { data, error } = await supabase
    .from("votos_secretos")
    .insert({
      eleccion_id,
      cargo_id,
      candidato_id,
      cantidad: cantidad_votos,
    })
    .select()
    .single();

  return { data, error };
}

export async function obtenerResultados(eleccion_id: string) {
  const { data, error } = await supabase
    .from("votos_secretos")
    .select(
      `
      candidato_id,
      cantidad,
      candidatos (
        id,
        nombre,
        cargo_id,
        cargos (
          id,
          nombre
        )
      )
    `,
    )
    .eq("eleccion_id", eleccion_id);

  if (error) return { data: null, error };

  // Agrupar por candidato
  const resultados: Record<
    string,
    { candidato: string; cargo: string; votos: number }
  > = {};

  data?.forEach((voto: any) => {
    const candidatoId = voto.candidato_id;
    if (!resultados[candidatoId]) {
      resultados[candidatoId] = {
        candidato: voto.candidatos?.nombre || "Desconocido",
        cargo: voto.candidatos?.cargos?.nombre || "Sin cargo",
        votos: 0,
      };
    }
    resultados[candidatoId].votos += voto.cantidad;
  });

  return { data: Object.values(resultados), error: null };
}

export async function obtenerEstadisticasVotacion(eleccion_id: string) {
  // Obtener todos los usuarios activos
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nombre_completo, votos_base, poderes")
    .eq("activo", true);

  // Obtener registros de votación (quién votó, sin saber por quién)
  const { data: registros } = await supabase
    .from("registro_votos")
    .select("usuario_id, votos_usados, cargo_id")
    .eq("eleccion_id", eleccion_id);

  const estadisticas = usuarios?.map((usuario) => {
    const votosUsuario =
      registros?.filter((r) => r.usuario_id === usuario.id) || [];
    const votosUsados = votosUsuario.reduce(
      (sum, v) => sum + v.votos_usados,
      0,
    );
    const votosDisponibles = usuario.votos_base + usuario.poderes;

    return {
      usuario_id: usuario.id,
      nombre: usuario.nombre_completo,
      votos_disponibles: votosDisponibles,
      votos_usados: votosUsados,
      ha_votado: votosUsuario.length > 0,
      cargos_votados: votosUsuario.length,
    };
  });

  return { data: estadisticas, error: null };
}

// Función para subir foto
export async function subirFoto(file: File, path: string) {
  const { data, error } = await supabase.storage
    .from("fotos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) return { url: null, error };

  const { data: urlData } = supabase.storage.from("fotos").getPublicUrl(path);

  return { url: urlData.publicUrl, error: null };
}
