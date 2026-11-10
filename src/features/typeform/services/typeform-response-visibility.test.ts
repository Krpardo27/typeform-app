import { describe, expect, it } from "vitest";
import { getTypeformAnswerFieldLabel, mapMaskedTypeformResponses, type TypeformResponseItem } from "./typeform.service";

const form = { id: "form", title: "Concurso", fields: [{ id: "notes", title: "Comentarios", type: "long_text" }] };
const raw: TypeformResponseItem = {
  token: "a", submitted_at: "2026-11-06T12:34:56Z", landed_at: "2026-11-06T12:00:00Z",
  hidden: { email: "private@example.test", numero: "123456789" },
  answers: [{ type: "text", field: { id: "notes" }, text: "NOMBRE CORREO TELEFONO EN TEXTO LIBRE" },
    { type: "file_url", file_url: "https://private.example.test/archivo" }],
};

describe("proyección de respuestas antes de salir del servidor", () => {
  it.each([undefined, { maskSensitive: true }, { maskSensitive: false }])("sin tokens autorizados nunca devuelve datos ni fragmentos: %j", (options) => {
    expect(mapMaskedTypeformResponses(form, [raw], options)).toEqual([{ token: "a", visibility: "anonymous", answers: [], hidden: [] }]);
  });

  it("revela únicamente el token autorizado, no otro con los mismos datos", () => {
    const result = mapMaskedTypeformResponses(form, [raw, { ...raw, token: "b" }], { unmaskTokens: new Set(["a"]) });
    expect(result[0].visibility).toBe("winner");
    expect(result[0].answers[0].value).toBe("NOMBRE CORREO TELEFONO EN TEXTO LIBRE");
    expect(result[1]).toEqual({ token: "b", visibility: "anonymous", answers: [], hidden: [] });
  });
});

