import { eveChannel } from "eve/channels/eve";
import { localDev, type AuthFn, vercelOidc } from "eve/channels/auth";
import { auth } from "@/lib/auth";
import { isUserAllowed } from "@/lib/server-config";

const betterAuthSession: AuthFn<Request> = async (request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !isUserAllowed(session.user.email)) return null;

  const attributes: Record<string, string> = {
    email: session.user.email,
    name: session.user.name,
  };
  if (session.user.image) attributes.picture = session.user.image;

  return {
    attributes,
    authenticator: "better-auth:vercel",
    principalId: session.user.id,
    principalType: "user",
  };
};

const productionAuth = process.env.ALLOW_VERCEL_OIDC === "true"
  ? [betterAuthSession, vercelOidc()]
  : [betterAuthSession];

export default eveChannel({
  auth: process.env.NODE_ENV === "development" ? [betterAuthSession, localDev()] : productionAuth,
  audience: "private",
  turnPolicy: "queue",
});
