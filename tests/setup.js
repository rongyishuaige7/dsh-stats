// 测试环境模块拦截：stub 掉 UI primitives（其 ESM 依赖链含 katex CSS，node 无法加载）
const Module = require('module');
const path = require('path');
const origLoad = Module._load;

Module._load = function (request, parent, isMain) {
	if (request === '@deepseek-ai/dsh-client-ui-primitives') {
		return require(path.join(__dirname, 'primitives-stub.cjs'));
	}
	return origLoad.apply(this, arguments);
};
