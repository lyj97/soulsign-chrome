# soulsign-chrome 开发指南
# Node.js 版本要求

建议使用 Node.js 16.x 或 18.x LTS 版本进行开发和打包。Vue CLI 5.x 及相关依赖在 Node.js 16/18 下兼容性最佳，避免使用过高（如 20+）或过低（如 12 以下）版本。

如需切换 Node 版本，推荐使用 [nvm](https://github.com/nvm-sh/nvm) 工具：
```bash
nvm install 18
nvm use 18
```

本开发指南详细介绍 soulsign-chrome 项目的结构、开发流程、脚本编写规范、构建与调试方法，帮助新开发者快速上手并高效开发。

---

## 1. 项目简介

soulsign-chrome 是一个用于自动签到的 Chrome/Firefox 浏览器扩展，支持脚本化自动登录和签到，无需手动抓取 cookie。用户只需安装脚本并登录账号即可自动签到。

---

## 2. 目录结构说明

- `src/`：主源码目录，包含各功能模块
  - `backend/`：后端逻辑，如任务管理、脚本构建与记录
  - `common/`：通用工具、axios封装、权限管理、polyfill等
  - `components/`：Vue组件（如日期、表单、评分）
  - `content/`：内容脚本，注入页面实现自动签到
  - `devtools/`：开发者工具相关页面
  - `entry/`：扩展入口文件（background, content, options, popup）
  - `ext/`：扩展存储相关
  - `options/`：设置页及子页面
  - `popup/`：弹窗页
  - `styles/`：Less 样式文件
  - `tab/`：标签页相关
- `lib/`：构建工具与 loader（如 auto-loader.js、zip.js）
- `@types/`：TypeScript 类型定义
- `public/`：静态资源（图标、HTML等）
- `static/demos/`：脚本示例，供参考和测试

---

## 3. 技术栈

- Vue 2.x + Muse UI
- JavaScript/TypeScript
- Chrome/Firefox 扩展 API
- Axios、PrismJS、JSZip 等
- Less
- ESLint/Prettier 代码规范

---

## 4. 开发环境搭建

1. 安装依赖：
   ```bash
   npm install
   ```
2. 启动开发模式：
   ```bash
   npm run start
   ```
   - 自动构建并监听源码变更。
3. 构建发布包：
   ```bash
   npm run build
   ```
   - 生成 `dist/` 目录，包含可加载的扩展包。
4. 代码检查与修复：
   ```bash
   npm run lint
   npm run lint-fix
   ```

---

## 5. 主要文件说明

- `src/manifest.js`：扩展 manifest，定义权限、入口、图标等，构建时自动生成 `manifest.json`。
- `vue.config.js`：Vue CLI 配置，包含多页面、loader、资源拷贝等。
- `tsconfig.json`：TypeScript 配置，支持 JS/TS 混合开发。
- `lib/auto-loader.js`：自动组件加载器，简化 Vue 组件引用。

---

## 6. 脚本开发规范

脚本需遵循 UserScript 格式，头部需包含元信息注释：
```javascript
// ==UserScript==
// @name              脚本名称
// @namespace         脚本官方网址
// @version           版本号
// @author            作者
// @loginURL          登录链接
// @expire            会话过期时间（毫秒）
// @domain            请求域名（可多个）
// @param             参数定义
// ==/UserScript==
```

核心接口：
- `exports.run = async function () { ... }`  // 执行签到
- `exports.check = async function () { ... }` // 检查是否在线

详细示例见 `static/demos/` 目录。

---

## 7. 日志与输出格式

脚本输出支持标准对象格式和字符串格式，推荐标准格式：
```javascript
{
  summary: "签到成功",
  detail: [
    {
      domain: "www.example.com",
      url: "https://www.example.com",
      message: "获得 1 积分",
      errno: false,
      log: { ... }
    }
  ]
}
```

---

## 8. 构建与调试

- 开发时建议使用 Chrome 的“加载已解压的扩展程序”功能，选择 `dist/` 目录。
- Firefox 可通过 [AMO](https://addons.mozilla.org/zh-CN/firefox/addon/%E9%AD%82%E7%AD%BE/) 安装测试。
- 脚本调试可在插件的“任务管理”页面上传/粘贴脚本。

---

## 9. 代码规范

- 遵循 ESLint/Prettier 规范，支持 TypeScript。
- 组件命名统一，自动加载（见 auto-loader.js）。
- 公共工具函数集中于 `src/common/utils/`。

---

## 10. 贡献与反馈

- 欢迎提交 PR 或 issue。
- 贡献脚本请参考 `static/demos/` 示例。
- 详细变更记录见 `CHANGELOG.md`。

---

## 11. 参考资源

- [项目主页](https://github.com/inu1255/soulsign-chrome)
- [脚本发布站点](https://soulsign.inu1255.cn)
- [脚本开发文档](https://github.com/inu1255/soulsign-chrome/tree/master/static/demos.md)

---

如有疑问请查阅 README.md 或提交 issue。
