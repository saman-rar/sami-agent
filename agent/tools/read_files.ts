import { defineTool } from "eve/tools";
import { readFile } from "eve/tools/read_file";

export default defineTool({
  description:
    "Read multiple project files in one operation. Prefer this instead of several sequential read_file calls when related files are already known.",
  inputSchema: {
    type: "object",
    properties: {
      files: {
        type: "array",
        items: { type: "string" },
        description: "List of file paths to read.",
      },
    },
    required: ["files"],
  },
  execute: async ({ files }: { files: string[] }, ctx) => {
    const results = [];

    for (const file of files.slice(0, 20)) {
      try {
        const result = await readFile.execute?.({ filePath: file }, ctx);
        results.push({
          file,
          success: true,
          result,
        });
      } catch (error) {
        results.push({
          file,
          success: false,
          error: String(error),
        });
      }
    }

    return {
      files: results,
    };
  },
});
