import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const version = '0.68.0';
const arch = process.env.TARGETARCH || { x64: 'amd64', arm64: 'arm64' }[process.arch];
const checksums = {
  amd64: '3cf934477f4fb1ee9e19e49c31fb33f5ffe3283300076f59afad8b8ccf1e1621',
  arm64: '8855bd3537adf6f456b4073a1fb6f119885060f3c8b714fd56a842db42b4c097',
};
if (!checksums[arch]) throw new Error('Unsupported architecture');
const archive = `frp_${version}_linux_${arch}`;
const response = await fetch(`https://github.com/fatedier/frp/releases/download/v${version}/${archive}.tar.gz`, {
  signal: AbortSignal.timeout(120_000),
});
if (!response.ok) throw new Error('Could not download the tunnel client');
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash('sha256').update(bytes).digest('hex') !== checksums[arch]) {
  throw new Error('Tunnel client checksum verification failed');
}
writeFileSync('frp.tar.gz', bytes, { flag: 'wx' });
