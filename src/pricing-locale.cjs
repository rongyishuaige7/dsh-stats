const pairs = {
  edit: ['编辑', 'Edit'], replace: ['更新草稿', 'Update draft'], conflict: ['价格设置已在其他页面更新，请重新打开后再保存', 'Prices changed in another window. Reopen settings before saving.'],
  standard: ['标准上下文', 'Standard context'], legacy: ['历史费率', 'Historical rates'], peak: ['高峰', 'Peak'], offPeak: ['非高峰', 'Off-peak'], observed: ['核验时间（此前为估算）', 'Observed at (earlier usage is estimated)'],
  title: ['价格设置', 'Price settings'], failed: ['操作失败，请重试', 'Operation failed. Please retry.'],
  unavailable: ['价格设置暂不可用，请确认插件版本', 'Price settings unavailable. Check the plugin version.'], loading: ['加载中…', 'Loading…'],
  auto: ['自动更新价格', 'Update prices automatically'], refresh: ['立即更新', 'Update now'], updated: ['上次同步', 'Last synced'], builtin: ['内置价格', 'Bundled prices'],
  refreshFailed: ['价格更新失败，继续使用上次有效版本', 'Price update failed. Previous valid prices are retained.'],
  missing: ['待计价模型', 'Models awaiting prices'], configure: ['设置价格', 'Set price'], custom: ['自定义价格', 'Custom prices'],
  units: ['单价单位：每百万 token。留空表示未知，0 表示免费。未填生效时间时，历史用量按此价格估算。', 'Prices per million tokens. Empty means unknown; 0 means free. Without a start date, historical usage is estimated at this price.'],
  invalid: ['请检查单价、模型、供应商及生效时间，规则时间不能重叠', 'Check rates, model, provider and dates. Rule periods must not overlap.'],
  provider: ['供应商 ID', 'Provider ID'], model: ['模型 ID', 'Model ID'], currency: ['币种', 'Currency'], uncached: ['非缓存输入', 'Uncached input'], cacheRead: ['缓存读取', 'Cache read'], cacheWrite: ['缓存写入', 'Cache write'], output: ['输出', 'Output'],
  conditions: ['更多条件', 'More conditions'], from: ['生效时间（本地时区）', 'Effective from (local time)'], to: ['结束时间（不含）', 'Effective until (exclusive)'],
  threshold: ['长上下文阈值（输入 token）', 'Long context threshold (input tokens)'], long: ['长上下文', 'Long context'], multiplier: ['倍率', 'multiplier'], accountType: ['账户类型', 'Account type'],
  add: ['加入草稿', 'Add to draft'], remove: ['移除', 'Remove'], preview: ['预览变化', 'Preview changes'], save: ['保存', 'Save'], cancel: ['撤销草稿', 'Discard draft'], affected: ['影响会话', 'Affected sessions'],
  catalog: ['查看价格与来源', 'Prices and sources'], search: ['搜索模型或供应商', 'Search models or providers'], usedFirst: ['默认只显示用过的模型，搜索可查看全部', 'Shows used models by default. Search to see all.'],
  source: ['价格来源', 'Pricing source'], history: ['历史版本', 'History'], rollbackHint: ['恢复旧版本会暂停自动更新，重新勾选自动更新后保存即可恢复', 'Restoring a version pauses updates. Enable automatic updates and save to resume.'], rollback: ['恢复此版本', 'Restore version']
};
module.exports = { zh: Object.fromEntries(Object.entries(pairs).map(([k, v]) => ['price.' + k, v[0]])), en: Object.fromEntries(Object.entries(pairs).map(([k, v]) => ['price.' + k, v[1]])) };
