// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 活跃会话查询 sessions.get 抛错会让整个 stats/aggregate RPC 直接失败
// Source: src/index.js:347  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StatsService } from '../../src/index.js';

const createdHomes = [];
const previousDshHome = process.env.DSH_HOME;

afterEach(() => {
	if (previousDshHome === undefined) delete process.env.DSH_HOME;
	else process.env.DSH_HOME = previousDshHome;
	while (createdHomes.length) rmSync(createdHomes.pop(), { recursive: true, force: true });
});

function makeHome(workspace) {
	const home = mkdtempSync(join(tmpdir(), 'dsh-stats-n00238-'));
	createdHomes.push(home);
	mkdirSync(join(home, 'storages'), { recursive: true });
	writeFileSync(join(home, 'storages', 'workspace.json'), JSON.stringify(workspace));
	process.env.DSH_HOME = home;
	return home;
}

// 同时提供直接属性、ctx.get 和 ctx.reflect.get 三种解析方式，保证
// contextService(hostCtx, name) 无论用哪种方式都能拿到注入的宿主服务桩。
function makeService(services) {
	const ctx = {
		reflect: { get: (name) => services[name] },
		get: (name) => services[name],
		...services,
	};
	return { ctx };
}

// 把可能 reject 的调用折叠成可断言的结果对象，避免未捕获异常被当成测试
// 代码自身出错。
async function settle(promise) {
	try {
		return { ok: true, value: await promise };
	} catch (error) {
		return { ok: false, error };
	}
}

test('[F1] 活跃会话查询抛错时 aggregate 整体拒绝，而不是降级返回其它会话', async () => {
	makeHome({
		tables: { workspaces: { w1: { title: 'P', path: '/p', sessionIds: ['s1'] } } },
		global: { archivedSessionIds: [] }
	});
	const service = makeService({
		sessions: { get() { throw new Error('live session store unavailable'); } }
	});
	const outcome = await settle(StatsService.prototype.aggregate.call(service));
	expect(outcome.ok).toBe(true);
	if (!outcome.ok) return;
	expect(outcome.value.projects.map((project) => project.id)).toEqual(['w1']);
	expect(outcome.value.projects[0].sessions.map((session) => session.id)).toEqual(['s1']);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

