// Host integration: Typert remote descriptors, account RPC adaptation and session navigation.
let { parsePricingResult, pricingRequestSchema, parseAggregateResult, parseBalanceResult, parseAccountResult, parseProvidersResult, forceSchema } = require("./rpc-client.js");
const inject = ["slots", "locale", "remote", "sessions"];
const NS = "stats";

function adaptLegacyBalance(value) {
	return {
		generatedAt: value.generatedAt,
		accounts: (value.accounts || []).map(function(account, index) {
			var stale = account.status === "stale";
			return {
				id: index ? "deepseek-official-" + account.currency.toLowerCase() : "deepseek-official",
				displayName: account.name,
				providerFamily: "deepseek",
				mode: "balance",
				adapter: "deepseek-balance",
				status: account.status === "ok" ? "ok" : account.status === "unconfigured" ? "not-configured" : "unavailable",
				stale,
				fetchedAt: account.fetchedAt || value.generatedAt,
				lastSuccessAt: account.fetchedAt,
				errorCode: account.errorCode,
				missingCredential: account.status === "unconfigured" ? "DEEPSEEK_API_KEY" : null,
				actionUrl: account.topUpUrl,
				balance: account.total == null ? null : { currency: account.currency, remaining: account.total, used: null, total: null, toppedUp: account.toppedUp, granted: account.granted, unlimited: false },
				plan: null,
				windows: []
			};
		}),
		warnings: (value.warnings || []).map(function(warning) { return { providerId: "deepseek-official", code: warning.code, message: warning.message }; })
	};
}

async function readAccountRemote(stats, force) {
	if (typeof stats.account === "function") {
		try {
			const answered = await stats.account(force === true);
			if (!answered.ok) throw answered.error || new Error("stats/account failed");
			return parseAccountResult(answered.value);
		} catch (error) {
			const missing = ["gateway/method-unavailable", "gateway/invocation-unavailable", "method-not-found", "METHOD_NOT_FOUND", -32601].includes(error?.code);
			if (!missing) throw error;
		}
	}
	const legacy = await stats.current();
	if (!legacy.ok) throw legacy.error || new Error("stats/current failed");
	const adapted = adaptLegacyBalance(parseBalanceResult(legacy.value));
	adapted.warnings.push({ providerId: "deepseek-official", code: "LEGACY_ACCOUNT_API", message: "Legacy account service: only DeepSeek balances are available" });
	return adapted;
}

// 内联 Typert Remote 描述符：DSH 不自动挂载第三方 ./remote，
// 需在客户端手动 ctx.remote.$mount(contribution)。
const STATS_REMOTE_CONTRIBUTION = {
	package: "@rongyi7/dsh-stats",
	descriptors: [{
		id: "@rongyi7/dsh-stats#stats/aggregate",
		service: "stats",
		namespace: "stats",
		method: "aggregate",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "@rongyi7/dsh-stats#stats/aggregate:result",
				schema: { parse: parseAggregateResult }
			},
			sourceLocation: { file: "packages/stats/src/index.ts", line: 1, column: 1 }
		}, {
			id: "@rongyi7/dsh-stats#stats/current",
			service: "stats",
			namespace: "stats",
			method: "current",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "@rongyi7/dsh-stats#stats/current:result",
				schema: { parse: parseBalanceResult }
			},
				sourceLocation: { file: "packages/stats/src/index.ts", line: 1, column: 1 }
			}, {
				id: "@rongyi7/dsh-stats#stats/providers", service: "stats", namespace: "stats", method: "providers", invocation: { kind: "direct" }, parameters: [],
				result: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/providers:result", schema: { parse: parseProvidersResult } },
				sourceLocation: { file: "packages/stats/src/index.ts", line: 1, column: 1 }
			}, {
				id: "@rongyi7/dsh-stats#stats/account", service: "stats", namespace: "stats", method: "account", invocation: { kind: "direct" }, parameters: [{
					name: "force", wire: "force", source: "json", codec: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/account:force", schema: forceSchema }
				}],
				result: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/account:result", schema: { parse: parseAccountResult } },
				sourceLocation: { file: "packages/stats/src/index.ts", line: 1, column: 1 }
			}, {
				id: "@rongyi7/dsh-stats#stats/pricing", service: "stats", namespace: "stats", method: "pricing", invocation: { kind: "direct" },
				parameters: [{ name: "request", wire: "request", source: "json", codec: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/pricing:request", schema: pricingRequestSchema } }],
				result: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/pricing:result", schema: { parse: parsePricingResult } },
				sourceLocation: { file: "src/index.js", line: 1, column: 1 }

			}]
};
// Harness 0.1.7 registries require codec.create(); 0.1.5 registries read codec.schema.
STATS_REMOTE_CONTRIBUTION.descriptors.forEach(function(row) {
	[row.result].concat(row.parameters.map(function(p) { return p.codec; })).forEach(function(codec) {
		if (codec && codec.mode === "strict" && typeof codec.create !== "function") codec.create = function() { return codec.schema; };
	});
});

function subagentAddressFor(sessions, session) {
	if (!sessions || !session?.subagent || typeof session.id !== "string") return null;
	try {
		var retained = typeof sessions.subagentAddress === "function" ? sessions.subagentAddress(session.id) : null;
		if (retained) return retained;
		if (typeof session.parentSession !== "string" || !session.parentSession) return null;
		var snapshot = sessions.list?.getSnapshot?.();
		var catalog = snapshot?.subagentsByParent?.[session.parentSession];
		var entry = catalog?.entries?.find(function(candidate) { return candidate.kind === "child" && candidate.id === session.id; });
		if (!entry || (entry.mode !== "one-shot" && entry.mode !== "continuable")) return null;
		return { parentSessionId: session.parentSession, childSessionId: session.id, mode: entry.mode };
	} catch {
		return null;
	}
}

async function openStatsSession(sessions, session, uiWorkspace) {
	if (!session || typeof session.id !== "string" || !session.id) throw new Error("session id is unavailable");
	// Harness 0.1.7 replaced sessions.open with retain(target), and its UI owner
	// accepts durable subagent addresses. Earlier owners forward a plain id to
	// sessions.open, so subagents keep the controller fallback below there.
	var targetContract = typeof sessions?.retain === "function";
	if (typeof uiWorkspace?.openSession === "function" && (targetContract || !session.subagent)) {
		// The UI owner retains the session, selects it and reveals Conversation.
		// A controller retain() alone cannot perform navigation.
		await uiWorkspace.openSession(targetContract && subagentAddressFor(sessions, session) || session.id);
		return;
	}
	if (!sessions || typeof sessions.open !== "function") throw new Error("session navigation is unavailable");
	try {
		await sessions.open(session.id);
		return;
	} catch (openError) {
		if (!session.subagent || typeof sessions.openSubagent !== "function") throw openError;
		var address = subagentAddressFor(sessions, session);
		if (!address && typeof session.parentSession === "string" && session.parentSession && typeof sessions.refreshSubagents === "function") {
			await sessions.refreshSubagents(session.parentSession);
			address = subagentAddressFor(sessions, session);
		}
		if (!address) throw openError;
		await sessions.openSubagent(address);
	}
}

module.exports = { NS, STATS_REMOTE_CONTRIBUTION, inject, openStatsSession, readAccountRemote, subagentAddressFor };
