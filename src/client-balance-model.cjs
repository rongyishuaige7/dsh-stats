// Pure balance view model shared by the React view and unit tests.
// No React, DOM, storage, locale strings or wall-clock reads belong here:
// callers pass `now` explicitly so results do not depend on the time zone.
const QUOTA_WARN = 20;
const QUOTA_DANGER = 5;
const ALERT_MAX = 1e9;

const TONE_RANK = { ok: 0, warn: 1, danger: 2 };

const STATUS_CHIPS = {
	unauthorized: { tone: "danger", key: "chip.unauthorized" },
	blocked: { tone: "danger", key: "chip.blocked" },
	"rate-limited": { tone: "warn", key: "chip.rateLimited" },
	unavailable: { tone: "warn", key: "chip.unavailable" },
	"invalid-response": { tone: "warn", key: "chip.invalidResponse" }
};

function isRecord(value) {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
	return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value) {
	return typeof value === "string" && value.trim() !== "";
}

// B6: below 5% is danger, below 20% is warn. Missing values cannot warn.
function quotaLevel(remainingPercent) {
	if (!isFiniteNumber(remainingPercent)) return "ok";
	if (remainingPercent < QUOTA_DANGER) return "danger";
	if (remainingPercent < QUOTA_WARN) return "warn";
	return "ok";
}

// B6: always round down so the number and the colour threshold agree.
// 4.96 is shown as "4.9", never as "5" while still being red.
function fmtQuotaPercent(remainingPercent) {
	if (!isFiniteNumber(remainingPercent)) return { value: 0, text: "0" };
	const clamped = Math.max(0, Math.min(100, remainingPercent));
	if (clamped >= 10) {
		const value = Math.floor(clamped);
		return { value: value, text: String(value) };
	}
	const value = Math.floor(clamped * 10) / 10;
	return { value: value, text: value.toFixed(1).replace(/\.0$/, "") };
}

// B9: accounts the host cannot query are folded into the idle group. Both
// groups keep the host order.
function splitAccounts(accounts) {
	const active = [];
	const idle = [];
	(Array.isArray(accounts) ? accounts : []).forEach(function(account) {
		if (!isRecord(account)) return;
		if (account.status === "not-configured" || account.status === "unsupported") idle.push(account);
		else active.push(account);
	});
	return { active: active, idle: idle };
}

// B8: drop malformed stored entries instead of trusting localStorage.
function normalizeBalanceAlerts(value) {
	const out = {};
	if (!isRecord(value)) return out;
	Object.keys(value).forEach(function(id) {
		if (!isNonEmptyString(id)) return;
		// Keep the result a plain data object; never let a stored key touch the prototype.
		if (id === "__proto__" || id === "constructor" || id === "prototype") return;
		const entry = value[id];
		if (!isRecord(entry)) return;
		if (!isFiniteNumber(entry.amount) || entry.amount <= 0 || entry.amount > ALERT_MAX) return;
		if (!isNonEmptyString(entry.currency)) return;
		out[id] = { amount: entry.amount, currency: entry.currency };
	});
	return out;
}

// B8: an alert only applies to a readable, limited balance account whose
// currency still matches the stored alert.
function alertFor(account, alerts) {
	if (!isRecord(account) || account.mode !== "balance" || !isRecord(account.balance)) return null;
	if (account.balance.unlimited === true) return null;
	if (!isFiniteNumber(account.balance.remaining)) return null;
	if (!isRecord(alerts)) return null;
	const alert = alerts[account.id];
	if (!isRecord(alert)) return null;
	if (!isFiniteNumber(alert.amount) || alert.amount <= 0 || alert.amount > ALERT_MAX) return null;
	if (alert.currency !== account.balance.currency) return null;
	return { amount: alert.amount, currency: alert.currency };
}

