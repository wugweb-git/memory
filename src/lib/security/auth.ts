import { NextRequest } from "next/server";

export function getRequestUser(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "system_user";
  const role = req.headers.get("x-user-role") || "user";
  return { userId, role };
}
