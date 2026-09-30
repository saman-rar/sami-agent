CREATE TABLE "agent_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"contextCompression" text DEFAULT 'medium' NOT NULL,
	"selection" jsonb,
	"updatedAt" text
);
--> statement-breakpoint
CREATE TABLE "deleted_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"deletedAt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"connection" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy_imports" (
	"path" text PRIMARY KEY NOT NULL,
	"importedAt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"projectId" text,
	"metadata" jsonb NOT NULL,
	"encryptedSecret" jsonb
);
--> statement-breakpoint
CREATE TABLE "llm_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text,
	"projectId" text,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"inputTokens" integer,
	"outputTokens" integer,
	"reasoningTokens" integer,
	"cachedTokens" integer,
	"durationMs" integer,
	"createdAt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text,
	"connectionId" text,
	"toolName" text NOT NULL,
	"durationMs" integer,
	"status" text NOT NULL,
	"createdAt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"updatedAt" text
);
--> statement-breakpoint
CREATE TABLE "agent_plans" (
	"scope" text PRIMARY KEY NOT NULL,
	"projectId" text,
	"updatedAt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"source" jsonb NOT NULL,
	"sessionId" text,
	"createdAt" text NOT NULL,
	"updatedAt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_models" (
	"providerId" text NOT NULL,
	"modelId" text NOT NULL,
	"model" jsonb NOT NULL,
	CONSTRAINT "provider_models_providerId_modelId_pk" PRIMARY KEY("providerId","modelId")
);
--> statement-breakpoint
CREATE TABLE "provider_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"connection" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"eveSessionId" text NOT NULL,
	"projectId" text,
	"title" text NOT NULL,
	"projectName" text,
	"agentMode" text,
	"selection" jsonb,
	"archived" boolean DEFAULT false NOT NULL,
	"createdAt" text NOT NULL,
	"updatedAt" text NOT NULL,
	CONSTRAINT "sessions_eveSessionId_unique" UNIQUE("eveSessionId")
);
--> statement-breakpoint
CREATE TABLE "skill_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text,
	"skillId" text NOT NULL,
	"createdAt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_todos" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text,
	"requestId" text,
	"toolName" text NOT NULL,
	"durationMs" integer,
	"status" text NOT NULL,
	"createdAt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"lastSessionId" text,
	"lastProjectId" text,
	"updatedAt" text
);
--> statement-breakpoint
ALTER TABLE "integration_metadata" ADD CONSTRAINT "integration_metadata_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_requests" ADD CONSTRAINT "llm_requests_sessionId_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_requests" ADD CONSTRAINT "llm_requests_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_calls" ADD CONSTRAINT "mcp_calls_sessionId_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_calls" ADD CONSTRAINT "mcp_calls_connectionId_integration_metadata_id_fk" FOREIGN KEY ("connectionId") REFERENCES "public"."integration_metadata"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_plans" ADD CONSTRAINT "agent_plans_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_models" ADD CONSTRAINT "provider_models_providerId_provider_connections_id_fk" FOREIGN KEY ("providerId") REFERENCES "public"."provider_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_usage" ADD CONSTRAINT "skill_usage_sessionId_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_todos" ADD CONSTRAINT "agent_todos_scope_agent_plans_scope_fk" FOREIGN KEY ("scope") REFERENCES "public"."agent_plans"("scope") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_sessionId_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_requestId_llm_requests_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."llm_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_lastSessionId_sessions_id_fk" FOREIGN KEY ("lastSessionId") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_lastProjectId_projects_id_fk" FOREIGN KEY ("lastProjectId") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_project_kind_idx" ON "integration_metadata" USING btree ("projectId","kind");--> statement-breakpoint
CREATE INDEX "llm_session_created_idx" ON "llm_requests" USING btree ("sessionId","createdAt");--> statement-breakpoint
CREATE INDEX "llm_project_idx" ON "llm_requests" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "mcp_session_created_idx" ON "mcp_calls" USING btree ("sessionId","createdAt");--> statement-breakpoint
CREATE INDEX "projects_updated_idx" ON "projects" USING btree ("updatedAt");--> statement-breakpoint
CREATE INDEX "sessions_project_updated_idx" ON "sessions" USING btree ("projectId","updatedAt");--> statement-breakpoint
CREATE INDEX "sessions_updated_idx" ON "sessions" USING btree ("updatedAt");--> statement-breakpoint
CREATE INDEX "skills_session_created_idx" ON "skill_usage" USING btree ("sessionId","createdAt");--> statement-breakpoint
CREATE INDEX "todos_scope_order_idx" ON "agent_todos" USING btree ("scope","order");--> statement-breakpoint
CREATE INDEX "tools_session_created_idx" ON "tool_calls" USING btree ("sessionId","createdAt");