describe("etiquetas legibles del formulario actual", () => {
  const labels = ["Nombres", "Primer apellido", "Segundo apellido", "RUT:", "Correo electrónico", "Teléfono", "Región", "Comuna"];
  const nestedForm = {
    id: "form", title: "Concurso", fields: [
      { id: "contact", type: "contact_info", properties: { fields: labels.slice(0, 6).map((title, index) => ({
        id: `opaque-contact-${index}`, ref: `opaque-ref-${index}`, title, type: index === 4 ? "email" : "short_text",
      })) } },
      { id: "address", type: "address", fields: labels.slice(6).map((title, index) => ({
        id: `opaque-address-${index}`, ref: `opaque-place-${index}`, title, type: "dropdown",
      })) },
    ],
  };
  const nested: TypeformResponseItem = { token: "a", hidden: { secret: "HIDDEN" }, answers: [
    { field: { id: "contact" }, answers: labels.slice(0, 6).map((_, index) => ({
      field: index % 2 === 0 ? { id: `opaque-contact-${index}` } : { ref: `opaque-ref-${index}` },
      type: "text", text: `valor-${index}`,
    })) },
    { field: { id: "address" }, answers: labels.slice(6).map((_, index) => ({
      field: { ref: `opaque-place-${index}` }, type: "text", text: `ubicación-${index}`,
    })) },
  ] };

  it("resuelve id/ref de contact_info/address anidados y conserva el valor y tipo de cada hijo", () => {
    const snapshot = JSON.stringify({ nestedForm, nested });
    const [mapped] = mapMaskedTypeformResponses(nestedForm, [nested], { unmaskTokens: new Set(["a"]) });
    expect(mapped.answers.map((answer) => answer.fieldLabel)).toEqual(labels);
    expect(mapped.answers.map((answer) => answer.question)).toEqual(labels);
    expect(mapped.answers.map((answer) => answer.value)).toEqual([
      "valor-0", "valor-1", "valor-2", "valor-3", "valor-4", "valor-5", "ubicación-0", "ubicación-1",
    ]);
    expect(mapped.answers[4]).toMatchObject({ fieldType: "email", answerType: "text", masked: false });
    expect(JSON.stringify({ nestedForm, nested })).toBe(snapshot);
  });

  it("usa el título real actualizado y no una pregunta fija ni el ref semántico", () => {
    const [mapped] = mapMaskedTypeformResponses({ id: "form", title: "Concurso", fields: [
      { id: "name", ref: "first_name", title: "Nombres tal como aparecen en tu documento" },
    ] }, [{ token: "a", answers: [{ field: { id: "name" }, text: "Ana" }] }], { unmaskTokens: new Set(["a"]) });
    expect(mapped.answers[0].fieldLabel).toBe("Nombres tal como aparecen en tu documento");
  });

  it("no mezcla campos sin identificadores al buscar metadatos", () => {
    const [mapped] = mapMaskedTypeformResponses({ id: "form", title: "Concurso", fields: [
      { title: "No corresponde" }, { id: "other", title: "Tampoco corresponde" },
    ] }, [{ token: "a", answers: [{ type: "text", text: "Dato" }] }], { unmaskTokens: new Set(["a"]) });
    expect(mapped.answers[0]).toMatchObject({ fieldLabel: "Respuesta 1", question: "Respuesta 1" });
  });

  it("solo admite refs semánticas conocidas; nunca usa id ni refs opacas como etiqueta", () => {
    const refs = ["correo_electronico", "primer_apellido", "region", "6d6f4b98-94aa-4b5c-993a-61e63f2a2287", "Ab7xQ9mLp2", "opaque_question", "kjhgfdsasdf"];
    const [mapped] = mapMaskedTypeformResponses({ id: "form", title: "Concurso" }, [{ token: "a", answers: refs.map((ref) => ({
      field: { id: "Nombres", ref }, type: "text", text: "Dato",
    })) }], { unmaskTokens: new Set(["a"]) });
    expect(mapped.answers.map((answer) => answer.fieldLabel)).toEqual([
      "Correo electrónico", "Primer apellido", "Región", "Respuesta 4", "Respuesta 5", "Respuesta 6", "Respuesta 7",
    ]);
    expect(mapped.answers.map((answer) => getTypeformAnswerFieldLabel(answer))).toEqual(mapped.answers.map((answer) => answer.fieldLabel));
    expect(getTypeformAnswerFieldLabel({ question: "Ab7xQ9mLp2" }, 2)).toBe("Respuesta 3");
    expect(getTypeformAnswerFieldLabel({ question: "¿Por qué quieres participar?" })).toBe("¿Por qué quieres participar?");
  });

  it("expande objetos compuestos con etiquetas de sus subcampos reales", () => {
    const [mapped] = mapMaskedTypeformResponses({ id: "form", title: "Concurso", fields: [
      { id: "contact", type: "contact_info", properties: { fields: [{ id: "n", ref: "first_name", title: "Nombres" }] } },
      { id: "address", type: "address", properties: { fields: [{ id: "c", ref: "city", title: "Comuna" }] } },
    ] }, [{ token: "a", answers: [
      { field: { id: "contact" }, type: "contact_info", contact_info: { first_name: "Ana" } },
      { field: { id: "address" }, type: "address", address: { city: "Valdivia" } },
    ] }], { unmaskTokens: new Set(["a"]) });
    expect(mapped.answers.map(({ fieldLabel, value }) => ({ fieldLabel, value }))).toEqual([
      { fieldLabel: "Nombres", value: "Ana" }, { fieldLabel: "Comuna", value: "Valdivia" },
    ]);
  });

  it("preserva la alineación 1:1 del extractor de perfiles que ya aplana respuestas", () => {
    const child = { field: { id: "opaque-contact-0" }, type: "text", text: "Ana" };
    const answers = [{ answers: [child] }, child, { type: "contact_info", contact_info: { email: "a@example.test" } }, { type: "text", text: "a@example.test" }];
    const [mapped] = mapMaskedTypeformResponses(nestedForm, [{ token: "a", answers }], { unmaskTokens: new Set(["a"]) });
    expect(mapped.answers.map((answer) => answer.value)).toEqual(["Sin respuesta", "Ana", "Sin respuesta", "a@example.test"]);
  });

  it("ningún metadato, valor, hidden ni fecha sale para anónimos, ni con respuestas compuestas", () => {
    expect(mapMaskedTypeformResponses(nestedForm, [nested], { maskSensitive: false, unmaskTokens: new Set(["otro"]) }))
      .toEqual([{ token: "a", visibility: "anonymous", answers: [], hidden: [] }]);
  });
});