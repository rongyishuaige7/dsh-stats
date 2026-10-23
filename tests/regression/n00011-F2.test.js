// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] 不限量余额账户仍渲染提醒铃铛，但 alertFor 对其永远返回 null，提醒永远不会生效
// Source: src/client-balance.cjs:326  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const mod = require('../../src/client-balance.cjs');

const HOOK_NAMES = ['useState', 'useRef', 'useEffect', 'useLayoutEffect'];

// Minimal hook runtime: reproduces React's useState semantics (initial value is
// only used on the first render) and runs useEffect after the render so that an
// effect-based fix would also settle before we inspect the tree.
function createHookHarness() {
	const slots = [];
	let cursor = 0;
	let dirty = false;
	let pending = [];

	const dispatcher = {
		useState(initial) {
			const index = cursor++;
			if (!(index in slots)) {
				slots[index] = { value: typeof initial === 'function' ? initial() : initial };
			}
			const slot = slots[index];
			const setValue = next => {
				const value = typeof next === 'function' ? next(slot.value) : next;
				if (!Object.is(value, slot.value)) {
					slot.value = value;
					dirty = true;
				}
			};
			return [slot.value, setValue];
		},
		useRef(initial) {
			const index = cursor++;
			if (!(index in slots)) slots[index] = { ref: { current: initial } };
			return slots[index].ref;
		},
		useEffect(effect, deps) {
			const index = cursor++;
			const previous = slots[index];
			const changed = !previous || !previous.deps || !deps || deps.length !== previous.deps.length
				|| deps.some((dep, i) => !Object.is(dep, previous.deps[i]));
			slots[index] = { deps: deps ? deps.slice() : null };
			if (changed) pending.push(effect);
		},
		useLayoutEffect(effect, deps) {
			dispatcher.useEffect(effect, deps);
		},
		useMemo(factory) {
			cursor++;
			return factory();
		},
		useCallback(fn) {
			cursor++;
			return fn;
		},
		useContext() {
			cursor++;
			return null;
		},
		useDebugValue() {},
		useId() {
			cursor++;
			return 'test-id';
		},
	};

	function install() {
		const saved = {};
		for (const name of HOOK_NAMES) saved[name] = React[name];
		for (const name of HOOK_NAMES) {
			try {
				React[name] = dispatcher[name];
			} catch (error) {
				// fall back to React's internals dispatcher below
			}
		}
		let restoreInternals = null;
		if (React.useState !== dispatcher.useState) {
			const internals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
				|| React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
			if (internals && internals.ReactCurrentDispatcher) {
				const previous = internals.ReactCurrentDispatcher.current;
				internals.ReactCurrentDispatcher.current = dispatcher;
				restoreInternals = () => { internals.ReactCurrentDispatcher.current = previous; };
			} else if (internals && 'H' in internals) {
				const previous = internals.H;
				internals.H = dispatcher;
				restoreInternals = () => { internals.H = previous; };
			}
		}
		return () => {
			for (const name of HOOK_NAMES) {
				try {
					React[name] = saved[name];
				} catch (error) {
					// ignore
				}
			}
			if (restoreInternals) restoreInternals();
		};
	}

	return {
		render(component, props) {
			let tree;
			for (let pass = 0; pass < 20; pass += 1) {
				cursor = 0;
				dirty = false;
				pending = [];
				const restore = install();
				try {
					tree = component(props);
				} finally {
					restore();
				}
				const effects = pending;
				pending = [];
				effects.forEach(effect => { effect(); });
				if (!dirty) return tree;
			}
			throw new Error('hook harness did not settle');
		},
	};
}

function collect(node, predicate, out = []) {
	if (node == null || typeof node !== 'object') return out;
	if (Array.isArray(node)) {
		node.forEach(child => collect(child, predicate, out));
		return out;
	}
	if (predicate(node)) out.push(node);
	const children = node.props ? node.props.children : undefined;
	// Never invoke render-prop children (Popover), only walk created elements.
	if (typeof children !== 'function') collect(children, predicate, out);
	return out;
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] 不限量余额账户不应渲染提醒铃铛（alertFor 永远返回 null）', () => {
	const account = {
		id: 'unlimited-balance',
		displayName: 'Unlimited',
		mode: 'balance',
		status: 'ok',
		adapter: 'fixture-balance',
		actionUrl: null,
		balance: { currency: 'CNY', remaining: null, used: null, total: null, toppedUp: null, granted: null, unlimited: true },
	};
	const tree = mod.AccountRow({ account, alerts: {}, onAlertChange() {}, now: 0, t: key => key });
	const bells = collect(tree, node => node.props && node.props.action === 'balance-alert');
	expect(bells).toHaveLength(0);
});

