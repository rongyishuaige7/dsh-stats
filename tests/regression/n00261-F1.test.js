// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 热力图分档在多数活跃日并列于峰值时，峰值日只得到 2 级，最高两档不可达
// Source: src/client-trends-model.cjs:247  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

const mod = require('../../src/client-trends-model.cjs');

describe('client-trends-model heatLevel 分档', () => {
	test('[F1] 多数活跃日并列在峰值时，峰值日仍应是最高档 4', () => {
		const values = [1, 2, 3, 5, 5, 5, 5, 5];
		expect(mod.heatLevel(5, values)).toBe(4);
	});

	test('[F1] 同一组活跃值下最深档 4 必须可达', () => {
		const values = [1, 2, 3, 5, 5, 5, 5, 5];
		const levels = values.map(function (value) {
			return mod.heatLevel(value, values);
		});
		expect(levels).toContain(4);
	});
});

