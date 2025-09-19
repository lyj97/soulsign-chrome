# 魂签项目文档目录

本文件夹包含了魂签（soulsign-chrome）项目的技术文档。

## 文档列表

### 技术分析文档
1. **[后台接口分析文档](./backend-api.md)** - 详细分析项目中的后台接口访问实现
   - 内部通信机制
   - API路由配置
   - 权限控制和安全机制
   
2. **[脚本更新机制文档](./script-update-mechanism.md)** - 详细说明脚本自动更新的实现原理
   - 更新配置和流程
   - 版本比较规则
   - 更新策略和安全考虑

### 开发文档
3. **[开发说明](./readme_dev.md)** - 项目开发相关的说明文档

## 项目架构概述

魂签是一个Chrome浏览器扩展，主要用于自动签到功能。项目架构如下：

```
soulsign-chrome/
├── src/
│   ├── backend/          # 后端逻辑
│   │   ├── backapi.js    # API路由配置
│   │   ├── scriptbuild.js # 脚本构建引擎
│   │   ├── scriptrecord.js # 脚本录制功能
│   │   ├── config.js     # 配置管理
│   │   └── utils.js      # 工具函数
│   ├── entry/            # 入口文件
│   │   ├── background.js # 后台脚本
│   │   ├── content.js    # 内容脚本
│   │   ├── options.js    # 选项页面
│   │   └── popup.js      # 弹出窗口
│   ├── options/          # 选项页面组件
│   ├── popup/            # 弹出窗口组件
│   └── common/           # 公共组件和工具
└── doc/                  # 文档目录
```

## 关键特性

1. **无外部后台服务**：完全基于Chrome Extension机制，无需服务器
2. **自动脚本更新**：支持定期检查和自动更新签到脚本
3. **安全机制**：域名检查、权限控制、代码隔离
4. **用户友好**：图形化界面、通知提醒、操作录制

## 开发环境

- Node.js + Vue.js
- Chrome Extension Manifest V2
- TypeScript支持
- Less样式预处理

## 相关资源

- [项目主页](https://github.com/inu1255/soulsign-chrome)
- [使用说明](../README.md)
- [更新日志](../CHANGELOG.md)

---

*文档最后更新时间：2025年9月19日*
