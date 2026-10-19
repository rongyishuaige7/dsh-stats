// Account balance view: one row per connected provider, ordered by urgency.
// All calculations live in client-balance-model.cjs; this file only renders.
const react = require("react");
const { fmtBalanceAmount, fmtClock } = require("./client-format.cjs");
const {
	accountChip, accountMeta, accountReason, alertFor, attentionList, balanceParts, balanceTotals,
	fmtQuotaPercent, legacyNotice, quotaLevel, resetParts, safeActionUrl,
	sortAccounts, splitAccounts, tightestWindow
} = require("./client-balance-model.cjs");
const { tipProps, tipRows } = require("./client-tip.cjs");

const e = react.createElement;

// Replace %s / %d in order, the same convention the rest of the panel uses.
function fill(template, values) {
	let index = 0;
	return String(template).replace(/%[sd]/g, function() {
		return String(values[index++]);
	});
}

function windowName(kind, t) {
	const key = "balance.window." + kind;
	const text = t(key);
	return !text || text === key ? kind : text;
}

function resetText(parts, t) {
	if (!parts) return "";
	if (parts.soon) return t("balance.resetSoon");
	if (parts.days == null && parts.hours == null) return fill(t("balance.resetMin"), [parts.minutes]);
	if (parts.days == null) {
		return parts.minutes
			? fill(t("balance.resetHourMin"), [parts.hours, parts.minutes])
			: fill(t("balance.resetHour"), [parts.hours]);
	}
	return parts.hours
		? fill(t("balance.resetDayHour"), [parts.days, parts.hours])
		: fill(t("balance.resetDay"), [parts.days]);
}

function reasonText(reason, t) {
	if (!reason) return null;
	if (reason.key === "reason.stale") return fill(t("balance.reason.stale"), [fmtClock(reason.at)]);
	return t("balance." + reason.key);
}

function metaText(meta, t) {
	const type = t("balance.type." + meta.type);
	if (meta.detail.kind === "plan") return type + " · " + meta.detail.value;
	if (meta.detail.kind === "route") return type + " · " + t("balance.route");
	return type + " · " + meta.detail.value;
}

function BalanceKpis(props) {
	const active = props.active;
	const alerts = props.alerts;
	const t = props.t;
	const now = props.now;
	if (active.length < 2) return null;
	const totals = balanceTotals(active);
	const tight = tightestWindow(active);
	const attention = attentionList(active, alerts);
	const leadSub = [];
	if (totals.others.length) {
		leadSub.push(totals.others.map(function(row) {
			return fmtBalanceAmount(row.amount, row.currency);
		}).join(" · "));
	}
	leadSub.push(fill(t("balance.kpi.accounts"), [totals.balanceCount]));
	if (totals.staleCount) leadSub.push(fill(t("balance.kpi.staleCount"), [totals.staleCount]));
	if (totals.unreadCount) leadSub.push(fill(t("balance.kpi.unreadCount"), [totals.unreadCount]));

	const cells = [
		e("div", { className: "dss-bal-kpi is-lead", key: "available" },
			e("div", { className: "dss-bal-kpi-k" }, t("balance.kpi.available")),
			e("div", { className: "dss-bal-kpi-v" }, totals.lead ? fmtBalanceAmount(totals.lead.amount, totals.lead.currency) : "—"),
			e("div", { className: "dss-bal-kpi-s" }, leadSub.join(" · "))
		)
	];

	if (tight) {
		const level = quotaLevel(tight.window.remainingPercent);
		const percent = fmtQuotaPercent(tight.window.remainingPercent);
		const reset = resetText(resetParts(tight.window.resetsAt, now), t);
		const accountName = tight.account.displayName || tight.account.id;
		const sub = accountName + " " + windowName(tight.window.kind, t) + (reset ? " · " + reset : "");
		cells.push(e("div", { className: "dss-bal-kpi", key: "tightest" },
			e("div", { className: "dss-bal-kpi-k" }, t("balance.kpi.tightest")),
			e("div", { className: "dss-bal-kpi-v" + (level === "ok" ? "" : " is-" + level) },
				fill(t("balance.kpi.tightestValue"), [percent.text])),
			e("div", { className: "dss-bal-kpi-s" }, sub)
		));
	}

	const names = [];
	attention.accounts.forEach(function(account, index) {
		if (index) names.push(t("balance.kpi.nameSep"));
		names.push(e("span", { className: "dss-bal-nw", key: account.id }, account.displayName || account.id));
	});
	cells.push(e("div", { className: "dss-bal-kpi", key: "attention" },
		e("div", { className: "dss-bal-kpi-k" }, t("balance.kpi.attention")),
		e("div", { className: "dss-bal-kpi-v" + (attention.tone === "ok" ? "" : " is-" + attention.tone) },
			String(attention.accounts.length)),
		e("div", { className: "dss-bal-kpi-s dss-bal-kpi-names" }, attention.accounts.length ? names : t("balance.kpi.allClear"))
	));

	return e("section", {
		className: "dss-bal-kpis" + (tight ? "" : " is-two"),
		"aria-label": t("balance.kpiLabel")
	}, cells);
}

