import fs from 'fs';
import path from 'path';

const artifactPath = './artifacts/contracts/AutoEscrowv3.sol/AutoEscrowv3.json';
const destPath = '../web/src/components/AutoEscrowABI.json';

try {
    const raw = fs.readFileSync(artifactPath, 'utf8');
    const artifact = JSON.parse(raw);
    fs.writeFileSync(destPath, JSON.stringify(artifact.abi, null, 2), 'utf8');
    console.log('Successfully copied AutoEscrowv3 ABI to frontend!');
} catch (e) {
    console.error('Error copying ABI:', e);
}
