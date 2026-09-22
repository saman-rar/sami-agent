import { defineMcpClientConnection } from "eve/connections";
import { requireGitHubToken } from "@/lib/github/connect";
import { requireProjectMutationApproval } from "../lib/approval-policy";

export default defineMcpClientConnection({
  url: "https://api.githubcopilot.com/mcp/",
  description:
    "GitHub repositories, issues, pull requests, actions, and repository metadata through the official remote GitHub MCP server.",
  auth: {
    principalType: "user",
    async getToken({ principal }) {
      if (principal.type !== "user") {
        throw new Error("GitHub MCP requires an authenticated user.");
      }
      return { token: await requireGitHubToken(principal.id) };
    },
  },
  // GitHub MCP includes write-capable tools. Keep the existing global policy as the enforcement boundary.
  approval: requireProjectMutationApproval,
});