function QuotaMeter(props) {
	const window = props.window;
	const t = props.t;
	const name = windowName(window.kind, t);
	const percent = fmtQuotaPercent(window.remainingPercent);
	const level = quotaLevel(window.remainingPercent);
	const hasReset = window.resetsAt != null && Number.isFinite(window.resetsAt);
	const reset = resetText(resetParts(window.resetsAt, props.now), t);
	const label = hasReset
		? fill(t("balance.meterLabelReset"), [name, percent.text, fmtClock(window.resetsAt)])
		: fill(t("balance.meterLabel"), [name, percent.text]);
	const barClass = "dss-bal-bar" + (level === "ok" ? "" : " is-" + level) + (window.remainingPercent <= 0 ? " is-empty" : "");
	const tip = hasReset ? tipProps(function() {
		return tipRows(fill(t("balance.resetAt"), [fmtClock(window.resetsAt)]), []);
	}) : null;
	return e("div", { className: "dss-bal-meter", "data-kind": window.kind },
		e("span", { className: "dss-bal-meter-k" }, name),
		e("span", {
			className: barClass,
			role: "meter",
			"aria-valuemin": "0",
			"aria-valuemax": "100",
			"aria-valuenow": String(percent.value),
			"aria-label": label
		}, e("i", { style: { width: percent.value + "%" } })),
		e("span", { className: "dss-bal-meter-v" + (level === "ok" ? "" : " is-" + level) }, percent.text + "%"),
		hasReset ? e("span", Object.assign({ className: "dss-bal-reset", tabIndex: 0 }, tip), reset) : null
	);
}

function amountSubNodes(list, alertLine, currency, t) {
	const nodes = [];
	list.forEach(function(part, index) {
		if (index) nodes.push(" · ");
		const text = part.key === "used"
			? fill(t("balance.part.used"), [fmtBalanceAmount(part.value[0], currency), fmtBalanceAmount(part.value[1], currency)])
			: fill(t("balance.part." + part.key), [fmtBalanceAmount(part.value, currency)]);
		nodes.push(e("span", { key: part.key }, text));
	});
	if (alertLine) {
		if (nodes.length) nodes.push(" · ");
		nodes.push(e("span", {
			key: "alert",
			className: "dss-bal-alert-line" + (alertLine.below ? " is-warn" : "")
		}, fill(t("balance.alert.line"), [fmtBalanceAmount(alertLine.amount, currency)])));
	}
	return nodes;
}

