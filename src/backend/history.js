import {localGet, localSave} from "@/common/chrome";

/**
 * 任务历史记录管理
 * 记录登录检查、签到等的成功失败、日志、返回值等
 */

// 默认配置
const DEFAULT_CONFIG = {
	maxDays: 30, // 保留最近30天的记录
	maxRecords: 1000, // 每个任务最多保留1000条记录
	enableLogging: true, // 是否启用日志记录
};

/**
 * 历史记录数据结构
 * @typedef {Object} TaskHistory
 * @property {string} id - 唯一ID
 * @property {string} taskName - 任务名称 (author/name)
 * @property {'check'|'run'} type - 操作类型：登录检查或签到执行
 * @property {number} timestamp - 执行时间戳
 * @property {boolean} success - 是否成功
 * @property {string} result - 返回结果/错误信息
 * @property {string[]} logs - 执行日志
 * @property {number} duration - 执行耗时(ms)
 * @property {Object} [params] - 执行参数（敏感信息已过滤）
 * @property {string} [error] - 错误堆栈信息
 */

/**
 * 获取历史记录配置
 * @returns {Promise<Object>}
 */
export async function getHistoryConfig() {
	const config = await localGet("history_config");
	return Object.assign({}, DEFAULT_CONFIG, config || {});
}

/**
 * 保存历史记录配置
 * @param {Object} config
 * @returns {Promise<void>}
 */
export async function saveHistoryConfig(config) {
	const mergedConfig = Object.assign({}, await getHistoryConfig(), config);
	return localSave({history_config: mergedConfig});
}

/**
 * 生成历史记录ID
 * @returns {string}
 */
function generateHistoryId() {
	return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 过滤敏感参数信息
 * @param {Object} params
 * @returns {Object}
 */
function filterSensitiveParams(params) {
	if (!params || typeof params !== "object") return params;

	const filtered = {};
	const sensitiveKeys = ["password", "pwd", "token", "secret", "key", "cookie", "authorization"];

	for (const [key, value] of Object.entries(params)) {
		const lowerKey = key.toLowerCase();
		if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
			filtered[key] = "***";
		} else {
			filtered[key] = value;
		}
	}

	return filtered;
}

/**
 * 添加历史记录
 * @param {string} taskName - 任务名称
 * @param {'check'|'run'} type - 操作类型
 * @param {boolean} success - 是否成功
 * @param {string} result - 执行结果
 * @param {Object} options - 其他选项
 * @param {number} [options.duration] - 执行耗时
 * @param {string[]} [options.logs] - 执行日志
 * @param {Object} [options.params] - 执行参数
 * @param {Error} [options.error] - 错误对象
 * @returns {Promise<void>}
 */
export async function addHistory(taskName, type, success, result, options = {}) {
	const config = await getHistoryConfig();
	if (!config.enableLogging) return;

	const history = {
		id: generateHistoryId(),
		taskName,
		type,
		timestamp: Date.now(),
		success,
		result: result || "",
		logs: options.logs || [],
		duration: options.duration || 0,
		params: options.params ? filterSensitiveParams(options.params) : null,
		error: options.error ? options.error.stack || options.error.message : null,
	};

	// 获取现有历史记录
	const historyKey = `history_${taskName.replace("/", "_")}`;
	const existingHistory = (await localGet(historyKey)) || [];

	// 添加新记录
	existingHistory.unshift(history);

	// 清理旧记录
	const cutoffTime = Date.now() - config.maxDays * 24 * 60 * 60 * 1000;
	const cleanHistory = existingHistory
		.filter((h) => h.timestamp > cutoffTime)
		.slice(0, config.maxRecords);

	// 保存历史记录
	await localSave({[historyKey]: cleanHistory});

	console.log(`[History] Added ${type} record for ${taskName}: ${success ? "SUCCESS" : "FAILURE"}`);
}

/**
 * 获取任务历史记录
 * @param {string} taskName - 任务名称
 * @param {Object} [options] - 查询选项
 * @param {number} [options.limit] - 限制返回数量
 * @param {number} [options.offset] - 偏移量
 * @param {'check'|'run'} [options.type] - 过滤类型
 * @param {boolean} [options.success] - 过滤成功/失败
 * @returns {Promise<TaskHistory[]>}
 */
