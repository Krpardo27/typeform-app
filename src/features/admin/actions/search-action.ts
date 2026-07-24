"use server";

import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import {
  getAuthorizedWorkspace,
  getVisibleWorkspaces,
} from "@/features/admin/workspaces/services/workspace-permissions";
import {
  getTypeformForm,
  getTypeformFormResponses,
  getWorkspaceForms,
  mapMaskedTypeformResponses,
} from "@/features/typeform/services/typeform.service";

const MIN_SEARCH_LENGTH = 2;
const MAX_RESULTS_PER_SECTION = 12;

function looksLikeInternalWorkspaceId(value: string) {
  return /^c[a-z0-9]{20,}$/i.test(value);
}

export type AuthorizedUserSearchResult = {
  id: string;
  email: string;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
    globalRole: "SUPER_ADMIN" | "USER";
  } | null;
};

export type WorkspaceSearchResult = {
  id: string;
  name: string;
  typeformId: string;
  role: "EDITOR" | "VIEWER";
};

export type GlobalSearchResult = {
  query: string;
  workspaces: WorkspaceSearchResult[];
  authorizedUsers: AuthorizedUserSearchResult[];
  forms: FormSearchResult[];
  participants: ParticipantSearchResult[];
};

export type FormSearchResult = {
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
  lastUpdatedAt?: string;
};

export type ParticipantSearchResult = {
  token: string;
  label: string;
  detail: string;
  formId: string;
  formTitle: string;
  workspaceId: string;
  isWinner: boolean;
};

function normalizeQuery(search: string) {
  return search.trim();
}

function getWinnerLabel(
  response: {
    token: string;
    answers: { question: string; value: string }[];
  },
  index: number,
) {
  const preferred = response.answers.find((answer) => {
    const question = answer.question.toLowerCase();
    return (
      /nombre|correo|email|rut/.test(question) &&
      answer.value !== "Sin respuesta"
    );
  });

  const shortToken = response.token.slice(-6);

  return {
    label: preferred?.value ?? `Participante ${index + 1}`,
    detail: `Ref ${shortToken}`,
  };
}

async function searchAuthorizedUsers(
  query: string,
): Promise<AuthorizedUserSearchResult[]> {
  const allowedUsers = await prisma.allowedUser.findMany({
    where: {
      email: {
        contains: query,
        mode: "insensitive",
      },
    },
    orderBy: {
      email: "asc",
    },
    take: MAX_RESULTS_PER_SECTION,
  });

  if (allowedUsers.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: allowedUsers.map((item) => item.email),
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      globalRole: true,
    },
  });

  const userByEmail = new Map(
    users.map((user) => [user.email.toLowerCase(), user]),
  );

  return allowedUsers.map((allowedUser) => ({
    ...allowedUser,
    user: userByEmail.get(allowedUser.email.toLowerCase()) ?? null,
  }));
}

async function searchVisibleWorkspaces(
  currentUser: {
    id: string;
    email: string;
    name: string;
    globalRole: "SUPER_ADMIN" | "USER";
  },
  query: string,
): Promise<WorkspaceSearchResult[]> {
  const workspaces = await getVisibleWorkspaces(currentUser);
  const queryLower = query.toLowerCase();

  return workspaces
    .filter((workspace) => {
      const byName = workspace.name.toLowerCase().includes(queryLower);
      const byAppId = workspace.id.toLowerCase().includes(queryLower);
      const byTypeformId = workspace.typeformId
        .toLowerCase()
        .includes(queryLower);

      return byName || byAppId || byTypeformId;
    })
    .slice(0, MAX_RESULTS_PER_SECTION);
}

async function searchWorkspaceForms(
  currentUser: {
    id: string;
    email: string;
    name: string;
    globalRole: "SUPER_ADMIN" | "USER";
  },
  workspaceId: string,
  query: string,
): Promise<FormSearchResult[]> {
  const workspace = await getAuthorizedWorkspace(currentUser, workspaceId);

  if (!workspace) {
    return [];
  }

  const workspaceLookupKey = looksLikeInternalWorkspaceId(workspace.typeformId)
    ? workspace.name
    : workspace.typeformId;
  const forms = await getWorkspaceForms(workspaceLookupKey);
  const queryLower = query.toLowerCase();

  return forms.items
    .filter((form) => {
      const byTitle = form.title.toLowerCase().includes(queryLower);
      const byId = form.id.toLowerCase().includes(queryLower);
      return byTitle || byId;
    })
    .slice(0, MAX_RESULTS_PER_SECTION)
    .map((form) => ({
      id: form.id,
      title: form.title,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      lastUpdatedAt: form.last_updated_at,
    }));
}

