import config from "../backend/config";
import backapi from "../backend/backapi";
import {isFirefox, localGet, localSave, newNotification, syncGet, syncSave} from "@/common/chrome";
import {isEmpty, sleep} from "@/common/utils";
import {addTask, checkTask, compileTask, getTasks, runTask, setTask} from "@/backend/utils";
import compareVersions from "compare-versions";

chrome.runtime.onMessage.addListener(function (info, sender, cb) {
	(async () => {
		let api = backapi[info.path];
		if (api)
			try {
				let data = await api(info.body);
				return cb({no: 200, data});
			} catch (msg) {
				console.error(msg);
				return cb({no: 500, msg: msg + ""});
			}
		return cb({no: 404, msg: "not found"});
	})();
	return true;
});

const TAIL_KEYWORD = "#soulsign-install";
chrome.tabs.onUpdated.addListener(function (tabId, tabInfo, tab) {
	if (tabInfo.url && tabInfo.url.endsWith(TAIL_KEYWORD)) {
		chrome.tabs.update(tabId, {
			url: chrome.runtime.getURL("/options.html#" + tabInfo.url.slice(0, -TAIL_KEYWORD.length)),
		});
	}
});

function race(pms, ms) {
	return Promise.race([sleep(ms || config.timeout * 1e3), pms]);
}

function init() {
	return new Promise(function (resolve, reject) {
		syncGet("config").then((data) => {
			if (!data) {
				// 旧版本或者新安装，尝试升级
				localGet(Object.keys(config)).then((data) => {
					if (!isEmpty(data)) {
						// 旧版本
						console.log("旧版本升级");
						Object.assign(config, data);
						localGet("tasks").then((tasks) => {
							chrome.storage.local.clear(function () {
								syncSave({config});
								let sync = {tasks: []};
								let local = {};
								for (let task of tasks) {
									let name = task.author + "/" + task.name;
									sync.tasks.push(name);
									local[name] = task;
								}
								resolve(Promise.all([localSave(local), syncSave(sync)]));
							});
						});
					} else {
						// 新安装
						console.log("新安装");
						resolve();
					}
				});
			} else {
				Object.assign(config, data);
				resolve();
			}
		});
	});
}

async function loop() {
	let tasks = await getTasks();
	let today = new Date(Date.now() - config.begin_at).setHours(0, 0, 0, 0) + config.begin_at;
	let err_cnt = 0;
	for (let task of tasks) {
		if (!task.enable) continue;
		let changed = false;
		if (task.check) {
			// 有检查是否在线的函数
			let now = Date.now();
			if (task.online_at > now) task.online_at = now;
			if (task.online_at + task.expire < now) {
				// 没有检查过|之前不在线|到了再次检查时间了
				changed = true;
				let ok = false;
				try {
					ok = await race(checkTask(task));
				} catch (err) {
					// if (/Network Error|timeout/.test(err)) return; // 网络中断时
					task.result = err + "";
					console.error(task.name, "开始检查是否在线失败", err);
				}
				if (!ok) {
					// 不在线，直接跳过
					err_cnt++;
					if (config.notify_at + config.notify_freq * 1e3 < now) {
						// 距离上次通知很久了
						newNotification(`${task.name}不在线`, {
							body: "点此去登录或禁用它",
							url: task.loginURL || "/options.html",
						});
						config.notify_at = now;
						await syncSave({config});
					}
					task.online_at = -now;
					await setTask(task);
					continue;
				}
				task.online_at = now;
			}
		}
		if (task.freq ? task.success_at + task.freq < Date.now() : task.success_at < today) {
			// 到达运行频率 | 今天没有执行成功过
			if (task.failure_at + config.retry_freq * 1e3 <= new Date().getTime()) {
				// 运行失败后要歇10分钟
				changed = true;
				await race(runTask(task));
			}
		}
		if (task.failure_at > task.success_at) {
			err_cnt++;
			let now = Date.now();
			if (config.notify_at + config.notify_freq * 1e3 < now) {
				// 距离上次通知很久了
				newNotification(`${task.name}`, {
					body: "签到失败",
					url: "/options.html",
				});
				config.notify_at = now;
				await syncSave({config});
			}
		}
		if (changed) await setTask(task);
	}
	if (err_cnt) {
		chrome.browserAction.setBadgeBackgroundColor({color: "#F44336"});
		chrome.browserAction.setBadgeText({text: err_cnt + ""});
	} else {
		chrome.browserAction.setBadgeText({text: ""});
	}
}

