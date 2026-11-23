import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { configureConnector, startConnector } from '../amydex_tunnel/start.mjs';

const agentSource = 'export async function runAgent(options) { return options; }';
const agentSha256 = createHash('sha256').update(agentSource).digest('hex');
const identity = {
  version: 2,
  tunnelId: 'a'.repeat(24),
  token: 'b'.repeat(64),
  serverUrl: 'https://amydex.example',
  agentSource,
  agentSha256,
};

async function fixture(t) {
  const runtimeDir = await mkdtemp(join(tmpdir(), 'amydex-test-'));
  t.after(() => rm(runtimeDir, { force: true, recursive: true }));
  return {
    runtimeDir,
    inbox: join(runtimeDir, 'connector.json'),
    identityFile: join(runtimeDir, 'amydex-connector.json'),
    options: {},
  };
}

test('imports the authenticated bundle, stores it privately, and starts its connector', async t => {
  const state = await fixture(t);
  await writeFile(state.inbox, JSON.stringify({ ...identity, config: 'discard' }));
  assert.deepEqual(await configureConnector(state), identity);
  assert.deepEqual(JSON.parse(await readFile(state.identityFile, 'utf8')), identity);
  assert.equal((await stat(state.identityFile)).mode & 0o777, 0o600);
  await assert.rejects(stat(state.inbox), { code: 'ENOENT' });
  const saved = await configureConnector(state);
  assert.deepEqual(saved, identity);
  const frpc = '/usr/local/bin/frpc';
  assert.deepEqual(await startConnector(saved, { ...state, frpc }), {
    bundleFile: state.identityFile, frpc, stateDir: state.runtimeDir,
  });
  assert.equal((await stat(join(state.runtimeDir, 'agent.mjs'))).mode & 0o777, 0o600);
});

test('rejects mismatched connector code without replacing the saved connector', async t => {
  const state = await fixture(t);
  await writeFile(state.identityFile, JSON.stringify(identity));
  await writeFile(state.inbox, JSON.stringify({ ...identity, agentSource: 'invalid code' }));
  await assert.rejects(configureConnector(state), /connector code is missing or damaged/);
  assert.deepEqual(JSON.parse(await readFile(state.identityFile, 'utf8')), identity);
  assert.ok(await stat(state.inbox));
  const replacement = { ...identity, token: 'c'.repeat(64) };
  await writeFile(state.inbox, JSON.stringify(replacement));
  assert.deepEqual(await configureConnector(state), replacement);
});

test('redeems a pairing code once over HTTPS and reuses the private bundle', async t => {
  const state = await fixture(t);
  const code = 'd'.repeat(32);
  state.options = { server_url: identity.serverUrl, pairing_code: code };
  const fetch = t.mock.method(globalThis, 'fetch', async (url, request) => {
    assert.equal(url.href, identity.serverUrl + '/api/pair');
    assert.equal(request.method, 'POST');
    assert.equal(request.redirect, 'error');
    assert.deepEqual(JSON.parse(request.body), { code });
    return Response.json(identity);
  });
  assert.deepEqual(await configureConnector(state), identity);
  assert.deepEqual(await configureConnector(state), identity);
  assert.equal(fetch.mock.callCount(), 1);
});

test('a 1.0.0 identity without an agent requires a fresh connector', async t => {
  const state = await fixture(t);
  const { agentSource: source, agentSha256: checksum, ...legacy } = identity;
  await writeFile(state.identityFile, JSON.stringify(legacy));
  await assert.rejects(configureConnector(state), /needs a fresh connector/);
  await writeFile(state.inbox, JSON.stringify(identity));
  assert.deepEqual(await configureConnector(state), identity);
});
