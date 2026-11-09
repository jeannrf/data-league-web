# Configurar Firebase para Data League

Pasos para dejar funcionando el acceso con Google, la base de datos y el despliegue. Plan **Spark** (gratuito): no hace falta tarjeta.

## 1. Crear el proyecto
1. Entra a <https://console.firebase.google.com> con la cuenta del evento y pulsa **Agregar proyecto**.
2. Nombre sugerido: `data-league-2026`. Google Analytics es opcional.

## 2. Registrar la app web y copiar las claves
1. En la página principal del proyecto pulsa el ícono **</>** (Web) y ponle un nombre. No marques Hosting todavía.
2. Copia los valores de `firebaseConfig` y créalos en un archivo `.env.local` en la raíz del repositorio (hay una plantilla en `.env.example`):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

**Importante:** `.env.local` NO debe tener `VITE_USE_EMULATORS=true` en producción. Esa línea activa los emuladores locales.

## 3. Activar el inicio de sesión con Google
1. **Compilación > Authentication > Comenzar**.
2. Pestaña **Sign-in method** > **Google** > **Habilitar**.
3. Pon el **nombre público del proyecto** (por ejemplo "Data League") y un **correo de asistencia**. Guarda.
4. Pestaña **Configuración > Dominios autorizados**: ya están `localhost` y los dominios `*.firebaseapp.com` y `*.web.app` del proyecto. Si usas otro dominio, agrégalo aquí; si no, el acceso falla con "dominio no autorizado".

### Acceso del panel de administración (solo contraseña)
En `/admin` solo se ve una barra que pide la **contraseña de administrador**. Por detrás, la web inicia sesión con una cuenta interna de Firebase (correo `admin@dataleague.test`) y la contraseña que escribas. La contraseña NO está en el código: la guarda Firebase, cifrada, y bloquea los intentos repetidos. Para crearla:
1. **Authentication > Sign-in method > Correo electrónico/contraseña > Habilitar** (deja desactivado «Vínculo de correo electrónico»). Guarda.
2. **Authentication > Usuarios > Agregar usuario**: correo `admin@dataleague.test` (exactamente ese) y la contraseña de administrador que quieras. Usa una larga: es lo único que protege los datos de los postulantes.
3. Publica las reglas (`npm run deploy:rules`): ahí se comprueba que solo esa cuenta puede leer postulaciones y sponsors. Una cuenta de Google con ese mismo correo no sirve.

Para cambiar la contraseña: Authentication > Usuarios > menú ⋮ del usuario > Restablecer contraseña (o bórralo y créalo de nuevo).

## 4. Crear Firestore
1. **Compilación > Firestore Database > Crear base de datos**.
2. Edición Standard, modo **producción**. Ubicación: `southamerica-east1` (São Paulo), la más cercana a Perú. No se puede cambiar después.

## 5. Publicar las reglas de seguridad
```bash
npx firebase login
npm run deploy:rules            # = firebase deploy --only firestore:rules --project prod
```
`.firebaserc` ya trae dos proyectos: `default` (un proyecto de prueba para los emuladores) y `prod` (`data-league-web`, el real). Por eso los comandos de despliegue llevan `--project prod`.
Vuelve a publicar las reglas cada vez que cambien (ahora incluyen sponsors y el panel de administración).
(Si prefieres, edita el `projectId` de `.firebaserc`.) Las reglas validan en el servidor el tamaño del equipo, la edad, la fecha límite y los correos repetidos.

## 6. Publicar la web
```bash
npm run deploy                  # compila y publica hosting + reglas en prod
```
Queda en `https://data-league-2026.web.app` (el sitio de Hosting se llama `data-league-2026`; el ID del proyecto, `data-league-web`, no se puede cambiar). Para ver los cambios antes: `npx firebase hosting:channel:deploy vista-previa`.

## 7. Probar
1. Abre `/postular`, pulsa **Continuar con Google** y completa una postulación de prueba.
2. En **Firestore Database > Datos** deben aparecer `postulaciones/{uid}` y `correosEdicion/2026-uni_{correo}`.
3. Borra esos documentos de prueba antes de abrir al público.

## 8. Correos de estado (EmailJS, gratis y sin tarjeta)
Cuando el administrador pasa una postulación a **Aprobada**, **En observación** o **Rechazada**, el panel puede enviar un correo a quien postuló. Se usa [EmailJS](https://www.emailjs.com) porque funciona desde el navegador y no exige el plan de pago de Firebase (plan gratuito: 200 correos al mes).
1. Crea una cuenta en emailjs.com. **Email Services > Add New Service > Gmail** (o el que uses) y conéctalo con la cuenta desde la que quieres enviar. Anota el **Service ID**.
2. **Email Templates > Create New Template**:
   - *Subject:* `{{subject}}`
   - *To Email:* `{{to_email}}`
   - *Reply To:* `{{reply_to}}`
   - *From Name:* `Data League`
   - *Content:* `{{message}}`
   Guarda y anota el **Template ID**.
3. **Account > General**: copia la **Public Key**.
4. Agrega estas líneas a `.env.local` y reinicia `npm run dev`:
```
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
VITE_CONTACT_EMAIL=correo-de-contacto@ejemplo.com   # opcional
```
5. En EmailJS, **Account > Security**, limita los dominios permitidos a tu sitio (`localhost` y `tu-proyecto.web.app`).
6. Prueba: en el panel abre una postulación de prueba (con tu propio correo), cámbiala a «Aprobada» y revisa el correo.

Limitaciones: la clave pública de EmailJS viaja en la web, así que alguien podría usarla para mandar correos con tu plantilla hasta agotar el cupo; por eso conviene limitar los dominios. El plan gratuito permite pocos correos por segundo: el panel envía de a uno con una pausa. Para volúmenes grandes conviene pasar luego a la extensión *Trigger Email* de Firebase (requiere el plan Blaze).

## Pendientes recomendados
- **App Check** (reCAPTCHA) para reducir el spam de postulaciones (RNF-08).
- **Contraseña de administración:** si más personas del equipo van a entrar, comparten la misma contraseña; cámbiala cuando alguien deje el equipo.
- **Presupuesto:** en Google Cloud, crea una alerta de presupuesto en 1 USD (RNF-24).
- **Correos de confirmación:** requieren el plan Blaze (ver SRS, TBD-04).
