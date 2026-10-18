// Dialog behaviour shared by the statistics panel and the layers it opens.
//
// The panel keeps a LIFO stack of layer close functions. Escape pops the top
// layer first and only closes the panel when the stack is empty. Focus is
// restored only for user-initiated dismissals (Escape, close button, scrim),
// never when a session opens and the host takes over.
const react = require("react");

const FOCUSABLE = "button, [href], input, select, textarea, summary, [tabindex]:not([tabindex='-1'])";

function focusableElements(root) {
	if (!root || typeof root.querySelectorAll !== "function") return [];
	return Array.from(root.querySelectorAll(FOCUSABLE)).filter(function(node) {
		return !node.disabled &&
			!node.hidden &&
			node.tabIndex >= 0 &&
			typeof node.getClientRects === "function" &&
			node.getClientRects().length > 0;
	});
}

function trapTab(ev, root) {
	if (!ev || ev.key !== "Tab" || !root) return;
	var nodes = focusableElements(root);
	if (nodes.length === 0) {
		ev.preventDefault();
		ev.stopPropagation();
		root.focus();
		return;
	}
	var first = nodes[0], last = nodes[nodes.length - 1];
	var active = typeof document !== "undefined" ? document.activeElement : null;
	if (ev.shiftKey) {
		if (active === first || active === root || !root.contains(active)) {
			ev.preventDefault();
			ev.stopPropagation();
			last.focus();
		}
		return;
	}
	if (active === last || active === root || !root.contains(active)) {
		ev.preventDefault();
		ev.stopPropagation();
		first.focus();
	}
}

// Pure so the IME cases can be unit-tested: CDP cannot reliably synthesise
// composition events.
function escapeAction(ev, stackSize) {
	if (!ev || (ev.key !== "Escape" && ev.key !== "Esc")) return "ignore";
	var native = ev.nativeEvent || ev;
	if (native.isComposing === true || ev.isComposing === true || ev.keyCode === 229 || native.keyCode === 229) return "ignore";
	return stackSize > 0 ? "pop" : "close";
}

function createLayerStack() {
	var items = [];
	return {
		get size() { return items.length; },
		push: function(close) { items.push(close); },
		remove: function(close) {
			var index = items.lastIndexOf(close);
			if (index >= 0) items.splice(index, 1);
		},
		pop: function() {
			var close = items.pop();
			if (close) close();
		},
		clear: function() { items.length = 0; }
	};
}

const LayerContext = react.createContext(null);

function useLayer(open, close) {
	var layers = react.useContext(LayerContext);
	var closeRef = react.useRef(close);
	react.useEffect(function() { closeRef.current = close; }, [close]);
	react.useEffect(function() {
		if (!open || !layers) return undefined;
		var entry = function() { closeRef.current(); };
		layers.push(entry);
		return function() { layers.remove(entry); };
	}, [open, layers]);
}

function useDialogFocus(panelRef, open) {
	var openerRef = react.useRef(null);
	var restoreRef = react.useRef(false);
	react.useEffect(function() {
		if (!open || typeof document === "undefined") {
			restoreRef.current = false;
			return undefined;
		}
		var panel = panelRef.current;
		openerRef.current = document.activeElement;
		if (panel) {
			var selected = panel.querySelector('[role="tab"][aria-selected="true"]');
			var target = selected || focusableElements(panel)[0];
			if (target) target.focus();
			else panel.focus();
		}
		// A button that becomes disabled drops focus to body. Chrome does not
		// always fire focusout for this, so observe disabled changes as well.
		var checkFocus = function() {
			var current = panelRef.current;
			if (!current || !current.isConnected) return;
			var active = document.activeElement;
			if (active === document.body || active === document.documentElement || active == null) current.focus();
		};
		// Chrome's focus fixup for a newly disabled button can run after the
		// event, so poll for 300ms after focusout/disabled changes. A new
		// trigger restarts the window instead of leaving a permanent interval.
		var burstUntil = 0;
		var burstTimer = null;
		var startFocusBurst = function() {
			burstUntil = Date.now() + 300;
			if (burstTimer !== null) return;
			burstTimer = setInterval(function() {
				checkFocus();
				if (Date.now() >= burstUntil) {
					clearInterval(burstTimer);
					burstTimer = null;
				}
			}, 50);
		};
		var onFocusOut = function() { startFocusBurst(); };
		if (panel) panel.addEventListener("focusout", onFocusOut);
		var observer = typeof MutationObserver !== "undefined" ? new MutationObserver(function() { startFocusBurst(); }) : null;
		if (observer && panel) observer.observe(panel, { attributes: true, attributeFilter: ["disabled"], subtree: true });
		return function() {
			if (panel) panel.removeEventListener("focusout", onFocusOut);
			if (observer) observer.disconnect();
			if (burstTimer !== null) {
				clearInterval(burstTimer);
				burstTimer = null;
			}
			if (!restoreRef.current) return;
			restoreRef.current = false;
			var opener = openerRef.current;
			if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === "function") {
				opener.focus();
				return;
			}
			var trigger = document.querySelector(".dss-trigger");
			if (trigger) trigger.focus();
		};
	}, [open, panelRef]);
	return react.useCallback(function() { restoreRef.current = true; }, []);
}

module.exports = { FOCUSABLE, focusableElements, trapTab, escapeAction, createLayerStack, LayerContext, useLayer, useDialogFocus };
