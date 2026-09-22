import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isConfiguredOwner } from "@/lib/persistence/single-owner";

export type CurrentUser = {
  id: string;
  email?: string;
  name?: string;
};

export async function requireCurrentUser(): Promise<CurrentUser> {
  if (process.env.NODE_ENV === "development") {
    return { id: "local-dev", name: "Local developer" };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isConfiguredOwner(session.user.email)) {
    throw new UnauthorizedError();
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export class UnauthorizedError extends Error {
  readonly status = 401;

  constructor() {
    super("Authentication required.");
    this.name = "UnauthorizedError";
  }
}