export async function getTaskHistory(taskName, options = {}) {
	const historyKey = `history_${taskName.replace("/", "_")}`;
	const history = (await localGet(historyKey)) || [];

	let filtered = history;

	// 类型过滤
	if (options.type) {
		filtered = filtered.filter((h) => h.type === options.type);
	}

	// 成功/失败过滤
	if (typeof options.success === "boolean") {
		filtered = filtered.filter((h) => h.success === options.success);
	}

	// 分页
	const offset = options.offset || 0;
	const limit = options.limit || filtered.length;

	return filtered.slice(offset, offset + limit);
}

/**
 * 获取所有任务的历史记录统计
 * @returns {Promise<Object>}
 */
export async function getAllHistoryStats() {
	const storage = await localGet(null);
	const stats = {};

	for (const [key, value] of Object.entries(storage)) {
		if (key.startsWith("history_") && Array.isArray(value)) {
			const taskName = key.replace("history_", "").replace("_", "/");
			const total = value.length;
			const success = value.filter((h) => h.success).length;
			const checkCount = value.filter((h) => h.type === "check").length;
			const runCount = value.filter((h) => h.type === "run").length;
			const recent = value.slice(0, 10); // 最近10条记录

			stats[taskName] = {
				total,
				success,
				failure: total - success,
				checkCount,
				runCount,
				successRate: total > 0 ? ((success / total) * 100).toFixed(1) : "0",
				recent,
			};
		}
	}

	return stats;
}

/**
 * 清理任务历史记录
 * @param {string} taskName - 任务名称，不传则清理所有
 * @param {number} [days] - 保留最近几天，不传则清理所有
 * @returns {Promise<void>}
 */
export async function clearHistory(taskName = null, days = null) {
	if (taskName) {
		// 清理指定任务的历史
		const historyKey = `history_${taskName.replace("/", "_")}`;
		if (days) {
			const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
			const history = (await localGet(historyKey)) || [];
			const filteredHistory = history.filter((h) => h.timestamp > cutoffTime);
			await localSave({[historyKey]: filteredHistory});
		} else {
			await localSave({[historyKey]: []});
		}
	} else {
		// 清理所有历史记录
		const storage = await localGet(null);
		const keysToRemove = Object.keys(storage).filter((key) => key.startsWith("history_"));

		if (days) {
			const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
			const updates = {};

			for (const key of keysToRemove) {
				const history = storage[key];
				if (Array.isArray(history)) {
					updates[key] = history.filter((h) => h.timestamp > cutoffTime);
				}
			}

			await localSave(updates);
		} else {
			await chrome.storage.local.remove(keysToRemove);
		}
	}

	console.log(`[History] Cleared history for ${taskName || "all tasks"}`);
}

/**
 * 导出历史记录
 * @param {string} [taskName] - 任务名称，不传则导出所有
 * @returns {Promise<Object>}
 */
export async function exportHistory(taskName = null) {
	if (taskName) {
		const history = await getTaskHistory(taskName);
		return {[taskName]: history};
	} else {
		const storage = await localGet(null);
		const exported = {};

		for (const [key, value] of Object.entries(storage)) {
			if (key.startsWith("history_") && Array.isArray(value)) {
				const taskName = key.replace("history_", "").replace("_", "/");
				exported[taskName] = value;
			}
		}

		return exported;
	}
}

/**
 * 导入历史记录
 * @param {Object} historyData - 历史记录数据
 * @param {boolean} [merge] - 是否与现有记录合并，默认false
 * @returns {Promise<void>}
 */
export async function importHistory(historyData, merge = false) {
	const updates = {};

	for (const [taskName, history] of Object.entries(historyData)) {
		if (!Array.isArray(history)) continue;

		const historyKey = `history_${taskName.replace("/", "_")}`;

		if (merge) {
			const existingHistory = (await localGet(historyKey)) || [];
			const mergedHistory = [...history, ...existingHistory];

			// 去重并按时间排序
			const uniqueHistory = mergedHistory
				.filter((item, index, arr) => arr.findIndex((h) => h.id === item.id) === index)
				.sort((a, b) => b.timestamp - a.timestamp);

			updates[historyKey] = uniqueHistory;
		} else {
			updates[historyKey] = history;
		}
	}

	await localSave(updates);
	console.log("[History] Imported history data");
}
