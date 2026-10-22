// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] apply 的卸载清理未隔离宿主 dispose 异常，抛错后本插件注入的 <style> 与 tooltip 都不会被清理
// Source: src/client.cjs:735  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

// 针对 src/client.cjs 的错误路径测试：apply 卸载清理对宿主 dispose 异常的隔离
const mod = require('../../src/client.cjs');

describe('apply 卸载清理', () => {
	test('[F1] 宿主 dispose 抛错时仍应移除注入的 <style> 与 tooltip', async () => {
		const styleTag = { dataset: {}, isConnected: true, remove: vi.fn() };
		const tooltip = { remove: vi.fn() };
		const head = { appendChild: vi.fn() };
		globalThis.document = {
			querySelector: () => null,
			createElement: () => styleTag,
			head,
			body: { appendChild: vi.fn(), removeChild: vi.fn() },
			getElementById: (id) => (id === 'dss-tooltip' ? tooltip : null),
		};

		const ctx = {
			effect: (fn) => { fn(); },
			locale: { register: () => () => {} },
			inject: () => () => {},
			remote: { $mount: async () => () => { throw new Error('host dispose failed'); } },
			slots: { inject: () => {}, register: () => ({}) },
			sessions: {},
		};

		let dispose = null;
		let applyError = null;
		try {
			dispose = await mod.apply(ctx);
		} catch (error) {
			applyError = error;
		}
		expect(applyError).toBeNull();
		expect(typeof dispose).toBe('function');
		// 确认插件确实注入了自己的 <style>（ownedStyle），否则后面的清理断言无意义
		expect(head.appendChild).toHaveBeenCalledWith(styleTag);
		expect(styleTag.remove).not.toHaveBeenCalled();

		let thrown = null;
		try {
			dispose();
		} catch (error) {
			thrown = error;
		}
		delete globalThis.document;

		expect(thrown).toBeNull();
		expect(styleTag.remove).toHaveBeenCalledTimes(1);
		expect(tooltip.remove).toHaveBeenCalledTimes(1);
	});
});

