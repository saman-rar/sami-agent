import { createHash, randomUUID } from "node:crypto";
import { readPrivateJson, writePrivateJson } from "@/lib/persistence/blob";
import { ownerStoragePath } from "@/lib/persistence/single-owner";

const DOCUMENT_VERSION = 1 as const;

export type AgentTodoStatus = "pending" | "in_progress" | "completed";

export type AgentTodoItem = {
  id: string;
  title: string;
  status: AgentTodoStatus;
  order: number;
};

export type AgentPlanDocument = {
  version: typeof DOCUMENT_VERSION;
  scope: string;
  items: AgentTodoItem[];
  updatedAt: string;
};

function storagePath(scope: string): string {
  const scopeHash = createHash("sha256").update(scope).digest("hex").slice(0, 24);
  return ownerStoragePath(`agent-plan/${scopeHash}`, DOCUMENT_VERSION);
}

function emptyDocument(scope: string): AgentPlanDocument {
  return {
    version: DOCUMENT_VERSION,
    scope,
    items: [],
    updatedAt: new Date(0).toISOString(),
  };
}

export async function readAgentPlan(scope: string): Promise<AgentPlanDocument> {
  const document =
    (await readPrivateJson<AgentPlanDocument>(storagePath(scope))) ?? emptyDocument(scope);

  if (document.version !== DOCUMENT_VERSION || document.scope !== scope) {
    throw new Error("Agent plan state has an unsupported format.");
  }

  return document;
}

export async function replaceAgentPlan(
  scope: string,
  titles: string[],
): Promise<AgentPlanDocument> {
  const updatedAt = new Date().toISOString();
  const document: AgentPlanDocument = {
    version: DOCUMENT_VERSION,
    scope,
    items: titles.map((title, order) => ({
      id: randomUUID(),
      title,
      status: "pending",
      order,
    })),
    updatedAt,
  };
  await writePrivateJson(storagePath(scope), document);
  return document;
}

export async function updateAgentTodo(
  scope: string,
  id: string,
  patch: { title?: string; status?: AgentTodoStatus },
): Promise<AgentPlanDocument> {
  const document = await readAgentPlan(scope);
  const index = document.items.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Todo item was not found.");

  document.items[index] = {
    ...document.items[index],
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
  };
  document.updatedAt = new Date().toISOString();
  await writePrivateJson(storagePath(scope), document);
  return document;
}

export async function clearAgentPlan(scope: string): Promise<AgentPlanDocument> {
  const document: AgentPlanDocument = {
    version: DOCUMENT_VERSION,
    scope,
    items: [],
    updatedAt: new Date().toISOString(),
  };
  await writePrivateJson(storagePath(scope), document);
  return document;
}
