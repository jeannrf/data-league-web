import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";

let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-data-league",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const ADM = { email: "admin@dataleague.test", firebase: { sign_in_provider: "password" } };
const member = (n: number) => ({ nombre: `Persona ${n}`, correo: `m${n}@correo.pe`, whatsapp: `+5198765432${n}` });
const base = (over: Record<string, unknown> = {}) => ({
  edicion: "2026-uni", uid: "u1", modo: "equipo", estado: "registrada",
  nombre: "Lider Prueba", whatsapp: "+51987654321", correo: "lider@correo.pe", nombreEquipo: "Los Datos", integrantes: [member(1)],
  consentimiento: true, versionTextosLegales: "2026-11-08",
  creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp(), ...over,
});
const individual = (over: Record<string, unknown> = {}) => {
  const d: Record<string, unknown> = base({ modo: "individual", ...over });
  delete d.integrantes;
  delete d.nombreEquipo;
  return d;
};

/** Crea la postulación y su índice de correos en un solo lote, como hace la app. */
async function submit(uid: string, email: string, data: Record<string, unknown>, extra: { id: string; rol: string }[]) {
  const db = env.authenticatedContext(uid, { email }).firestore();
  const batch = writeBatch(db);
  batch.set(doc(db, "postulaciones", uid), data);
  for (const e of extra) batch.set(doc(db, "correosEdicion", `2026-uni_${e.id}`), { uid, rol: e.rol });
  return batch.commit();
}
const leaderIdx = [{ id: "lider@correo.pe", rol: "lider" }];

