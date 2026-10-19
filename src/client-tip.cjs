// Body-level tooltip used by the timeline, trends and model views.
const { esc } = require("./client-format.cjs");

// Structured tooltip: title + key/value rows (all content escaped).
function tipRows(title, rows) {
	var html = "<div class='dss-tip-title'>" + esc(title) + "</div>";
	for (var i = 0; i < rows.length; i++) {
		html += "<div class='dss-tip-row'><span>" + esc(String(rows[i][0])) + "</span><b>" + esc(String(rows[i][1])) + "</b></div>";
	}
	return html;
}

function showTipRaw(html, ev) {
	var el = document.getElementById("dss-tooltip");
	if (!el) { el = document.createElement("div"); el.id = "dss-tooltip"; el.className = "dss-tt"; document.body.appendChild(el); }
	el.innerHTML = html.replace(/\n/g, "<br>");
	el.classList.add("show");
	var pad = 14, x = ev.clientX + pad, y = ev.clientY + pad;
	var rect = el.getBoundingClientRect();
	if (x + rect.width > window.innerWidth) x = ev.clientX - rect.width - pad;
	if (y + rect.height > window.innerHeight) y = ev.clientY - rect.height - pad;
	el.style.left = x + "px"; el.style.top = y + "px";
}

function hideTip() {
	var el = document.getElementById("dss-tooltip");
	if (el) el.classList.remove("show");
}

// Hover and focus both show the same structured tooltip. Focus anchors to the
// element bottom so keyboard users see it next to the trigger.
function tipProps(getHtml) {
	const show = function(ev) {
		if (!ev) return;
		let x = ev.clientX;
		let y = ev.clientY;
		if ((ev.type === "focus" || ev.type === "focusin") && ev.currentTarget && typeof ev.currentTarget.getBoundingClientRect === "function") {
			const rect = ev.currentTarget.getBoundingClientRect();
			x = rect.left + rect.width / 2;
			y = rect.bottom;
		}
		showTipRaw(getHtml(), { clientX: x, clientY: y });
	};
	return {
		onMouseEnter: show,
		onMouseMove: show,
		onMouseLeave: hideTip,
		onFocus: show,
		onBlur: hideTip
	};
}

module.exports = { tipRows, showTipRaw, hideTip, tipProps };
