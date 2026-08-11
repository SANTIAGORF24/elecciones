# 🗳️ Sistema de Votación Electrónica

> Plataforma web para organizar elecciones internas con **voto secreto verificable**,
> delegación de poderes y resultados en tiempo real. Construida con Next.js 16 y Supabase.

---

## 🎯 El problema

Las votaciones de asambleas, colegios profesionales y juntas directivas se siguen haciendo
a mano: listas en papel, recuento manual y cero trazabilidad. Este sistema digitaliza el
proceso completo manteniendo las dos garantías que lo hacen legítimo:

1. **El voto es secreto** — se separa el registro de *quién votó* del registro de *qué se votó*.
2. **El censo es cerrado** — solo los usuarios habilitados para esa elección concreta pueden votar.

---

## ✨ Funcionalidades

| Módulo | Qué hace |
| --- | --- |
| **Gestión de elecciones** | Crear elecciones, definir cargos y asociar candidatos con foto |
| **Censo por elección** | Habilitar qué usuarios pueden votar en cada elección |
| **Voto por enlace único** | Cada votante accede con su enlace (`/votacion/[link]`), sin necesidad de instalar nada |
| **Voto secreto** | Los votos se almacenan disociados de la identidad del votante |
| **Delegación de poderes** | Un votante puede ceder su voto a otro, con historial completo de la cesión |
| **Seguimiento en vivo** | Panel de participación mientras la votación está abierta |
| **Resultados públicos** | Página de resultados accesible por enlace (`/resultados/[link]`) |

---

## 🗄️ Modelo de datos

```
usuarios ──┬── eleccion_usuarios_permitidos ──── elecciones
           │                                          │
           ├── historial_poderes                      ├── cargos ──< candidatos ──< fotos
           │   (delegación de voto)                   │
           └── registro_votos ─────────────────────► votos_secretos
               (QUIÉN votó)                           (QUÉ se votó)
                        └──< registro_votos_candidatos
```

> El desacople entre `registro_votos` y `votos_secretos` es el núcleo del diseño: permite
> auditar la **participación** sin poder reconstruir el sentido del voto de nadie.

---

## 🧱 Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Supabase** — PostgreSQL, autenticación y políticas RLS
- **Tailwind CSS** + **shadcn/ui** (Radix UI)
- **React Hook Form** + **Zod** para validación
- **Recharts** para la visualización de resultados

---

## 🗺️ Rutas

```
/                       Portada
/login                  Acceso de administradores
/elecciones             Alta y configuración de elecciones
/usuarios               Gestión del censo
/configuracion          Parámetros generales
/seguimiento            Participación en tiempo real
/votar                  Panel del votante
/votacion/[link]        Papeleta con enlace único
/resultados/[link]      Resultados públicos
```

---

## 🚀 Ejecutar en local

```bash
git clone https://github.com/SANTIAGORF24/elecciones.git
cd elecciones
pnpm install
```

Crea un archivo `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
```

```bash
pnpm dev    # http://localhost:3000
```

---

## 👤 Autor

**Santiago Ramírez Forero** — Desarrollador Full Stack
[LinkedIn](https://www.linkedin.com/in/santiago-ramírez-forero) · [GitHub](https://github.com/SANTIAGORF24)
