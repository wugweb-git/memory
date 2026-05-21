import 'dotenv/config';
import { seedProfileAndSources } from '../src/lib/seed/profile';

seedProfileAndSources()
  .then((result) => {
    console.log('Seed complete:', result);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
