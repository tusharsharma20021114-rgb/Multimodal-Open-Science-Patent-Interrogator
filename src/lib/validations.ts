import { z } from "zod";

export const chatSchema = z.object({
  query: z.string().min(1).max(2000),
  documentId: z.string().uuid().optional().nullable(),
});

export const diagramChatSchema = z.object({
  diagramId: z.string().uuid().optional(),
  diagramIds: z.array(z.string().uuid()).max(10).optional(),
  question: z.string().min(1).max(1000),
});

export const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().max(50 * 1024 * 1024),
});

export const deleteDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type ChatInput = z.infer<typeof chatSchema>;
export type DiagramChatInput = z.infer<typeof diagramChatSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
