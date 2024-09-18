import * as z from "zod";

export const reviewSchema = z.object({
  review: z.string().min(1),
  rating: z.number().min(1).max(5),
});

export type ReviewSchema = z.infer<typeof reviewSchema>;
