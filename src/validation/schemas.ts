import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "name is required").max(255),
  email: z.string().email("invalid email format"),
});

export const createPostSchema = z.object({
  title: z.string().min(1, "title is required").max(500),
  body: z.string().min(1, "body is required"),
  userId: z.string().uuid().optional(),
});

export const updatePostSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid("invalid UUID"),
});
