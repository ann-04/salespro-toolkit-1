import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.join(__dirname, 'index.js');
let content = fs.readFileSync(indexPath, 'utf8');

// Find the start of old sales assets routes
const startMarker = '// --- SALES ASSETS ROUTES ---';
const endMarker = 'app.listen(PORT, () => {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    // Remove old routes section
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);

    const newContent = before + after;

    fs.writeFileSync(indexPath, newContent, 'utf8');
    console.log('✅ Old sales assets routes removed successfully');
    console.log(`📝 Removed ${content.length - newContent.length} characters`);
} else {
    console.log('❌ Could not find markers to remove old routes');
    console.log(`Start marker found: ${startIndex !== -1}`);
    console.log(`End marker found: ${endIndex !== -1}`);
}
