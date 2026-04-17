import { handleEmail } from '../lib/email.js';
import { sendError } from '../lib/errors.js';

export default async function handler(req, res) {
  try {
    const result = await handleEmail(req);
    return res.status(result.code).json(result.body);
  } catch (error) {
    return sendError(res, error);
  }
}
