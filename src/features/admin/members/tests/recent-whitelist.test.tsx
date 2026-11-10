// @vitest-environment node

import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RecentWhitelist } from "../components/RecentWhitelist";
import { radioWorkspaceTemplates } from "../../../../../config/radio-workspaces";

type Props = ComponentProps<typeof RecentWhitelist>;
type Assignment = Props["users"][number]["workspaces"][number];

function makeProps(count = 3): Props {
  return {
    allowedUsers: Array.from({ length: count }, (_, index) => ({
      id: `allowed-${index}`,
      email: `member-${index}@example.com`,
      createdAt: new Date("2026-11-02T00:30:00.000Z"),
    })),
    users: [],
  };
}

function assignment(index: number, role = "VIEWER"): Assignment {
  return {
    workspaceId: `workspace-${index}`,
    role,
    workspace: { name: `Radio ${index}`, typeformId: `TF-${index}` },
  };
}

function render(props: Props) {
  return renderToStaticMarkup(<RecentWhitelist {...props} />);
}

function bodyRows(html: string) {
  const body = html.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  return [...body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(([row]) => row);
}

function paginationButton(html: string, label: string) {
  const button = [...html.matchAll(/<button\b[^>]*>/g)]
    .map(([tag]) => tag)
    .find((tag) => tag.includes(`aria-label="${label}"`));
  expect(button).toBeDefined();
  return button!;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((child) => deepFreeze(child));
    Object.freeze(value);
  }
  return value;
}

