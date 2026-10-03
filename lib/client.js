window.__ModuleLoader__.load({
  id: 'hdp-harness-b7-cso1-trusted-local-diagnostic',
  factory: (require) => {
    const React = require('react');
    const BUILD_HASH = 'ef000d4bb1b811cb1ae999b55bb9788fd6b5cb8194533b7c9391fcbf07af38d4';
    const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
    const HEADER_LEADING_SLOT = 'conversation.header.leading';
    const MODULE_NAME = 'hdp-harness-b7-cso1-trusted-local-diagnostic';

    function createTrustedDiagnosticStoreRegistry() {
  const stateByHandle = new WeakMap();
  const activeStates = new Set();
  const maximumRecords = 3;
  let serviceGeneration = 1;
  let serviceActive = true;

  function reject(status) {
    return Object.freeze({ ok: false, status, records: Object.freeze([]) });
  }

  function ownedState(handle) {
    if ((typeof handle !== 'object' && typeof handle !== 'function') || handle === null) return null;
    const state = stateByHandle.get(handle);
    if (!state || !serviceActive || state.disposed || state.serviceGeneration !== serviceGeneration) return null;
    return state;
  }

  function create(runId, buildHash, recordLimit = maximumRecords) {
    if (!serviceActive) return reject('STORE_SERVICE_DISPOSED');
    if (typeof runId !== 'string' || runId.length < 16 || runId.length > 64) return reject('INVALID_RUN_ID');
    if (typeof buildHash !== 'string' || !/^[0-9a-f]{64}$/.test(buildHash)) return reject('INVALID_BUILD_HASH');
    if (!Number.isInteger(recordLimit) || recordLimit < 1 || recordLimit > maximumRecords) return reject('INVALID_RECORD_LIMIT');
    const state = { runId, buildHash, serviceGeneration, recordLimit, records: [], seen: new Set(), tainted: false, truncated: false, sealed: false, disposed: false };
    const handle = Object.freeze({
      contract: 'TrustedDiagnosticStore/0.1',
      run_id: runId,
      build_hash: buildHash,
      service_generation: serviceGeneration,
      append(event) { return append(this, event); },
      read_current(requestRunId, requestBuildHash) { return read_current(this, requestRunId, requestBuildHash); },
      seal() { return seal(this); },
      dispose() { return dispose(this); },
    });
    stateByHandle.set(handle, state);
    activeStates.add(state);
    return Object.freeze({ ok: true, status: 'TRUSTED_STORE_CREATED', handle });
  }

  function append(handle, event) {
    const state = ownedState(handle);
    if (!state) return reject('REJECT_UNTRUSTED_SINK');
    if (state.sealed) return reject('STORE_SEALED');
    try {
      if (!event || typeof event !== 'object') throw new Error('EVENT_NOT_OBJECT');
      const descriptors = Object.getOwnPropertyDescriptors(event);
      const keys = Reflect.ownKeys(descriptors);
      if (keys.some((key) => typeof key !== 'string')) throw new Error('EVENT_SYMBOL_KEY');
      for (const key of keys) if (!Object.hasOwn(descriptors[key], 'value')) throw new Error('EVENT_ACCESSOR');
      const eventName = descriptors.event?.value;
      if (typeof eventName !== 'string') throw new Error('EVENT_NAME_INVALID');
      const guardEvent = eventName === 'SOURCE_GUARD_ALLOWED' || eventName === 'SOURCE_GUARD_DENIED';
      const allowedKeys = guardEvent ? ['event', 'hostname', 'normalized_hostname', 'hostname_readable', 'allowed'] : ['event'];
      if (keys.length !== allowedKeys.length || keys.some((key) => !allowedKeys.includes(key))) throw new Error('EVENT_FIELDS_INVALID');
      if (!['CLIENT_APPLY_ENTERED', 'SOURCE_GUARD_ALLOWED', 'SOURCE_GUARD_DENIED', 'DIAGNOSTIC_EXTRACTION_COMPLETE'].includes(eventName)) throw new Error('EVENT_NOT_ALLOWLISTED');
      if (state.seen.has(eventName)) throw new Error('DUPLICATE_EVENT');
      if (state.records.length >= state.recordLimit) {
        state.truncated = true;
        return reject('STORE_CAP_REACHED');
      }
      let fields = {};
      if (guardEvent) {
        const hostname = descriptors.hostname.value;
        const normalized = descriptors.normalized_hostname.value;
        const readable = descriptors.hostname_readable.value;
        const allowed = descriptors.allowed.value;
        if (hostname !== null && typeof hostname !== 'string') throw new Error('HOSTNAME_INVALID');
        if (normalized !== null && typeof normalized !== 'string') throw new Error('NORMALIZED_HOSTNAME_INVALID');
        if (typeof readable !== 'boolean' || typeof allowed !== 'boolean') throw new Error('GUARD_RESULT_INVALID');
        if ((eventName === 'SOURCE_GUARD_ALLOWED') !== allowed) throw new Error('GUARD_EVENT_MISMATCH');
        fields = { hostname, normalized_hostname: normalized, hostname_readable: readable, allowed };
      }
      const record = Object.freeze({ schema: 'TrustedDiagnosticStore/0.1', run_id: state.runId, build_hash: state.buildHash, service_generation: state.serviceGeneration, event: eventName, ...fields });
      state.records.push(record);
      state.seen.add(eventName);
      return Object.freeze({ ok: true, status: 'APPENDED', count: state.records.length });
    } catch {
      state.tainted = true;
      return reject('EVENT_REJECTED');
    }
  }

  function read_current(handle, requestRunId, requestBuildHash) {
    const state = ownedState(handle);
    if (!state) return reject('REJECT_UNTRUSTED_SINK');
    if (state.sealed) return reject('STORE_SEALED');
    if (requestRunId !== state.runId) return reject('RUN_ID_MISMATCH');
    if (requestBuildHash !== state.buildHash) return reject('BUILD_HASH_MISMATCH');
    if (state.truncated || state.tainted) return reject(state.truncated ? 'STORE_TRUNCATED' : 'STORE_TAINTED');
    const records = state.records.slice(0, state.recordLimit);
    if (records.length > state.recordLimit || records.some((record) => record.run_id !== requestRunId || record.build_hash !== requestBuildHash || record.service_generation !== state.serviceGeneration)) return reject('RECORD_BINDING_INVALID');
    const applied = records.filter((record) => record.event === 'CLIENT_APPLY_ENTERED').length;
    const allowed = records.filter((record) => record.event === 'SOURCE_GUARD_ALLOWED').length;
    const denied = records.filter((record) => record.event === 'SOURCE_GUARD_DENIED').length;
    const extracted = records.filter((record) => record.event === 'DIAGNOSTIC_EXTRACTION_COMPLETE').length;
    if (applied !== 1 || allowed + denied !== 1 || extracted > 1 || records.length !== applied + allowed + denied + extracted) return Object.freeze({ ok: false, status: 'RECORD_SET_INCOMPLETE', records: Object.freeze(records) });
    if (records[0]?.event !== 'CLIENT_APPLY_ENTERED' || !['SOURCE_GUARD_ALLOWED', 'SOURCE_GUARD_DENIED'].includes(records[1]?.event) || (extracted === 1 && records[2]?.event !== 'DIAGNOSTIC_EXTRACTION_COMPLETE')) return Object.freeze({ ok: false, status: 'RECORD_ORDER_INVALID', records: Object.freeze(records) });
    const status = extracted === 1 ? 'SCOPED_RECORD_SET_COMPLETE' : 'READY_FOR_EXTRACTION';
    return Object.freeze({ ok: true, status, run_id: state.runId, build_hash: state.buildHash, records: Object.freeze(records) });
  }

  function seal(handle) {
    const state = ownedState(handle);
    if (!state) return reject('REJECT_UNTRUSTED_SINK');
    if (state.sealed) return reject('STORE_SEALED');
    const read = read_current(handle, state.runId, state.buildHash);
    if (!read.ok || read.status !== 'SCOPED_RECORD_SET_COMPLETE') return reject('RECORD_SET_NOT_COMPLETE');
    state.sealed = true;
    return Object.freeze({ ok: true, status: 'STORE_SEALED' });
  }

  function dispose(handle) {
    if (arguments.length === 0) {
      for (const state of activeStates) {
        state.records.length = 0;
        state.seen.clear();
        state.disposed = true;
      }
      activeStates.clear();
      serviceActive = false;
      serviceGeneration += 1;
      return Object.freeze({ ok: true, status: 'STORE_SERVICE_DISPOSED' });
    }
    const state = ownedState(handle);
    if (!state) return reject('REJECT_UNTRUSTED_SINK');
    state.records.length = 0;
    state.seen.clear();
    state.disposed = true;
    activeStates.delete(state);
    stateByHandle.delete(handle);
    serviceGeneration += 1;
    return Object.freeze({ ok: true, status: 'STORE_DISPOSED' });
  }

  return Object.freeze({ create, append, read_current, seal, dispose });
}

    function createDiagnosticPanel(registry, handle, runId) {
      let readAttempted = false;
      return function TrustedDiagnosticPanel() {
        const [view, setView] = React.useState(null);
        function readAndDisplay() {
          if (readAttempted) return;
          readAttempted = true;
          try {
            const beforeExtraction = registry.read_current(handle, runId, BUILD_HASH);
            if (!beforeExtraction.ok || beforeExtraction.status !== 'READY_FOR_EXTRACTION') {
              setView({ status: beforeExtraction.status || 'OBSERVABILITY_INCOMPLETE', records: [] });
              return;
            }
            const appended = registry.append(handle, { event: 'DIAGNOSTIC_EXTRACTION_COMPLETE' });
            if (!appended.ok) {
              setView({ status: appended.status || 'OBSERVABILITY_INCOMPLETE', records: [] });
              return;
            }
            const snapshot = registry.read_current(handle, runId, BUILD_HASH);
            if (!snapshot.ok || snapshot.status !== 'SCOPED_RECORD_SET_COMPLETE') {
              setView({ status: snapshot.status || 'OBSERVABILITY_INCOMPLETE', records: [] });
              return;
            }
            const sealed = registry.seal(handle);
            if (!sealed.ok) {
              setView({ status: sealed.status || 'OBSERVABILITY_INCOMPLETE', records: [] });
              return;
            }
            setView({ status: 'SCOPED_RECORD_SET_COMPLETE', run_id: runId, build_hash: BUILD_HASH, records: snapshot.records });
          } catch {
            setView({ status: 'OBSERVABILITY_INCOMPLETE', records: [] });
          }
        }
        return React.createElement('details', { 'data-hdp-diagnostic': 'trusted-local-only' },
          React.createElement('summary', null, 'HDP 本地诊断'),
          React.createElement('button', { type: 'button', onClick: readAndDisplay, disabled: view?.status === 'SCOPED_RECORD_SET_COMPLETE' }, '读取本次记录'),
          React.createElement('pre', { 'aria-live': 'polite' }, view ? JSON.stringify(view, null, 2) : '尚未读取；记录只在当前页面内存中。'));
      };
    }

    function readOriginalGuardInput() {
      try {
        const hostname = String(window.location.hostname ?? '');
        const normalizedHostname = hostname.toLowerCase();
        return {
          hostname,
          normalized_hostname: normalizedHostname,
          hostname_readable: true,
          allowed: LOOPBACK_HOSTS.has(normalizedHostname),
        };
      } catch {
        return { hostname: null, normalized_hostname: null, hostname_readable: false, allowed: false };
      }
    }

    function apply(ctx) {
      let runId;
      try {
        runId = window.crypto.randomUUID();
      } catch {
        return;
      }
      if (typeof runId !== 'string' || runId.length < 16 || runId.length > 64) return;

      const registry = createTrustedDiagnosticStoreRegistry();
      const created = registry.create(runId, BUILD_HASH);
      if (!created.ok) return;
      const handle = created.handle;
      try {
        const lifecycleHandle = ctx.effect(() => () => { registry.dispose(handle); }, 'HDP trusted diagnostic store disposal');
        if (typeof lifecycleHandle !== 'function') {
          registry.dispose(handle);
          return;
        }
        const component = createDiagnosticPanel(registry, handle, runId);
        const slotHandle = ctx.slots.inject(HEADER_LEADING_SLOT, () => ctx.slots.register({
          name: HEADER_LEADING_SLOT,
          id: MODULE_NAME,
        }, component));
        if (typeof slotHandle !== 'function') {
          registry.dispose(handle);
          return;
        }
      } catch {
        registry.dispose(handle);
        return;
      }

      if (!registry.append(handle, { event: 'CLIENT_APPLY_ENTERED' }).ok) return;
      const guard = readOriginalGuardInput();
      registry.append(handle, {
        event: guard.allowed ? 'SOURCE_GUARD_ALLOWED' : 'SOURCE_GUARD_DENIED',
        hostname: guard.hostname,
        normalized_hostname: guard.normalized_hostname,
        hostname_readable: guard.hostname_readable,
        allowed: guard.allowed,
      });
    }

    return { name: MODULE_NAME, inject: ["slots"], apply };
  },
});
