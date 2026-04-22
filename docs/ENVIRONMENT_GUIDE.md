# 环境配置指南

本指南详细说明如何配置 SkillMap 项目的环境变量，特别是 LLM 提供商的配置。

## 1. 环境变量模板

项目根目录中有一个 `.env.example` 文件，包含了所有需要的环境变量。你需要复制这个文件并命名为 `.env`，然后根据你的实际情况填写相应的值。

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

## 2. LLM 提供商配置

SkillMap 支持多种 LLM 提供商，默认使用火山引擎 (Ark) 作为主要提供商，硅基流动 (SiliconFlow) 作为备用提供商。

### 2.1 选择 LLM 提供商

在 `.env` 文件中，通过 `LLM_PROVIDER` 环境变量选择你要使用的 LLM 提供商：

```env
# LLM供应商配置 (ark | siliconflow)
LLM_PROVIDER=ark
```

### 2.2 火山引擎 (Ark) 配置

**推荐使用**，支持完整功能，包括思考模式和网络搜索。

1. **获取 API Key**：
   - 访问 [火山引擎控制台](https://console.volcengine.com/)
   - 登录或注册账号
   - 进入 "API 密钥管理" 页面
   - 创建或获取已有的 API Key

2. **配置环境变量**：
   ```env
   # 火山引擎 (Ark)
   ARK_API_KEY=your_ark_api_key
   ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
   ARK_MODEL=doubao-seed-2-0-lite-260215
   ```

   **默认模型**：项目默认使用豆包模型 `doubao-seed-2-0-lite-260215`，这是经过测试的稳定模型。

   **修改模型**：如果你想使用其他模型，只需要修改 `.env` 文件中的 `ARK_MODEL` 环境变量：
   
   ```env
   # 修改为其他豆包模型
   ARK_MODEL=doubao-seed-2-0-pro-260215
   ```
   
   **注意事项**：
   - 确保模型支持相同的 API 接口
   - 某些模型可能不支持思考模式和网络搜索功能
   - 不同模型的参数和响应格式可能不同

   推荐的替代模型：
   - `doubao-seed-2-0-pro-260215`（更强大但费用更高）
   - `doubao-seed-2-0-mini-260215`（更轻量但功能较少）

### 2.3 硅基流动 (SiliconFlow) 配置

作为备用提供商，支持基本的聊天功能。

1. **获取 API Key**：
   - 访问 [硅基流动控制台](https://cloud.siliconflow.cn/)
   - 登录或注册账号
   - 进入 "API 密钥" 页面
   - 创建或获取已有的 API Key

2. **配置环境变量**：
   ```env
   # 硅基流动 (SiliconFlow)
   SILICONFLOW_API_KEY=your_siliconflow_api_key
   SILICONFLOW_BASE_URL=https://api.siliconflow.cn
   SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3
   ```

### 2.4 其他 OpenAI 兼容接口

如果你有其他 OpenAI 兼容的 LLM 接口（如本地部署的模型、第三方中转服务等），可以使用自定义配置：

```env
# 自定义 OpenAI 兼容接口
CUSTOM_LLM_API_KEY=your_api_key
CUSTOM_LLM_BASE_URL=https://your-custom-llm-api.com
CUSTOM_LLM_MODEL=your-model-name
```

## 3. 通用 LLM 参数

以下参数适用于所有 LLM 提供商：

```env
# LLM通用参数
LLM_TEMPERATURE=0.3
LLM_MAX_TOKENS=4000
```

- `LLM_TEMPERATURE`：控制生成内容的随机性，值越大越随机
- `LLM_MAX_TOKENS`：控制生成内容的最大长度

## 4. 数据库配置

SkillMap 使用 SQLite 数据库存储数据：

```env
# 数据库
DB_PATH=./data/skillmap.db
```

默认情况下，数据库文件会存储在项目根目录的 `data` 文件夹中。

## 5. 服务器配置

```env
# 服务器配置
PORT=3000
NODE_ENV=development
```

- `PORT`：服务器监听的端口
- `NODE_ENV`：运行环境（development 或 production）

## 6. 配置验证

配置完成后，你可以通过启动开发服务器来验证配置是否正确：

```bash
npm run dev
```

如果配置正确，服务器会成功启动并显示类似以下输出：

```
VITE v6.0.1  ready in 3.28 s

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

## 7. 故障排除

### 7.1 API Key 错误

如果看到类似以下错误：

```
ARK API key is required when using ark provider. Please set ARK_API_KEY in .env file.
```

说明你选择了 `ark` 提供商但没有提供 API Key。请检查 `.env` 文件中的 `ARK_API_KEY` 配置。

### 7.2 LLM 调用超时

如果看到类似以下错误：

```
LLM API 调用超时 (300s)
```

说明 LLM 提供商响应超时。这可能是由于网络问题或 API 负载过高导致的。请稍后重试。

### 7.3 JSON 解析错误

如果看到类似以下错误：

```
无法解析 AI 响应为 JSON
```

说明 LLM 返回的内容不是有效的 JSON 格式。这可能是由于模型输出异常或网络问题导致的。系统会自动重试，如果多次失败，请检查 LLM 提供商的状态。

## 8. 生产环境配置

在生产环境中，建议：

1. 将 `NODE_ENV` 设置为 `production`
2. 配置 `CORS_ORIGIN` 为你的实际域名
3. 确保使用稳定的 LLM 提供商
4. 定期备份数据库文件

```env
# 生产环境配置
NODE_ENV=production
CORS_ORIGIN=https://your-production-domain.com
```

## 9. 常见问题

### Q: 我可以同时配置多个 LLM 提供商吗？

A: 可以。系统会使用 `LLM_PROVIDER` 指定的提供商作为主要提供商，如果失败则会自动切换到备用提供商。

### Q: 如何选择合适的 LLM 提供商？

A: 推荐使用火山引擎 (Ark)，因为它支持完整的功能，包括思考模式和网络搜索。如果 Ark 不可用，可以使用硅基流动作为备用。

### Q: API Key 安全吗？

A: API Key 存储在 `.env` 文件中，该文件已经被添加到 `.gitignore`，不会被提交到版本控制系统。请确保不要在代码中硬编码 API Key。

### Q: 可以使用本地部署的 LLM 吗？

A: 可以，只要它提供 OpenAI 兼容的 API 接口。你需要在 `.env` 文件中配置 `CUSTOM_LLM_API_KEY`、`CUSTOM_LLM_BASE_URL` 和 `CUSTOM_LLM_MODEL`。
