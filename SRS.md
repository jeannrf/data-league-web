# Data League: Especificación de Requisitos de Software (SRS)

| | |
|---|---|
| **Proyecto** | Plataforma web de Data League (landing, postulaciones y panel de administración) |
| **Versión** | 1.7 (borrador) |
| **Fecha** | 8 de noviembre de 2026 |
| **Autor** | Jeanpier |
| **Estado** | En revisión. Los puntos marcados como **[TBD]** están pendientes de definir (ver sección 10). |

Estructura basada en IEEE 830 / ISO/IEC/IEEE 29148.

---

## Índice

1. [Introducción](#1-introducción)
2. [Descripción general](#2-descripción-general)
3. [Reglas de negocio](#3-reglas-de-negocio)
4. [Requisitos funcionales](#4-requisitos-funcionales)
5. [Requisitos de datos](#5-requisitos-de-datos)
6. [Requisitos no funcionales](#6-requisitos-no-funcionales)
7. [Interfaces externas](#7-interfaces-externas)
8. [Casos de uso principales](#8-casos-de-uso-principales)
9. [Plan de entregas y criterios de aceptación](#9-plan-de-entregas-y-criterios-de-aceptación)
10. [Pendientes por definir](#10-pendientes-por-definir)
11. [Historial de cambios](#11-historial-de-cambios)

---

## 1. Introducción

### 1.1 Propósito

Este documento especifica los requisitos de la plataforma web de **Data League**, la liga interuniversitaria e institucional de ciencia de datos. Es la referencia para el desarrollo, las pruebas y la validación con el equipo organizador.

### 1.2 Alcance

El sistema tiene tres componentes:

1. **Landing pública**: presenta el evento, sus tracks, requisitos, cronograma, aliados y preguntas frecuentes, y lleva a la postulación.
2. **Sistema de postulación**: permite postular de forma **individual** o **en equipo (2 a 4 personas)**. Solo quien postula (el líder o la persona individual) crea una cuenta.
3. **Panel de administración**: permite al equipo organizador revisar postulaciones, armar equipos, comunicarse con los participantes, configurar el evento y hacer el check-in de la final presencial.
4. **Solicitudes de sponsors**: formulario público para que empresas y organizaciones se postulen como sponsors, y su gestión en el panel.

**Fuera de alcance en la versión 1.0:**

- Pagos (el evento es gratuito).
- Evaluación de jurados dentro de la plataforma.
- Publicación de premios y jurados (se muestran como "Próximamente").
- Emisión de certificados.
- Cuentas para los integrantes del equipo que no son líderes.

### 1.3 Datos del evento (edición 2026)

| Dato | Valor |
|---|---|
| Sede | Universidad Nacional de Ingeniería (UNI), Lima |
| Lema | Aprende. Demuestra. Conecta. |
| Cierre de postulaciones | 29 de noviembre de 2026, 23:59 (hora de Perú, UTC−5) |
| Jornadas virtuales | 27/11 Kick off y storytelling con datos · 30/11 Machine Learning · 01/12 IA con aplicaciones y MVP · 02/12 Gobierno de datos |
| Final presencial | 5 de diciembre de 2026 en la UNI |
| Meta | 300+ postulantes, 120 participantes en la final, 20+ comunidades |
| Tracks | 01 Estado, Economía y Sociedad · 02 Salud, Vida y Bienestar · 03 Ciudades, Producción y Ambiente · 04 Deporte, Cultura y Entretenimiento · 05 Educación, Ciencia y Tecnología |
| Aliados institucionales | DMC Institute, Data Science, Facultad de Ingeniería Económica, Estadística y Ciencias Sociales (UNI). Nombres exactos por confirmar con los logos originales. |
| Community partners | Unicode y las demás comunidades de la diapositiva "Community & Partners" del kick-off. Lista exacta por confirmar. |

> La portada del kick-off dice 28 de noviembre y el cronograma dice 27. Ver **[TBD-01]**.

### 1.4 Glosario

| Término | Definición |
|---|---|
| **Postulante** | Persona que crea una cuenta y envía una postulación. Puede ser líder de equipo o postulante individual. |
| **Líder** | Postulante que inscribe un equipo y es su único contacto con cuenta. |
| **Integrante** | Miembro de un equipo registrado por el líder. No tiene cuenta; solo se guardan sus nombres, correo y WhatsApp. |
| **Equipo** | Grupo de 2 a 4 personas (líder incluido) inscrito en un track. |
| **Individual** | Postulante sin equipo. Puede pedir que la organización le asigne uno. |
| **Track** | Eje temático del desafío. Hay 5. |
| **Edición** | Una realización anual de Data League en una sede. La plataforma debe soportar varias. |
| **Finalista** | Persona o equipo habilitado para asistir a la final presencial. |
| **Admin** | Miembro del equipo organizador con acceso al panel. |

### 1.5 Referencias

- Kick-off de Data League (PDF, 8 páginas).
- Software Week 2026 (`softwareweek2026.web.app`), como referencia del flujo de inscripción individual o en equipo.
- Ley N.º 29733, Ley de Protección de Datos Personales del Perú, y su reglamento (D.S. 016-2024-JUS).

---

## 2. Descripción general

### 2.1 Perspectiva del producto

Es un sistema nuevo e independiente: una aplicación web de una sola página (SPA) alojada en Firebase Hosting que usa los servicios de Firebase como backend. No se integra con sistemas de las universidades.

```
Navegador (móvil o escritorio)
        │
        ▼
Firebase Hosting ── SPA React (landing + área del líder + panel admin)
        │
        ├── Firebase Authentication (Google)
        ├── Cloud Firestore (datos, reglas de seguridad por rol)
        ├── Extensión Trigger Email → SMTP (Gmail del evento o Brevo)
        └── Google Analytics
```

### 2.2 Clases de usuario

| Usuario | Descripción | Acceso |
|---|---|---|
| **Visitante** | Cualquier persona que entra a la landing. Público objetivo: estudiantes de pregrado o instituto, técnicos y no técnicos, que llegan sobre todo desde redes sociales en el móvil. | Landing y páginas legales. |
| **Postulante** (líder o individual) | Crea cuenta, envía y edita su postulación. | Su propia postulación y su equipo. |
| **Integrante** | Registrado por el líder. No usa la plataforma; recibe correos y mensajes por WhatsApp. | Ninguno. |
| **Admin** | Equipo organizador y voluntarios del check-in. | Todo el panel. |

### 2.3 Entorno operativo

- Navegadores: últimas dos versiones de Chrome, Safari, Firefox y Edge, en móvil y escritorio.
- Diseño *mobile-first*, con soporte desde 360 px de ancho.
- Idioma: español (Perú).
- Zona horaria de referencia: America/Lima (UTC−5).

### 2.4 Restricciones

| ID | Restricción |
|---|---|
| R-01 | Backend en **Firebase** (decisión del equipo). |
| R-02 | Un solo desarrollador, así que se prioriza la simplicidad y los servicios gestionados. |
| R-03 | La postulación debe estar abierta lo antes posible (objetivo: 12–13 de noviembre de 2026). |
| R-04 | Sin dominio propio: se usa la URL gratuita `*.web.app`. |
| R-05 | Presupuesto cercano a cero. |
| R-06 | Cumplir la Ley 29733 de protección de datos personales. |

### 2.5 Supuestos y dependencias

| ID | Supuesto o dependencia |
|---|---|
| S-01 | La postulación es gratuita. |
| S-02 | Basta con la declaración del líder para acreditar que todos los integrantes cumplen los requisitos; no se suben constancias. |
| S-03 | Los correos automáticos requieren el plan **Blaze** de Firebase (pide tarjeta; con este volumen el costo esperado es 0). Si no hay tarjeta, se usa la alternativa de la sección 7.3. **[TBD-04]** |
| S-04 | Las jornadas virtuales se transmiten en una plataforma externa (Meet, Zoom o YouTube) y la web solo guarda los enlaces. **[TBD-06]** |
| S-05 | Los logos de Data League y de los aliados se entregan en buena calidad (SVG o PNG). |

---

## 3. Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | Puede postular quien sea **estudiante activo de pregrado universitario o de instituto**. |
| RN-02 | Quien postula debe tener **18 años o más** a la fecha de postulación. |
| RN-03 | Un equipo tiene **mínimo 2 y máximo 4** personas, contando al líder. |
| RN-04 | Solo el líder (o el postulante individual) crea cuenta. Los integrantes se registran con **nombres, correo y WhatsApp**. |
| RN-05 | El líder declara que todos los integrantes cumplen RN-01 y RN-02 y que autorizaron compartir sus datos. |
| RN-06 | Un correo no puede aparecer en más de un equipo, ni como líder y como integrante a la vez, dentro de la misma edición. |
| RN-07 | Cada equipo o postulante individual elige **un track**. |
| RN-08 | La postulación se puede crear y editar hasta el **29/11/2026 a las 23:59** (hora de Perú). Después, solo un admin puede modificarla. |
| RN-09 | Un postulante individual puede pedir que la organización le asigne un equipo. Si lo asignan, pasa a ser integrante de ese equipo. |
| RN-10 | La final es presencial en la UNI y tiene un cupo aproximado de **120 personas**. El criterio para llegar a la final está pendiente. **[TBD-02]** |
| RN-11 | Los premios y los jurados no se publican hasta que la organización los confirme. |

---

## 4. Requisitos funcionales

**Prioridad (MoSCoW):** **M** = imprescindible para el lanzamiento · **S** = debería estar · **C** = deseable · **W** = no en esta versión.
**Fase:** según el plan de la sección 9.

### 4.1 Landing pública (LP)

| ID | Requisito | Prioridad | Fase |
|---|---|---|---|
| RF-LP-01 | Mostrar un hero con el logo, el lema "Aprende. Demuestra. Conecta.", la fecha límite de postulación y un botón "Postula". | M | 1 |
| RF-LP-02 | Mostrar una cuenta regresiva hasta el cierre de postulaciones. | C | 1 |
| RF-LP-03 | Explicar qué es Data League (la analogía con la Ivy League, en versión corta) y la visión de liga rotativa entre universidades. | M | 1 |
| RF-LP-04 | Mostrar los 5 tracks con nombre y una descripción breve. | M | 1 |
| RF-LP-05 | Mostrar los requisitos para postular (RN-01 a RN-03). | M | 1 |
| RF-LP-06 | Mostrar el cronograma con cada jornada etiquetada como virtual o presencial. | M | 1 |
| RF-LP-07 | Mostrar una sección de premios con el texto "Próximamente", sin montos. | M | 1 |
| RF-LP-08 | Mostrar el impacto esperado (300+ jóvenes, 120 en la final, 20+ comunidades). | S | 1 |
| RF-LP-09 | Mostrar los logos de aliados institucionales y community partners, con enlace a sus sitios. | M | 1 |
| RF-LP-10 | Mostrar preguntas frecuentes en formato acordeón. | S | 1 |
| RF-LP-11 | Mostrar un footer con redes sociales, correo de contacto y enlaces a las páginas legales. | M | 1 |
| RF-LP-12 | Cuando la postulación esté cerrada, cambiar el botón "Postula" por un aviso de cierre. | M | 2 |
| RF-LP-13 | Cargar el contenido editable (fechas, FAQ, aliados, enlaces) desde la configuración, sin desplegar código. | S | 4 |
| RF-LP-14 | Incluir metadatos para compartir en redes (Open Graph: título, descripción, imagen). | S | 1 |

### 4.2 Autenticación (AUT)

| ID | Requisito | Prioridad | Fase |
|---|---|---|---|
| RF-AUT-01 | Permitir crear cuenta e iniciar sesión con Google. Es el único método de acceso. | M | 2 |
| RF-AUT-02 | ~~Permitir crear cuenta e iniciar sesión con un enlace enviado al correo, sin contraseña.~~ **Retirado en la v1.2:** el acceso es solo con Google. | W | 2 |
| RF-AUT-03 | Permitir cerrar sesión. | M | 2 |
| RF-AUT-04 | Redirigir a quien ya tiene postulación a su área ("Mi postulación") en vez de al formulario. | M | 2 |
| RF-AUT-05 | Dar acceso al panel `/admin` solo con la contraseña de administración (una barra, sin cuentas ni correo). La contraseña la guarda Firebase Authentication y las reglas de Firestore solo permiten leer datos a esa cuenta. Las cuentas de Google son solo para postular. | M | 3 |

### 4.3 Postulación (POS)

La postulación es lo más simple posible: de cada persona solo se piden **nombre completo, celular y correo**.

| ID | Requisito | Prioridad | Fase |
|---|---|---|---|
| RF-POS-01 | Mostrar un único formulario, sin pasos: "Tus datos" (nombre completo y celular; el correo es el de la cuenta de Google y no se edita) y "Tu equipo". | M | 2 |
| RF-POS-02 | En "Tu equipo" permitir agregar de 1 a 3 integrantes, cada uno con nombre completo, celular y correo, y quitarlos antes de enviar. Sin integrantes, la postulación es individual. | M | 2 |
| RF-POS-03 | Pedir una única casilla obligatoria, no marcada por defecto, que reúne la declaración de requisitos (estudiante activo de pregrado, mayor de 18 años, integrantes que autorizaron compartir sus datos), el tratamiento de datos y la aceptación de las bases. | M | 2 |
| RF-POS-04 | Validar en el navegador y en las reglas de Firestore: celular (9 dígitos que empiezan con 9, o número internacional con código de país), correo válido y distinto para cada persona, equipo de 2 a 4 personas, fecha límite y casilla marcada. | M | 2 |
| RF-POS-05 | Rechazar la postulación si algún correo ya está en otra del mismo evento (RN-06), indicando cuál. | M | 2 |
| RF-POS-06 | Mostrar una confirmación después de enviar. | M | 2 |
| RF-POS-07 | Guardar el borrador del formulario en el navegador. | C | 2 |
| RF-POS-08 | Bloquear el envío después de la fecha límite (RN-08). | M | 2 |

**Retirados de la v1.6** (se pueden volver a pedir más adelante, por ejemplo en la ficha del admin): documento de identidad, fecha de nacimiento, institución, carrera, ciclo, nivel en datos, áreas de interés, "¿cómo te enteraste?", nombre del equipo, track y "pide equipo". La mayoría de edad y la condición de estudiante ya no se validan en el servidor: se aceptan por declaración (RN-05).

### 4.4 Área del postulante (PAR)

| ID | Requisito | Prioridad | Fase |
|---|---|---|---|
| RF-PAR-01 | Mostrar el estado de la postulación (sección 5.2). | M | 3 |
| RF-PAR-02 | Permitir editar los datos propios, los del equipo y los integrantes hasta la fecha límite, respetando RN-03 y RN-06. | M | 3 |
| RF-PAR-03 | Permitir retirar la postulación. | S | 3 |
| RF-PAR-04 | Mostrar los enlaces a las jornadas virtuales y sus grabaciones cuando existan. | S | 4 |
| RF-PAR-05 | Si el equipo es finalista, mostrar la información de la final y los QR de acceso de cada integrante. | S | 6 |
| RF-PAR-06 | Permitir registrar la entrega del proyecto (enlaces a repositorio, demo, video o slides). Depende de **[TBD-02]**. | C | 5 |

### 4.5 Panel de administración (ADM)

| ID | Requisito | Prioridad | Fase |
|---|---|---|---|
| RF-ADM-01 | Listar todas las postulaciones de la edición en una tabla con búsqueda por nombre, correo, documento o equipo. | M | 3 |
| RF-ADM-02 | Filtrar por modo (equipo o individual) y estado, y buscar por nombre, correo, documento o equipo. (Track, institución y "¿cómo te enteraste?" quedan para una versión posterior.) | M | 3 |
| RF-ADM-03 | Ver la ficha completa de una postulación con todos sus integrantes. | M | 3 |
| RF-ADM-04 | Cambiar el estado de una postulación, de forma individual y en lote. | M | 3 |
| RF-ADM-05 | Agregar notas internas a una postulación, guardadas en la colección `notasAdmin` (no visibles para el postulante). | S | 3 |
| RF-ADM-06 | Exportar a Excel (.xlsx) la lista filtrada, con una fila por persona (líderes, individuales e integrantes). | M | 3 |
| RF-ADM-07 | Exportar los WhatsApp de una selección en un formato listo para crear grupos o listas de difusión. | S | 3 |
| RF-ADM-08 | Mostrar un dashboard con: total de postulantes (personas), total de equipos, individuales, postulaciones por día, por track, por institución y por "¿cómo te enteraste?". | S | 3 |
| RF-ADM-09 | Mostrar la lista de individuales que piden equipo y permitir armar un equipo nuevo con ellos o agregarlos a un equipo incompleto. | S | 4 |
| RF-ADM-10 | Editar cualquier postulación o equipo, incluso después de la fecha límite. | S | 3 |
| RF-ADM-11 | Registrar quién hizo cada cambio de estado o edición y cuándo. | C | 4 |
| RF-ADM-12 | ~~Gestionar la lista de admins por correo.~~ Retirado: el acceso es una sola contraseña compartida (RF-AUT-05). | W | 4 |

### 4.6 Comunicaciones (COM)

| ID | Requisito | Prioridad | Fase |
|---|---|---|---|
| RF-COM-01 | Enviar un correo de confirmación al postulante al enviar la postulación, con el resumen de lo registrado. | M | 2 |
| RF-COM-02 | Enviar a cada integrante un correo informando que fue inscrito, quién es el líder, el equipo y el track, con un contacto para pedir su retiro. | S | 2 |
| RF-COM-03 | Permitir a los admins enviar correos a un segmento (filtro de la tabla) usando plantillas: recordatorio de jornada, equipo incompleto, finalista, no seleccionado, aviso general. | S | 4 |
| RF-COM-04 | Permitir incluir variables en las plantillas (nombre, equipo, track, enlace). | S | 4 |
| RF-COM-05 | Registrar cada correo enviado y su estado (enviado o con error). | C | 4 |
| RF-COM-07 | Al pasar una postulación a Aprobada, En observación o Rechazada, permitir enviar un correo a quien postuló, con un mensaje opcional del administrador, y registrar el último correo enviado. Sin plan de pago se hace con EmailJS desde el panel. | S | 3 |
| RF-COM-06 | Enviar un recordatorio automático a quien tenga un equipo de menos de 2 personas 48 horas antes del cierre. | C | 4 |

### 4.7 Configuración (CFG)

| ID | Requisito | Prioridad | Fase |
|---|---|---|---|
| RF-CFG-01 | Abrir o cerrar la postulación manualmente y definir la fecha límite. | M | 2 |
| RF-CFG-02 | Editar los tracks (nombre, descripción, orden). | S | 4 |
| RF-CFG-03 | Editar las jornadas (fecha, tema, modalidad, enlace de transmisión, enlace de grabación). | S | 4 |
| RF-CFG-04 | Editar las preguntas frecuentes. | S | 4 |
| RF-CFG-05 | Editar los aliados (nombre, logo, tipo, sitio web). | C | 4 |
| RF-CFG-06 | Mostrar u ocultar las secciones de premios y jurados, y editar su contenido cuando se definan. | C | 7 |

### 4.8 Check-in de la final (CHK)

| ID | Requisito | Prioridad | Fase |
|---|---|---|---|
| RF-CHK-01 | Generar un código QR único por persona finalista (líder e integrantes). | S | 6 |
| RF-CHK-02 | Enviar a cada finalista, por correo, su QR y la información de la final. | S | 6 |
| RF-CHK-03 | Permitir a un admin escanear el QR con la cámara del móvil y registrar la asistencia, mostrando nombre, equipo y si ya había ingresado. | S | 6 |
| RF-CHK-04 | Permitir registrar la asistencia buscando por nombre o documento, si la persona no trae el QR. | S | 6 |
| RF-CHK-05 | Mostrar el conteo de asistentes en tiempo real y exportar la lista. | C | 6 |

### 4.9 Sponsors (SPO)

| ID | Requisito | Prioridad | Fase |
|---|---|---|---|
| RF-SPO-01 | Mostrar en la landing una sección "Sé sponsor" que lleve al formulario `/sponsor`. | S | 3 |
| RF-SPO-02 | Permitir, sin iniciar sesión, enviar una solicitud con organización, contacto, cargo, correo, teléfono (opcional), formas de apoyo (aporte económico, premios, difusión, mentoría o jurado, otro) y mensaje (opcional), con consentimiento de uso de datos obligatorio. | S | 3 |
| RF-SPO-03 | Validar la solicitud en el navegador y en las reglas de Firestore, y reducir el spam con un campo trampa (y App Check cuando esté activo). | S | 3 |
| RF-SPO-04 | Listar las solicitudes en el panel de administración, cambiar su estado (nuevo, contactado, confirmado, descartado) y exportarlas a CSV. Solo los admins pueden leerlas. | S | 3 |

### 4.10 Cuenta e inscripción a jornadas (EVT)

| ID | Requisito | Prioridad | Fase |
|---|---|---|---|
| RF-EVT-01 | Mostrar «Iniciar sesión» en la barra de navegación; con sesión iniciada pasa a «Mi cuenta». El acceso es con Google. | S | 3 |
| RF-EVT-02 | Página `/eventos` con las jornadas virtuales (kick-off, machine learning, IA con aplicaciones y MVP, gobierno de datos), cada una con fecha, modalidad y botón «Inscribirme». | S | 3 |
| RF-EVT-03 | Inscribirse con un clic usando la cuenta de Google (se guardan nombre y correo) y poder cancelar la inscripción. Es independiente de la postulación a la liga. | S | 3 |
| RF-EVT-04 | A quien está inscrito, mostrarle el enlace de la transmisión cuando exista y ofrecer añadir la jornada a su calendario (archivo .ics). La hora y el enlace están por confirmar ([TBD-06]). | S | 3 |
| RF-EVT-05 | Página `/cuenta` con el estado de la postulación y las jornadas a las que la persona se inscribió. | S | 3 |
| RF-EVT-06 | En el panel de administración, pestaña «Jornadas» con el número de inscritos por jornada, la lista, exportación a CSV y copia de correos. | S | 3 |

---

## 5. Requisitos de datos

### 5.1 Modelo en Cloud Firestore

Todas las colecciones llevan el campo `edicion` (por ejemplo `"2026-uni"`) para soportar varias ediciones (la sede rotará a la UNALM, la UNMSM y otras).

**`postulaciones/{uid}`**: una por quien lidera o postula solo; el id es el uid de Firebase Auth.

```ts
{
  edicion: string;              // "2026-uni"
  uid: string;
  modo: "equipo" | "individual"; // equipo si hay integrantes
  estado: EstadoPostulacion;    // ver 5.2
  nombre: string;               // nombre completo
  whatsapp: string;             // E.164, ej. "+51987654321"
  correo: string;               // el de la cuenta de Google, en minúsculas
  integrantes?: Array<{ nombre: string; correo: string; whatsapp: string }>;  // 1 a 3, solo en modo equipo
  consentimiento: true;         // declaración, datos y bases
  versionTextosLegales: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
  // Los agrega el panel al enviar un correo de estado:
  correoEstado?: string;
  correoEnviadoEn?: Timestamp;
}
```

**`correosEdicion/{edicion}_{correo}`**: índice de unicidad. Se crea un documento por cada correo de la postulación (líder e integrantes) dentro de una transacción; si ya existe, la postulación se rechaza (RN-06).

```ts
{ postulacionId: string; rol: "lider" | "individual" | "integrante" }
```

**`config/{edicion}`**: contenido editable y parámetros.

```ts
{
  postulacionAbierta: boolean;
  fechaLimite: Timestamp;       // 2026-11-29T23:59:59-05:00
  tracks: Array<{ id: string; nombre: string; descripcion: string; orden: number }>;
  jornadas: Array<{ fecha: Timestamp; tema: string; modalidad: "virtual" | "presencial"; enlace?: string; grabacion?: string }>;
  faq: Array<{ pregunta: string; respuesta: string }>;
  aliados: Array<{ nombre: string; logoUrl: string; tipo: "institucional" | "community"; web?: string }>;
  mostrarPremios: boolean;
  mostrarJurados: boolean;
}
```

**`notasAdmin/{postulacionId}`**: notas internas de una postulación, `{ edicion, notas: string, actualizadoPor: string, actualizadoEn: Timestamp }`. Va en una colección aparte porque Firestore no puede ocultar campos sueltos de un documento: si las notas estuvieran en `postulaciones`, el postulante podría leerlas. Solo los admins pueden leer y escribir esta colección (RNF-06).

**`inscripciones/{evento}_{uid}`**: inscripción de una persona a una jornada virtual. `{ evento: "kickoff"|"ml"|"ia"|"gobierno", uid, nombre, correo, creadoEn }`. Cada persona crea, lee y borra solo la suya; el admin lee todas.

**`sponsors/{id}`**: solicitud de sponsor. `{ edicion, estado: "nuevo"|"contactado"|"confirmado"|"descartado", organizacion, contacto, cargo, correo, telefono, tipoApoyo: string[], mensaje, consentimientoDatos: true, creadoEn }`. Cualquiera puede crearla (con validación); solo los admins la leen y la gestionan.

**Cuenta de administración**: no hay colección `admins`. El administrador es una única cuenta de Firebase Authentication (correo interno `admin@dataleague.test`, proveedor contraseña); las reglas la identifican por ese correo y por el proveedor.

**`mail/{id}`**: cola de la extensión Trigger Email (`to`, `message.subject`, `message.html`, `delivery.state`).

**`checkin/{qrToken}`**: `{ edicion, postulacionId, nombre, registradoEn, registradoPor }`

**`auditoria/{id}`** (C): `{ edicion, postulacionId, adminUid, accion, antes, despues, fecha }`

### 5.2 Estados de una postulación

| Estado | Se muestra como | Significado | Quién lo asigna |
|---|---|---|---|
| `registrada` | Pendiente | Enviada, sin revisar. | Sistema |
| `aprobada` | Aprobada | Revisada y conforme. | Admin |
| `observada` | En observación | Tiene datos por corregir. | Admin |
| `rechazada` | Rechazada | No fue aprobada. | Admin |
| `retirada` | Retirada | Retirada por la persona que postuló. | Postulante |

El administrador elige entre Pendiente, Aprobada, En observación y Rechazada. Al pasar a Aprobada, En observación o Rechazada puede enviar un correo a quien postuló (RF-COM-07). Los estados antiguos `valida`, `finalista` y `no_seleccionada` se muestran como Aprobada, Aprobada y Rechazada. La condición de finalista para la final se definirá aparte ([TBD-02]).

### 5.3 Retención de datos

Los datos personales se conservan hasta **[TBD-08]** después de la final y luego se anonimizan, salvo los agregados estadísticos (conteos por institución, track, etc.) que sirven para reportes y próximas ediciones.

---

## 6. Requisitos no funcionales

### 6.1 Rendimiento

| ID | Requisito |
|---|---|
| RNF-01 | La landing debe cargar con un LCP menor a 2,5 s en un móvil de gama media con 4G. |
| RNF-02 | Puntaje de Lighthouse en móvil de 90 o más en Rendimiento, Accesibilidad y Buenas prácticas para la landing. |
| RNF-03 | El sistema debe soportar al menos 1 000 postulaciones y 100 usuarios concurrentes sin degradación. |
| RNF-04 | La tabla del panel debe cargar y filtrar 1 000 registros en menos de 2 s. |

### 6.2 Seguridad

| ID | Requisito |
|---|---|
| RNF-05 | Las reglas de seguridad de Firestore deben impedir que un postulante lea o modifique postulaciones ajenas. |
| RNF-06 | Solo la cuenta de administración (ver RF-AUT-05) puede leer todas las postulaciones, cambiar estados, leer y escribir `notasAdmin`, editar la configuración y registrar check-ins. |
| RNF-07 | Las reglas deben validar en el servidor: tamaño del equipo (RN-03), fecha límite (RN-08), formatos y campos obligatorios. |
| RNF-08 | Se debe activar Firebase App Check (reCAPTCHA Enterprise o v3) para reducir el spam de postulaciones. |
| RNF-09 | Los tokens de QR deben ser aleatorios (al menos 128 bits) y no derivables de datos personales. |
| RNF-10 | Las reglas de seguridad deben tener pruebas automatizadas con el emulador de Firebase. |

### 6.3 Privacidad y cumplimiento

| ID | Requisito |
|---|---|
| RNF-11 | Publicar una política de privacidad que indique responsable, finalidad, datos recogidos, destinatarios (aliados, si aplica), plazo de conservación y cómo ejercer los derechos ARCO, según la Ley 29733. |
| RNF-12 | Pedir consentimiento explícito, no marcado por defecto, antes de enviar la postulación. Guardar la versión del texto aceptado. |
| RNF-13 | Si los datos se compartirán con aliados o patrocinadores, pedirlo en una casilla separada y opcional. **[TBD-09]** |
| RNF-14 | El correo a integrantes (RF-COM-02) debe incluir cómo solicitar la eliminación de sus datos. |
| RNF-15 | Los datos personales solo se muestran en el panel admin; las exportaciones se descargan solo por admins. |

### 6.4 Usabilidad y accesibilidad

| ID | Requisito |
|---|---|
| RNF-16 | El formulario de postulación en equipo de 4 personas debe poder completarse en menos de 5 minutos. |
| RNF-17 | Lenguaje cercano y sin jerga técnica, pensado también para perfiles no técnicos. |
| RNF-18 | Contraste de texto según WCAG 2.1 nivel AA, navegación por teclado y etiquetas en todos los campos. |
| RNF-19 | Los mensajes de error deben indicar qué campo falla y cómo corregirlo. |

### 6.5 Disponibilidad, mantenimiento y costo

| ID | Requisito |
|---|---|
| RNF-20 | Disponibilidad de 99,5 % durante el periodo de postulación (la de Firebase Hosting y Firestore). |
| RNF-21 | Exportación de respaldo de Firestore al menos una vez al día durante la postulación (programada con Blaze, o manual desde el panel). |
| RNF-22 | Código en TypeScript, con lint y formato automáticos, en un repositorio con despliegue automático a Firebase Hosting desde la rama principal. |
| RNF-23 | Entornos separados de desarrollo (emuladores locales) y producción. |
| RNF-24 | Costo mensual de infraestructura de 0 USD dentro de las cuotas gratuitas, con una alerta de presupuesto en 1 USD. |

---

## 7. Interfaces externas

### 7.1 Interfaz de usuario y diseño

Basado en la identidad del kick-off ([docs/design/portada-kickoff.png](docs/design/portada-kickoff.png)).

**Idea de diseño: la red como sistema.** Data League conecta personas, comunidades y universidades; el motivo de la portada (nodos unidos por líneas) es esa idea hecha imagen. En la web no es un fondo: es la estructura de la página. Cada sección usa la red de forma distinta, y quien vea una captura sin el logo debe reconocer igual que es Data League.

#### Tokens de color

| Token | Uso | Color |
|---|---|---|
| `--bg` | Fondo | `#070A10` |
| `--surface` | Bordes y superficies sutiles (no tarjetas por defecto) | `#2D3A59` |
| `--primary` | Azul de marca: titulares grandes, "LEAGUE", nodos y líneas | `#4162FF` |
| `--primary-text` | Azul claro para texto pequeño y enlaces (contraste ≈ 7:1) | `#7C93FF` |
| `--accent` | Amarillo: botón principal, fechas, nodo de énfasis | `#FFDE41` |
| `--text` | Texto principal | `#F2F5FA` |
| `--text-muted` | Texto secundario | `#9DA5B5` |

- **Contraste:** `--primary` sobre `--bg` da cerca de 4,2:1, por debajo del 4,5:1 de WCAG AA (RNF-18). Sirve para titulares grandes y gráficos, pero **no para texto de cuerpo ni enlaces**; para eso se usa `--primary-text`.
- **Uso del color:** fondo casi negro dominante; blanco y azul para los títulos; el amarillo solo para lo que pide acción o marca una fecha. No se agregan otros colores de marca.

#### Logo

Wordmark: "DATA" en blanco (`--text`) y "LEAGUE" en azul (`--primary`), en mayúsculas y negrita, con el lema "Aprende. Demuestra. Conecta." debajo en blanco. Se reproduce como texto (HTML/SVG) hasta recibir el vectorial original ([TBD-07]).

#### Tipografía

- **Una sola familia: Archivo (variable, con eje de ancho).** Titulares en peso 900, mayúsculas y ancho extendido en escritorio (condensado en móvil para que las palabras largas entren), con tamaño de afiche: el tamaño marca la jerarquía, como en un cartel de baile donde manda quien va más grande. Texto de lectura en Archivo regular a 19 px, en tono casi blanco; el gris solo para texto terciario.
- Los números de los tracks van en contorno. El amarillo se usa para rellenar o delinear lo que importa (metas, "Próximamente").
- Los titulares nunca usan `--primary` en tamaño pequeño (ver contraste).

#### La línea continua (firma del diseño)

Una sola línea amarilla, vista desde arriba como un geoglifo de Nazca, recorre toda la página: nace en el nodo amarillo más grande del mapa del hero, entra en la franja amarilla de la fecha límite y baja en zigzag por los márgenes, cruzando de lado a lado en cada borde de sección y encendiendo un nodo en cada título. Termina en un nodo amarillo junto al wordmark del footer. Se dibuja con el scroll; con `prefers-reduced-motion` aparece completa. Es un SVG generado desde la posición real de las secciones ([src/components/Line.tsx](src/components/Line.tsx)).

#### Cómo se usa la red en cada sección

| Sección | Uso del motivo |
|---|---|
| Hero | Mapa del Perú hecho de nodos (azules, blancos y un nodo amarillo de énfasis), en SVG, con un brillo lento y sutil en algunos nodos. |
| Tracks (RF-LP-04) | Cinco filas numeradas **01–05** con titular grande y descripción corta, unidas por una línea vertical con un nodo por fila. Sin cuadrícula de tarjetas. |
| Cronograma (RF-LP-06) | Recorrido horizontal (vertical en móvil) que une 27/11 → 30/11 → 01/12 → 02/12 → 5/12. Nodos azules para las jornadas virtuales y un nodo amarillo más grande para la final presencial. |
| Impacto (RF-LP-08) | Cifras grandes (300+, 120, 20+) con una red de fondo cuyos nodos se encienden al entrar en pantalla. |
| Aliados (RF-LP-09) | Los logos como nodos conectados, con la línea resaltada al pasar el cursor. |
| Fechas clave | Franja amarilla de la portada: barra `--accent` con texto oscuro en negrita, para el cierre de postulaciones y la fecha de la final. |
| Formulario de postulación | Indicador de pasos como nodos unidos por una línea; cada paso completado enciende su nodo. El formulario en sí es sobrio. |

#### Botón principal

Fondo `--accent` con texto `--bg`. Solo hay uno por vista. En móvil queda fijo en la parte baja de la pantalla, al alcance del pulgar.

#### Movimiento

- Animación solo en opacidad, brillo y trazo de las líneas, con CSS o SVG. Nada de librerías pesadas.
- Con `prefers-reduced-motion` se apaga toda animación del motivo y queda la versión estática.
- El mapa se entrega como SVG liviano; la portada raster de 946 KB no se usa en la web (RNF-01).

#### Landing y panel admin

La landing es una superficie de persuasión y usa el sistema completo. El panel admin es una herramienta de trabajo: usa los mismos tokens, pero es sobrio y denso. Sin motivo animado ni titulares gigantes, con tablas legibles, el amarillo reservado para la acción principal y el escáner QR pensado para uso con una mano en móvil.

#### Tema

Oscuro únicamente.

**Pantallas:**

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | Landing | Público |
| `/postular` | Elección de modo y formulario por pasos | Con sesión |
| `/mi-postulacion` | Estado, edición, jornadas y QR | Postulante |
| `/eventos` | Jornadas virtuales: inscripción, calendario y enlace | Público (inscribirse requiere sesión) |
| `/cuenta` | Mi cuenta: postulación e inscripciones | Con sesión |
| `/sponsor` | Formulario para postular como sponsor | Público |
| `/privacidad`, `/bases` | Textos legales | Público |
| `/admin` | Panel: postulaciones (tabla, filtros, ficha, estados, notas, exportación) y sponsors | Admin |
| `/admin/postulaciones` | Tabla, filtros, ficha, exportación | Admin |
| `/admin/equipos` | Armado de equipos con individuales | Admin |
| `/admin/comunicaciones` | Plantillas y envíos | Admin |
| `/admin/configuracion` | Fechas, tracks, jornadas, FAQ, aliados | Admin |
| `/admin/checkin` | Escáner QR y lista de asistencia | Admin |

### 7.2 Interfaces de software

| Servicio | Uso |
|---|---|
| Firebase Hosting | Alojamiento de la SPA en `*.web.app`. |
| Firebase Authentication | Proveedor Google (único método de acceso). |
| Cloud Firestore | Base de datos y reglas de seguridad. |
| Extensión Trigger Email | Envío de correos desde la colección `mail` por SMTP. |
| Firebase App Check | Protección contra abuso. |
| Google Analytics for Firebase | Visitas, clics en "Postula", postulaciones completadas. |

**Stack del cliente:** React + Vite + TypeScript, Tailwind CSS, React Router, React Hook Form + Zod para validación, SheetJS para exportar a Excel, `html5-qrcode` para el escáner y `qrcode` para generar QR.

### 7.3 Interfaces de comunicación

- **Correo (opción principal):** extensión Trigger Email con SMTP de una cuenta Gmail del evento (aprox. 500 correos al día) o Brevo (300 al día gratis). Requiere plan Blaze. **[TBD-04], [TBD-05]**
- **Correo (alternativa sin Blaze):** envío desde el navegador con EmailJS para la confirmación, y los envíos masivos se hacen exportando el segmento a una herramienta externa.
- **WhatsApp:** fuera de la plataforma. El panel exporta los números (RF-ADM-07) para crear grupos o listas de difusión.

---

## 8. Casos de uso principales

### CU-01: Postular en equipo

**Actor:** líder · **Precondición:** postulación abierta.

1. El líder pulsa "Postula" en la landing.
2. Inicia sesión con Google o con un enlace a su correo.
3. Elige "Postular en equipo".
4. Completa sus datos (paso 1), el nombre del equipo y el track (paso 2) y los integrantes (paso 3).
5. Acepta la declaración, el consentimiento y las bases, y revisa el resumen.
6. Envía. El sistema valida, guarda la postulación con estado `registrada` y crea los índices de correo.
7. El líder ve la confirmación y recibe un correo. Cada integrante recibe un aviso.

**Flujos alternativos:**

- 6a. Un correo ya está registrado: el sistema indica cuál y no guarda nada.
- 6b. Pasó la fecha límite: el sistema muestra el aviso de cierre.
- 2a. Ya tiene postulación: se le lleva a "Mi postulación".

### CU-02: Postular individualmente

Igual que CU-01, pero en el paso 3 elige "Postular individualmente", completa sus datos y el track, e indica si quiere que le asignen equipo. No hay paso de integrantes.

### CU-03: Editar la postulación

**Actor:** postulante · **Precondición:** antes de la fecha límite.
El postulante entra a "Mi postulación", modifica sus datos, el equipo o los integrantes y guarda. Se aplican las mismas validaciones que al postular.

### CU-04: Revisar y cambiar estados

**Actor:** admin.
Filtra la tabla, abre fichas, agrega notas y cambia estados de uno o varios registros. Opcionalmente, envía un correo al segmento.

### CU-05: Armar equipos con individuales

**Actor:** admin.
Filtra individuales que piden equipo, selecciona de 2 a 4 y crea un equipo (o agrega a uno incompleto). El sistema actualiza los registros y puede avisar por correo.

### CU-06: Check-in en la final

**Actor:** admin (voluntario en la puerta).
Abre `/admin/checkin` en el móvil, escanea el QR del asistente y el sistema muestra nombre y equipo y registra la hora. Si el QR ya se usó, lo advierte. Si no hay QR, busca por nombre o documento.

---

## 9. Plan de entregas y criterios de aceptación

| Fase | Fechas | Alcance | Criterio de aceptación |
|---|---|---|---|
| **1. Base y landing** | 8–10 nov | Proyecto Firebase, repositorio, despliegue automático, tokens de diseño, landing completa con "Postulaciones abren pronto". | La landing está publicada en `*.web.app`, se ve bien en móvil y cumple RNF-01. |
| **2. Postulación** | 11–13 nov | Login, formulario en equipo e individual, validaciones, reglas de seguridad, correo de confirmación. **Apertura de postulaciones.** | Se puede postular en ambos modos de punta a punta; las reglas rechazan equipos de 1 o 5 personas, menores de 18, correos repetidos y envíos fuera de plazo (probado en el emulador). |
| **3. Admin básico** | 14–19 nov | Tabla, filtros, ficha, estados, notas, exportación a Excel, dashboard, "Mi postulación". | Un admin puede encontrar cualquier postulación, cambiar su estado y exportar la lista filtrada. Un no admin no puede entrar a `/admin`. |
| **4. Equipos y comunicaciones** | 20–26 nov | Armado de equipos, plantillas y envíos por segmento, configuración editable, jornadas. | Se puede armar un equipo con individuales y enviar un correo a un segmento. |
| **5. Jornadas y cierre** | 27 nov – 1 dic | Cierre automático el 29/11, entregas (si se definen), selección de finalistas. | A las 23:59:59 del 29/11 el formulario deja de aceptar envíos. |
| **6. Final** | 2–5 dic | QR por finalista, envío de QR, escáner de check-in. | El check-in de una persona toma menos de 5 s y detecta QR repetidos. |
| **7. Después del evento** | diciembre | Ganadores y premios en la landing, reporte para aliados, retención de datos. | |

---

## 10. Pendientes por definir

| ID | Pendiente | Impacto |
|---|---|---|
| TBD-01 | ¿El kick-off es el 27 o el 28 de noviembre? | Cronograma de la landing. |
| TBD-02 | ¿Cómo se llega a la final? ¿Las jornadas virtuales son para todos los inscritos? ¿Los 120 salen de una entrega de proyecto, de un comité o del orden de inscripción? ¿Hay entrega y en qué fecha? | Estados, RF-PAR-06, fase 5. |
| TBD-03 | Confirmar que la postulación es gratuita. | Alcance (pagos). |
| TBD-04 | ¿Hay una tarjeta para activar el plan Blaze de Firebase? | Correos automáticos y respaldos. |
| TBD-05 | ¿Hay una cuenta de Gmail del evento para enviar correos? | RF-COM-*. |
| TBD-06 | ¿En qué plataforma serán las jornadas virtuales? ¿Se graban? | RF-PAR-04, RF-CFG-03. |
| TBD-07 | Logo de Data League en vectorial y logos de los aliados en buena calidad. | RF-LP-01, RF-LP-09. |
| TBD-08 | Plazo de conservación de los datos personales. | Política de privacidad, 5.3. |
| TBD-09 | ¿Se compartirán los datos de participantes con aliados o patrocinadores? | Consentimiento (RNF-13). |
| TBD-10 | Correo de contacto oficial y redes sociales del evento. | Footer, correos. |
| TBD-11 | Texto de las bases del concurso. | Página `/bases`. |
| TBD-12 | Premios y jurados. | Sección de premios (hoy "Próximamente"). |

---

## 11. Historial de cambios

| Versión | Fecha | Cambios |
|---|---|---|
| 1.7 | 08/11/2026 | «Iniciar sesión» en la barra, página `/eventos` para inscribirse a las jornadas virtuales (estilo agenda), página `/cuenta` y pestaña «Jornadas» en el panel (sección 4.10). |
| 1.6 | 08/11/2026 | Postulación mínima: solo nombre, celular y correo de cada persona, con una casilla de aceptación (sección 4.3 y modelo 5.1). Se retiran documento, edad, institución, track y demás campos. |
| 1.5 | 08/11/2026 | Estados simplificados (Pendiente, Aprobada, En observación, Rechazada), correo al cambiar de estado (RF-COM-07) y sin filtro por track en el panel. |
| 1.4 | 08/11/2026 | El panel `/admin` se protege solo con la contraseña de administración (RF-AUT-05); se retira la lista de admins (RF-ADM-12). |
| 1.3 | 08/11/2026 | Se agregan las solicitudes de sponsors (sección 4.9, colección `sponsors`, ruta `/sponsor`) y la primera versión del panel `/admin`. El inicio de sesión pasa a una ventana modal. |
| 1.2 | 08/11/2026 | El acceso a la postulación pasa a ser solo con Google (se retira el enlace por correo, RF-AUT-02). |
| 1.1 | 08/11/2026 | Se redefine 7.1 con la dirección "la red como sistema": uso del motivo por sección, azul claro `--primary-text` para texto pequeño (el azul de marca no cumple AA), tipografía de titulares, movimiento y diferencia entre landing y admin. Se ajusta `--primary` a `#4162FF` (medido en la portada) y se documentan el logo, el uso del color y el motivo del mapa en 7.1. Se agrega `apellidos` a los integrantes en el modelo de datos. Las notas internas pasan de `postulaciones.notasInternas` a la colección `notasAdmin` para que el postulante no pueda leerlas. |
| 1.0 | 08/11/2026 | Primera versión a partir del kick-off y las definiciones del equipo: Firebase, equipos de 2 a 4, solo el líder crea cuenta, requisitos de estudiante y +18, cierre el 29/11, final presencial el 5/12. |
