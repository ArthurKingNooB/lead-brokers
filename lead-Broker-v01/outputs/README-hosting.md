# Publicar Lead Brokers en Render

## Archivos importantes

- `server.js`: servidor Node con API y sitio web.
- `package.json`: comando de inicio para hosting.
- `data/lands.json`: base de datos local de terrenos.
- `index.html`, `styles.css`, `app.js`: pagina.

## Pasos

1. Subir la carpeta `outputs` a un repositorio de GitHub.
2. Entrar a Render y crear un `Web Service`.
3. Conectar el repositorio.
4. Configurar:
   - Root Directory: `outputs` si subiste todo el proyecto completo.
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. En Environment Variables agregar:
   - `ADMIN_PASSWORD`: la contrasena real de Agustina.
6. Deploy.

Render va a entregar una URL publica tipo:

```txt
https://lead-brokers.onrender.com
```

## Importante

Esta version guarda los terrenos en `data/lands.json`. Para uso profesional permanente conviene sumar un disco persistente en Render o pasar la base a Supabase/Postgres, porque algunos hostings pueden resetear archivos internos al redeploy.
