import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const localEnv = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '../contracts/.env') });
}
