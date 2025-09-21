# 魂签后台接口分析文档

## 概述

魂签（soulsign-chrome）项目中实际上**没有外部的HTTP后台接口**，所有的"后台接口"都是Chrome扩展内部的API通信机制。项目采用消息传递的方式在不同的组件间进行通信。

## 架构说明

### 内部通信机制

项目使用Chrome Extension的消息传递API `chrome.runtime.onMessage` 来实现内部组件间的通信：

```javascript
// src/entry/background.js
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
```

### API路由配置

所有的API端点都在 `src/backend/backapi.js` 中定义：

## API接口列表

### 配置管理
- `config/get` - 获取配置信息
- `config/set` - 设置配置信息

### 任务管理
- `task/list` - 获取任务列表
- `task/del` - 删除指定任务
- `task/add` - 添加新任务
- `task/set` - 更新任务信息
- `task/run` - 执行指定任务

### 录制功能
- `record/start` - 开始录制用户操作
- `record/begin` - 开始代码录制
- `record/code` - 记录代码操作
- `record/end` - 结束录制并获取代码

## 关键组件

### 1. backapi.js - API路由
```javascript
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
    // ... 其他API
};
```

### 2. scriptbuild.js - 脚本构建引擎
- 负责解析和执行用户脚本
- 提供安全的运行环境
- 实现域名检查和权限控制
- 支持各种浏览器API调用（cookie、localStorage等）

### 3. utils.js - 任务管理工具
- 管理签到任务的CRUD操作
- 处理任务执行和结果记录
- 支持任务版本比较和参数解析

## 外部HTTP请求

虽然没有传统的后台接口，但项目会进行以下HTTP请求：

### 1. 脚本更新请求
```javascript
let {data} = await axios.get(task.updateURL);
```

### 2. 外部脚本引用
```javascript
require(url) {
    return axios.get(url, {validateStatus: () => true});
}
```

### 3. 任务执行中的网络请求
用户脚本可以使用注入的axios实例进行HTTP请求，但受到域名限制：
```javascript
let request = axios.create({timeout: 10e3});
request.interceptors.request.use(function (config) {
    if (!checkDomain(domains, config.url)) 
        return Promise.reject(`domain配置不正确`);
});
```

## 权限控制

项目通过`@grant`指令控制脚本权限：
- `cookie` - 允许访问cookie
- `localStorage` - 允许访问本地存储
- `notify` - 允许发送通知
- `eval` - 允许执行危险操作
- `loadjs` - 允许加载外部JavaScript

## 数据存储

项目使用Chrome Storage API进行数据持久化：
- `chrome.storage.sync` - 同步存储（配置信息、任务名称列表）
- `chrome.storage.local` - 本地存储（具体的任务数据）

## 安全机制

1. **域名检查**：所有网络请求都会检查目标域名是否在脚本允许的域名列表中
2. **权限控制**：通过grant机制控制脚本可以使用的功能
3. **代码隔离**：用户脚本在独立的环境中执行，限制对危险API的访问

## 总结

魂签项目采用了典型的Chrome Extension架构，没有传统意义上的后台服务器，而是完全基于浏览器扩展机制实现。所有的数据处理和逻辑都在客户端完成，通过Chrome Storage API进行数据持久化，通过消息传递机制实现组件间通信。
