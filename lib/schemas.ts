import { z } from "zod";

export const conditionSchema = z.enum(["new", "good", "fair", "poor", "unknown"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const extractedInventorySchema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      brand: z.string().min(1),
      model: z.string().min(1),
      quantity: z.number().int().min(1).max(50),
      condition: conditionSchema,
      room: z.string().min(1),
      confidence: confidenceSchema,
      notes: z.string().default("")
    })
  )
});

export const parsedPolicySchema = z.object({
  contentsLimit: z.number().nonnegative().nullable(),
  deductible: z.number().nonnegative().nullable(),
  coverageBasis: z.enum(["RCV", "ACV", "unknown"]),
  findings: z.array(
    z.object({
      kind: z.enum(["coverage", "deductible", "sublimit", "exclusion"]),
      label: z.string().min(1),
      amount: z.number().nonnegative().nullable(),
      appliesTo: z.string().nullable(),
      quote: z.string().min(1),
      page: z.number().int().positive(),
      confidence: confidenceSchema
    })
  )
});

export const inventoryPatchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    category: z.string().min(1).max(80).optional(),
    brand: z.string().min(1).max(80).optional(),
    model: z.string().min(1).max(100).optional(),
    quantity: z.number().int().min(1).max(50).optional(),
    condition: conditionSchema.optional(),
    room: z.string().min(1).max(80).optional(),
    notes: z.string().max(500).optional()
  })
  .strict();

export const claimProfileUpdateSchema = z
  .object({
    state: z.string().max(40).optional(),
    insurer: z.string().max(100).optional(),
    claimNumber: z.string().max(80).optional(),
    lossDate: z.string().max(20).optional(),
    language: z.enum(["en", "hi", "es", "de"]).optional()
  })
  .strict();
