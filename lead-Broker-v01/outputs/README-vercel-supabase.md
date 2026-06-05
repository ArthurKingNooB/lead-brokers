# Publicar gratis en Vercel + Supabase

Esta es la opcion gratuita recomendada:

- Vercel: publica la pagina y las funciones `/api`.
- Supabase: guarda terrenos e imagenes como datos.

## 1. Crear Supabase

1. Entrar a https://supabase.com
2. Crear un proyecto gratis.
3. Ir a SQL Editor.
4. Pegar y ejecutar el contenido de `supabase-schema.sql`.

## 2. Copiar claves

En Supabase, ir a Project Settings -> API y copiar:

- Project URL
- service_role key

La `service_role key` no se pega en el codigo. Solo va como variable privada en Vercel.

## 3. Subir a GitHub

Subir la carpeta `outputs` como proyecto.

## 4. Crear proyecto en Vercel

1. Entrar a https://vercel.com
2. New Project
3. Importar el repo.
4. Si subiste todo el workspace, usar Root Directory: `outputs`.

## 5. Variables de entorno en Vercel

Agregar:

```txt
SUPABASE_URL=tu_project_url
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
ADMIN_PASSWORD=contrasena_de_agustina
ADMIN_TOKEN=un_texto_largo_secreto
```

Ejemplo de `ADMIN_TOKEN`: una frase larga sin espacios o un token aleatorio.

## 6. Deploy

Vercel entrega una URL publica. Agustina entra, inicia sesion, carga terrenos y todos los visitantes ven los cambios.

## Nota

La version local con `server.js` sigue funcionando para pruebas. En Vercel, las funciones usan Supabase en vez de `data/lands.json`.
