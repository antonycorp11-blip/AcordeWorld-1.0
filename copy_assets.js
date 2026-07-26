const fs = require('fs');
const path = require('path');

const srcBg = '/Users/aquillesantony/.gemini/antigravity/brain/cdeae4f4-13cf-4826-a3cd-7b7b67e67264/town_square_background_1784925177454.jpg';
const srcSprite = '/Users/aquillesantony/.gemini/antigravity/brain/cdeae4f4-13cf-4826-a3cd-7b7b67e67264/hero_character_1784925198002.jpg';

const destBg = path.join(__dirname, 'assets', 'background.jpg');
const destSprite = path.join(__dirname, 'assets', 'spritesheet.jpg');

fs.mkdirSync(path.join(__dirname, 'assets'), { recursive: true });
fs.copyFileSync(srcBg, destBg);
fs.copyFileSync(srcSprite, destSprite);

console.log('Assets copied successfully!');
console.log('Background size:', fs.statSync(destBg).size);
console.log('Spritesheet size:', fs.statSync(destSprite).size);
