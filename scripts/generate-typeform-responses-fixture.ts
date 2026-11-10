import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { TypeformResponseItem } from "../src/features/typeform/services/typeform.service";

export type TypeformFixtureField = {
  id?: string;
  ref?: string;
  title?: string;
  type?: string;
  fields?: TypeformFixtureField[];
  choices?: { label?: string }[];
  properties?: {
    fields?: TypeformFixtureField[];
    choices?: { label?: string }[];
  };
};

type ChileLocation = { region: string; communes: string[] };
type FixtureOptions = { workspaceId: string; formId?: string; count: number; force: boolean };
const DEFAULT_WORKSPACE_ID = "gE4Nx2";
const DEFAULT_COUNT = 120;
const OUTPUT_DIR = path.join(process.cwd(), "src/features/typeform/fixtures/responses");
const CHILE_LOCATIONS: ChileLocation[] = [
  { region: "Región de Arica y Parinacota", communes: ["Arica", "Camarones", "Putre", "General Lagos"] },
  { region: "Región de Tarapacá", communes: ["Iquique", "Alto Hospicio", "Pozo Almonte", "Pica", "Huara"] },
  { region: "Región de Antofagasta", communes: ["Antofagasta", "Calama", "Tocopilla", "Mejillones", "Taltal"] },
  { region: "Región de Atacama", communes: ["Copiapó", "Caldera", "Vallenar", "Chañaral", "Diego de Almagro"] },
  { region: "Región de Coquimbo", communes: ["La Serena", "Coquimbo", "Ovalle", "Illapel", "Vicuña"] },
  { region: "Región de Valparaíso", communes: ["Valparaíso", "Viña del Mar", "Quilpué", "Villa Alemana", "San Antonio"] },
  { region: "Región Metropolitana de Santiago", communes: ["Santiago", "Puente Alto", "Maipú", "La Florida", "Las Condes"] },
  { region: "Región del Libertador General Bernardo O'Higgins", communes: ["Rancagua", "Machalí", "San Fernando", "Rengo", "Pichilemu"] },
  { region: "Región del Maule", communes: ["Talca", "Curicó", "Linares", "Cauquenes", "Constitución"] },
  { region: "Región de Ñuble", communes: ["Chillán", "Chillán Viejo", "San Carlos", "Bulnes", "Quirihue"] },
  { region: "Región del Biobío", communes: ["Concepción", "Talcahuano", "Los Ángeles", "Coronel", "Chiguayante"] },
  { region: "Región de La Araucanía", communes: ["Temuco", "Padre Las Casas", "Villarrica", "Angol", "Pucón"] },
  { region: "Región de Los Ríos", communes: ["Valdivia", "La Unión", "Río Bueno", "Panguipulli", "Los Lagos"] },
  { region: "Región de Los Lagos", communes: ["Puerto Montt", "Osorno", "Castro", "Ancud", "Puerto Varas"] },
  { region: "Región de Aysén del General Carlos Ibáñez del Campo", communes: ["Coyhaique", "Aysén", "Chile Chico", "Cochrane", "Cisnes"] },
  { region: "Región de Magallanes y de la Antártica Chilena", communes: ["Punta Arenas", "Puerto Natales", "Porvenir", "Cabo de Hornos", "Primavera"] },
];

export function validateFormId(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("formId inválido: usa solo letras, números, guion y guion bajo.");
  }
  return value;
}

function validateCount(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 5000) {
    throw new Error("count debe ser un entero entre 1 y 5000.");
  }
  return count;
}

export function parseFixtureArgs(args: string[]): FixtureOptions {
  const values = new Map<string, string>();
  let force = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--force" && !force) {
      force = true;
      continue;
    }
    const match = /^--(formId|workspaceId|count)(?:=(.*))?$/.exec(args[i]);
    if (!match || values.has(match[1])) throw new Error("Argumentos inválidos o repetidos.");
    const value = match[2] ?? args[++i];
    if (!value || value.startsWith("--")) throw new Error("Falta el valor de un argumento.");
    values.set(match[1], value);
  }
  const rawCount = values.get("count") ?? String(DEFAULT_COUNT);
  if (!/^\d+$/.test(rawCount)) throw new Error("count debe ser un entero entre 1 y 5000.");
  const formId = values.get("formId");
  return {
    workspaceId: values.get("workspaceId") ?? DEFAULT_WORKSPACE_ID,
    formId: formId === undefined ? undefined : validateFormId(formId),
    count: validateCount(Number(rawCount)),
    force,
  };
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function fieldRole(field: TypeformFixtureField) {
  return normalize(`${field.title ?? ""} ${field.ref ?? ""}`).replace(/[_-]/g, " ");
}

