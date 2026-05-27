import fs from 'fs';
import dotenv from 'dotenv';
try {
  const content = fs.readFileSync('frontend/.env', 'utf8');
  const parsed = dotenv.parse(content);
  Object.keys(parsed).forEach(k => {
    console.log(`${k}: ${parsed[k] ? 'DEFINED (length ' + parsed[k].length + ')' : 'EMPTY'}`);
  });
} catch (err) {
  console.error('Error reading frontend env:', err.message);
}
