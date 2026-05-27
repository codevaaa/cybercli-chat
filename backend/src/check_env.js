import dotenv from 'dotenv';
const parsed = dotenv.config().parsed || {};
Object.keys(parsed).forEach(k => {
  console.log(`${k}: ${parsed[k] ? 'DEFINED (length ' + parsed[k].length + ')' : 'EMPTY'}`);
});