async function upgrade() {
	let now = Date.now();
	if (config.upgrade_at + config.upgrade_freq * 1e3 > now) return;
	console.log("开始检查更新");
	let tasks = await getTasks();
	let li = [];
	for (let task of tasks) {
		if (!task.enable) continue;
		if (task.updateURL) {
			try {
				let {data} = await axios.get(task.updateURL);
				let item = compileTask(data);
				// TODO: 脚本增加 @minSDK 标记，以便插件版本低时不更新脚本
				if (compareVersions(item.version, task.version) > 0) {
					let changed = false;
					for (let k of ["author", "name", "grants", "domains"]) {
						if (item[k] != task[k]) {
							changed = true;
							break;
						}
					}
					if (changed) chrome.tabs.create({url: "/options.html#" + task.updateURL});
					else {
						li.push(task.name);
						addTask(tasks, item);
					}
				}
			} catch (error) {
				console.error(task.name, "更新失败");
			}
		}
	}
	if (li.length) {
		let title = li[0];
		if (li.length > 1) title += `等${li.length}个脚本`;
		newNotification(title + " 升级成功", {url: "/options.html"});
	}
	config.upgrade_at = now;
	await syncSave({config});
}

let originMap = {};

chrome.webRequest.onBeforeSendHeaders.addListener(
	function (details) {
		let requestHeaders = details.requestHeaders;
		for (var i = 0; i < requestHeaders.length; ++i) {
			var header = requestHeaders[i];
			if (header.name === "Origin") {
				if (!details.url.startsWith(header.value)) {
					originMap[details.requestId] = header.value;
				}
			}
		}
		// 只有插件才加
		var initiaor = details.initiator || details.documentUrl;
		if (!initiaor || !/^\w+-extension:/.test(initiaor)) return;
		let n = 0;
		requestHeaders = requestHeaders
			.filter((x) => {
				return !/^(Referer|Origin|User-Agent)$/i.test(x.name);
			})
			.map((x) => {
				if (x.name == "_referer") return {name: "Referer", value: x.value};
				if (x.name == "_origin") return {name: "Origin", value: x.value};
				if (x.name == "_user_agent") return {name: "User-Agent", value: x.value};
				n++;
				return x;
			});
		if (n < requestHeaders.length) return {requestHeaders};
	},
	{urls: ["<all_urls>"], types: ["xmlhttprequest"]},
	isFirefox ? ["blocking", "requestHeaders"] : ["blocking", "requestHeaders", "extraHeaders"]
);

chrome.webRequest.onHeadersReceived.addListener(
	function (details) {
		if (!config.cross) return;
		let origin = originMap[details.requestId];
		if (origin) {
			delete originMap[details.requestId];
			// 只有跨域了才加
			let flag = config.allow_cross[details.initiator];
			if (!flag) return; // 不允许跨域
			let responseHeaders = details.responseHeaders;
			for (var i = 0; i < responseHeaders.length; ++i) {
				if (responseHeaders[i].name.toLowerCase() === "access-control-allow-origin") {
					// 已经有了就不加了
					return;
				}
			}
			responseHeaders.push({name: "Access-Control-Allow-Origin", value: origin});
			if (flag & 2) responseHeaders.push({name: "Access-Control-Allow-Credentials", value: "true"});
			responseHeaders.push({name: "Access-Control-Allow-Headers", value: config.cross_header});
			return {responseHeaders};
		}
	},
	{urls: ["<all_urls>"], types: ["xmlhttprequest"]},
	["blocking", "responseHeaders"]
);

async function main() {
	await init();
	while (true) {
		try {
			await loop();
			if (config.upgrade) await upgrade();
		} catch (error) {
			console.error(error);
		}
		await sleep(config.loop_freq * 1e3);
	}
}

main().catch((err) => {
	console.log(`崩溃`, err);
});

if ("serviceWorker" in navigator) {
	navigator.serviceWorker.getRegistrations().then((registrations) => {
		registrations.forEach((sw) => sw.unregister());
	});
}
