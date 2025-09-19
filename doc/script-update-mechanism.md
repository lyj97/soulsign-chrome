# 魂签脚本更新机制文档

## 概述

魂签（soulsign-chrome）实现了自动的脚本更新机制，能够定期检查和更新已安装的签到脚本，确保用户始终使用最新版本的脚本。

## 更新机制架构

### 1. 更新配置

在 `src/backend/config.js` 中定义了更新相关的配置：

```javascript
const config = {
    /** 是否自动更新 */
    upgrade: true,
    /** 检查更新间隔时间(秒)，默认24小时 */
    upgrade_freq: 86400,
    /** 检查更新时间 */
    upgrade_at: 0,
};
```

### 2. 更新流程

更新逻辑在 `src/entry/background.js` 的 `upgrade()` 函数中实现：

#### 2.1 定时检查
```javascript
async function main() {
    await init();
    while (true) {
        try {
            await loop();
            if (config.upgrade) await upgrade(); // 如果开启自动更新
        } catch (error) {
            console.error(error);
        }
        await sleep(config.loop_freq * 1e3);
    }
}
```

#### 2.2 更新检查逻辑
```javascript
async function upgrade() {
    let now = Date.now();
    // 检查是否到了更新时间
    if (config.upgrade_at + config.upgrade_freq * 1e3 > now) return;
    
    console.log("开始检查更新");
    let tasks = await getTasks();
    let li = [];
    
    for (let task of tasks) {
        if (!task.enable) continue; // 跳过已禁用的任务
        if (task.updateURL) {
            try {
                // 从updateURL获取最新脚本
                let {data} = await axios.get(task.updateURL);
                let item = compileTask(data);
                
                // 版本比较
                if (compareVersions(item.version, task.version) > 0) {
                    let changed = false;
                    // 检查关键属性是否变化
                    for (let k of ["author", "name", "grants", "domains"]) {
                        if (item[k] != task[k]) {
                            changed = true;
                            break;
                        }
                    }
                    
                    if (changed) {
                        // 如果关键属性变化，需要用户确认
                        chrome.tabs.create({url: "/options.html#" + task.updateURL});
                    } else {
                        // 自动更新
                        li.push(task.name);
                        addTask(tasks, item);
                    }
                }
            } catch (error) {
                console.error(task.name, "更新失败");
            }
        }
    }
    
    // 更新通知
    if (li.length) {
        let title = li[0];
        if (li.length > 1) title += `等${li.length}个脚本`;
        newNotification(title + " 升级成功", {url: "/options.html"});
    }
    
    config.upgrade_at = now;
    await syncSave({config});
}
```

## 脚本元数据要求

要支持自动更新，脚本需要在UserScript头部包含以下元数据：

### 必需字段
```javascript
// ==UserScript==
// @name         脚本名称
// @version      1.0.0
// @author       作者名
// @domain       example.com
// @updateURL    https://example.com/script.js
// ==/UserScript==
```

### 版本比较规则
- 使用 `compare-versions` 库进行语义化版本比较
- 支持标准的语义化版本格式：`major.minor.patch`
- 例如：`1.2.1` > `1.2.0` > `1.1.9`

## 更新策略

### 自动更新条件
1. 脚本已启用 (`task.enable = true`)
2. 脚本配置了 `updateURL`
3. 新版本号高于当前版本
4. 关键属性（author、name、grants、domains）未发生变化

### 手动确认更新
如果检测到以下变化，会打开设置页面让用户确认：
- 作者名称变化
- 脚本名称变化  
- 权限列表变化 (`grants`)
- 允许访问的域名变化 (`domains`)

### 更新失败处理
- 网络请求失败：记录错误日志，不影响其他脚本更新
- 脚本解析失败：记录错误日志，保持原脚本不变
- 版本比较失败：跳过该脚本的更新

## 前端更新检查

除了后台自动更新，前端页面也支持手动检查更新：

### Options页面更新检查 (src/options/Root.vue)
```javascript
async upgrade() {
    let tasks = this.tasks;
    let map = {};
    for (let task of tasks) map[task.key] = "";
    
    for (let task of tasks) {
        if (task.updateURL) {
            try {
                let {data} = await axios.get(task.updateURL);
                let item = compileTask(data);
                if (compareVersions(item.version, task.version) > 0) {
                    map[task.key] = item.version; // 记录可更新的版本号
                }
            } catch (error) {
                console.error(task.name, "获取更新失败");
            }
        }
    }
    this.ver = map; // 在UI中显示可更新的脚本
}
```

## 更新通知

### 成功通知
```javascript
newNotification(title + " 升级成功", {url: "/options.html"});
```

### 失败处理
- 静默处理，记录错误日志
- 不会打断用户正常使用

## 安全考虑

1. **域名验证**：更新的脚本仍需通过域名检查
2. **权限控制**：新脚本的权限不会自动扩大，需要用户确认
3. **版本回退**：不支持自动版本回退，需要用户手动操作

## 配置管理

用户可以通过以下方式控制更新行为：

### 全局设置
- 在扩展选项中开启/关闭自动更新
- 调整更新检查频率

### 脚本级设置  
- 为特定脚本禁用自动更新
- 手动指定updateURL

## 总结

魂签的脚本更新机制具有以下特点：

1. **自动化**：默认24小时检查一次更新
2. **安全性**：关键变更需要用户确认
3. **可靠性**：更新失败不影响现有脚本运行
4. **透明性**：提供详细的更新状态和通知
5. **灵活性**：支持全局和脚本级的更新控制

该机制确保用户能够及时获得脚本更新，同时保持系统的稳定性和安全性。
