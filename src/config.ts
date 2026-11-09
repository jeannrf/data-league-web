// Contenido y parámetros de la edición. Más adelante vendrá de Firestore (RF-LP-13).

export const EDICION = "2026-uni";

/** Correo interno de la cuenta de administración (no es secreto y no recibe mensajes). La contraseña vive en Firebase Authentication. */
export const ADMIN_EMAIL = "admin@dataleague.test";

/** Postulación abierta. Las reglas de Firestore también lo comprueban (config/2026-uni). */
export const POSTULACION_ABIERTA = true;

/** 29/11/2026 23:59:59, hora de Perú (UTC−5). */
export const FECHA_LIMITE = new Date("2026-11-29T23:59:59-05:00");

export const tracks = [
  { id: "01", nombre: "Estado, Economía y Sociedad", descripcion: "Datos para entender y mejorar lo público, la economía y la vida en comunidad." },
  { id: "02", nombre: "Salud, Vida y Bienestar", descripcion: "Datos al servicio de la salud y del bienestar de las personas." },
  { id: "03", nombre: "Ciudades, Producción y Ambiente", descripcion: "Datos para ciudades que funcionan, producción que rinde y un ambiente que se cuida." },
  { id: "04", nombre: "Deporte, Cultura y Entretenimiento", descripcion: "Datos para contar mejor lo que vivimos en la cancha, el escenario y la pantalla." },
  { id: "05", nombre: "Educación, Ciencia y Tecnología", descripcion: "Datos para aprender, investigar y construir tecnología útil." },
] as const;

export type Jornada = {
  fecha: string;
  dia: string;
  mes: string;
  tema: string;
  modalidad: "virtual" | "presencial" | "cierre";
};

// Kick-off: 27/11 (confirmado). Cierre y final marcados con modalidad propia.
export const cronograma: Jornada[] = [
  { fecha: "2026-11-27", dia: "27", mes: "NOV", tema: "Kick off y storytelling con datos", modalidad: "virtual" },
  { fecha: "2026-11-29", dia: "29", mes: "NOV", tema: "Cierre de postulaciones, 23:59", modalidad: "cierre" },
  { fecha: "2026-11-30", dia: "30", mes: "NOV", tema: "Machine Learning", modalidad: "virtual" },
  { fecha: "2026-12-01", dia: "01", mes: "DIC", tema: "IA con aplicaciones y MVP", modalidad: "virtual" },
  { fecha: "2026-12-02", dia: "02", mes: "DIC", tema: "Gobierno de datos", modalidad: "virtual" },
  { fecha: "2026-12-05", dia: "05", mes: "DIC", tema: "Final en la UNI, Lima", modalidad: "presencial" },
];

export const requisitos = [
  "Ser estudiante activo de pregrado, universitario o de instituto.",
  "Tener 18 años o más al postular.",
  "Postular en equipo de 2 a 4 personas, o de forma individual.",
  "Elegir un track para tu desafío.",
];

// Nombres por confirmar con los logos originales ([TBD-07]).
export const aliados = {
  institucionales: [
    "DMC Institute",
    "Data Science",
    "Facultad de Ingeniería Económica, Estadística y Ciencias Sociales, UNI",
  ],
  comunidades: ["Unicode"],
};

export const faq = [
  { p: "¿Quién puede postular?", r: "Cualquier estudiante activo de pregrado, de universidad o de instituto, con 18 años o más. No importa si vienes de una carrera técnica o no: la liga es para perfiles técnicos y no técnicos." },
  { p: "¿Puedo postular solo?", r: "Sí. Si postulas de forma individual, puedes pedir que la organización te asigne un equipo." },
  { p: "¿Cómo se arma un equipo?", r: "Los equipos son de 2 a 4 personas. Solo quien lidera el equipo crea una cuenta y registra a las demás personas con sus nombres, correo y WhatsApp." },
  { p: "¿Hasta cuándo puedo postular?", r: "Hasta el 29 de noviembre de 2026 a las 23:59, hora de Perú. Hasta esa fecha también puedes editar tu postulación." },
  { p: "¿Cómo funciona la final?", r: "La final es presencial, el 5 de diciembre de 2026 en la Universidad Nacional de Ingeniería (UNI), en Lima, con unas 120 personas. Los criterios para llegar a la final se publicarán próximamente." },
  { p: "¿Qué premios hay?", r: "Los premios y el jurado se anunciarán próximamente." },
];