async function searchFormParticipants(
  currentUser: {
    id: string;
    email: string;
    name: string;
    globalRole: "SUPER_ADMIN" | "USER";
  },
  options: {
    workspaceId: string;
    formId: string;
    query: string;
  },
): Promise<ParticipantSearchResult[]> {
  const workspace = await getAuthorizedWorkspace(currentUser, options.workspaceId);

  if (!workspace) {
    return [];
  }

  const form = await getTypeformForm(options.formId);
  const winnerCookieName = `winner_selection:${workspace.id}:${form.id}`;
  const winnerCookieRaw = (await cookies()).get(winnerCookieName)?.value;
  let winnerTokens = new Set<string>();

  if (winnerCookieRaw) {
    try {
      const parsed = JSON.parse(winnerCookieRaw) as {
        tokens?: string[];
        by?: string;
      };

      if (parsed.by === currentUser.id) {
        winnerTokens = new Set(parsed.tokens ?? []);
      }
    } catch {
      winnerTokens = new Set();
    }
  }

  const responses = await getTypeformFormResponses(form.id, {
    page: 1,
    pageSize: 100,
  });
  const maskedResponses = mapMaskedTypeformResponses(form, responses.items, {
    maskSensitive: false,
    unmaskTokens: winnerTokens,
  });
  const queryLower = options.query.toLowerCase();

  return maskedResponses
    .map((response, index) => {
      const winnerLabel = getWinnerLabel(response, index);
      const searchable = [
        winnerLabel.label,
        winnerLabel.detail,
        response.token,
        ...response.answers.map((answer) => answer.value),
      ]
        .join(" ")
        .toLowerCase();
      const isWinner = winnerTokens.has(response.token);

      const matches =
        searchable.includes(queryLower) ||
        (isWinner && /ganador|winner/.test(queryLower));

      if (!matches) {
        return null;
      }

      return {
        token: response.token,
        label: winnerLabel.label,
        detail: winnerLabel.detail,
        formId: form.id,
        formTitle: form.title,
        workspaceId: workspace.id,
        isWinner,
      } satisfies ParticipantSearchResult;
    })
    .filter((item): item is ParticipantSearchResult => item !== null)
    .slice(0, MAX_RESULTS_PER_SECTION);
}

export async function searchGlobalAction(
  search: string,
  options?: {
    workspaceId?: string;
    includeForms?: boolean;
    formId?: string;
    includeParticipants?: boolean;
  },
): Promise<GlobalSearchResult> {
  const query = normalizeQuery(search);

  if (query.length < MIN_SEARCH_LENGTH) {
    return {
      query,
      workspaces: [],
      authorizedUsers: [],
      forms: [],
      participants: [],
    };
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Debes iniciar sesión para usar el buscador");
  }

  const [workspaces, authorizedUsers, forms, participants] = await Promise.all([
    searchVisibleWorkspaces(currentUser, query),
    currentUser.globalRole === "SUPER_ADMIN"
      ? searchAuthorizedUsers(query)
      : Promise.resolve([]),
    options?.includeForms && options.workspaceId
      ? searchWorkspaceForms(currentUser, options.workspaceId, query)
      : Promise.resolve([]),
    options?.includeParticipants && options.workspaceId && options.formId
      ? searchFormParticipants(currentUser, {
          workspaceId: options.workspaceId,
          formId: options.formId,
          query,
        })
      : Promise.resolve([]),
  ]);

  return {
    query,
    workspaces,
    authorizedUsers,
    forms,
    participants,
  };
}

export const searchArtistsAction = searchGlobalAction;

export async function searchAuthorizedUsersAndWorkspacesAction(search: string) {
  return searchGlobalAction(search);
}
