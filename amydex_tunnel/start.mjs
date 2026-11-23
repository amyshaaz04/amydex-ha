import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function httpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (value === url.origin || value === url.origin + '/');
  } catch {
    return false;
  }
}

function validateConnector(bundle) {
  if (bundle?.version !== 2 || !/^[a-f0-9]{24}$/.test(bundle.tunnelId) ||
      !/^[a-f0-9]{64}$/.test(bundle.token) || !httpsOrigin(bundle.serverUrl)) {
    throw new Error('Use a version 2 connector from AmyDex with an HTTPS server URL.');
  }
  if (typeof bundle.agentSource !== 'string' || !bundle.agentSource ||
      createHash('sha256').update(bundle.agentSource).digest('hex') !== bundle.agentSha256) {
    throw new Error('The connector code is missing or damaged. Download a fresh connector from AmyDex.');
  }
  const { version, tunnelId, token, serverUrl, agentSource, agentSha256 } = bundle;
  return { version, tunnelId, token, serverUrl, agentSource, agentSha256 };
}

async function readOptional(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    if (error instanceof SyntaxError) throw new Error('A connector or configuration file contains invalid JSON.');
    throw new Error('Could not read a connector or configuration file.');
  }
}

async function saveConnector(file, bundle) {
  const connector = validateConnector(bundle);
  const pending = join(dirname(file), '.connector-' + randomUUID());
  try {
    await writeFile(pending, JSON.stringify(connector), { mode: 0o600, flag: 'wx' });
    await rename(pending, file);
  } catch {
    await rm(pending, { force: true }).catch(() => {});
    throw new Error('Could not save the connector in private app storage.');
  }
  return connector;
}

async function redeemPairing(server, code) {
  try {
    const response = await fetch(new URL('/api/pair', server), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error();
    return await response.json();
  } catch {
    throw new Error('Pairing failed. Check the AmyDex address and request a fresh code if needed.');
  }
}

export async function configureConnector({ inbox, identityFile, options }) {
  const imported = await readOptional(inbox);
  if (imported !== undefined) {
    const connector = await saveConnector(identityFile, imported);
    try {
      await unlink(inbox);
    } catch {
      console.error('Connector saved. Remove connector.json from the app configuration folder.');
    }
    console.log('AmyDex connector imported.');
    return connector;
  }

  const saved = await readOptional(identityFile);
  if (saved?.agentSource !== undefined || saved?.agentSha256 !== undefined) {
    return validateConnector(saved);
  }

  const code = options?.pairing_code?.trim();
  if (!code) {
    throw new Error(saved === undefined
      ? 'Import connector.json into this app’s configuration folder or enter an AmyDex pairing code.'
      : 'This app version needs a fresh connector. Download connector.json from AmyDex and import it.');
  }
  const server = options.server_url?.trim();
  if (!httpsOrigin(server) || !/^[a-f0-9]{32}$/.test(code)) {
    throw new Error('Enter the HTTPS server URL and one-time code shown in AmyDex.');
  }

  const paired = await redeemPairing(server, code);
  const connector = await saveConnector(identityFile, paired);
  console.log('AmyDex connector paired. Clear the one-time pairing code from Configuration.');
  return connector;
}

export async function startConnector(connector, { identityFile, runtimeDir, frpc }) {
  const { agentSource } = validateConnector(connector);
  const agentFile = join(runtimeDir, 'agent.mjs');
  await writeFile(agentFile, agentSource, { mode: 0o600, flag: 'wx' });
  try {
    const agent = await import(pathToFileURL(agentFile).href);
    if (typeof agent.runAgent !== 'function') throw new Error();
    return await agent.runAgent({ bundleFile: identityFile, frpc, stateDir: runtimeDir });
  } catch {
    throw new Error('The AmyDex connector could not start. Check the app log and import a fresh connector if needed.');
  }
}

async function start() {
  process.umask(0o077);
  const runtimeDir = await mkdtemp(join(tmpdir(), 'amydex-tunnel-'));
  process.once('exit', () => rmSync(runtimeDir, { recursive: true, force: true }));
  const identityFile = '/data/amydex-connector.json';
  const options = await readOptional('/data/options.json');
  const connector = await configureConnector({ inbox: '/config/connector.json', identityFile, options });
  await startConnector(connector, { identityFile, runtimeDir, frpc: '/usr/local/bin/frpc' });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  start().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
