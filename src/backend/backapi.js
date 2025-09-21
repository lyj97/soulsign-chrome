import {syncSave} from "@/common/chrome";
import config from "./config";
import scriptbuild from "./scriptbuild";
import {beginCode, getCode, onCode, startRecord} from "./scriptrecord";
import {addTask, delTask, getTasks, runTask, setTask} from "./utils";
import {
	clearHistory,
	exportHistory,
	getAllHistoryStats,
	getHistoryConfig,
	getTaskHistory,
	saveHistoryConfig,
} from "./history";

export default {
	"config/get"() {
		return config;
	},
	"config/set"(body) {
		Object.assign(config, body);
		return syncSave({config});
	},
	"task/list"() {
		return getTasks();
	},
	"task/del"(name) {
		return delTask(name);
	},
	"task/add"(task) {
		return addTask(scriptbuild(task));
	},
	"task/set"(task) {
		return setTask(task);
	},
	"task/run"(name) {
		return runTask(name);
	},
	"record/start"(data) {
		return startRecord(data);
	},
	"record/begin"(data) {
		return beginCode(data);
	},
	"record/code"(data) {
		return onCode(data);
	},
	"record/end"(data) {
		return getCode(data);
	},
	// 历史记录相关接口
	"history/config"() {
		return getHistoryConfig();
	},
	"history/config/set"(config) {
		return saveHistoryConfig(config);
	},
	async "history/list"(params) {
		const {filters = {}, page = 1, pageSize = 50, sort = {}} = params;
		const allStats = await getAllHistoryStats();
		const availableTasks = Object.keys(allStats);

		let allHistory = [];

		// 如果指定了任务，只获取该任务的历史
		if (filters.taskName) {
			const history = await getTaskHistory(filters.taskName);
			allHistory = history.map((h) => ({...h, taskName: filters.taskName}));
		} else {
			// 获取所有任务的历史
			for (const taskName of availableTasks) {
				const history = await getTaskHistory(taskName);
				allHistory.push(...history.map((h) => ({...h, taskName})));
			}
		}

		// 应用过滤器
		let filtered = allHistory;

		if (filters.type) {
			filtered = filtered.filter((h) => h.type === filters.type);
		}

		if (filters.success !== "" && filters.success !== undefined) {
			const success = filters.success === "true" || filters.success === true;
			filtered = filtered.filter((h) => h.success === success);
		}

		if (filters.days) {
			const cutoff = Date.now() - parseInt(filters.days) * 24 * 60 * 60 * 1000;
			filtered = filtered.filter((h) => h.timestamp > cutoff);
		}

		// 排序
		if (sort.name) {
			const direction = sort.order === "asc" ? 1 : -1;
			filtered.sort((a, b) => {
				let aVal = a[sort.name];
				let bVal = b[sort.name];
				if (typeof aVal === "string") aVal = aVal.toLowerCase();
				if (typeof bVal === "string") bVal = bVal.toLowerCase();
				return aVal < bVal ? -direction : aVal > bVal ? direction : 0;
			});
		}

		// 分页
		const total = filtered.length;
		const startIndex = (page - 1) * pageSize;
		const data = filtered.slice(startIndex, startIndex + pageSize);

		return {
			data,
			total,
			availableTasks,
			page,
			pageSize,
		};
	},
	async "history/stats"(filters = {}) {
		const allStats = await getAllHistoryStats();
		let totalRecords = 0;
		let successCount = 0;
		let failureCount = 0;
		let checkCount = 0;
		let runCount = 0;

		for (const [taskName, stats] of Object.entries(allStats)) {
			// 如果有任务过滤，只统计指定任务
			if (filters.taskName && taskName !== filters.taskName) continue;

			// 如果有天数过滤，需要重新获取并过滤数据
			if (filters.days) {
				const cutoff = Date.now() - parseInt(filters.days) * 24 * 60 * 60 * 1000;
				const history = await getTaskHistory(taskName);
				const recentHistory = history.filter((h) => h.timestamp > cutoff);

				totalRecords += recentHistory.length;
				successCount += recentHistory.filter((h) => h.success).length;
				checkCount += recentHistory.filter((h) => h.type === "check").length;
				runCount += recentHistory.filter((h) => h.type === "run").length;
			} else {
				totalRecords += stats.total;
				successCount += stats.success;
				checkCount += stats.checkCount;
				runCount += stats.runCount;
			}
		}

		failureCount = totalRecords - successCount;
		const successRate = totalRecords > 0 ? ((successCount / totalRecords) * 100).toFixed(1) : "0";

		return {
			totalRecords,
			successCount,
			failureCount,
			successRate,
			checkCount,
			runCount,
		};
	},
	"history/export"(filters = {}) {
		if (filters.taskName) {
			return exportHistory(filters.taskName);
		}
		return exportHistory();
	},
	"history/clear"(params = {}) {
		const {taskName, days} = params;
		return clearHistory(taskName, days);
	},
};