function children(field: TypeformFixtureField) {
  return field.fields ?? field.properties?.fields ?? [];
}

function leaves(fields: TypeformFixtureField[]): TypeformFixtureField[] {
  return fields.flatMap((field) => field.type === "statement" ? [] :
    children(field).length ? leaves(children(field)) : [field]);
}

function choiceLabels(field: TypeformFixtureField) {
  return (field.choices ?? field.properties?.choices ?? [])
    .flatMap((choice) => choice.label?.trim() ? [choice.label] : []);
}

function isChoice(field: TypeformFixtureField) {
  return ["dropdown", "multiple_choice", "picture_choice"].includes(field.type ?? "");
}

function isRegion(field: TypeformFixtureField) {
  return /\b(region|state)\b/.test(fieldRole(field));
}

function isCommune(field: TypeformFixtureField) {
  return /\b(comuna|ciudad|localidad|city)\b/.test(fieldRole(field));
}

function regionKey(value: string) {
  return normalize(value).replace(/\b(region|de|del|la|el|los|las|y)\b/g, "").replace(/[^a-z0-9]/g, "");
}

function regionMatches(label: string, region: string) {
  const key = regionKey(label);
  const expected = regionKey(region);
  return key.length > 2 && (key === expected || expected.startsWith(key));
}

function availableLocations(fields: TypeformFixtureField[]) {
  const regionFields = fields.filter((field) => isChoice(field) && isRegion(field));
  const communeFields = fields.filter((field) => isChoice(field) && isCommune(field));
  const locations = CHILE_LOCATIONS.flatMap((location) => {
    if (!regionFields.every((field) => choiceLabels(field).some((label) => regionMatches(label, location.region)))) return [];
    const communes = location.communes.filter((commune) => communeFields.every((field) =>
      choiceLabels(field).some((label) => normalize(label) === normalize(commune))));
    return communes.length ? [{ ...location, communes }] : [];
  });
  if (!locations.length) throw new Error("El esquema no permite una región y comuna coherentes del catálogo sintético.");
  return locations;
}

const GIVEN_NAMES = ["Amalia", "Bruno", "Camila", "Diego", "Elisa", "Felipe", "Gabriela", "Hugo", "Inés", "Joaquín", "Kiara", "Lucas", "Marina", "Nicolás", "Olivia", "Pablo", "Renata", "Simón", "Teresa", "Vicente"];
const SURNAMES = ["Alarcón", "Barrera", "Cáceres", "Donoso", "Espinoza", "Fuentes", "Garrido", "Herrera", "Ibarra", "Jara", "Lagos", "Morales", "Navarro", "Ortega", "Paredes", "Quintana", "Rojas", "Salinas", "Toledo", "Valdés", "Zamora"];

function participant(index: number) {
  const offset = index - 1;
  const firstName = GIVEN_NAMES[offset % GIVEN_NAMES.length];
  const firstSurname = SURNAMES[offset % SURNAMES.length];
  const secondSurname = SURNAMES[(offset + 1 + Math.floor(offset / SURNAMES.length) % (SURNAMES.length - 1)) % SURNAMES.length];
  // Invalid check digit on purpose: never impersonate a valid Chilean RUT.
  const body = String(index).padStart(8, "0");
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) sum += Number(body[body.length - 1 - i]) * (2 + i % 6);
  const correctDigit = 11 - sum % 11;
  const rut = `${body.slice(0, 2)}.${body.slice(2, 5)}.${body.slice(5)}-${correctDigit === 11 ? "1" : "0"}`;
  return {
    firstName, firstSurname, secondSurname, rut,
    email: `participante.${index}@example.invalid`,
    instagram: `@fixture_inexistente_${String(index).padStart(4, "0")}`,
    // +56 with invalid national prefix, not a callable mobile number.
    phone: `+56000${String(index).padStart(6, "0")}`,
  };
}

