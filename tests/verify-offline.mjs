import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('lib/client.js', root), 'utf8');
const outcomes = [];

function createFixture(options = {}) {
  let exported;
  let panel;
  let cleanup;
  let currentView = null;
  let stateWrites = 0;
  let registered = 0;
  const React = {
    useState(initial) { return [currentView ?? initial, value => { currentView = value; stateWrites++; }]; },
    createElement(type, props, ...children) { return { type, props: props ?? {}, children }; },
  };
  const fixtureWindow = {
    location: { hostname: options.hostname ?? 'localhost' },
    crypto: { randomUUID: () => options.runId ?? 'offline-fixture-run-00000000000001' },
    __ModuleLoader__: { load({ factory }) { exported = factory(name => { assert.equal(name, 'react'); return React; }); } },
  };
  if (options.uuidThrows) fixtureWindow.crypto.randomUUID = () => { throw new Error('synthetic unavailable UUID'); };
  if (options.hostnameThrows) Object.defineProperty(fixtureWindow.location, 'hostname', { get() { throw new Error('synthetic unreadable origin'); } });
  vm.runInNewContext(source, { window: fixtureWindow }, { timeout: 1000 });
  const ctx = {
    effect(callback) { cleanup = callback(); return options.invalidEffect ? null : cleanup; },
    slots: {
      inject(name, callback) { assert.equal(name, 'conversation.header.leading'); callback(); return options.invalidSlot ? null : () => {}; },
      register(descriptor, component) { assert.equal(descriptor.name, 'conversation.header.leading'); panel = component; registered++; },
    },
  };
  return {
    plugin: exported,
    apply: () => exported.apply(ctx),
    get registered() { return registered; },
    get stateWrites() { return stateWrites; },
    cleanup: () => cleanup?.(),
    render: () => panel?.(),
    get view() { return currentView; },
  };
}

function button(tree) { return tree.children.find(child => child?.type === 'button'); }
function check(name, run) { run(); outcomes.push({ name, status: 'PASS' }); }

check('loopback user click yields three bound metadata records and disables read button', () => {
  const fixture = createFixture();
  assert.deepEqual(Array.from(fixture.plugin.inject), ['slots']);
  fixture.apply();
  assert.equal(fixture.registered, 1);
  const initial = fixture.render();
  assert.equal(button(initial).props.disabled, false);
  button(initial).props.onClick();
  assert.equal(fixture.view.status, 'SCOPED_RECORD_SET_COMPLETE');
  assert.deepEqual(Array.from(fixture.view.records, record => record.event), ['CLIENT_APPLY_ENTERED', 'SOURCE_GUARD_ALLOWED', 'DIAGNOSTIC_EXTRACTION_COMPLETE']);
  for (const record of fixture.view.records) {
    assert.equal(record.run_id, fixture.view.run_id);
    assert.equal(record.build_hash, fixture.view.build_hash);
  }
  assert.equal(button(fixture.render()).props.disabled, true);
  button(initial).props.onClick();
  assert.equal(fixture.stateWrites, 1);
});

for (const hostname of ['127.0.0.1', '::1', '[::1]', 'LOCALHOST']) {
  check('loopback origin admitted: ' + hostname, () => {
    const fixture = createFixture({ hostname }); fixture.apply(); button(fixture.render()).props.onClick();
    assert.equal(fixture.view.records[1].event, 'SOURCE_GUARD_ALLOWED');
  });
}
check('non-loopback origin reports denial', () => {
  const fixture = createFixture({ hostname: 'example.invalid' }); fixture.apply(); button(fixture.render()).props.onClick();
  assert.equal(fixture.view.records[1].event, 'SOURCE_GUARD_DENIED');
  assert.equal(fixture.view.records[1].allowed, false);
});
check('unreadable origin fails closed', () => {
  const fixture = createFixture({ hostnameThrows: true }); fixture.apply(); button(fixture.render()).props.onClick();
  assert.equal(fixture.view.records[1].event, 'SOURCE_GUARD_DENIED');
  assert.equal(fixture.view.records[1].hostname, null);
});
check('disposed lifecycle cannot extract records', () => {
  const fixture = createFixture(); fixture.apply(); fixture.cleanup(); button(fixture.render()).props.onClick();
  assert.equal(fixture.view.status, 'REJECT_UNTRUSTED_SINK');
  assert.equal(fixture.view.records.length, 0);
});
check('unavailable UUID creates no panel', () => {
  const fixture = createFixture({ uuidThrows: true }); fixture.apply(); assert.equal(fixture.registered, 0);
});
check('invalid run ID creates no panel', () => {
  const fixture = createFixture({ runId: 'short' }); fixture.apply(); assert.equal(fixture.registered, 0);
});
check('invalid lifecycle binding creates no panel', () => {
  const fixture = createFixture({ invalidEffect: true }); fixture.apply(); assert.equal(fixture.registered, 0);
});
check('invalid slot binding disposes store', () => {
  const fixture = createFixture({ invalidSlot: true }); fixture.apply(); button(fixture.render()).props.onClick();
  assert.equal(fixture.view.status, 'REJECT_UNTRUSTED_SINK');
});
const server = await import(new URL('lib/server.mjs', root));
check('server apply remains frozen no-op', () => {
  assert.equal(Object.isFrozen(server.default), true);
  assert.equal(server.default.apply(), undefined);
});

const result = {
  status: 'PASS', passed: outcomes.length, failed: 0, outcomes,
  limits: 'Node VM and React/Cordis interface stubs only; does not verify real DeepSeek Harness, installation, React rendering or upstream compatibility. No host interaction, network request or model turn performed.',
  node_version: process.version,
};
console.log(JSON.stringify({ status: result.status, passed: result.passed, failed: result.failed, node_version: result.node_version }));
