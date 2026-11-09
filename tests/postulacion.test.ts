import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarCelular, postulacionSchema, crossIssues } from "../src/lib/validacion.ts";

const base = { correoLider: "lider@uni.pe", nombre: "Ana Pérez", celular: "987654321", integrantes: [], acepta: true as const };
const ok = (v: object) => postulacionSchema.safeParse({ ...base, ...v });
const msgs = (v: object) => { const r = ok(v); return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`); };
const bien = { nombre: "Luis Gómez", celular: "912345678", correo: "luis@uni.pe" };

test("celulares válidos", () => {
  for (const [i, o] of [["987654321", "+51987654321"], ["987 654 321", "+51987654321"], ["987-654-321", "+51987654321"], ["(987) 654 321", "+51987654321"],
    ["+51987654321", "+51987654321"], ["+51 987 654 321", "+51987654321"], ["+573001234567", "+573001234567"], [" 987654321 ", "+51987654321"]])
    assert.equal(normalizarCelular(i), o, i);
});
test("celulares inválidos", () => {
  for (const i of ["", "abc", "87654321", "887654321", "9876543210", "98765432", "+51887654321", "+1", "+0123456789", "98765432a", "+51 12345", "0051987654321", "+5198765432123456"])
    assert.equal(normalizarCelular(i), null, i);
});
test("postulación individual válida", () => assert.equal(ok({}).success, true));
test("equipo de 4 válido", () => {
  const r = ok({ integrantes: [bien, { nombre: "Eva R", celular: "955555555", correo: "eva@uni.pe" }, { nombre: "Tito S", celular: "944444444", correo: "tito@uni.pe" }] });
  assert.equal(r.success, true);
});
test("más de 4 personas", () => assert.ok(msgs({ integrantes: Array(4).fill(bien) }).some((m) => m.includes("máximo 4"))));
test("nombre vacío / solo espacios / muy largo", () => {
  assert.ok(msgs({ nombre: "" }).length); assert.ok(msgs({ nombre: "   " }).length); assert.ok(msgs({ nombre: "a".repeat(101) }).length);
  assert.equal(ok({ nombre: "a".repeat(100) }).success, true);
});
test("nombres con tildes, ñ, guiones y apóstrofes", () => {
  for (const n of ["José Ñañez", "María-Luisa O'Brien", "Çağla Yıldız", "Wang 王"]) assert.equal(ok({ nombre: n }).success, true, n);
});
test("correos inválidos", () => {
  for (const c of ["", "a", "a@", "@b.com", "a@b", "a b@c.com", "a@@b.com", "a@b..com"])
    assert.ok(msgs({ integrantes: [{ ...bien, correo: c }] }).some((m) => m.startsWith("integrantes.0.correo")), c);
});
test("correos válidos y normalizados a minúsculas", () => {
  const r = postulacionSchema.safeParse({ ...base, integrantes: [{ ...bien, correo: "  Luis.Gomez+x@UNI.EDU.pe " }] });
  assert.ok(r.success); assert.equal(r.data.integrantes[0].correo, "luis.gomez+x@uni.edu.pe");
});
test("no aceptar términos", () => { assert.ok(msgs({ acepta: false }).length); assert.ok(msgs({ acepta: undefined }).length); });
test("celular de quien postula inválido", () => assert.ok(msgs({ celular: "12345" }).some((m) => m.startsWith("celular"))));
test("repetidos: correo del líder (mayúsculas), entre integrantes, nombre y celular del líder", () => {
  assert.ok(msgs({ integrantes: [{ ...bien, correo: "LIDER@uni.pe" }] }).some((m) => m.includes("ya está en tu equipo")));
  assert.ok(msgs({ integrantes: [bien, { ...bien, nombre: "Otro", celular: "955555555" }] }).some((m) => m.startsWith("integrantes.1.correo")));
  assert.ok(msgs({ integrantes: [{ ...bien, nombre: "ana pérez" }] }).some((m) => m.startsWith("integrantes.0.nombre")));
  assert.ok(msgs({ integrantes: [{ ...bien, celular: "+51 987 654 321" }] }).some((m) => m.startsWith("integrantes.0.celular")));
});
test("dos integrantes con mismo celular no se bloquean (solo se compara con el líder)", () => {
  assert.equal(crossIssues({ ...base, integrantes: [bien, { nombre: "Z", celular: bien.celular, correo: "z@uni.pe" }] }).length, 0);
});
