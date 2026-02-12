import { afterAll } from 'vitest';
import { cleanupAll } from './helpers/supabase.js';

// Clean up all test data after all tests in this project complete
afterAll(async () => {
  await cleanupAll();
});
