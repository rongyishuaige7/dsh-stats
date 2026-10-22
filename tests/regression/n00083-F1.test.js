// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 响应缺失或 status 无法解析时 Number() 得到 NaN，被错误归类为 http-4xx 而非 fetch-failed
// Source: src/host-balance.js:122  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { describe, test, expect } from 'vitest';
import { fetchDeepSeekBalance } from '../../src/host-balance.js';

const credentials = { resolve: async () => "sk-fixture-key" };
const NOW = 1_700_000_000_000;

describe("host-balance numeric error classification", () => {
	test("[F1] fetch 没有返回响应对象时应归类为 fetch-failed 而非 http-4xx", async () => {
		await expect(
			fetchDeepSeekBalance(credentials, async () => null, NOW)
		).rejects.toMatchObject({ code: "fetch-failed" });
	});

	test("[F1] 响应 status 无法转为数字(NaN)时不应被当作 4xx 拒绝", async () => {
		let error;
		try {
			await fetchDeepSeekBalance(credentials, async () => ({ ok: false }), NOW);
		} catch (caught) {
			error = caught;
		}
		expect(error).toBeTruthy();
		expect(error.code).not.toBe("http-4xx");
		expect(error.code).toBe("fetch-failed");
	});
});

