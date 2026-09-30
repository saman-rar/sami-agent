import { z } from "zod";
import { PROVIDER_KINDS } from "./types";

const optionalTrimmedString = z.string().trim().max(500).optional();

export const createProviderConnectionSchema = z.object({
  kind: z.enum(PROVIDER_KINDS),
  apiKey: z.string().trim().min(1).max(20_000),
  name: z.string().trim().min(1).max(80).optional(),
  baseUrl: z.url().max(2_000).optional(),
  organization: optionalTrimmedString,
  project: optionalTrimmedString,
});

export const updateProviderConnectionSchema = z.object({
  apiKey: z.string().trim().min(1).max(20_000).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  baseUrl: z.url().max(2_000).optional(),
  organization: optionalTrimmedString,
  project: optionalTrimmedString,
});

export const modelSelectionSchema = z.object({
  providerId: z.string().trim().min(1).max(200),
  modelId: z.string().trim().min(1).max(500),
  thinkingLevel: z.string().trim().max(50).optional(),
});
