import { sleep } from "workflow";

/**
 * IDENTITY PRISM: ONBOARDING WORKFLOW
 * ----------------------------------
 * Handles new user logic with durable sleep states via Vercel Workflows.
 */

// Stubs for internal services
async function createUser(email: string) {
  return { id: `usr_${Math.random().toString(36).substr(2, 9)}`, email };
}

async function sendWelcomeEmail(user: any) {
  console.log(`[Workflow] Sending welcome email to ${user.email}`);
}

async function sendOnboardingEmail(user: any) {
  console.log(`[Workflow] Sending onboarding deep-dive to ${user.email}`);
}

export async function handleUserSignup(email: string) {
  "use workflow";

  const user = await createUser(email);
  await sendWelcomeEmail(user);

  // Durable sleep: survive deployments and restarts
  await sleep("5s");

  await sendOnboardingEmail(user);
  
  return { userId: user.id, status: "onboarded" };
}
