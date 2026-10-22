import {z} from 'zod';
export const planSchema = z.object({
  congregation: z.string(),
  name: z.string(),
  status: z.enum(["trial", "active", "expired"]),
  trialEndsAt: z.string(),
  paymentDate: z.string().nullable(),
  locked: z.boolean(),
  serverTime: z.string(),
});
export type WorkspacePlan = z.infer<typeof planSchema>;
