// Account balance view: one row per connected provider, ordered by urgency.
// All calculations live in client-balance-model.cjs; this file only renders.
const react = require("react");
const { fmtBalanceAmount, fmtClock } = require("./client-format.cjs");
const {
	accountChip, accountMeta, accountReason, alertFor, attentionList, balanceParts, balanceTotals,
	fmtQuotaPercent, legacyNotice, quotaLevel, resetParts, safeActionUrl,
	skeletonModel, sortAccounts, splitAccounts, tightestWindow, validateAlertAmount
} = require("./client-balance-model.cjs");
const { tipProps, tipRows } = require("./client-tip.cjs");
const { Popover } = require("./client-dialog.cjs");
const { IconBell } = require("./client-icons.cjs");

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
	const now = Number.isFinite(props.now) ? props.now : Date.now();
	const hasReset = window.resetsAt != null && Number.isFinite(window.resetsAt) && window.resetsAt >= now;
	const reset = resetText(resetParts(window.resetsAt, now), t);
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
		const windows = (Array.isArray(account.windows) ? account.windows : []).filter(function(window) {
			return window && typeof window === "object";
		});
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
		const text = unlimited ? t("balance.unlimited") : amount != null ? fmtBalanceAmount(amount, parts.currency || "") : "—";
		const sub = amountSubNodes(parts.parts, parts.alertLine, parts.currency || "", t);
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

function currencySymbol(currency) {
	if (currency === "CNY") return "¥";
	if (currency === "USD") return "$";
	return currency || "";
}

function BalanceAlert(props) {
	const account = props.account;
	const t = props.t;
	const currency = account.balance.currency;
	const alert = props.alert;
	const valueState = react.useState(alert ? String(alert.amount) : "");
	const value = valueState[0], setValue = valueState[1];
	const errorState = react.useState(null);
	const error = errorState[0], setError = errorState[1];
	const inputRef = react.useRef(null);

	// Keep the field in sync when the stored alert changes (for example after
	// an external refresh or a clear), instead of keeping the first value.
	react.useEffect(function() {
		setValue(alert ? String(alert.amount) : "");
		setError(null);
	}, [alert ? alert.amount : null, alert ? alert.currency : null]);

	// If the row disappears while focus is still inside the popover, hand focus
	// to the panel instead of letting it fall to the body.
	react.useEffect(function() {
		return function() {
			if (typeof document === "undefined") return;
			const active = document.activeElement;
			if (active === document.body || active === document.documentElement || active == null) {
				const panel = document.querySelector(".dss-panel");
				if (panel && typeof panel.focus === "function") panel.focus();
			}
		};
	}, []);

	const submit = function(event) {
		if (event) event.preventDefault();
		const result = validateAlertAmount(value);
		if (result.kind === "ok") {
			props.onChange(account.id, { amount: result.amount, currency: currency });
			props.close(true);
			return;
		}
		if (result.kind === "empty") {
			if (alert) {
				props.onChange(account.id, null);
				props.close(true);
				return;
			}
			setError(t("balance.alert.required"));
		} else {
			setError(t("balance.alert.invalid"));
		}
		if (inputRef.current) inputRef.current.focus();
	};

	return e("form", {
		className: "dss-bal-alert-form",
		noValidate: true,
		onSubmit: submit
	},
		e("h3", { className: "dss-bal-alert-title" }, fill(t("balance.alert.title"), [account.displayName || account.id])),
		e("label", { className: "dss-bal-alert-field" },
			e("span", { className: "dss-bal-alert-prefix" }, t("balance.alert.field")),
			e("span", { className: "dss-bal-alert-symbol", "aria-hidden": "true" }, currencySymbol(currency)),
			e("input", {
				ref: inputRef,
				type: "text",
				inputMode: "decimal",
				autoComplete: "off",
				placeholder: t("balance.alert.placeholder"),
				"aria-label": fill(t("balance.alert.inputLabel"), [currency]),
				"data-popover-autofocus": true,
				"aria-invalid": error ? "true" : undefined,
				"aria-describedby": error ? "dss-bal-alert-error" : undefined,
				value: value,
				onChange: function(event) {
					setValue(event.target.value);
					if (error) setError(null);
				}
			})
		),
		error ? e("div", { className: "dss-bal-alert-error", id: "dss-bal-alert-error" }, error) : null,
		e("p", { className: "dss-bal-alert-hint" }, fill(t("balance.alert.hint"), [currency])),
		e("div", { className: "dss-bal-alert-btns" },
			alert ? e("button", {
				type: "button",
				className: "dss-bal-alert-btn dss-bal-alert-clear",
				"data-action": "balance-alert-clear",
				onClick: function() {
					props.onChange(account.id, null);
					props.close(true);
				}
			}, t("balance.alert.clear")) : null,
			e("button", {
				type: "button",
				className: "dss-bal-alert-btn",
				"data-action": "balance-alert-cancel",
				onClick: function() { props.close(true); }
			}, t("balance.alert.cancel")),
			e("button", {
				type: "submit",
				className: "dss-bal-alert-btn dss-bal-alert-primary",
				"data-action": "balance-alert-save"
			}, t("balance.alert.save"))
		)
	);
}

