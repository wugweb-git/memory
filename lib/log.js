import Log from '../models/Log.js';

export async function writeLog(entry) {
  try {
    await Log.create(entry);
  } catch {
    // keep API flow non-blocking on log write failure
  }
}
