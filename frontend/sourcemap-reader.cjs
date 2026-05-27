const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

async function readMap() {
  const mapPath = './dist/assets/index-Ded_zb19.js.map';
  if (!fs.existsSync(mapPath)) {
    console.error('Map file not found:', mapPath);
    return;
  }
  const mapContent = fs.readFileSync(mapPath, 'utf8');
  await SourceMapConsumer.with(mapContent, null, consumer => {
    const pos = consumer.originalPositionFor({
      line: 659,
      column: 14382
    });
    console.log(pos);
  });
}
readMap().catch(console.error);
