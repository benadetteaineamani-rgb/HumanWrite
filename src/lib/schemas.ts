import { z } from "zod";

/** Server-side request validation (§20). Every route validates before doing work. */

export const RewriteSchema = z.object({
  text: z.string().min(1).max(50000),
  tasks: z.array(z.string()).min(1).max(12),
  mode: z.string().default("Academic"),
  intensity: z.string().default("Standard Edit"),
  documentType: z.string().optional(),
  voiceProfileId: z.string().optional(),
  voiceStrength: z.number().min(0).max(100).optional(),
  scope: z.enum(["selection", "block", "document"]).default("block"),
  tier: z.enum(["FAST", "STANDARD", "DEEP"]).optional(),
});

export const AnalyseSchema = z.object({
  kind: z.enum(["conceptual-repetition", "sentence-contribution", "paragraph-purpose", "empty-storytelling"]),
  text: z.string().min(1).max(20000),
  context: z.string().max(20000).optional(),
});

export const EditorialQuestionSchema = z.object({
  question: z.string().min(1).max(2000),
  text: z.string().min(1).max(20000),
});

export const StyleProfileSchema = z.object({
  name: z.string().min(1).max(120),
  samples: z.array(z.string().min(1)).min(1).max(12),
});

export const CompareStylesSchema = z.object({
  text: z.string().min(1).max(8000),
  voices: z.array(z.string()).min(1).max(5),
});

export const DocumentSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(300).default("Untitled document"),
  documentType: z.string().default("Blank"),
  contentJson: z.unknown(),
  plainText: z.string().default(""),
  activeVoiceProfileId: z.string().nullable().optional(),
  writingMode: z.string().default("Academic"),
});

export type RewriteInput = z.infer<typeof RewriteSchema>;
export type AnalyseInput = z.infer<typeof AnalyseSchema>;