test("equipo válido (líder + 1 integrante) se acepta", async () => {
  await assertSucceeds(submit("u1", "lider@correo.pe", base(), [...leaderIdx, { id: "m1@correo.pe", rol: "integrante" }]));
});
test("equipo de 4 personas (líder + 3) se acepta", async () => {
  await assertSucceeds(submit("u1", "lider@correo.pe", base({ integrantes: [member(1), member(2), member(3)] }),
    [...leaderIdx, ...[1, 2, 3].map((n) => ({ id: `m${n}@correo.pe`, rol: "integrante" }))]));
});
test("equipo sin nombre, o individual con nombre de equipo, se rechaza", async () => {
  await assertFails(submit("u1", "lider@correo.pe", base({ nombreEquipo: "  " }), [...leaderIdx, { id: "m1@correo.pe", rol: "integrante" }]));
  await assertFails(submit("u1", "lider@correo.pe", { ...individual(), nombreEquipo: "Los Datos" }, [{ id: "lider@correo.pe", rol: "individual" }]));
});
/** Retira la postulación y libera los correos en un solo lote, como hace la app. */
async function retirar(uid: string, email: string, correos: string[]) {
  const db = env.authenticatedContext(uid, { email }).firestore();
  const batch = writeBatch(db);
  batch.update(doc(db, "postulaciones", uid), { estado: "retirada", actualizadoEn: serverTimestamp() });
  for (const c of correos) batch.delete(doc(db, "correosEdicion", `2026-uni_${c}`));
  return batch.commit();
}
const equipoIdx = [...leaderIdx, { id: "m1@correo.pe", rol: "integrante" }];
test("quien retiró su postulación puede volver a postular; sin retirar, no", async () => {
  await assertSucceeds(submit("u1", "lider@correo.pe", base(), equipoIdx));
  await assertFails(submit("u1", "lider@correo.pe", base({ nombreEquipo: "Otro" }), equipoIdx));   // sigue vigente
  await assertSucceeds(retirar("u1", "lider@correo.pe", ["lider@correo.pe", "m1@correo.pe"]));
  await assertSucceeds(submit("u1", "lider@correo.pe", base({ nombreEquipo: "Segunda vez" }), equipoIdx));
  const d = await getDoc(doc(env.authenticatedContext("u1", { email: "lider@correo.pe" }).firestore(), "postulaciones", "u1"));
  assert.equal(d.data()?.estado, "registrada");
  assert.equal(d.data()?.nombreEquipo, "Segunda vez");
});
test("retirar libera los correos para otra persona; ajena no puede borrarlos", async () => {
  await assertSucceeds(submit("u1", "lider@correo.pe", base(), equipoIdx));
  const otra = env.authenticatedContext("u2", { email: "otra@correo.pe" }).firestore();
  await assertFails(deleteDoc(doc(otra, "correosEdicion", "2026-uni_m1@correo.pe")));
  const propia = env.authenticatedContext("u1", { email: "lider@correo.pe" }).firestore();
  await assertFails(deleteDoc(doc(propia, "correosEdicion", "2026-uni_m1@correo.pe")));   // sin retirar, no se libera
  await assertSucceeds(retirar("u1", "lider@correo.pe", ["lider@correo.pe", "m1@correo.pe"]));
  await assertSucceeds(submit("u2", "otra@correo.pe", base({ uid: "u2", correo: "otra@correo.pe" }), [{ id: "otra@correo.pe", rol: "lider" }, { id: "m1@correo.pe", rol: "integrante" }]));
});
test("una postulación rechazada por el equipo organizador no se puede reemplazar", async () => {
  await assertSucceeds(submit("u1", "lider@correo.pe", base(), equipoIdx));
  await env.withSecurityRulesDisabled(async (c) => { await updateDoc(doc(c.firestore(), "postulaciones", "u1"), { estado: "rechazada" }); });
  await assertFails(submit("u1", "lider@correo.pe", base(), equipoIdx));
});
test("equipo de 1 persona (sin integrantes) se rechaza", async () => {
  await assertFails(submit("u1", "lider@correo.pe", base({ integrantes: [] }), leaderIdx));
});
test("equipo de 5 personas (líder + 4) se rechaza", async () => {
  await assertFails(submit("u1", "lider@correo.pe", base({ integrantes: [member(1), member(2), member(3), member(4)] }),
    [...leaderIdx, ...[1, 2, 3, 4].map((n) => ({ id: `m${n}@correo.pe`, rol: "integrante" }))]));
});
test("sin aceptar datos y bases se rechaza", async () => {
  await assertFails(submit("u1", "lider@correo.pe", base({ consentimiento: false }), leaderIdx));
});
test("celular inválido o nombre vacío se rechaza", async () => {
  await assertFails(submit("u1", "lider@correo.pe", base({ whatsapp: "987654321" }), leaderIdx));
  await assertFails(submit("u1", "lider@correo.pe", base({ nombre: "  " }), leaderIdx));
});
test("campos que ya no existen (documento, track, edad) se rechazan como extra", async () => {
  await assertFails(submit("u1", "lider@correo.pe", base({ track: "01" }), leaderIdx));
});
test("el correo de la postulación debe ser el de la cuenta", async () => {
  await assertFails(submit("u1", "lider@correo.pe", base({ correo: "otro@correo.pe" }), [{ id: "otro@correo.pe", rol: "lider" }]));
});
test("no se puede postular en nombre de otro uid", async () => {
  const db = env.authenticatedContext("u2", { email: "lider@correo.pe" }).firestore();
  await assertFails(setDoc(doc(db, "postulaciones", "u1"), base()));
});
test("integrante con el mismo correo que el líder se rechaza", async () => {
  await assertFails(submit("u1", "lider@correo.pe", base({ integrantes: [{ ...member(1), correo: "lider@correo.pe" }] }), leaderIdx));
});
test("correo ya registrado en otro equipo se rechaza (RN-06)", async () => {
  await assertSucceeds(submit("u1", "lider@correo.pe", base(), [...leaderIdx, { id: "m1@correo.pe", rol: "integrante" }]));
  await assertFails(submit("u2", "otro@correo.pe", base({ uid: "u2", correo: "otro@correo.pe", integrantes: [member(1)] }),
    [{ id: "otro@correo.pe", rol: "lider" }, { id: "m1@correo.pe", rol: "integrante" }]));
});
test("el índice de correos solo acepta correos de la propia postulación", async () => {
  await assertFails(submit("u1", "lider@correo.pe", base(), [...leaderIdx, { id: "ajeno@correo.pe", rol: "integrante" }]));
});
test("individual válido se acepta; con integrantes se rechaza", async () => {
  await assertSucceeds(submit("u1", "lider@correo.pe", individual(), [{ id: "lider@correo.pe", rol: "individual" }]));
  await env.clearFirestore();
  await assertFails(submit("u1", "lider@correo.pe", { ...individual(), integrantes: [member(1)] }, [{ id: "lider@correo.pe", rol: "individual" }]));
});
test("un postulante no lee postulaciones ajenas; un admin sí", async () => {
  await assertSucceeds(submit("u1", "lider@correo.pe", base(), leaderIdx.concat([{ id: "m1@correo.pe", rol: "integrante" }])));
  await assertFails(getDoc(doc(env.authenticatedContext("u2", { email: "x@correo.pe" }).firestore(), "postulaciones", "u1")));
  await assertSucceeds(getDoc(doc(env.authenticatedContext("u1", { email: "lider@correo.pe" }).firestore(), "postulaciones", "u1")));
  await assertSucceeds(getDoc(doc(env.authenticatedContext("adm", ADM).firestore(), "postulaciones", "u1")));
});
test("el postulante no puede cambiarse el estado a 'finalista', pero sí retirarse", async () => {
  await assertSucceeds(submit("u1", "lider@correo.pe", base(), leaderIdx.concat([{ id: "m1@correo.pe", rol: "integrante" }])));
  const db = env.authenticatedContext("u1", { email: "lider@correo.pe" }).firestore();
  await assertFails(updateDoc(doc(db, "postulaciones", "u1"), { estado: "finalista", actualizadoEn: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(db, "postulaciones", "u1"), { estado: "retirada", actualizadoEn: serverTimestamp() }));
});
test("sin sesión no se puede crear nada", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, "postulaciones", "u1"), base()));
});
test("con la postulación cerrada en config se rechaza", async () => {
  await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), "config", "2026-uni"), { postulacionAbierta: false }); });
  await assertFails(submit("u1", "lider@correo.pe", base(), leaderIdx.concat([{ id: "m1@correo.pe", rol: "integrante" }])));
});

