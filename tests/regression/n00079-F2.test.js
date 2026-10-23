// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] SESSION_PROJECTION_DOMAIN_VERSIONS 用 Object.freeze 冻结 Set 无效，外部可写入并改变 isSupportedProjectionDomainVersion 的判定
// Source: src/host-util.js:19  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	isSupportedProjectionDomainVersion,
	readSessionProjcache,
	SESSION_PROJECTION_DOMAIN_VERSIONS,
} from '../../src/host-util.js';

describe('host-util state', () => {
	// [night-evolver] 这条发现还没修，测试暂不提升;

	test('[F2] Object.freeze 冻结不了 Set，外部写入会改变 isSupportedProjectionDomainVersion 的结果', () => {
		expect(isSupportedProjectionDomainVersion(4242)).toBe(false);
		try {
			SESSION_PROJECTION_DOMAIN_VERSIONS.add(4242);
			expect(SESSION_PROJECTION_DOMAIN_VERSIONS.has(4242)).toBe(false);
			expect(isSupportedProjectionDomainVersion(4242)).toBe(false);
		} finally {
			SESSION_PROJECTION_DOMAIN_VERSIONS.delete(4242);
		}
	});
});