// B8: strip whitespace and ASCII/full-width commas, then require a plain
// decimal with at most two fraction digits and a value in (0, 1e9].
function validateAlertAmount(raw) {
	const text = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
	const cleaned = text.replace(/[\s,，]/g, "");
	if (!cleaned) return { kind: "empty" };
	if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return { kind: "invalid" };
	const amount = Number(cleaned);
	if (!(amount > 0) || amount > ALERT_MAX) return { kind: "invalid" };
	return { kind: "ok", amount: amount };
}

function subscriptionMin(account) {
	const windows = Array.isArray(account.windows) ? account.windows : [];
	let min = null;
	windows.forEach(function(window) {
		if (!isRecord(window) || !isFiniteNumber(window.remainingPercent)) return;
		if (min == null || window.remainingPercent < min) min = window.remainingPercent;
	});
	return min;
}

// B7: exactly one label per row, the first matching condition wins.
function accountChip(account, alerts) {
	if (!isRecord(account)) return null;
	if (account.stale === true) return { tone: "warn", key: "chip.stale" };
	const statusChip = Object.prototype.hasOwnProperty.call(STATUS_CHIPS, account.status)
		? STATUS_CHIPS[account.status]
		: null;
	if (statusChip) return { tone: statusChip.tone, key: statusChip.key };
	if (account.mode === "subscription") {
		const min = subscriptionMin(account);
		if (min != null) {
			if (min <= 0) return { tone: "danger", key: "chip.quotaOut" };
			if (min < QUOTA_DANGER) return { tone: "danger", key: "chip.quotaDanger" };
			if (min < QUOTA_WARN) return { tone: "warn", key: "chip.quotaWarn" };
		}
		return null;
	}
	if (account.mode === "balance" && isRecord(account.balance)) {
		const balance = account.balance;
		if (balance.unlimited !== true && balance.remaining <= 0) return { tone: "danger", key: "chip.balanceOut" };
		const alert = alertFor(account, alerts);
		if (alert && balance.remaining > 0 && balance.remaining < alert.amount) return { tone: "warn", key: "chip.balanceLow" };
	}
	return null;
}

function accountTone(account, alerts) {
	const chip = accountChip(account, alerts);
	return chip ? chip.tone : "ok";
}

// B2: danger first, then warn, then ok. Equal tones keep the host order.
function sortAccounts(active, alerts) {
	return (Array.isArray(active) ? active : []).map(function(account, index) {
		return { account: account, index: index, rank: TONE_RANK[accountTone(account, alerts)] };
	}).sort(function(a, b) {
		return (b.rank - a.rank) || (a.index - b.index);
	}).map(function(entry) {
		return entry.account;
	});
}

// B4: the row subline never repeats the account name, so same-family accounts
// stay distinguishable.
function accountMeta(account) {
	const type = account && account.mode === "subscription" ? "subscription" : "balance";
	const plan = account && typeof account.plan === "string" ? account.plan.trim() : "";
	const displayName = account && typeof account.displayName === "string" ? account.displayName.trim() : "";
	if (plan && plan !== displayName) return { type: type, detail: { kind: "plan", value: plan } };
	if (account && account.adapter === "generic-usage") return { type: type, detail: { kind: "route", value: null } };
	return { type: type, detail: { kind: "id", value: account && account.id != null ? account.id : "" } };
}

// B7: the reason line under the amount. `key` is a suffix of a `balance.*`
// locale key; `at` is only present for a stale snapshot with a last success.
function accountReason(account) {
	if (!isRecord(account)) return null;
	if (account.stale === true) {
		if (account.lastSuccessAt != null && isFiniteNumber(account.lastSuccessAt)) {
			return { key: "reason.stale", at: account.lastSuccessAt };
		}
		return { key: "staleHint" };
	}
	if (isNonEmptyString(account.status) && account.status !== "ok") {
		return { key: "message." + account.status };
	}
	if (account.mode === "balance" && isRecord(account.balance)
		&& account.balance.unlimited !== true && account.balance.remaining === 0) {
		return { key: "reason.balanceOut" };
	}
	return null;
}