function alertBell(account, props) {
	if (account.mode !== "balance" || !account.balance || account.balance.unlimited === true) return null;
	const alert = alertFor(account, props.alerts);
	const name = account.displayName || account.id;
	const label = alert
		? fill(props.t("balance.alert.aria"), [name, fill(props.t("balance.alert.below"), [fmtBalanceAmount(alert.amount, alert.currency)])])
		: fill(props.t("balance.alert.aria"), [name, props.t("balance.alert.unset")]);
	return e(Popover, {
		label: label,
		title: props.t("balance.alert.button"),
		panelLabel: fill(props.t("balance.alert.title"), [name]),
		action: "balance-alert",
		buttonClassName: "dss-bal-bell" + (alert ? " is-on" : ""),
		panelClassName: "dss-bal-alert",
		trigger: e(IconBell, { size: 15 }),
		flip: true,
		children: function(api) {
			return e(BalanceAlert, {
				account: account,
				alert: alert,
				t: props.t,
				onChange: props.onAlertChange,
				close: api.close
			});
		}
	});
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
			alertBell(account, props),
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

function balanceShell(children, t, busy) {
	return e("section", {
		className: "dss-bal",
		style: { "--dss-bal-mk": t("balance.meterKeyWidth") },
		"aria-busy": busy ? "true" : undefined
	}, children);
}

function SkeletonKpis(props) {
	const cells = props.cells === 2 ? 2 : 3;
	return e("section", {
		className: "dss-bal-kpis is-skeleton" + (cells === 2 ? " is-two" : ""),
		"aria-hidden": "true"
	},
		Array.from({ length: cells }, function(_, index) {
			return e("div", { className: "dss-bal-kpi" + (index ? "" : " is-lead"), key: index },
				e("div", { className: "dss-bal-kpi-k" },
					e("span", { className: "dss-bal-sk", "aria-hidden": "true", style: { width: "56px" } })),
				e("div", { className: "dss-bal-kpi-v" },
					e("span", {
						className: "dss-bal-sk" + (index ? " is-lg" : " is-xl"),
						"aria-hidden": "true",
						style: { width: (index ? 72 : 120) + "px" }
					})),
				e("div", { className: "dss-bal-kpi-s" },
					e("span", { className: "dss-bal-sk", "aria-hidden": "true", style: { width: "90px" } }))
			);
		})
	);
}

function SkeletonRow(props) {
	const row = props.row;
	const named = !!row.name;
	const type = row.type === "subscription" ? "subscription" : "balance";
	const firstWidth = named ? (type === "subscription" ? "60%" : "110px") : "60%";
	return e("li", { className: "dss-bal-row is-skeleton" },
		e("div", { className: "dss-bal-id" },
			e("i", { className: "dss-bal-dot is-idle", "aria-hidden": "true" }),
			e("div", { className: "dss-bal-nm" },
				named
					? e("b", { className: "dss-bal-name" }, row.name)
					: e("span", { className: "dss-bal-sk is-lg", "aria-hidden": "true", style: { width: "70px" } }),
				named
					? e("span", { className: "dss-bal-meta" },
						props.t("balance.type." + type) + " · " + (row.id || ""))
					: e("span", { className: "dss-bal-sk", "aria-hidden": "true", style: { width: "90px" } })
			)
		),
		e("div", { className: "dss-bal-main" },
			e("span", { className: "dss-bal-sk is-lg", "aria-hidden": "true", style: { width: firstWidth } }),
			e("span", { className: "dss-bal-sk", "aria-hidden": "true", style: { width: "36%" } })
		),
		e("div", { className: "dss-bal-act" })
	);
}

function SkeletonIdle(props) {
	const idle = props.idle;
	const t = props.t;
	if (!idle.length) return null;
	const names = idle.map(function(account) { return account.name || account.id; }).join(" · ");
	return e("details", { className: "dss-bal-idle", open: props.open },
		e("summary", { className: "dss-bal-idle-sum" }, fill(t("balance.idle.summary"), [idle.length, names])),
		idle.map(function(account) {
			return e("div", { className: "dss-bal-idle-row", "data-account-id": account.id, key: account.id },
				e("b", null, account.name || account.id),
				e("span", { className: "dss-bal-reason" }, t("balance." + account.reason))
			);
		})
	);
}

function BalanceSkeleton(props) {
	const t = props.t;
	const model = skeletonModel(props.providers);
	const rows = model.rows;
	const children = [];
	if (model.named && rows.length >= 2) {
		children.push(e(SkeletonKpis, {
			key: "kpis",
			cells: rows.some(function(row) { return row.type === "subscription"; }) ? 3 : 2
		}));
	}
	if (rows.length) {
		children.push(e("section", { className: "dss-bal-list", key: "list" },
			e("div", { className: "dss-bal-cols", "aria-hidden": "true" },
				e("span", null, t("balance.col.account")),
				e("span", null, t("balance.col.value")),
				e("span", null, "")),
			e("ul", { className: "dss-bal-rows" },
				rows.map(function(row, index) {
					return e(SkeletonRow, { key: row.id || "unnamed-" + index, row: row, t: t });
				})
			)
		));
	}
	if (model.idle.length) {
		children.push(e(SkeletonIdle, {
			key: "idle",
			idle: model.idle,
			open: rows.length === 0,
			t: t
		}));
	}
	children.push(e("p", { className: "dss-bal-foot", key: "foot" },
		model.named && rows.length ? fill(t("balance.loadingCount"), [rows.length]) : t("balance.loading")));
	return balanceShell(e(react.Fragment, null, children), t, true);
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
		return e(BalanceSkeleton, { providers: props.providers, t: t });
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
						return e(AccountRow, {
							key: account.id,
							account: account,
							alerts: alerts,
							onAlertChange: props.onAlertChange,
							now: now,
							t: t
						});
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

module.exports = { BalanceView, BalanceKpis, AccountRow, QuotaMeter, IdleAccounts, BalanceAlert, BalanceSkeleton };
