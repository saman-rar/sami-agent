import type { SandboxNetworkPolicy } from "eve/sandbox";

/**
 * GitHub HTTPS Git accepts a token as the Basic auth password. The header is
 * injected by the sandbox firewall, so the credential never enters the VM.
 */
export function githubNetworkPolicy(token: string): SandboxNetworkPolicy {
  const basic = Buffer.from(`x-access-token:${token}`, "utf8").toString("base64");
  return {
    allow: {
      "github.com": [
        {
          transform: [
            {
              headers: {
                authorization: `Basic ${basic}`,
              },
            },
          ],
        },
      ],
      "*": [],
    },
  };
}
