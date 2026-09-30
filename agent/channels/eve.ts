import { eveChannel } from "eve/channels/eve";
import { localDev, type AuthFn, vercelOidc } from "eve/channels/auth";
import { auth } from "@/lib/auth";
import { normalizeAgentMode } from "@/lib/agent-mode";
import { normalizeContextCompressionMode } from "@/lib/agent-config/types";
import { getProjectForUser } from "@/lib/projects/service";
import { isConfiguredOwner, SINGLE_OWNER_PRINCIPAL_ID } from "@/lib/persistence/single-owner";

function requestAgentMode(request: Request) {
  return normalizeAgentMode(request.headers.get("x-sami-agent-mode"));
}

function requestProjectId(request: Request): string | undefined {
  const value = request.headers.get("x-sami-project-id")?.trim();
  return value || undefined;
}

function requestContextCompression(request: Request) {
  return normalizeContextCompressionMode(
    request.headers.get("x-sami-context-compression"),
  );
}

const betterAuthSession: AuthFn<Request> = async (request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !isConfiguredOwner(session.user.email)) return null;

  const attributes: Record<string, string> = {
    email: session.user.email,
    name: session.user.name,
    agentMode: requestAgentMode(request),
    contextCompression: requestContextCompression(request),
  };
  const projectId = requestProjectId(request);
  if (projectId) {
    const project = await getProjectForUser(SINGLE_OWNER_PRINCIPAL_ID, projectId);
    if (!project) return null;
    attributes.projectId = projectId;
  }
  if (session.user.image) {
    attributes.picture = session.user.image;
  }

  return {
    attributes,
    authenticator: "better-auth:vercel",
    principalId: SINGLE_OWNER_PRINCIPAL_ID,
    principalType: "user",
  };
};

const baseLocalDevAuth = localDev();
const localDevSession: AuthFn<Request> = async (request) => {
  const local = await baseLocalDevAuth(request);
  if (!local) return null;

  const attributes = {
    ...local.attributes,
    agentMode: requestAgentMode(request),
    contextCompression: requestContextCompression(request),
  } as Record<string, string>;
  const projectId = requestProjectId(request);
  if (projectId) {
    const project = await getProjectForUser(SINGLE_OWNER_PRINCIPAL_ID, projectId);
    if (!project) return null;
    attributes.projectId = projectId;
  }

  return {
    ...local,
    attributes,
    principalId: SINGLE_OWNER_PRINCIPAL_ID,
    principalType: "user",
  };
};

export default eveChannel({
  auth: [betterAuthSession, vercelOidc(), localDevSession],
});