// B5: amount, breakdown parts, optional alert line and the optional "available"
// meter. Null and zero parts are omitted; unlimited balances never warn.
function balanceParts(account, alert) {
	const empty = {
		amount: null, currency: null, zero: false, unlimited: false,
		parts: [], alertLine: null, meter: null
	};
	if (!isRecord(account) || account.mode !== "balance" || !isRecord(account.balance)) return empty;
	const balance = account.balance;
	const unlimited = balance.unlimited === true;
	const remaining = isFiniteNumber(balance.remaining) ? balance.remaining : null;
	const parts = [];
	if (isFiniteNumber(balance.toppedUp) && balance.toppedUp !== 0) parts.push({ key: "toppedUp", value: balance.toppedUp });
	if (isFiniteNumber(balance.granted) && balance.granted !== 0) parts.push({ key: "granted", value: balance.granted });
	if (isFiniteNumber(balance.used) && balance.used !== 0
		&& isFiniteNumber(balance.total) && balance.total !== 0) {
		parts.push({ key: "used", value: [balance.used, balance.total] });
	}
	let alertLine = null;
	if (!unlimited && remaining != null && isRecord(alert) && isFiniteNumber(alert.amount)
		&& alert.amount > 0 && alert.currency === balance.currency) {
		alertLine = { amount: alert.amount, below: remaining > 0 && remaining < alert.amount };
	}
	// Work in integer cents: 1.4 / 20 must be 7, not 6 from float error.
	const totalCents = isFiniteNumber(balance.total) ? Math.round(balance.total * 100) : 0;
	let meter = null;
	if (!unlimited && remaining != null && totalCents > 0) {
		meter = { remaining: Math.max(0, Math.min(100, Math.floor(Math.round(remaining * 100) * 100 / totalCents))) };
	}
	return {
		amount: remaining,
		currency: typeof balance.currency === "string" ? balance.currency : null,
		zero: !unlimited && remaining === 0,
		unlimited: unlimited,
		parts: parts,
		alertLine: alertLine,
		meter: meter
	};
}

// B6: relative reset time, rounded down to whole minutes. `days > 0` drops the
// minutes field; the view omits zero trailing parts.
function resetParts(resetsAt, now) {
	if (!isFiniteNumber(resetsAt) || !isFiniteNumber(now)) return null;
	const minutes = Math.floor((resetsAt - now) / 60000);
	if (minutes < 1) return { soon: true };
	if (minutes < 60) return { minutes: minutes };
	if (minutes < 1440) return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
	return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60) };
}

// B3: sum readable, limited balance accounts by currency in integer cents.
// CNY leads when present, otherwise the first currency seen leads.
function balanceTotals(active) {
	const cents = {};
	const seen = [];
	let balanceCount = 0;
	let staleCount = 0;
	let unreadCount = 0;
	(Array.isArray(active) ? active : []).forEach(function(account) {
		if (!isRecord(account) || account.mode !== "balance") return;
		balanceCount++;
		if (account.stale === true) staleCount++;
		const balance = account.balance;
		if (!isRecord(balance)) { unreadCount++; return; }
		if (balance.unlimited === true) return;
		if (!isFiniteNumber(balance.remaining) || !isNonEmptyString(balance.currency)) return;
		if (!Object.prototype.hasOwnProperty.call(cents, balance.currency)) {
			cents[balance.currency] = 0;
			seen.push(balance.currency);
		}
		cents[balance.currency] += Math.round(balance.remaining * 100);
	});
	const ordered = seen.map(function(currency, index) {
		return { currency: currency, index: index };
	}).sort(function(a, b) {
		return ((a.currency === "CNY" ? 0 : 1) - (b.currency === "CNY" ? 0 : 1)) || (a.index - b.index);
	}).map(function(entry) {
		return entry.currency;
	});
	if (!ordered.length) {
		return { lead: null, others: [], balanceCount: balanceCount, staleCount: staleCount, unreadCount: unreadCount };
	}
	return {
		lead: { currency: ordered[0], amount: cents[ordered[0]] / 100 },
		others: ordered.slice(1).map(function(currency) {
			return { currency: currency, amount: cents[currency] / 100 };
		}),
		balanceCount: balanceCount,
		staleCount: staleCount,
		unreadCount: unreadCount
	};
}