// ---------- Sponsors y panel de administración ----------
const sponsor = (over: Record<string, unknown> = {}) => ({
  edicion: "2026-uni", estado: "nuevo", organizacion: "Acme SAC", contacto: "Ana Pérez", cargo: "Gerenta", correo: "ana@acme.pe",
  telefono: "", tipoApoyo: ["premios"], mensaje: "Hola", consentimientoDatos: true, creadoEn: serverTimestamp(), ...over,
});
test("cualquiera, sin sesión, puede enviar una solicitud de sponsor válida", async () => {
  await assertSucceeds(setDoc(doc(env.unauthenticatedContext().firestore(), "sponsors", "s1"), sponsor()));
});
test("sponsor sin consentimiento, con tipo de apoyo inválido o con campos extra se rechaza", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, "sponsors", "s1"), sponsor({ consentimientoDatos: false })));
  await assertFails(setDoc(doc(db, "sponsors", "s2"), sponsor({ tipoApoyo: ["hackear"] })));
  await assertFails(setDoc(doc(db, "sponsors", "s3"), sponsor({ extra: 1 })));
  await assertFails(setDoc(doc(db, "sponsors", "s4"), sponsor({ estado: "confirmado" })));
  await assertFails(setDoc(doc(db, "sponsors", "s5"), sponsor({ correo: "no-es-correo" })));
});
test("las solicitudes de sponsor solo las lee un admin", async () => {
  await assertSucceeds(setDoc(doc(env.unauthenticatedContext().firestore(), "sponsors", "s1"), sponsor()));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "sponsors", "s1")));
  await assertFails(getDoc(doc(env.authenticatedContext("u9", { email: "x@x.pe" }).firestore(), "sponsors", "s1")));
  await assertSucceeds(getDoc(doc(env.authenticatedContext("adm", ADM).firestore(), "sponsors", "s1")));
});
const mentor = (over: Record<string, unknown> = {}) => ({
  edicion: "2026-uni", estado: "nuevo", nombre: "Luis Gómez", correo: "luis@correo.pe", telefono: "", ocupacion: "Data scientist en Acme",
  perfil: "", areas: ["ml"], mensaje: "", consentimientoDatos: true, creadoEn: serverTimestamp(), ...over,
});
test("cualquiera, sin sesión, puede postular como mentor", async () => {
  await assertSucceeds(setDoc(doc(env.unauthenticatedContext().firestore(), "mentores", "m1"), mentor()));
});
test("mentor sin consentimiento, con área inválida, estado distinto o campos extra se rechaza", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, "mentores", "m1"), mentor({ consentimientoDatos: false })));
  await assertFails(setDoc(doc(db, "mentores", "m2"), mentor({ areas: ["hackear"] })));
  await assertFails(setDoc(doc(db, "mentores", "m3"), mentor({ extra: 1 })));
  await assertFails(setDoc(doc(db, "mentores", "m4"), mentor({ estado: "confirmado" })));
  await assertFails(setDoc(doc(db, "mentores", "m5"), mentor({ correo: "no-es-correo" })));
});
test("las postulaciones de mentores solo las lee un admin", async () => {
  await assertSucceeds(setDoc(doc(env.unauthenticatedContext().firestore(), "mentores", "m1"), mentor()));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "mentores", "m1")));
  await assertFails(getDoc(doc(env.authenticatedContext("u9", { email: "x@x.pe" }).firestore(), "mentores", "m1")));
  await assertSucceeds(getDoc(doc(env.authenticatedContext("adm", ADM).firestore(), "mentores", "m1")));
});
test("un admin cambia estados y notas; un postulante no", async () => {
  await assertSucceeds(submit("u1", "lider@correo.pe", base(), leaderIdx.concat([{ id: "m1@correo.pe", rol: "integrante" }])));
  const adm = env.authenticatedContext("adm", ADM).firestore();
  await assertSucceeds(updateDoc(doc(adm, "postulaciones", "u1"), { estado: "finalista", actualizadoEn: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(adm, "notasAdmin", "u1"), { edicion: "2026-uni", notas: "Revisar", actualizadoPor: "adm", actualizadoEn: serverTimestamp() }));
  const user = env.authenticatedContext("u1", { email: "lider@correo.pe" }).firestore();
  await assertFails(getDoc(doc(user, "notasAdmin", "u1")));
  await assertFails(setDoc(doc(user, "notasAdmin", "u1"), { notas: "x" }));
});
test("un admin lista todas las postulaciones; un postulante no", async () => {
  await assertSucceeds(submit("u1", "lider@correo.pe", base(), leaderIdx.concat([{ id: "m1@correo.pe", rol: "integrante" }])));
  const { getDocs, collection } = await import("firebase/firestore");
  await assertSucceeds(getDocs(collection(env.authenticatedContext("adm", ADM).firestore(), "postulaciones")));
  await assertFails(getDocs(collection(env.authenticatedContext("u1", { email: "lider@correo.pe" }).firestore(), "postulaciones")));
});
test("una cuenta de Google con el correo del admin NO es admin; tampoco una de contraseña con otro correo", async () => {
  await assertSucceeds(setDoc(doc(env.unauthenticatedContext().firestore(), "sponsors", "s1"), sponsor()));
  const google = env.authenticatedContext("g1", { email: "admin@dataleague.test", firebase: { sign_in_provider: "google.com" } }).firestore();
  const otro = env.authenticatedContext("p1", { email: "otro@dataleague.test", firebase: { sign_in_provider: "password" } }).firestore();
  await assertFails(getDoc(doc(google, "sponsors", "s1")));
  await assertFails(getDoc(doc(otro, "sponsors", "s1")));
  await assertSucceeds(getDoc(doc(env.authenticatedContext("adm", ADM).firestore(), "sponsors", "s1")));
});

// ---------- Inscripciones a jornadas ----------
const insc = (evento: string, uid: string, over: Record<string, unknown> = {}) => ({ evento, uid, nombre: "Ana", correo: "ana@correo.pe", creadoEn: serverTimestamp(), ...over });
test("una persona se inscribe y se desinscribe de una jornada; no puede hacerlo por otra", async () => {
  const ana = env.authenticatedContext("u1", { email: "ana@correo.pe" }).firestore();
  await assertSucceeds(setDoc(doc(ana, "inscripciones", "kickoff_u1"), insc("kickoff", "u1")));
  await assertFails(setDoc(doc(ana, "inscripciones", "ml_u2"), insc("ml", "u2")));                 // a nombre de otra persona
  await assertFails(setDoc(doc(ana, "inscripciones", "otro_u1"), insc("otro", "u1")));             // evento que no existe
  await assertFails(setDoc(doc(ana, "inscripciones", "ia_u1"), insc("ia", "u1", { correo: "otro@correo.pe" })));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), "inscripciones", "ia_u1"), insc("ia", "u1")));
  await assertSucceeds(deleteDoc(doc(ana, "inscripciones", "kickoff_u1")));
});
test("cada quien ve solo sus inscripciones; el admin ve todas", async () => {
  const ana = env.authenticatedContext("u1", { email: "ana@correo.pe" }).firestore();
  await assertSucceeds(setDoc(doc(ana, "inscripciones", "kickoff_u1"), insc("kickoff", "u1")));
  const { getDocs, collection, query, where } = await import("firebase/firestore");
  await assertSucceeds(getDocs(query(collection(ana, "inscripciones"), where("uid", "==", "u1"))));
  await assertFails(getDocs(collection(ana, "inscripciones")));                                    // lista completa: no
  const otra = env.authenticatedContext("u2", { email: "bea@correo.pe" }).firestore();
  await assertFails(getDoc(doc(otra, "inscripciones", "kickoff_u1")));
  await assertFails(deleteDoc(doc(otra, "inscripciones", "kickoff_u1")));
  await assertSucceeds(getDocs(collection(env.authenticatedContext("adm", ADM).firestore(), "inscripciones")));
});
assert.ok(true);
