import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getTypeformForm,
  getWorkspaceForms,
  type TypeformResponseItem,
} from "../src/features/typeform/services/typeform.service";

type TypeformFixtureField = {
  id?: string;
  ref?: string;
  title?: string;
  type?: string;
  choices?: TypeformFixtureChoice[];
  properties?: {
    choices?: TypeformFixtureChoice[];
  };
};

type TypeformFixtureChoice = {
  label?: string;
};

type ChileLocation = {
  region: string;
  communes: string[];
};

const DEFAULT_WORKSPACE_ID = "gE4Nx2";
const DEFAULT_COUNT = 120;
const OUTPUT_DIR = path.join(
  process.cwd(),
  "src/features/typeform/fixtures/responses",
);

const CHILE_LOCATIONS: ChileLocation[] = [
  {
    region: "Región de Arica y Parinacota",
    communes: ["Arica", "Camarones", "Putre", "General Lagos"],
  },
  {
    region: "Región de Tarapacá",
    communes: ["Iquique", "Alto Hospicio", "Pozo Almonte", "Pica", "Huara"],
  },
  {
    region: "Región de Antofagasta",
    communes: ["Antofagasta", "Calama", "Tocopilla", "Mejillones", "Taltal"],
  },
  {
    region: "Región de Atacama",
    communes: ["Copiapó", "Caldera", "Vallenar", "Chañaral", "Diego de Almagro"],
  },
  {
    region: "Región de Coquimbo",
    communes: ["La Serena", "Coquimbo", "Ovalle", "Illapel", "Vicuña"],
  },
  {
    region: "Región de Valparaíso",
    communes: ["Valparaíso", "Viña del Mar", "Quilpué", "Villa Alemana", "San Antonio"],
  },
  {
    region: "Región Metropolitana de Santiago",
    communes: ["Santiago", "Puente Alto", "Maipú", "La Florida", "Las Condes"],
  },
  {
    region: "Región del Libertador General Bernardo O'Higgins",
    communes: ["Rancagua", "Machalí", "San Fernando", "Rengo", "Pichilemu"],
  },
  {
    region: "Región del Maule",
    communes: ["Talca", "Curicó", "Linares", "Cauquenes", "Constitución"],
  },
  {
    region: "Región de Ñuble",
    communes: ["Chillán", "Chillán Viejo", "San Carlos", "Bulnes", "Quirihue"],
  },
  {
    region: "Región del Biobío",
    communes: ["Concepción", "Talcahuano", "Los Ángeles", "Coronel", "Chiguayante"],
  },
  {
    region: "Región de La Araucanía",
    communes: ["Temuco", "Padre Las Casas", "Villarrica", "Angol", "Pucón"],
  },
  {
    region: "Región de Los Ríos",
    communes: ["Valdivia", "La Unión", "Río Bueno", "Panguipulli", "Los Lagos"],
  },
  {
    region: "Región de Los Lagos",
    communes: ["Puerto Montt", "Osorno", "Castro", "Ancud", "Puerto Varas"],
  },
  {
    region: "Región de Aysén del General Carlos Ibáñez del Campo",
    communes: ["Coyhaique", "Aysén", "Chile Chico", "Cochrane", "Cisnes"],
  },
  {
    region: "Región de Magallanes y de la Antártica Chilena",
    communes: ["Punta Arenas", "Puerto Natales", "Porvenir", "Cabo de Hornos", "Primavera"],
  },
];

function getArg(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));

  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);

  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getChoiceLabels(field: TypeformFixtureField) {
  return (field.choices ?? field.properties?.choices ?? [])
    .map((choice) => choice.label?.trim())
    .filter((label): label is string => Boolean(label));
}

function normalizeChoiceLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getFieldValue(
  field: TypeformFixtureField,
  index: number,
  location: ChileLocation,
) {
  const title = `${field.title ?? field.ref ?? ""}`.toLowerCase();
  const type = field.type ?? "short_text";

  if (type === "email" || /email|correo|mail/.test(title)) {
    return {
      type: "email",
      email: `participante.${index}@example.com`,
    };
  }

  if (type === "phone_number" || /telefono|teléfono|phone|celular/.test(title)) {
    return {
      type: "phone_number",
      phone_number: `+569${String(80000000 + index).slice(0, 8)}`,
    };
  }

  if (type === "number" || /edad|numero|número|cantidad/.test(title)) {
    return {
      type: "number",
      number: 18 + (index % 45),
    };
  }

  if (type === "yes_no" || type === "legal") {
    return {
      type: "boolean",
      boolean: index % 2 === 0,
    };
  }

  if (type === "date") {
    return {
      type: "date",
      date: `2026-09-${String((index % 28) + 1).padStart(2, "0")}`,
    };
  }

  if (type === "website") {
    return {
      type: "url",
      url: `https://example.com/participante-${index}`,
    };
  }

  if (type === "multiple_choice" || type === "dropdown" || type === "picture_choice") {
    const choiceLabels = getChoiceLabels(field);
    const locationIndex = index - 1;
    const isRegionField = /regi[oó]n|region/.test(title);
    const isCommuneField = /comuna|ciudad|localidad/.test(title);

    if (isRegionField) {
      const regionChoices = choiceLabels.filter((label) => /regi[oó]n|region/i.test(label));
      const matchingRegionChoice = regionChoices.find(
        (label) => normalizeChoiceLabel(label) === normalizeChoiceLabel(location.region),
      );

      return {
        type: "choice",
        choice: {
          label:
            matchingRegionChoice ??
            regionChoices[locationIndex % regionChoices.length] ??
            location.region,
        },
      };
    }

    if (isCommuneField) {
      return {
        type: "choice",
        choice: {
          label: location.communes[locationIndex % location.communes.length],
        },
      };
    }

    return {
      type: "choice",
      choice: { label: choiceLabels[locationIndex % choiceLabels.length] ?? location.region },
    };
  }

  return {
    type: "text",
    text: /nombre|name/.test(title)
      ? `Participante ${index}`
      : `Respuesta de prueba ${index}`,
  };
}

function buildResponse(
  formId: string,
  fields: TypeformFixtureField[],
  hiddenFields: string[],
  index: number,
): TypeformResponseItem {
  const location = CHILE_LOCATIONS[(index - 1) % CHILE_LOCATIONS.length];
  const submittedAt = new Date(Date.UTC(2026, 8, 28, 12, 0, 0));
  submittedAt.setMinutes(submittedAt.getMinutes() - index * 3);

  const landedAt = new Date(submittedAt);
  landedAt.setMinutes(landedAt.getMinutes() - 2);

  return {
    landing_id: `fixture-landing-${formId}-${index}`,
    response_id: `fixture-response-${formId}-${index}`,
    token: `fixture-${formId}-${String(index).padStart(4, "0")}`,
    landed_at: landedAt.toISOString(),
    submitted_at: submittedAt.toISOString(),
    hidden: Object.fromEntries(
      hiddenFields.map((field) => [
        field,
        field.toLowerCase().includes("email")
          ? `hidden.${index}@example.com`
          : String(index),
      ]),
    ),
    answers: fields.map((field, fieldIndex) => ({
      field: {
        id: field.id ?? field.ref ?? `fixture-field-${fieldIndex}`,
        ref: field.ref ?? field.id ?? `fixture-field-${fieldIndex}`,
        type: field.type,
      },
      ...getFieldValue(field, index, location),
    })),
  };
}

async function getWorkspaceFormsToSeed(workspaceId: string) {
  const forms = [];
  let page = 1;

  while (true) {
    const result = await getWorkspaceForms(workspaceId, { page, pageSize: 200 });
    forms.push(...result.items);

    if (page >= result.page_count || result.items.length === 0) {
      break;
    }

    page += 1;
  }

  return forms;
}

async function main() {
  const workspaceId = getArg("workspaceId") ?? DEFAULT_WORKSPACE_ID;
  const formId = getArg("formId");
  const count = Math.max(1, Number.parseInt(getArg("count") ?? String(DEFAULT_COUNT), 10));

  await mkdir(OUTPUT_DIR, { recursive: true });

  const forms = formId
    ? [{ id: formId, title: formId }]
    : await getWorkspaceFormsToSeed(workspaceId);

  if (forms.length === 0) {
    console.log(`No se encontraron formularios para workspace ${workspaceId}.`);
    return;
  }

  for (const form of forms) {
    const detail = await getTypeformForm(form.id);
    const fields = (detail.fields ?? []) as TypeformFixtureField[];
    const hiddenFields = detail.hidden ?? [];
    const responses = Array.from({ length: count }, (_, index) =>
      buildResponse(form.id, fields, hiddenFields, index + 1),
    );
    const outputPath = path.join(OUTPUT_DIR, `${form.id}.json`);

    await writeFile(
      outputPath,
      `${JSON.stringify({ items: responses }, null, 2)}\n`,
      "utf8",
    );

    console.log(`Fixture creado: ${outputPath} (${count} participantes)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});