// Immutable radix index: updates copy eight bounded branches, never the
// complete history. Collision buckets retain the original keys.
function hashKey(key) {
	let hash = 2166136261;
	for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
	return (hash >>> 0).toString(16).padStart(8, "0");
}

function updateRoute(tree, key, update) {
	const hash = hashKey(key);
	function visit(node, depth) {
		const next = { ...node };
		if (depth === hash.length) {
			const value = update(node?.[key]);
			if (value === null) delete next[key];
			else next[key] = value;
		} else {
			const child = visit(node?.[hash[depth]], depth + 1);
			if (Object.keys(child).length) next[hash[depth]] = child;
			else delete next[hash[depth]];
		}
		return next;
	}
	return visit(tree, 0);
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
	if (route.routeTree !== undefined) return treeRows(route.routeTree);
	if (Array.isArray(route.routes)) return route.routes.slice();
	return route.routes && typeof route.routes === "object" ? Object.values(route.routes) : [];
}

function primaryRoute(rows, fallback = {}) {
	const totals = new Map();
	let primary = fallback, weight = -1;
	for (const row of rows) {
		const key = JSON.stringify([row.providerId, row.model, row.accountType]);
		const total = (totals.get(key) || 0) + (row.uncached || 0) + (row.output || 0) + (row.cacheRead || 0) + (row.cacheWrite || 0);
		totals.set(key, total);
		if (total > weight) { primary = row; weight = total; }
	}
	return primary;
}

module.exports = { updateRoute, routeRows, primaryRoute };