// B3: the smallest remaining percentage across every subscription window,
// first encountered wins a tie.
function tightestWindow(active) {
	let best = null;
	(Array.isArray(active) ? active : []).forEach(function(account) {
		if (!isRecord(account) || account.mode !== "subscription" || !Array.isArray(account.windows)) return;
		account.windows.forEach(function(window) {
			if (!isRecord(window) || !isFiniteNumber(window.remainingPercent)) return;
			if (!best || window.remainingPercent < best.window.remainingPercent) {
				best = { account: account, window: window };
			}
		});
	});
	return best;
}

// B3: accounts that need attention, in B2 order, plus the worst tone.
function attentionList(active, alerts) {
	const accounts = [];
	let tone = "ok";
	sortAccounts(active, alerts).forEach(function(account) {
		const current = accountTone(account, alerts);
		if (current === "ok") return;
		accounts.push(account);
		if (TONE_RANK[current] > TONE_RANK[tone]) tone = current;
	});
	return { tone: tone, accounts: accounts };
}

// B10: page-level status only reflects the whole account query. A single failed
// account keeps its own row and never changes this state.
function balanceHeaderState(state, data, hasRemote) {
	const current = isRecord(state) ? state : {};
	const error = current.error == null ? null : current.error;
	if (!hasRemote) return { kind: "unavailable", at: null, error: null };
	const at = isRecord(data) && isFiniteNumber(data.generatedAt) ? data.generatedAt : null;
	if (!isRecord(data)) {
		if (current.kind === "error") return { kind: "error", at: null, error: error };
		return { kind: "loading", at: null, error: null };
	}
	if (current.kind === "refreshing") return { kind: "refreshing", at: null, error: null };
	if (current.kind === "stale" || current.kind === "error") {
		return { kind: "stale", at: at, error: error };
	}
	return { kind: "exact", at: at, error: null };
}

// B12: only the code matters; the host's English message never reaches the body.
function legacyNotice(data) {
	const warnings = isRecord(data) && Array.isArray(data.warnings) ? data.warnings : [];
	return warnings.some(function(warning) {
		return isRecord(warning) && warning.code === "LEGACY_ACCOUNT_API";
	});
}

// B11: first-load skeleton. Without providers we still reserve three unnamed
// rows; with providers the idle group mirrors B9.
function skeletonModel(providers) {
	const list = Array.isArray(providers) ? providers.filter(isRecord) : [];
	if (!list.length) {
		return { rows: [{ id: null }, { id: null }, { id: null }], idle: [], named: false };
	}
	const rows = [];
	const idle = [];
	list.forEach(function(provider) {
		const id = provider.id == null ? null : provider.id;
		const name = provider.displayName || provider.id || "";
		if (provider.status === "unsupported" || provider.configured === false) {
			idle.push({
				id: id,
				name: name,
				reason: provider.status === "unsupported" ? "idle.unsupported" : "notConfigured"
			});
			return;
		}
		rows.push({
			id: id,
			name: name,
			type: provider.accountMode === "subscription" ? "subscription" : "balance"
		});
	});
	return { rows: rows, idle: idle, named: true };
}

// B4: only provider-owned HTTPS links may be rendered.
function safeActionUrl(url) {
	if (typeof url !== "string" || !url) return null;
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:" ? url : null;
	} catch (error) {
		return null;
	}
}

module.exports = {
	ALERT_MAX,
	QUOTA_DANGER,
	QUOTA_WARN,
	accountChip,
	accountMeta,
	accountReason,
	accountTone,
	alertFor,
	attentionList,
	balanceHeaderState,
	balanceParts,
	balanceTotals,
	fmtQuotaPercent,
	legacyNotice,
	normalizeBalanceAlerts,
	quotaLevel,
	resetParts,
	safeActionUrl,
	skeletonModel,
	sortAccounts,
	splitAccounts,
	tightestWindow,
	validateAlertAmount
};
