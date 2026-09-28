// Slot durations and priced usage slices for aggregation.
import pricing from "./pricing.cjs";
const { priceUsage, convertCostToCny, summarizeCostsCny } = pricing;
import { LONG_CONTEXT_TOKENS, SLOT_MS, activityIntervals, identityFields, identityKey, rawIdentity } from "./host-util.js";
function emptyRaw() {
	return { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
}
function addRaw(a, b) {
	a.turns += b.turns; a.steps += b.steps; a.llmMs += b.llmMs; a.toolMs += b.toolMs;
	a.ttftMs += b.ttftMs; a.ttftSteps += b.ttftSteps; a.decodeMs += b.decodeMs; a.decodeTokens += b.decodeTokens;
	a.uncached += b.uncached; a.output += b.output; a.cacheRead += b.cacheRead; a.cacheWrite += b.cacheWrite; a.reasoning += b.reasoning;
}

// 把活跃区间按 30 分钟绝对槽切分累计
function slotDurations(times) {
	const slotMs = new Map();
	for (const [s, e] of activityIntervals(times)) {
		const startSlot = Math.floor(s / SLOT_MS);
		const endSlot = Math.floor(e / SLOT_MS);
		for (let k = startSlot; k <= endSlot; k++) {
			const overlap = Math.min(e, (k + 1) * SLOT_MS) - Math.max(s, k * SLOT_MS);
			if (overlap > 0) slotMs.set(k, (slotMs.get(k) || 0) + overlap);
		}
	}
	return [...slotMs.entries()].map(([slot, ms]) => ({ slot, ms }));
}

// 按「provider + 模型 + 账户类型 + 服务档 + 上下文 + 30 分钟槽」聚合。
// 上下文 token 数保留到请求粒度，避免 OpenAI/Gemini/MiniMax 的不同阈值被槽聚合破坏。
function slotUsages(usages, engine = pricing) {
	const m = new Map();
	for (const u of usages) {
		const k = Math.floor(u.time / SLOT_MS);
		const identity = rawIdentity(u.providerId, u.model, u.accountType, u.time);
		const serviceTier = pricing.normalizeServiceTier(u.serviceTier);
		const contextTokens = Number.isFinite(u.contextTokens) ? u.contextTokens : u.uncached + u.cacheRead + u.cacheWrite;
		const contextOver512k = contextTokens > LONG_CONTEXT_TOKENS;
		const key = identityKey(identity) + "\u0000" + serviceTier + "\u0000" + contextTokens + "\u0000" + k + "\u0000" + u.time;
		const cur = m.get(key) || {
			model: identity.modelRaw,
			time: u.time,
			...identityFields(identity),
			serviceTier,
			contextTokens,
			contextOver512k,
			slot: k,
			uncached: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			reasoning: 0
		};
		cur.uncached += u.uncached; cur.output += u.output; cur.cacheRead += u.cacheRead; cur.cacheWrite += u.cacheWrite;
		cur.reasoning += u.reasoning;
		if (u.pricingIncomplete) cur.pricingIncomplete = true;
		m.set(key, cur);
	}
	return [...m.values()].map(({ pricingIncomplete, ...row }) => pricedUsage(row, pricingIncomplete, engine));
}

// Keep the pricing qualification on this observation without changing the RPC
// shape. A preview must never read a generating session a second time.
function pricedUsage(row, incomplete, engine) {
	const result = { ...row, cost: engine.convertCostToCny(engine.priceUsage({ ...row, pricingIncomplete: incomplete }, row)) };
	Object.defineProperty(result, "_pricingIncomplete", { value: incomplete === true });
	return result;
}

function repriceSnapshot(snapshot, engine) {
	const projects = snapshot.projects.map(project => {
		const sessions = project.sessions.map(session => {
			const slotUsage = session.slotUsage.map(row => pricedUsage(row, row._pricingIncomplete, engine));
			return { ...session, slotUsage, modelUsage: modelUsages(slotUsage), cost: engine.summarizeCostsCny(slotUsage.map(row => row.cost)) };
		});
		return { ...project, sessions, cost: engine.mergeCostSummariesCny(sessions.map(session => session.cost)) };
	});
	return { ...snapshot, projects, cost: engine.mergeCostSummariesCny(projects.map(project => project.cost)) };
}

function modelUsages(rows) {
	const grouped = new Map();
	for (const row of rows) {
		const identity = rawIdentity(row.providerId, row.modelRaw || row.model, row.accountType, row.slot * SLOT_MS);
		const key = identityKey(identity);
		const current = grouped.get(key) || {
			model: identity.modelRaw,
			...identityFields(identity),
			uncached: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			reasoning: 0,
			_costs: []
		};
		current.uncached += row.uncached || 0;
		current.output += row.output || 0;
		current.cacheRead += row.cacheRead || 0;
		current.cacheWrite += row.cacheWrite || 0;
		current.reasoning += row.reasoning || 0;
		current._costs.push(convertCostToCny(row.cost || priceUsage(row, row)));
		grouped.set(key, current);
	}
	return [...grouped.values()].map(({ _costs, ...row }) => ({ ...row, cost: summarizeCostsCny(_costs) }));
}

function projectionSlotUsage(info, usage, updatedAt, engine = pricing) {
	const identity = rawIdentity(info.providerId, info.model, info.accountType, updatedAt);
	const contextTokens = usage.uncached + usage.cacheRead + usage.cacheWrite;
	const row = {
		model: identity.modelRaw,
		...identityFields(identity),
		serviceTier: "standard",
		contextTokens,
		contextOver512k: contextTokens > LONG_CONTEXT_TOKENS,
		slot: Math.floor(updatedAt / SLOT_MS),
		...usage
	};
	return pricedUsage(row, true, engine);
}

export { addRaw, emptyRaw, modelUsages, projectionSlotUsage, repriceSnapshot, slotDurations, slotUsages };
