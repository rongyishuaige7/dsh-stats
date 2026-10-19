// Inline SVG icons for the header and pricing drawer. The trigger and close
// button keep using the host primitives so older Harness versions still work.
const react = require("react");
const e = react.createElement;

function icon(children, props) {
	var size = props && props.size != null ? props.size : 16;
	return e("svg", {
		width: size,
		height: size,
		viewBox: props && props.viewBox ? props.viewBox : "0 0 16 16",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: props && props.strokeWidth != null ? props.strokeWidth : "1.6",
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
		e("circle", { key: "ring", cx: 12, cy: 12, r: 3 }),
		e("path", {
			key: "teeth",
			d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
		})
	], Object.assign({}, props, { viewBox: "0 0 24 24", strokeWidth: 2 }));
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

function IconBell(props) {
	return icon([
		e("path", { key: "body", d: "M8 2.2a4 4 0 0 0-4 4v2.3L2.8 10.6h10.4L12 8.5V6.2a4 4 0 0 0-4-4z" }),
		e("path", { key: "clapper", d: "M6.4 12.2a1.7 1.7 0 0 0 3.2 0" })
	], props);
}

function IconWarning(props) {
	return icon([
		e("path", { key: "triangle", d: "M8 2.2 14 13H2z" }),
		e("path", { key: "stem", d: "M8 6.2v3.2" }),
		e("path", { key: "dot", d: "M8 11.5h.01" })
	], props);
}

module.exports = { IconRefresh, IconDownload, IconChevronDown, IconGear, IconFilter, IconArrow, IconInfo, IconWarning, IconBell };
