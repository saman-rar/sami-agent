import { connect } from "@vercel/connect/eve";
import { defineDynamic, defineMcpClientConnection } from "eve/connections";
import { always } from "eve/tools/approval";

export default defineDynamic({
  events: {
    "session.started": (_event, ctx) => {
      try {
        const connectId = process.env.GITHUB_MCP_CONNECT_ID?.trim();
        const principal = ctx.session.auth.current;
        if (!connectId || principal?.principalType !== "user") return null;

        return defineMcpClientConnection({
          url: "https://api.githubcopilot.com/mcp/",
          description: "Inspect repositories and perform approved GitHub operations for the signed-in user.",
          instanceKey: connectId,
          auth: connect(connectId),
          approval: always(),
        });
      } catch {
        // A broken optional connector must not terminate the entire agent session.
        return null;
      }
    },
  },
});
