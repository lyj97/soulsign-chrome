import {sendMessage} from "./chrome";

/**
 * API调用封装类
 */
class API {
	/**
	 * 调用后端API
	 * @param {string} path - API路径
	 * @param {any} data - 请求数据
	 * @returns {Promise<any>} 响应数据
	 */
	async call(path, data) {
		try {
			return await sendMessage(path, data);
		} catch (error) {
			console.error(`API调用失败 [${path}]:`, error);
			throw error;
		}
	}

	/**
	 * 获取任务列表
	 * @returns {Promise<Array>}
	 */
	getTasks() {
		return this.call("task/list");
	}

	/**
	 * 运行任务
	 * @param {string} taskName
	 * @returns {Promise<any>}
	 */
	runTask(taskName) {
		return this.call("task/run", taskName);
	}

	/**
	 * 设置任务
	 * @param {Object} task
	 * @returns {Promise<any>}
	 */
	setTask(task) {
		return this.call("task/set", task);
	}

	/**
	 * 删除任务
	 * @param {string} taskName
	 * @returns {Promise<any>}
	 */
	deleteTask(taskName) {
		return this.call("task/del", taskName);
	}

	/**
	 * 添加任务
	 * @param {Object} task
	 * @returns {Promise<any>}
	 */
	addTask(task) {
		return this.call("task/add", task);
	}

	// 历史记录相关API
	/**
	 * 获取历史记录配置
	 * @returns {Promise<Object>}
	 */
	getHistoryConfig() {
		return this.call("history/config");
	}

	/**
	 * 保存历史记录配置
	 * @param {Object} config
	 * @returns {Promise<void>}
	 */
	setHistoryConfig(config) {
		return this.call("history/config/set", config);
	}

	/**
	 * 获取历史记录列表
	 * @param {Object} params - 查询参数
	 * @returns {Promise<Object>}
	 */
	getHistoryList(params) {
		return this.call("history/list", params);
	}

	/**
	 * 获取历史记录统计
	 * @param {Object} filters - 过滤条件
	 * @returns {Promise<Object>}
	 */
	getHistoryStats(filters) {
		return this.call("history/stats", filters);
	}

	/**
	 * 导出历史记录
	 * @param {Object} filters - 过滤条件
	 * @returns {Promise<Object>}
	 */
	exportHistory(filters) {
		return this.call("history/export", filters);
	}

	/**
	 * 清空历史记录
	 * @param {Object} params - 清空参数
	 * @returns {Promise<void>}
	 */
	clearHistory(params) {
		return this.call("history/clear", params);
	}

	// 配置相关API
	/**
	 * 获取配置
	 * @returns {Promise<Object>}
	 */
	getConfig() {
		return this.call("config/get");
	}

	/**
	 * 设置配置
	 * @param {Object} config
	 * @returns {Promise<void>}
	 */
	setConfig(config) {
		return this.call("config/set", config);
	}
}

// 导出API实例
const api = new API();
export default api;
