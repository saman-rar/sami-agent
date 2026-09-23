
import { getTodos, saveTodos, type TodoItem } from "./store";

export async function setCurrentAgentTask(title: string) {
  const todos = await getTodos();

  const updated = todos.map((item) =>
    item.status === "in_progress"
      ? { ...item, status: "completed" as const }
      : item,
  );

  const task: TodoItem = {
    id: crypto.randomUUID(),
    title,
    status: "in_progress",
    order: updated.length,
  };

  await saveTodos([...updated, task]);
}

export async function completeCurrentAgentTask() {
  const todos = await getTodos();

  await saveTodos(
    todos.map((item) =>
      item.status === "in_progress"
        ? { ...item, status: "completed" as const }
        : item,
    ),
  );
}
