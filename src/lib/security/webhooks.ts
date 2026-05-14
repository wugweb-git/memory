import { NextRequest } from "next/server";
import { verifySignedWebhook } from "@/lib/webhooks/verify";

export async function assertSignedWebhook(req: NextRequest) {
  const signature = req.headers.get("x-signature");
  const secret = process.env.WEBHOOK_SECRET || "";
  const body = await req.text();
  return verifySignedWebhook(signature, secret, body);
}