describe("RecentWhitelist (SSR con TanStack real)", () => {
  it("muestra el estado vacío sin tabla ni controles de paginación", () => {
    const html = render(makeProps(0));

    expect(html).toContain("Miembros autorizados recientes");
    expect(html).toContain("0 registros cargados");
    expect(html).toContain("Aún no hay miembros autorizados.");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("<select");
    expect(html).not.toContain('aria-label="Primera página"');
  });

  it.each([1, 3])("cuenta %i registros cargados, no el catálogo de usuarios ni un total supuesto", (count) => {
    const props = makeProps(count);
    props.users = Array.from({ length: 17 }, (_, index) => ({
      id: `user-${index}`,
      email: `member-${index}@example.com`,
      workspaces: [],
    }));
    const html = render(props);

    expect(html).toContain(count === 1 ? "1 registro cargado" : "3 registros cargados");
    expect(html).not.toContain("17 registros");
    expect(html).not.toContain("17 filas");
    expect(html).not.toMatch(/\btotal\b/i);
    expect(bodyRows(html)).toHaveLength(count);
  });

  it("empareja emails ignorando mayúsculas y espacios en ambos lados", () => {
    const props = makeProps(1);
    props.allowedUsers[0].email = "  MEMBER@example.COM  ";
    props.users = [
      { id: "other", email: "other@example.com", workspaces: [assignment(99)] },
      { id: "matching", email: " member@EXAMPLE.com ", workspaces: [assignment(1)] },
    ];
    const html = render(props);

    expect(html).toContain("  MEMBER@example.COM  ");
    expect(html).toContain("Radio 1</span>");
    expect(html).not.toContain("Radio 99</span>");
    expect(html).not.toContain("Sin workspaces asignados");
  });

  it("muestra nombres y roles Lector, Editor y el fallback para roles desconocidos", () => {
    const props = makeProps(1);
    props.users = [{
      id: "user-0",
      email: props.allowedUsers[0].email,
      workspaces: [assignment(1), assignment(2, "EDITOR"), assignment(3, "UNKNOWN")],
    }];
    const html = render(props);

    for (const [name, role] of [["Radio 1", "Lector"], ["Radio 2", "Editor"], ["Radio 3", "Rol no informado"]]) {
      expect(html).toContain(`title="${name} · ${role}"`);
      expect(html).toContain(`<span class="sr-only"> · ${role}</span>`);
    }
    expect(html).not.toContain("UNKNOWN");
    expect(html).not.toContain("<details");
  });

  it("distingue usuarios no registrados y registrados sin workspaces sin inventar accesos", () => {
    const props = makeProps(2);
    props.users = [{ id: "user-1", email: props.allowedUsers[1].email, workspaces: [] }];
    const rows = bodyRows(render(props));

    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(row).toContain("Sin workspaces asignados"));
  });

  it("incluye caption, descripción asociada y ambos encabezados con aria-sort none", () => {
    const html = render(makeProps());
    const headers = [...html.matchAll(/<th\b[^>]*>[\s\S]*?<\/th>/g)].map(([tag]) => tag);
    const descriptionId = html.match(/<table\b[^>]*aria-describedby="([^"]+)"/)?.[1];

    expect(html).toContain('<caption class="sr-only">Miembros autorizados y workspaces asignados</caption>');
    expect(html).toContain('role="region" aria-label="Tabla de miembros autorizados" tabindex="0"');
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
    expect(headers).toHaveLength(2);
    headers.forEach((header, index) => {
      expect(header).toContain('scope="col"');
      expect(header).toContain('aria-sort="none"');
      expect(header).toContain(`aria-label="Ordenar por ${index === 0 ? "Miembro" : "Workspaces"}. Sin orden"`);
    });
  });

  it("emite datetime ISO y fecha UTC estable entre zonas del servidor para evitar discrepancias de hidratación", () => {
    const props = makeProps(1);
    const times: string[] = [];
    try {
      for (const timezone of ["UTC", "America/Santiago", "Asia/Tokyo"]) {
        vi.stubEnv("TZ", timezone);
        const html = render(props);
        expect(html).toContain("Fechas en UTC.");
        const time = html.match(/<time\b[^>]*>[\s\S]*?<\/time>/)?.[0];
        expect(time).toBeDefined();
        times.push(time!);
      }
    } finally {
      vi.unstubAllEnvs();
    }

    const expected = new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
    }).format(props.allowedUsers[0].createdAt);
    expect(times).toEqual(Array(3).fill(`<time dateTime="2026-11-02T00:30:00.000Z">${expected} UTC</time>`));
  });

  it("con 3 filas mantiene pageSize 10 seleccionado, página 1 de 1 y navegación deshabilitada", () => {
    const html = render(makeProps(3));
    const select = html.match(/<select\b[^>]*>[\s\S]*?<\/select>/)?.[0];

    expect(bodyRows(html)).toHaveLength(3);
    expect(html).toContain("3 filas");
    expect(html).toContain("Página 1 de 1");
    expect(select).toContain('aria-label="Filas por página de la tabla"');
    expect(select).toMatch(/<option\b(?=[^>]*value="10")(?=[^>]*selected="")[^>]*>10 filas<\/option>/);
    expect(select?.match(/selected=""/g)).toHaveLength(1);
    for (const label of ["Primera página", "Página anterior", "Página siguiente", "Última página"]) {
      expect(paginationButton(html, label)).toContain('disabled=""');
    }
  });

  it("con 11 registros renderiza solo los primeros 10 y conserva el conteo de 11", () => {
    const props = makeProps(11);
    const html = render(props);
    const rows = bodyRows(html);

    expect(rows).toHaveLength(10);
    rows.forEach((row, index) => expect(row).toContain(props.allowedUsers[index].email));
    expect(html).not.toContain(props.allowedUsers[10].email);
    expect(html).toContain("11 registros cargados");
    expect(html).toContain("11 filas");
    expect(html).toContain("Página 1 de 2");
    for (const label of ["Primera página", "Página anterior"]) {
      expect(paginationButton(html, label)).toContain('disabled=""');
    }
    for (const label of ["Página siguiente", "Última página"]) {
      expect(paginationButton(html, label)).not.toContain('disabled=""');
    }
  });

  it.each([4, 5, 6])("con %i accesos muestra todos sin desplegables", (count) => {
    const props = makeProps(1);
    props.users = [{
      id: "user-0", email: props.allowedUsers[0].email,
      workspaces: Array.from({ length: count }, (_, index) => assignment(index + 1)),
    }];
    const html = render(props);
    for (let index = 1; index <= count; index++) {
      expect(html).toContain(`Radio ${index}</span>`);
    }
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<summary");
    expect(html).toContain("flex flex-wrap items-center gap-2");
  });

  it("muestra los nueve logos en lugar del nombre visible, manteniendo las dos columnas", () => {
    const props = makeProps(1);
    props.users = [{ id: "user", email: props.allowedUsers[0].email, workspaces: radioWorkspaceTemplates.map((radio, index) => ({
      workspaceId: `workspace-${index}`, role: "VIEWER", workspace: { ...radio },
    })) }];
    const html = render(props);
    const row = bodyRows(html)[0];
    expect(row.match(/<img\b/g)).toHaveLength(9);
    expect(row.match(/<td\b/g)).toHaveLength(2);
    for (const radio of radioWorkspaceTemplates) {
      expect(row).toContain(`alt="${radio.name}"`);
      expect(row).not.toContain(`>${radio.name}</span>`);
    }
    expect(row).toContain("object-contain");
    expect(row).not.toContain("<details");
  });

  it("resuelve la radio de un workspace renombrado por su plantilla", () => {
    const props = makeProps(1);
    props.users = [{ id: "user", email: props.allowedUsers[0].email, workspaces: [{
      workspaceId: "clon", role: "EDITOR", workspace: { name: "Promociones", typeformId: "nuevo", templateFormTypeformId: radioWorkspaceTemplates[0].templateFormTypeformId },
    }] }];
    const html = render(props);
    expect(html).toContain("concierto.png");
    expect(html).toContain('alt="Promociones"');
    expect(html).toContain('title="Promociones · Editor"');
  });

  it("renderiza controles reales sin mutar props congeladas profundamente", () => {
    const props = makeProps(11);
    props.allowedUsers.reverse();
    props.users = [{
      id: "user-0", email: " MEMBER-0@EXAMPLE.COM ",
      workspaces: Array.from({ length: 6 }, (_, index) => assignment(index)),
    }];
    const original = structuredClone(props);
    deepFreeze(props);

    // SSR no ejecuta eventos: esta prueba verifica pureza al renderizar los controles,
    // no simula clicks ni afirma comprobar transiciones de estado en el navegador.
    for (let attempt = 0; attempt < 2; attempt++) {
      const html = render(props);
      expect(html).toContain('aria-label="Ordenar por Miembro. Sin orden"');
      expect(html).toContain('aria-label="Ordenar por Workspaces. Sin orden"');
      expect(html).toContain('aria-label="Filas por página de la tabla"');
      expect(html).toMatch(/<input\b[^>]*type="number"/);
      expect(paginationButton(html, "Página siguiente")).not.toContain('disabled=""');
      expect(bodyRows(html)[0]).toContain(original.allowedUsers[0].email);
      expect(props).toEqual(original);
    }
    expect(Object.isFrozen(props.allowedUsers[0].createdAt)).toBe(true);
    expect(Object.isFrozen(props.allowedUsers[0])).toBe(true);
    expect(Object.isFrozen(props.allowedUsers)).toBe(true);
    expect(Object.isFrozen(props.users[0].workspaces[0].workspace)).toBe(true);
    expect(Object.isFrozen(props.users[0].workspaces[0])).toBe(true);
    expect(Object.isFrozen(props.users[0].workspaces)).toBe(true);
    expect(Object.isFrozen(props.users[0])).toBe(true);
    expect(Object.isFrozen(props.users)).toBe(true);
    expect(Object.isFrozen(props)).toBe(true);
  });
});