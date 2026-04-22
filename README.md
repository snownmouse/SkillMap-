# SkillMap - 对话驱动的技能探索地图

SkillMap 是一个基于 AI 的个性化技能规划与学习助手。通过深度融合教育学理论与心理学动机理论，为用户生成动态、可交互的技能树，并提供实时 AI 教练陪练。

## ✨ 核心特性

- **AI 驱动的技能树生成** - 输入专业、目标职业和当前水平，AI 为你量身定制学习路径
- **多 LLM 支持** - 兼容 Gemini、DeepSeek、硅基流动、火山引擎 (Ark) 及 OpenAI 兼容接口
- **教育学深度集成** - 科学的技能分级和学习路径设计
- **实时对话复盘** - 点击技能节点即可与 AI 导师对话，动态更新学习进度
- **响应式设计** - 适配不同设备，提供一致的用户体验

## 🚀 快速开始

### 1. 环境配置

#### 1.1 安装 Node.js

如果你还没有安装 Node.js，请先下载并安装：
- **Windows**: 访问 [Node.js 官网](https://nodejs.org/zh-cn/)，下载 LTS 版本并双击安装
- **macOS**: 可以使用 Homebrew 安装 `brew install node`
- **Linux**: 可以使用包管理器安装，如 `apt install nodejs npm`

安装完成后，打开命令行工具（Windows 是 cmd 或 PowerShell，macOS/Linux 是终端），运行以下命令检查是否安装成功：

```bash
node -v
npm -v
```

如果看到版本号，说明安装成功。

#### 1.2 复制环境变量模板

在项目文件夹中，找到 `.env.example` 文件，复制一份并重命名为 `.env`：

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

#### 1.3 配置 API Key

打开 `.env` 文件，根据你选择的 LLM 提供商填写 API Key：

- **火山引擎 (Ark)**：需要填写 `ARK_API_KEY`
- **DeepSeek**：需要填写 `DEEPSEEK_API_KEY`
- **硅基流动 (SiliconFlow)**：需要填写 `SILICONFLOW_API_KEY`
- **Gemini**：需要填写 `GEMINI_API_KEY`
- **其他 OpenAI 兼容接口**：填写 `CUSTOM_LLM_API_KEY` 和 `CUSTOM_LLM_BASE_URL`

### 2. 安装依赖

在项目文件夹中运行以下命令：

```bash
npm install
```

这个命令会下载并安装所有需要的依赖包，可能需要几分钟时间。

### 3. 启动开发服务器

安装完成后，运行以下命令启动开发服务器：

```bash
npm run dev
```

启动成功后，会看到类似这样的输出：

```
VITE v6.0.1  ready in 3.28 s

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

打开浏览器，访问 `http://localhost:3000` 即可开始使用。

### 4. 构建生产版本

如果你想部署项目到服务器，可以运行以下命令构建生产版本：

```bash
npm run build
```

构建完成后，会在 `dist` 目录生成优化后的生产文件。

### 5. 预览构建结果

构建完成后，可以运行以下命令预览生产版本：

```bash
npm run preview
```

## 🛠️ 技术栈

| 分类 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, Vite, Tailwind CSS v4 |
| 图谱 | Cytoscape.js |
| 后端 | Node.js, Express, SQLite |
| AI | 多 LLM 供应商兼容 |

## 📁 项目结构

```
src/
├── components/     # React 组件
│   ├── Chat/      # 对话组件
│   ├── Generate/ # 生成组件
│   ├── Layout/   # 布局组件
│   ├── SkillTree/# 技能树组件
│   └── Timeline/ # 时间线组件
├── pages/         # 页面组件
├── server/        # 后端代码
│   ├── controllers/  # 控制器
│   ├── prompts/     # 提示词模板
│   ├── repositories/ # 数据访问层
│   ├── routes/      # API 路由
│   └── services/    # 业务逻辑
├── services/      # 前端服务
├── types/         # TypeScript 类型
└── utils/         # 工具函数
```

## 📖 文档

详细文档请查看 [`docs/`](docs/) 目录：

- [快速入门指南](docs/README.md) - 从安装到使用的完整流程
- [环境配置指南](docs/ENVIRONMENT_GUIDE.md) - 详细的环境变量和 LLM 配置说明
- [构建部署指南](docs/BUILD_GUIDE.md) - 如何构建和部署项目

## 📄 许可证

MIT License

## © 版权声明

本项目版权归 SkillMap 团队所有。未经授权，不得用于商业用途。
