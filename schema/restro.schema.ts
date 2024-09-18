import * as z from "zod";

export const restroSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  cuisines: z.array(z.string().min(1)), //cuisines is the style or quality of cooking; cookery
});

export const restroDetails = z.object({
  links: z.array(
    z.object({
      name: z.string().min(1),
      url: z.string().min(1),
    })
  ),
  contact: z.object({
    phone: z.string().min(1),
    email: z.string().email(),
  }),
});

export type RestroSchema = z.infer<typeof restroSchema>;
export type RestroDetails = z.infer<typeof restroDetails>;