function AccountMain(props) {
	const account = props.account;
	const t = props.t;
	const now = props.now;
	const reason = accountReason(account);
	const nodes = [];

	if (account.mode === "subscription") {
		const windows = Array.isArray(account.windows) ? account.windows : [];
		if (!windows.length) {
			nodes.push(e("div", { className: "dss-bal-amt-line", key: "amt" },
				e("span", { className: "dss-bal-amt is-none" }, "—")));
		} else {
			windows.forEach(function(window, index) {
				nodes.push(e(QuotaMeter, { key: window.kind + "-" + index, window: window, now: now, t: t }));
			});
		}
	} else {
		const alert = alertFor(account, props.alerts);
		const parts = balanceParts(account, alert);
		const unlimited = parts.unlimited;
		const amount = parts.amount;
		const classes = ["dss-bal-amt"];
		if (unlimited) classes.push("is-unlimited");
		else if (amount == null) classes.push("is-none");
		if (account.stale) classes.push("is-stale");
		if (parts.zero) classes.push("is-zero");
		const text = unlimited ? t("balance.unlimited") : amount != null ? fmtBalanceAmount(amount, parts.currency) : "—";
		const sub = amountSubNodes(parts.parts, parts.alertLine, parts.currency, t);
		nodes.push(e("div", { className: "dss-bal-amt-line", key: "amt" },
			e("span", { className: classes.join(" ") }, text),
			sub.length ? e("span", { className: "dss-bal-amt-sub" }, sub) : null
		));
		if (parts.meter) {
			const percent = fmtQuotaPercent(parts.meter.remaining);
			const credit = t("balance.meter.credit");
			nodes.push(e("div", { className: "dss-bal-meter", "data-kind": "credit", key: "credit" },
				e("span", { className: "dss-bal-meter-k" }, credit),
				e("span", {
					className: "dss-bal-bar",
					role: "meter",
					"aria-valuemin": "0",
					"aria-valuemax": "100",
					"aria-valuenow": String(percent.value),
					"aria-label": fill(t("balance.meterLabel"), [credit, percent.text])
				}, e("i", { style: { width: percent.value + "%" } })),
				e("span", { className: "dss-bal-meter-v" }, percent.text + "%")
			));
		}
	}

	const reasonNode = reasonText(reason, t);
	if (reasonNode) nodes.push(e("div", { className: "dss-bal-reason", key: "reason" }, reasonNode));
	return e("div", { className: "dss-bal-main" }, nodes);
}

function AccountRow(props) {
	const account = props.account;
	const chip = accountChip(account, props.alerts);
	const tone = chip ? chip.tone : "ok";
	const link = safeActionUrl(account.actionUrl);
	return e("li", {
		className: "dss-bal-row" + (tone === "ok" ? "" : " is-" + tone),
		"data-account-id": account.id,
		"data-tone": tone
	},
		e("div", { className: "dss-bal-id" },
			e("i", { className: "dss-bal-dot" + (tone === "ok" ? "" : " is-" + tone), "aria-hidden": "true" }),
			e("div", { className: "dss-bal-nm" },
				e("b", { className: "dss-bal-name" }, account.displayName || account.id),
				e("span", { className: "dss-bal-meta" }, metaText(accountMeta(account), props.t)),
				chip
					? e("span", { className: "dss-bal-chip is-" + chip.tone }, props.t("balance." + chip.key))
					: e("span", { className: "dss-sr" }, props.t("balance.statusOk"))
			)
		),
		e(AccountMain, { account: account, alerts: props.alerts, now: props.now, t: props.t }),
		e("div", { className: "dss-bal-act" },
			link ? e("a", {
				className: "dss-bal-link",
				"data-action": "balance-link",
				href: link,
				target: "_blank",
				rel: "noreferrer"
			},
				account.mode === "balance" ? props.t("balance.topUp") : props.t("balance.manage"),
				e("span", { className: "dss-sr" }, props.t("balance.newTab"))
			) : null
		)
	);
}

function idleReason(account, t) {
	if (account.status === "not-configured") {
		const key = typeof account.missingCredential === "string" ? account.missingCredential.trim() : "";
		if (!key) return t("balance.notConfigured");
		const parts = String(t("balance.idle.missing")).split("%s");
		return [parts[0], e("code", { key: "credential" }, key), parts.slice(1).join("%s")];
	}
	if (account.status === "unsupported") return t("balance.idle.unsupported");
	return t("balance.notConfigured");
}

