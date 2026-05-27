import { z } from "zod";

export const paymentCheckSchema = z
  .object({
    agent_id: z.string().min(1),
    mandate_id: z.string().min(1).optional(),
    merchant: z.string().min(1),
    amount_usd: z.union([z.string().min(1), z.number().positive()]).transform(String),
    token: z.string().min(1),
    chain: z.string().min(1),
    purpose: z.string().min(1),
    idempotency_key: z.string().min(1),
    merchant_request_id: z.string().min(1).optional(),
    nonce: z.string().min(1).optional(),
    counterparty_wallet_address: z.string().min(1).optional(),
    payment_request_hash: z.string().min(1).optional(),
    decision_ttl: z.string().min(1).optional(),
    demo_agent_slug: z.string().min(1).optional(),
    demo_agent_name: z.string().min(1).optional(),
    demo_llm: z.unknown().optional(),
    originator_name: z.string().min(1).optional(),
    originator_address: z.string().min(1).optional(),
    originator_account_id: z.string().min(1).optional(),
    beneficiary_name: z.string().min(1).optional(),
    beneficiary_address: z.string().min(1).optional()
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (!value.merchant_request_id && !value.nonce) {
      ctx.addIssue({
        code: "custom",
        path: ["merchant_request_id"],
        message: "merchant_request_id or nonce is required"
      });
    }
  });

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}
