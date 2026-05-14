export async function ingestEmail(payload: { from: string; subject: string; body: string }) {
  return { source: "email", accepted: true, payload };
}
