# Phase 2-C Analytics Foundation

This layer provides non-sensitive runtime analytics primitives.

Stored data:
- token counts
- provider/model metadata
- tool execution metadata
- MCP execution metadata
- skill loading metadata

Not stored:
- prompts
- source files
- API keys
- secrets

The next integration step connects these trackers to the AI SDK execution pipeline and persistence.

## Runtime integration

Use `trackLLMRequest` and `trackToolExecution` at runtime boundaries. The tracker stores metadata only and does not store prompts or source files.