function textValue(field: TypeformFixtureField, index: number, location: ChileLocation) {
  const role = fieldRole(field);
  const person = participant(index);
  if (isRegion(field)) return location.region;
  if (isCommune(field)) return location.communes[(index - 1) % location.communes.length];
  if (/\brut\b|\br\.u\.t\b/.test(role)) return person.rut;
  if (/instagram|\binsta\b/.test(role)) return person.instagram;
  if (/email|correo|\bmail\b/.test(role)) return person.email;
  if (/telefono|phone|celular|movil/.test(role)) return person.phone;
  if (/segundo apellido|apellido materno|maternal|second last name/.test(role)) return person.secondSurname;
  if (/primer apellido|apellido paterno|paternal|first last name/.test(role)) return person.firstSurname;
  if (/apellidos|last name|surname/.test(role)) return `${person.firstSurname} ${person.secondSurname}`;
  if (/apellido/.test(role)) return person.firstSurname;
  if (/nombre completo|full name/.test(role)) return `${person.firstName} ${person.firstSurname} ${person.secondSurname}`;
  if (/nombre|first name|given name|\bname\b/.test(role)) return person.firstName;
  if (/pais|country/.test(role)) return "Chile";
  if (/direccion|address line|street/.test(role)) return `Calle ficticia ${index} (no existe)`;
  if (/postal|zip code/.test(role)) return "0000000";
  return ["Opción sintética", "Ejemplo local", "Dato ficticio", "Prueba de volumen"][index % 4] + ` ${index}`;
}

function fieldValue(field: TypeformFixtureField, index: number, location: ChileLocation) {
  const person = participant(index);
  switch (field.type) {
    case "email": return { type: "email", email: person.email };
    case "phone_number": return { type: "phone_number", phone_number: person.phone };
    case "number": return { type: "number", number: 18 + index % 63 };
    case "rating": case "opinion_scale": return { type: "number", number: 1 + index % 5 };
    case "yes_no": case "legal": return { type: "boolean", boolean: index % 2 === 0 };
    case "date": return { type: "date", date: new Date(Date.UTC(1980 + index % 25, index % 12, 1 + index % 28)).toISOString().slice(0, 10) };
    case "website": return { type: "url", url: `https://example.invalid/participante-${index}` };
  }
  if (isChoice(field)) {
    const labels = choiceLabels(field);
    const label = isRegion(field)
      ? labels.find((label) => regionMatches(label, location.region))
      : isCommune(field)
        ? labels.find((label) => normalize(label) === normalize(textValue(field, index, location)))
        : labels[(index - 1) % labels.length];
    if (!label) throw new Error("Campo de opciones sin una opción sintética compatible.");
    return { type: "choice", choice: { label } };
  }
  if (field.type === "short_text" || field.type === "long_text") {
    return { type: "text", text: textValue(field, index, location) };
  }
  // Omit unsupported uploads/payments/etc., never invent extra fields.
  return undefined;
}

function buildAnswers(fields: TypeformFixtureField[], index: number, location: ChileLocation): NonNullable<TypeformResponseItem["answers"]> {
  return fields.flatMap<NonNullable<TypeformResponseItem["answers"]>[number]>((field) => {
    if (field.type === "statement") return [];
    if (!field.id && !field.ref) throw new Error("Campo del esquema sin identidad real.");
    const identity = { ...(field.id ? { id: field.id } : {}), ...(field.ref ? { ref: field.ref } : {}), type: field.type };
    const nested = children(field);
    if (nested.length) return [{ field: identity, answers: buildAnswers(nested, index, location) }];
    const value = fieldValue(field, index, location);
    return value ? [{ field: identity, ...value }] : [];
  });
}

