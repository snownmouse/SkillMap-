# SkillMap - 对话驱动的技能探索地图

SkillMap 是一个基于 AI 的个性化技能规划与学习助手。通过深度融合教育学理论与心理学动机理论，为用户生成动态、可交互的技能树，并提供实时 AI 教练陪练。

## ✨ 核心特性

- **AI 驱动的技能树生成** - 输入专业、目标职业和当前水平，AI 为你量身定制学习路径
- **多 LLM 支持** - 兼容 Gemini、DeepSeek、硅基流动、火山引擎 (Ark) 及 OpenAI 兼容接口
- **教育学深度集成** - 科学的技能分级和学习路径设计
- **实时对话复盘** - 点击技能节点即可与 AI 导师对话，动态更新学习进度
- **响应式设计** - 适配不同设备，提供一致的用户体验

## 🚀 快速开始

### 方式一：Windows 一键安装

双击 `install.bat` 脚本，它会自动：
1. 检查 Node.js 是否已安装
2. 创建 `.env` 配置文件
3. 安装项目依赖
4. 创建数据目录

安装完成后，编辑 `.env` 文件配置 API Key，然后运行：

```bash
npm run dev
```

### 方式二：手动安装

#### 1. 安装 Node.js

如果你还没有安装 Node.js，请先下载并安装：
- **Windows**: 访问 [Node.js 官网](https://nodejs.org/zh-cn/)，下载 LTS 版本并双击安装
- **macOS**: 可以使用 Homebrew 安装 `brew install node`
- **Linux**: 可以使用包管理器安装，如 `apt install nodejs npm`

安装完成后，打开命令行工具，运行以下命令检查是否安装成功：

```bash
node -v
npm -v
```

#### 2. 复制环境变量模板

在项目文件夹中，找到 `.env.example` 文件，复制一份并重命名为 `.env`：

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

#### 3. 配置 API Key

打开 `.env` 文件，根据你选择的 LLM 提供商填写 API Key：

- **火山引擎 (Ark)**：需要填写 `ARK_API_KEY`
- **DeepSeek**：需要填写 `DEEPSEEK_API_KEY`
- **硅基流动 (SiliconFlow)**：需要填写 `SILICONFLOW_API_KEY`
- **Gemini**：需要填写 `GEMINI_API_KEY`
- **其他 OpenAI 兼容接口**：填写 `CUSTOM_LLM_API_KEY` 和 `CUSTOM_LLM_BASE_URL`

#### 4. 安装依赖

```bash
npm install
```

#### 5. 启动应用

```bash
npm run dev
```

启动成功后，会看到类似这样的输出：

```
SkillMap server running on http://localhost:3008
WebSocket server available at ws://localhost:3008/ws
LLM Provider: ark
```

打开浏览器，访问 `http://localhost:3008` 即可开始使用。

> **说明**：项目采用前后端一体化架构，`npm run dev` 会同时启动前端（Vite 开发服务器）和后端（Express API），无需分别启动。

### 构建生产版本

```bash
npm run build
```

构建完成后，会在 `dist` 目录生成优化后的生产文件。

## 🛠️ 技术栈

| 分类 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, Vite, Tailwind CSS v4 |
| 图谱 | Cytoscape.js |
| 后端 | Node.js, Express, SQLite (better-sqlite3) |
| AI | 多 LLM 供应商兼容 |
| 通信 | WebSocket (实时任务状态推送) |

## 📁 项目结构

```
├── server.ts              # 服务端入口（集成 Vite 中间件）
├── install.bat            # Windows 一键安装脚本
├── .env.example           # 环境变量模板
├── src/
│   ├── components/        # React 组件
│   │   ├── Chat/          # 对话组件
│   │   ├── Generate/      # 生成组件
│   │   ├── Layout/        # 布局组件
│   │   ├── SkillTree/     # 技能树组件
│   │   └── Timeline/      # 时间线组件
│   ├── pages/             # 页面组件
│   ├── server/            # 后端代码
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/     # 中间件（安全、限流）
│   │   ├── prompts/       # 提示词模板
│   │   ├── repositories/  # 数据访问层
│   │   ├── routes/        # API 路由
│   │   └── services/      # 业务逻辑
│   ├── services/          # 前端服务
│   ├── types/             # TypeScript 类型
│   └── utils/             # 工具函数
```

## 📄 许可证

MIT License

## 🤔 常见问题

### Q: 如何选择合适的 LLM 提供商？

A: 推荐使用火山引擎 (Ark)，因为它支持完整的功能，包括思考模式和网络搜索。如果 Ark 不可用，可以使用硅基流动 (SiliconFlow) 作为备用。

### Q: 如何获取 API Key？

A: 不同 LLM 提供商的 API Key 获取方式不同：
- **火山引擎 (Ark)**：访问 [火山引擎控制台](https://console.volcengine.com/) 创建 API Key
- **硅基流动 (SiliconFlow)**：访问 [硅基流动控制台](https://cloud.siliconflow.cn/) 创建 API Key
- **DeepSeek**：访问 [DeepSeek 官网](https://www.deepseek.com/) 创建 API Key
- **Gemini**：访问 [Google AI Studio](https://makersuite.google.com/) 创建 API Key

### Q: 遇到端口冲突怎么办？

A: 可以通过以下步骤解决：
1. 查看占用端口的进程：`netstat -ano | findstr :端口号`
2. 结束占用端口的进程：`taskkill /PID 进程ID /F`
3. 或者修改 `.env` 文件中的 `PORT` 参数，使用其他端口

### Q: 依赖安装失败怎么办？

A: 可以尝试使用国内镜像：
```bash
npm install --registry=https://registry.npmmirror.com
```

### Q: 数据存储在哪里？

A: 数据存储在本地的 SQLite 数据库中，位于 `data/skillmap.db` 文件。

## 📚 文档

- [快速入门指南](docs/README.md)
- [环境配置指南](docs/ENVIRONMENT_GUIDE.md)
- [构建部署指南](docs/BUILD_GUIDE.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进 SkillMap！

## 📞 联系我们

如果您在使用过程中遇到任何问题，或者有任何建议，请联系我们：

- **GitHub Issues**：在 GitHub 仓库中提交 issue
- **Email**：moyao0091@163.com
