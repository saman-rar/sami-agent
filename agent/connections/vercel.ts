import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";
import { requireProjectMutationApproval } from "../lib/approval-policy";

export default defineMcpClientConnection({
  url: "https://mcp.vercel.com",
  description: "Manage projects, deployments, and env vars.",
  auth: connect("mcp.vercel.com/prj_maSVCKnvTp1AdnOUJnFuaXxBVOtY"),
  // Conservative until per-tool side-effect classification is added: Vercel MCP can mutate deployments/env.
  approval: requireProjectMutationApproval,
});
