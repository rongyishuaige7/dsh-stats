// Header status, export menu and the pricing drawer.
const react = require("react");
const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
const { fmtClock } = require("./client-format.cjs");
const { MenuButton, MenuItem, useLayer } = require("./client-dialog.cjs");
const { PricingPanel, PricingErrorBoundary } = require("./pricing-panel.cjs");
const { IconDownload, IconChevronDown, IconInfo, IconWarning } = require("./client-icons.cjs");

const e = react.createElement;
const IconCloseOutline16 = primitives.IconCloseOutline16 || primitives.IconCloseOutlineRegular;

function statusText(state, remote, t) {
	var at = state.at != null ? " · " + fmtClock(state.at) : "";
	if (state.kind === "exact") return t("source.exact") + at;
	if (state.kind === "loading") return t("source.loading");
	if (state.kind === "refreshing") return t("source.refreshing");
	if (state.kind === "partial") return t("source.partial") + at;
	if (state.kind === "stale") return t("status.stale") + at;
	if (state.kind === "fallback") return t("source.local");
	return t("source." + state.kind);
}

function StatusIndicator({ state, remote, t }) {
	var text = statusText(state, remote, t);
	return e("span", {
		className: "dss-data-status " + state.kind,
		"aria-live": "polite",
		title: t(remote ? "source.host" : "source.local") + " · " + text
	},
		e("i", { className: "dss-status-dot", "aria-hidden": "true" }),
		e("span", { className: "dss-status-text" }, text)
	);
}

function bannerKind(state) {
	if (state.kind === "partial" || state.kind === "stale" || state.kind === "fallback") return state.kind;
	if (state.kind === "exact" && state.error) return "exact";
	return null;
}

function StatusBanner({ state, remote, t, onRetry }) {
	var kind = bannerKind(state);
	if (!kind) return null;
	var info = kind === "fallback" || kind === "exact";
	var Glyph = info ? IconInfo : IconWarning;
	return e("section", { className: "dss-status-banner " + kind + (info ? " info" : ""), role: "status" },
		e(Glyph, { size: 16, className: "dss-status-banner-icon" }),
		e("div", { className: "dss-status-banner-txt" },
			e("strong", null, t("source." + kind)),
			state.error ? e("details", { className: "dss-data-diagnostics" },
				e("summary", null, t("source.details")),
				e("div", null, state.error)
			) : null
		),
		onRetry && remote && (kind === "stale" || kind === "fallback") ? e("button", {
			type: "button",
			className: "dss-banner-retry",
			"data-action": "retry",
			onClick: onRetry
		}, t("price.retry")) : null
	);
}

function ExportMenu({ projects, t, onExportCSV, onExportJSON }) {
	var count = Array.isArray(projects) ? projects.length : 0;
	var csvHint = String(t("export.csvHint")).replace("%d", String(count));
	return e(MenuButton, {
		label: t("action.export"),
		action: "export",
		buttonClassName: "dss-export-btn",
		trigger: e(react.Fragment, null,
			e(IconDownload, { size: 16 }),
			e("span", { className: "dss-export-label" }, t("action.export")),
			e(IconChevronDown, { size: 12, className: "dss-export-caret" })
		)
	},
		e(MenuItem, { action: "export-csv", onSelect: onExportCSV },
			e("span", { className: "dss-menu-item-title" }, t("export.csv")),
			e("span", { className: "dss-menu-item-hint" }, csvHint)
		),
		e(MenuItem, { action: "export-json", onSelect: onExportJSON },
			e("span", { className: "dss-menu-item-title" }, t("export.json")),
			e("span", { className: "dss-menu-item-hint" }, t("export.jsonHint"))
		)
	);
}

function PricingDrawer({ open, focusModel, opener, gear, rootRef, onClose, remote, projects, t, onChanged }) {
	var localRef = react.useRef(null);
	var asideRef = rootRef || localRef;
	var closeRef = react.useRef(null);
	var restoreRef = react.useRef(false);
	var dismiss = react.useCallback(function() {
		restoreRef.current = true;
		onClose();
	}, [onClose]);
	useLayer(open, dismiss);
	react.useEffect(function() {
		if (!open) return undefined;
		if (closeRef.current) closeRef.current.focus();
		return function() {
			if (!restoreRef.current) return;
			restoreRef.current = false;
			var next = opener && opener.isConnected ? opener : gear;
			if (next && next.isConnected && typeof next.focus === "function") next.focus();
		};
	}, [open, opener, gear]);
	if (!open) return null;
	return e(react.Fragment, null,
		e("div", { className: "dss-drawer-scrim", onClick: dismiss, "aria-hidden": "true" }),
		e("aside", {
			className: "dss-drawer",
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "dss-drawer-title",
			ref: asideRef
		},
			e("div", { className: "dss-drawer-head" },
				e("h3", { id: "dss-drawer-title" }, t("price.title")),
				e("button", {
					type: "button",
					className: "dss-close",
					ref: closeRef,
					"data-action": "drawer-close",
					"aria-label": t("close"),
					title: t("close"),
					onClick: dismiss
				}, e(IconCloseOutline16, { size: 16 }))
			),
			e("div", { className: "dss-drawer-body" },
				e(PricingErrorBoundary, { t },
					e(PricingPanel, { remote, projects, focusModel, t, onChanged })
				)
			)
		)
	);
}

module.exports = { StatusIndicator, StatusBanner, ExportMenu, PricingDrawer };
