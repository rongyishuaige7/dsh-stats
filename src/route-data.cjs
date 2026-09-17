// Immutable radix index: updates copy eight bounded branches, never the
// complete history. Collision buckets retain the original keys.
function hashKey(key) {
	let hash = 2166136261;
	for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
	return (hash >>> 0).toString(16).padStart(8, "0");
}

const rowCache = new WeakMap();
const identityCache = new WeakMap();

function compareRoutes(a, b) {
	if (a.slot !== b.slot) return a.slot - b.slot;
	for (const field of ["providerId", "model", "accountType", "serviceTier"]) {
		const left = String(a[field] ?? ""), right = String(b[field] ?? "");
		if (left !== right) return left < right ? -1 : 1;
	}
	return a.contextTokens - b.contextTokens;
}

function updateRoute(tree, key, update) {
	const hash = hashKey(key);
	let previous, replacement;
	function visit(node, depth) {
		const next = { ...node };
		if (depth === hash.length) {
			previous = node?.[key];
			const value = update(previous);
			replacement = value === null ? null : Object.freeze(value);
			if (value === null) delete next[key];
			else next[key] = value;
		} else {
			const child = visit(node?.[hash[depth]], depth + 1);
			if (Object.keys(child).length) next[hash[depth]] = child;
			else delete next[hash[depth]];
		}
		return Object.freeze(next);
	}
	const next = visit(tree, 0);
	// Only materialize arrays when a reader already requested this tree. With
	// active wire subscribers, carry its immutable rows forward without walking
	// all eight radix levels again. Unsubscribed folds keep their bounded cost.
	const cached = rowCache.get(tree);
	if (cached) {
		const rows = cached.slice();
		const index = previous === undefined ? -1 : rows.indexOf(previous);
		if (index >= 0) {
			if (replacement === null) rows.splice(index, 1);
			else rows[index] = replacement;
		} else if (replacement !== null) {
			let low = 0, high = rows.length;
			while (low < high) {
				const mid = (low + high) >>> 1;
				if (compareRoutes(rows[mid], replacement) <= 0) low = mid + 1;
				else high = mid;
			}
			rows.splice(low, 0, replacement);
		}
		rowCache.set(next, rows);
	}
	return next;
}

function treeRows(tree, depth = 0) {
	if (!tree || typeof tree !== "object" || Array.isArray(tree)) throw new TypeError("invalid statsRoute index");
	if (depth === 8) return Object.values(tree);
	return Object.entries(tree).flatMap(([key, value]) => {
		if (!/^[0-9a-f]$/.test(key)) throw new TypeError("invalid statsRoute index key");
		return treeRows(value, depth + 1);
	});
}

function routeRows(route) {
	if (!route || typeof route !== "object") return [];
	if (route.routeTree !== undefined) {
		const tree = route.routeTree;
		if (!Object.isFrozen(tree)) return treeRows(tree).sort(compareRoutes);
		let rows = rowCache.get(tree);
		if (!rows) { rows = treeRows(tree).sort(compareRoutes); rowCache.set(tree, rows); }
		return rows.slice();
	}
	if (Array.isArray(route.routes)) return route.routes.slice();
	return route.routes && typeof route.routes === "object" ? Object.values(route.routes) : [];
}

function primaryRoute(rows, fallback = {}) {
	const totals = new Map();
	let primary = fallback, weight = -1;
	for (const row of rows) {
		let key = identityCache.get(row);
		if (key === undefined) {
			key = JSON.stringify([row.providerId, row.model, row.accountType]);
			if (Object.isFrozen(row)) identityCache.set(row, key);
		}
		const total = (totals.get(key) || 0) + (row.uncached || 0) + (row.output || 0) + (row.cacheRead || 0) + (row.cacheWrite || 0);
		totals.set(key, total);
		if (total > weight) { primary = row; weight = total; }
	}
	return primary;
}

module.exports = { updateRoute, routeRows, primaryRoute };
