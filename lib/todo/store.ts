import { readPrivateJson, writePrivateJson } from "@/lib/persistence/blob";
import { ownerStoragePath } from "@/lib/persistence/single-owner";

export type TodoItem = {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  order: number;
};

const PATH = ownerStoragePath("agent-todos", 1);

const defaults: TodoItem[] = [
  {
    id: "default-1",
    title: "Analyze current task",
    status: "in_progress",
    order: 0,
  },
];

export async function getTodos() {
  return (await readPrivateJson<TodoItem[]>(PATH)) ?? defaults;
}

export async function saveTodos(items: TodoItem[]) {
  await writePrivateJson(PATH, items.map((x, i) => ({ ...x, order: i })));
}
