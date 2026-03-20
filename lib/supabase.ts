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
  tipo: "normal" | "fija";
  votos_fijos_por_cargo?: number | null;
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

export interface EleccionUsuarioPermitido {
  id: string;
  eleccion_id: string;
  usuario_id: string;
  created_at: string;
}

export interface RegistroVotoCandidato {
  id: string;
  eleccion_id: string;
  usuario_id: string;
  cargo_id: string;
  candidato_id: string;
  bloque_votacion?: number;
  cantidad: number;
  created_at: string;
}

// Funciones de autenticación
export async function loginUsuario(identificador: string, password: string) {
  // Importar bcrypt al inicio
  const bcrypt = await import("bcryptjs");

  // Buscar primero por cédula
  let { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("cedula", identificador)
    .eq("activo", true)
    .single();

  // Si no se encuentra por cédula, buscar por email
  if (error || !usuario) {
    const { data: usuarioEmail, error: errorEmail } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", identificador)
      .eq("activo", true)
      .single();

    if (errorEmail || !usuarioEmail) {
      console.log("Login error - Usuario no encontrado:", identificador);
      return { error: "Usuario no encontrado o inactivo" };
    }

    usuario = usuarioEmail;
  }

  // Verificar que tengamos el usuario y su hash
  if (!usuario || !usuario.password_hash) {
    console.log("Login error - Sin password_hash");
    return { error: "Error en la configuración del usuario" };
  }

  // Verificar contraseña
  try {
    const isValid = await bcrypt.compare(password, usuario.password_hash);

    if (!isValid) {
      console.log("Login error - Contraseña incorrecta para:", identificador);
      return { error: "Contraseña incorrecta" };
    }

    console.log("Login exitoso para:", usuario.nombre_completo);
    return { usuario: usuario as Usuario };
  } catch (err) {
    console.log("Login error - Error al verificar contraseña:", err);
    return { error: "Error al verificar contraseña" };
  }
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

// Buscar usuario por cédula (sin contraseña, para votación pública)
export async function buscarUsuarioPorCedula(cedula: string) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, cedula, nombre_completo, votos_base, poderes, activo, rol")
    .eq("cedula", cedula)
    .eq("activo", true)
    .single();

  if (error || !data) {
    return { data: null, error: "Usuario no encontrado o inactivo" };
  }

  return { data, error: null };
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

  if (error?.code === "42501") {
    return {
      error: {
        ...error,
        message:
          "Permiso denegado por RLS al eliminar usuario. Ejecuta la migracion supabase-migration-003-delete-fixes.sql en Supabase SQL Editor.",
      },
    };
  }

  if (error?.code === "23503") {
    return {
      error: {
        ...error,
        message:
          "No se puede eliminar por referencias relacionadas. Ejecuta la migracion supabase-migration-003-delete-fixes.sql para ajustar FKs y politicas.",
      },
    };
  }

  return { error };
}

export async function eliminarEleccion(id: string) {
  const { error } = await supabase.from("elecciones").delete().eq("id", id);

  if (error?.code === "42501") {
    return {
      error: {
        ...error,
        message:
          "Permiso denegado por RLS al eliminar eleccion. Ejecuta la migracion supabase-migration-003-delete-fixes.sql en Supabase SQL Editor.",
      },
    };
  }

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
  total_poderes: number,
  motivo: string,
  asignado_por: string,
) {
  if (!Number.isInteger(total_poderes) || total_poderes < 0) {
    return {
      error: {
        message: "El total de poderes debe ser un numero entero mayor o igual a 0",
      },
    };
  }

  // Obtener poderes actuales
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("poderes")
    .eq("id", usuario_id)
    .single();

  const poderesActuales = usuario?.poderes || 0;
  const deltaPoderes = total_poderes - poderesActuales;

  // Actualizar usuario
  const { error: updateError } = await supabase
    .from("usuarios")
    .update({ poderes: total_poderes })
    .eq("id", usuario_id);

  if (updateError) return { error: updateError };

  // Registrar en historial
  const { data, error } = await supabase
    .from("historial_poderes")
    .insert({
      usuario_id,
      poderes_asignados: deltaPoderes,
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
  tipo: "normal" | "fija" = "normal",
  votos_fijos_por_cargo?: number,
) {
  const link_publico = `eleccion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from("elecciones")
    .insert({
      nombre,
      descripcion,
      estado: "pendiente",
      tipo,
      votos_fijos_por_cargo:
        tipo === "fija" ? Math.max(1, votos_fijos_por_cargo || 1) : null,
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

export async function obtenerUsuariosPermitidosPorEleccion(
  eleccion_id: string,
) {
  const { data, error } = await supabase
    .from("eleccion_usuarios_permitidos")
    .select("usuario_id")
    .eq("eleccion_id", eleccion_id);

  return {
    data: (data || []).map((item: { usuario_id: string }) => item.usuario_id),
    error,
  };
}

export async function guardarUsuariosPermitidosPorEleccion(
  eleccion_id: string,
  usuario_ids: string[],
) {
  const { error: deleteError } = await supabase
    .from("eleccion_usuarios_permitidos")
    .delete()
    .eq("eleccion_id", eleccion_id);

  if (deleteError) return { error: deleteError };

  if (!usuario_ids.length) {
    return { error: null };
  }

  const filas = usuario_ids.map((usuario_id) => ({ eleccion_id, usuario_id }));
  const { error: insertError } = await supabase
    .from("eleccion_usuarios_permitidos")
    .insert(filas);

  return { error: insertError };
}

export async function usuarioPuedeVotarEleccion(
  eleccion_id: string,
  usuario_id: string,
) {
  const { data: eleccion, error: errorEleccion } = await supabase
    .from("elecciones")
    .select("tipo")
    .eq("id", eleccion_id)
    .single();

  if (errorEleccion || !eleccion) {
    return { permitido: false, error: errorEleccion };
  }

  const { count: totalPermitidos, error: errorConteo } = await supabase
    .from("eleccion_usuarios_permitidos")
    .select("id", { count: "exact", head: true })
    .eq("eleccion_id", eleccion_id);

  if (errorConteo) {
    return { permitido: false, error: errorConteo };
  }

  // Elecciones normales sin lista blanca quedan abiertas.
  // Elecciones fijas sin participantes quedan cerradas.
  if (!totalPermitidos || totalPermitidos === 0) {
    return {
      permitido: eleccion.tipo !== "fija",
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("eleccion_usuarios_permitidos")
    .select("id")
    .eq("eleccion_id", eleccion_id)
    .eq("usuario_id", usuario_id)
    .maybeSingle();

  if (error) {
    return { permitido: false, error };
  }

  return { permitido: Boolean(data), error: null };
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
  const { permitido, error: permisoError } = await usuarioPuedeVotarEleccion(
    eleccion_id,
    usuario_id,
  );

  if (permisoError) {
    return { error: permisoError };
  }

  if (!permitido) {
    return { error: "No tienes permiso para votar en esta elección" };
  }

  const { data: eleccion, error: errorEleccion } = await supabase
    .from("elecciones")
    .select("tipo, votos_fijos_por_cargo")
    .eq("id", eleccion_id)
    .single();

  if (errorEleccion || !eleccion) {
    return { error: "No se pudo cargar la configuración de la elección" };
  }

  if (
    eleccion.tipo === "fija" &&
    cantidad_votos > (eleccion.votos_fijos_por_cargo || 1)
  ) {
    return {
      error: `Solo puedes usar hasta ${eleccion.votos_fijos_por_cargo || 1} votos por cargo en esta elección fija`,
    };
  }

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
  const { permitido, error: permisoError } = await usuarioPuedeVotarEleccion(
    eleccion_id,
    usuario_id,
  );

  if (permisoError) {
    return { error: permisoError };
  }

  if (!permitido) {
    return { error: "No tienes permiso para votar en esta elección" };
  }

  const { data: eleccion } = await supabase
    .from("elecciones")
    .select("tipo, votos_fijos_por_cargo")
    .eq("id", eleccion_id)
    .single();

  if (!eleccion) {
    return { error: "No se pudo cargar la configuración de la elección" };
  }

  if (eleccion.tipo === "fija") {
    const cantidadSolicitada = 1;

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("votos_base, poderes")
      .eq("id", usuario_id)
      .single();

    if (!usuario) {
      return { error: "Usuario no encontrado" };
    }

    const unidadesVoto = Math.max(1, usuario.votos_base + usuario.poderes);
    const votosPorBloque = Math.max(1, eleccion.votos_fijos_por_cargo || 1);

    const { count, error: conteoError } = await supabase
      .from("registro_votos_candidatos")
      .select("id", { head: true, count: "exact" })
      .eq("eleccion_id", eleccion_id)
      .eq("usuario_id", usuario_id)
      .eq("cargo_id", cargo_id);

    if (conteoError) {
      return { error: conteoError };
    }

    const totalUsados = count || 0;
    const votosDisponibles = votosPorBloque * unidadesVoto;
    const votosRestantes = votosDisponibles - totalUsados;
    const bloqueActual = Math.floor(totalUsados / votosPorBloque);

    const { data: votoMismoCandidato } = await supabase
      .from("registro_votos_candidatos")
      .select("id")
      .eq("eleccion_id", eleccion_id)
      .eq("usuario_id", usuario_id)
      .eq("cargo_id", cargo_id)
      .eq("candidato_id", candidato_id)
      .eq("bloque_votacion", bloqueActual)
      .maybeSingle();

    if (votoMismoCandidato) {
      return {
        error:
          "En elección fija solo puedes votar una vez por cada candidato en el bloque actual",
      };
    }

    if (cantidadSolicitada > votosRestantes) {
      return {
        error: `Solo te quedan ${votosRestantes} votos disponibles para este cargo`,
      };
    }

    const { error: detalleError } = await supabase
      .from("registro_votos_candidatos")
      .insert({
        eleccion_id,
        usuario_id,
        cargo_id,
        candidato_id,
        bloque_votacion: bloqueActual,
        cantidad: 1,
      });

    if (detalleError) {
      const constraintName = (detalleError as { constraint?: string }).constraint;
      if (
        (detalleError as { code?: string }).code === "23505" &&
        (constraintName ===
          "registro_votos_candidatos_eleccion_id_usuario_id_cargo_id_candidato_id_key" ||
          constraintName ===
            "registro_votos_candidatos_eleccion_id_usuario_id_cargo_id_c_key")
      ) {
        return {
          error:
            "La base de datos aun tiene la restriccion antigua de voto unico por candidato. Ejecuta la migracion 009 para habilitar bloques por poderes.",
        };
      }
      return { error: detalleError };
    }

    const { data, error } = await supabase
      .from("votos_secretos")
      .insert({
        eleccion_id,
        cargo_id,
        candidato_id,
        cantidad: cantidadSolicitada,
      })
      .select()
      .single();

    if (error) {
      return { data, error };
    }

    const { count: totalRegistrado, error: conteoFinalError } = await supabase
      .from("registro_votos_candidatos")
      .select("id", { head: true, count: "exact" })
      .eq("eleccion_id", eleccion_id)
      .eq("usuario_id", usuario_id)
      .eq("cargo_id", cargo_id);

    if (conteoFinalError) {
      return { error: conteoFinalError };
    }

    const { data: registroExistente } = await supabase
      .from("registro_votos")
      .select("id")
      .eq("eleccion_id", eleccion_id)
      .eq("usuario_id", usuario_id)
      .eq("cargo_id", cargo_id)
      .maybeSingle();

    if (registroExistente) {
      const { error: updateError } = await supabase
        .from("registro_votos")
        .update({ votos_usados: totalRegistrado || 0 })
        .eq("id", registroExistente.id);

      if (updateError) return { error: updateError };
    } else {
      const { error: insertRegistroError } = await supabase
        .from("registro_votos")
        .insert({
          eleccion_id,
          usuario_id,
          cargo_id,
          votos_usados: totalRegistrado || 0,
        });

      if (insertRegistroError) return { error: insertRegistroError };
    }

    return { data, error: null };
  }

  // Flujo normal (mantiene poderes y acumulado por cargo)
  const cantidadSolicitada = cantidad_votos;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("votos_base, poderes")
    .eq("id", usuario_id)
    .single();

  if (!usuario) {
    return { error: "Usuario no encontrado" };
  }

  const votosDisponibles = usuario.votos_base + usuario.poderes;

  const { data: votosUsados } = await supabase
    .from("registro_votos")
    .select("votos_usados")
    .eq("eleccion_id", eleccion_id)
    .eq("usuario_id", usuario_id)
    .eq("cargo_id", cargo_id);

  const totalUsados =
    votosUsados?.reduce((sum: number, v: any) => sum + v.votos_usados, 0) || 0;
  const votosRestantes = votosDisponibles - totalUsados;

  if (cantidadSolicitada > votosRestantes) {
    return {
      error: `Solo te quedan ${votosRestantes} votos disponibles para este cargo`,
    };
  }

  if (cantidadSolicitada < 1) {
    return { error: "Debes usar al menos 1 voto" };
  }

  const { data: registroExistente } = await supabase
    .from("registro_votos")
    .select("id, votos_usados")
    .eq("eleccion_id", eleccion_id)
    .eq("usuario_id", usuario_id)
    .eq("cargo_id", cargo_id)
    .single();

  if (registroExistente) {
    const { error: updateError } = await supabase
      .from("registro_votos")
      .update({
        votos_usados: registroExistente.votos_usados + cantidadSolicitada,
      })
      .eq("id", registroExistente.id);

    if (updateError) return { error: updateError };
  } else {
    const { error: registroError } = await supabase
      .from("registro_votos")
      .insert({
        eleccion_id,
        usuario_id,
        cargo_id,
        votos_usados: cantidadSolicitada,
      });

    if (registroError) return { error: registroError };
  }

  const { data, error } = await supabase
    .from("votos_secretos")
    .insert({
      eleccion_id,
      cargo_id,
      candidato_id,
      cantidad: cantidadSolicitada,
    })
    .select()
    .single();

  return { data, error };
}

export async function obtenerCandidatosVotadosPorUsuario(
  eleccion_id: string,
  usuario_id: string,
  bloque_votacion?: number,
) {
  let query = supabase
    .from("registro_votos_candidatos")
    .select("cargo_id, candidato_id, bloque_votacion")
    .eq("eleccion_id", eleccion_id)
    .eq("usuario_id", usuario_id);

  if (typeof bloque_votacion === "number") {
    query = query.eq("bloque_votacion", bloque_votacion);
  }

  const { data, error } = await query;

  return {
    data: (data || []) as Array<{
      cargo_id: string;
      candidato_id: string;
      bloque_votacion?: number;
    }>,
    error,
  };
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
  const { data: eleccion } = await supabase
    .from("elecciones")
    .select("tipo, votos_fijos_por_cargo")
    .eq("id", eleccion_id)
    .single();

  let usuariosQuery = supabase
    .from("usuarios")
    .select("id, nombre_completo, votos_base, poderes")
    .eq("activo", true);

  if (eleccion?.tipo === "fija") {
    const { data: permitidos } = await supabase
      .from("eleccion_usuarios_permitidos")
      .select("usuario_id")
      .eq("eleccion_id", eleccion_id);

    const idsPermitidos = (permitidos || []).map(
      (p: { usuario_id: string }) => p.usuario_id,
    );

    if (!idsPermitidos.length) {
      return { data: [], error: null };
    }

    usuariosQuery = usuariosQuery.in("id", idsPermitidos);
  }

  const { data: usuarios } = await usuariosQuery;

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
    const votosDisponibles =
      eleccion?.tipo === "fija"
        ? Math.max(1, eleccion.votos_fijos_por_cargo || 1) *
          Math.max(1, usuario.votos_base + usuario.poderes)
        : usuario.votos_base + usuario.poderes;

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