function IdleAccounts(props) {
	const idle = props.idle;
	const t = props.t;
	if (!idle.length) return null;
	const names = idle.map(function(account) { return account.displayName || account.id; }).join(" · ");
	return e("details", {
		className: "dss-bal-idle",
		open: props.open,
		onToggle: props.onToggle
	},
		e("summary", { className: "dss-bal-idle-sum" }, fill(t("balance.idle.summary"), [idle.length, names])),
		idle.map(function(account) {
			const link = safeActionUrl(account.actionUrl);
			return e("div", { className: "dss-bal-idle-row", "data-account-id": account.id, key: account.id },
				e("b", null, account.displayName || account.id),
				e("span", { className: "dss-bal-reason" }, idleReason(account, t)),
				link ? e("a", {
					className: "dss-bal-link",
					"data-action": "balance-link",
					href: link,
					target: "_blank",
					rel: "noreferrer"
				},
					t("balance.console"),
					e("span", { className: "dss-sr" }, t("balance.newTab"))
				) : null
			);
		})
	);
}

function balanceShell(children, t) {
	return e("section", {
		className: "dss-bal",
		style: { "--dss-bal-mk": t("balance.meterKeyWidth") }
	}, children);
}

function BalanceView(props) {
	const data = props.data;
	const state = props.state || { kind: "loading" };
	const t = props.t;
	const now = Date.now();
	const idleState = react.useState(false);
	const idleOpen = idleState[0], setIdleOpen = idleState[1];
	const alerts = props.alerts || {};

	if (!props.remote) {
		return balanceShell(
			e("div", { className: "dss-bal-failed" }, e("p", null, t("balance.unavailable"))),
			t
		);
	}
	if (!data && (state.kind === "loading" || state.kind === "refreshing")) {
		return balanceShell(e("p", { className: "dss-bal-loading" }, t("balance.loading")), t);
	}
	if (!data && state.kind === "error") {
		return balanceShell(
			e("div", { className: "dss-bal-failed", role: "status" },
				e("p", null, t("balance.failed")),
				state.error ? e("details", { className: "dss-data-diagnostics" },
					e("summary", null, t("source.details")),
					e("div", null, state.error)) : null,
				props.onRetry ? e("button", {
					type: "button",
					className: "dss-bal-retry",
					"data-action": "balance-retry",
					onClick: props.onRetry
				}, t("price.retry")) : null
			),
			t
		);
	}

	const accounts = data && Array.isArray(data.accounts) ? data.accounts : [];
	if (!accounts.length) {
		return balanceShell(e("p", { className: "dss-empty" }, t("balance.empty")), t);
	}
	const split = splitAccounts(accounts);
	const active = split.active;
	const idle = split.idle;
	const sorted = sortAccounts(active, alerts);

	return balanceShell(
		e(react.Fragment, null,
			legacyNotice(data) ? e("p", { className: "dss-bal-note", "data-code": "LEGACY_ACCOUNT_API" }, t("balance.legacy")) : null,
			active.length < 2 ? null : e(BalanceKpis, { active: active, alerts: alerts, now: now, t: t }),
			active.length ? e("section", { className: "dss-bal-list" },
				e("div", { className: "dss-bal-cols", "aria-hidden": "true" },
					e("span", null, t("balance.col.account")),
					e("span", null, t("balance.col.value")),
					e("span", null, "")),
				e("ul", { className: "dss-bal-rows", "aria-label": t("balance.listLabel") },
					sorted.map(function(account) {
						return e(AccountRow, { key: account.id, account: account, alerts: alerts, now: now, t: t });
					})
				)
			) : e("p", { className: "dss-empty" }, t("balance.noActive")),
			e(IdleAccounts, {
				idle: idle,
				open: idleOpen || active.length === 0,
				onToggle: function(event) { setIdleOpen(event.currentTarget.open); },
				t: t
			}),
			e("p", { className: "dss-bal-foot" }, t("balance.foot"))
		),
		t
	);
}

module.exports = { BalanceView, BalanceKpis, AccountRow, QuotaMeter, IdleAccounts };
