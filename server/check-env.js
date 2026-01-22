import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading env from:', envPath);

if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    console.log('--- RAW .env.local content check ---');
    for (const k in envConfig) {
        // Print value length and surrounded by quotes to see whitespace
        console.log(`${k}: "${envConfig[k]}" (Length: ${envConfig[k].length})`);
    }
} else {
    console.log('.env.local file NOT found at expected path.');
}