export function buildFixture(formId: string, fields: TypeformFixtureField[], hiddenFields: string[], count: number) {
  validateFormId(formId);
  validateCount(count);
  const locations = availableLocations(leaves(fields));
  const items: TypeformResponseItem[] = Array.from({ length: count }, (_, offset) => {
    const index = offset + 1;
    const location = locations[offset % locations.length];
    const submittedAt = new Date(Date.UTC(2026, 8, 28, 12) - index * 37 * 60_000 - index % 59 * 1000);
    const landedAt = new Date(submittedAt.getTime() - (45 + index % 240) * 1000);
    return {
      landing_id: `fixture-landing-${formId}-${index}`,
      response_id: `fixture-response-${formId}-${index}`,
      token: `fixture-${formId}-${String(index).padStart(4, "0")}`,
      landed_at: landedAt.toISOString(),
      submitted_at: submittedAt.toISOString(),
      hidden: Object.fromEntries(hiddenFields.map((field) => [field,
        /email|correo/i.test(field) ? participant(index).email : `fixture-${index}`])),
      answers: buildAnswers(fields, index, location),
    };
  });
  return { items };
}

type FormSchema = { fields?: TypeformFixtureField[]; hidden?: string[] };
type FormPage = { items: { id: string }[]; page_count: number };

// Independent of app services: no DB, response download or write API.
async function getSchema<T>(endpoint: string): Promise<T> {
  const token = process.env.TYPEFORM_TOKEN ?? process.env.TYPEFORM_API_TOKEN;
  if (!token) throw new Error("No hay una credencial de Typeform configurada.");
  try {
    const response = await fetch(`https://api.typeform.com${endpoint}`, {
      method: "GET", headers: { Authorization: `Bearer ${token}` }, redirect: "error",
    });
    if (!response.ok) throw new Error();
    return await response.json() as T;
  } catch {
    // Never include remote bodies, headers or underlying error messages.
    throw new Error("No se pudo consultar el esquema o catálogo de Typeform.");
  }
}

export async function generateFixtures(options: FixtureOptions, outputDir = OUTPUT_DIR) {
  validateCount(options.count);
  if (options.formId !== undefined) validateFormId(options.formId);
  const forms: { id: string }[] = [];
  if (options.formId) forms.push({ id: options.formId });
  else {
    let page = 1;
    while (true) {
      const query = new URLSearchParams({ workspace_id: options.workspaceId, page: String(page), page_size: "200" });
      const result = await getSchema<FormPage>(`/forms?${query}`);
      forms.push(...result.items);
      if (page >= result.page_count || result.items.length === 0) break;
      page += 1;
    }
  }
  // Check all targets, including IDs from the API, before writing any fixture.
  const targets = forms.map((form) => path.join(outputDir, `${validateFormId(form.id)}.json`));
  if (!options.force) {
    for (const target of targets) {
      try { await access(target); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw new Error("No se pudo comprobar el destino del fixture.");
      }
      throw new Error("Ya existe un fixture; usa --force para reemplazarlo.");
    }
  }
  for (const [index, form] of forms.entries()) {
    const detail = await getSchema<FormSchema>(`/forms/${encodeURIComponent(form.id)}`);
    const fixture = buildFixture(form.id, detail.fields ?? [], detail.hidden ?? [], options.count);
    await mkdir(outputDir, { recursive: true });
    try {
      await writeFile(targets[index], `${JSON.stringify(fixture, null, 2)}\n`, { encoding: "utf8", flag: options.force ? "w" : "wx" });
    } catch {
      throw new Error("No se pudo escribir el fixture; comprueba el destino y --force.");
    }
    console.log(`Fixture creado: ${targets[index]} (${options.count} participantes sintéticos)`);
  }
  if (!forms.length) console.log("No se encontraron formularios en el workspace.");
}

// Importing helpers never loads credentials, performs I/O or starts the CLI.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void (async () => {
    const options = parseFixtureArgs(process.argv.slice(2));
    await import("dotenv/config");
    await generateFixtures(options);
  })().catch(() => {
    console.error("No se generaron todos los fixtures. Revisa argumentos (count 1..5000 y formId seguro), credencial, esquema y destino; usa --force solo para reemplazar un fixture existente.");
    process.exitCode = 1;
  });
}