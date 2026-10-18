// Inline SVG icons for the header and pricing drawer. The trigger and close
// button keep using the host primitives so older Harness versions still work.
const react = require("react");
const e = react.createElement;

function icon(children, props) {
	var size = props && props.size != null ? props.size : 16;
	return e("svg", {
		width: size,
		height: size,
		viewBox: "0 0 16 16",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.6",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true",
		focusable: "false",
		className: props && props.className
	}, children);
}

function IconRefresh(props) {
	return icon([
		e("path", { key: "arc", d: "M13.2 7.2a5.2 5.2 0 1 1-1.6-3.4" }),
		e("path", { key: "head", d: "M13.2 2.6v3.4h-3.4" })
	], props);
}

function IconDownload(props) {
	return icon([
		e("path", { key: "stem", d: "M8 2.6v6.8" }),
		e("path", { key: "head", d: "M5.2 6.8 8 9.6l2.8-2.8" }),
		e("path", { key: "tray", d: "M3 11.6v1.2h10v-1.2" })
	], props);
}

function IconChevronDown(props) {
	return icon(e("path", { d: "m4.6 6 3.4 3.4L11.4 6" }), props);
}

function IconGear(props) {
	return icon([
		e("circle", { key: "ring", cx: 8, cy: 8, r: 2.2 }),
		e("path", {
			key: "spokes",
			d: "M8 1.9v1.5M8 12.6v1.5M1.9 8h1.5M12.6 8h1.5M3.7 3.7l1.1 1.1M11.2 11.2l1.1 1.1M12.3 3.7l-1.1 1.1M4.8 11.2l-1.1 1.1"
		})
	], props);
}

function IconFilter(props) {
	return icon(e("path", { d: "M2.5 3.2h11L9.4 7.7v5.1L6.6 11.6V7.7z" }), props);
}

function IconArrow(props) {
	return icon([
		e("path", { key: "line", d: "M3 8h10" }),
		e("path", { key: "head", d: "m9 4 4 4-4 4" })
	], props);
}

function IconInfo(props) {
	return icon([
		e("circle", { key: "ring", cx: 8, cy: 8, r: 5.7 }),
		e("path", { key: "stem", d: "M8 7.2v3.3" }),
		e("path", { key: "dot", d: "M8 4.9h.01" })
	], props);
}

function IconWarning(props) {
	return icon([
		e("path", { key: "triangle", d: "M8 2.2 14 13H2z" }),
		e("path", { key: "stem", d: "M8 6.2v3.2" }),
		e("path", { key: "dot", d: "M8 11.5h.01" })
	], props);
}

module.exports = { IconRefresh, IconDownload, IconChevronDown, IconGear, IconFilter, IconArrow, IconInfo, IconWarning };
