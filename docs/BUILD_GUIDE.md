# 构建部署指南

本指南详细说明如何构建和部署 SkillMap 项目。

## 1. 构建生产版本

在部署项目之前，你需要构建生产版本。生产版本会对代码进行优化，提高性能和安全性。

### 1.1 构建步骤

1. **确保环境变量配置正确**：
   ```env
   # 生产环境配置
   NODE_ENV=production
   CORS_ORIGIN=https://your-production-domain.com
   ```

2. **运行构建命令**：
   ```bash
   npm run build
   ```

3. **构建完成**：
   构建完成后，会在 `dist` 目录生成优化后的生产文件。

### 1.2 构建产物

构建产物包括：
- **静态资源**：HTML、CSS、JavaScript 文件
- **优化后的代码**：压缩和混淆后的 JavaScript
- **资源映射**：用于调试的 source map 文件

## 2. 本地预览

构建完成后，你可以在本地预览生产版本：

```bash
npm run preview
```

这会启动一个本地服务器，模拟生产环境的部署效果。

## 3. 部署选项

### 3.1 静态网站托管

如果你只需要前端功能，可以将 `dist` 目录部署到任何静态网站托管服务：

- **Vercel**：[https://vercel.com/](https://vercel.com/)
- **Netlify**：[https://www.netlify.com/](https://www.netlify.com/)
- **GitHub Pages**：[https://pages.github.com/](https://pages.github.com/)
- **AWS S3**：[https://aws.amazon.com/s3/](https://aws.amazon.com/s3/)

### 3.2 完整部署（前端 + 后端）

如果你需要完整的功能（包括后端 API 和数据库），需要部署到支持 Node.js 的服务器：

#### 3.2.1 服务器要求

- **Node.js**：v16.0 或更高版本
- **npm**：v7.0 或更高版本
- **存储空间**：至少 1GB 可用空间
- **网络**：可访问 LLM API

#### 3.2.2 部署步骤

1. **准备服务器**：
   - 安装 Node.js 和 npm
   - 配置防火墙，开放端口 3000

2. **上传项目**：
   - 将项目文件上传到服务器
   - 或者使用 git 克隆项目

3. **安装依赖**：
   ```bash
   npm install --production
   ```

4. **配置环境变量**：
   - 创建 `.env` 文件
   - 填写生产环境配置

5. **启动服务器**：
   ```bash
   # 使用 PM2 管理进程
   npm install -g pm2
   pm2 start npm --name "skillmap" -- run start
   ```

6. **配置反向代理**（可选）：
   - 使用 Nginx 或 Apache 配置反向代理
   - 添加 HTTPS 证书

### 3.3 Docker 部署

你也可以使用 Docker 部署项目：

1. **创建 Dockerfile**：
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm install --production
   
   COPY . .
   
   RUN npm run build
   
   EXPOSE 3000
   
   CMD ["npm", "run", "start"]
   ```

2. **构建镜像**：
   ```bash
   docker build -t skillmap .
   ```

3. **运行容器**：
   ```bash
   docker run -p 3000:3000 --env-file .env skillmap
   ```

## 4. 环境变量配置

生产环境中，建议配置以下环境变量：

```env
# 服务器配置
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-production-domain.com

# LLM 配置
LLM_PROVIDER=ark
ARK_API_KEY=your_ark_api_key

# 数据库配置
DB_PATH=/path/to/skillmap.db
```

## 5. 数据库管理

### 5.1 备份数据库

定期备份数据库文件：

```bash
# 备份数据库
cp data/skillmap.db data/skillmap_$(date +%Y%m%d).db
```

### 5.2 迁移数据库

如果需要迁移数据库到新服务器：

1. **备份原数据库**：
   ```bash
   cp data/skillmap.db skillmap_backup.db
   ```

2. **复制到新服务器**：
   ```bash
   scp skillmap_backup.db user@new-server:/path/to/skillmap/data/
   ```

3. **恢复数据库**：
   ```bash
   cp skillmap_backup.db data/skillmap.db
   ```

## 6. 性能优化

### 6.1 前端优化

- **启用 gzip 压缩**：在服务器配置中启用 gzip 压缩
- **使用 CDN**：将静态资源部署到 CDN
- **缓存策略**：配置合理的缓存策略

### 6.2 后端优化

- **连接池**：使用数据库连接池
- **缓存**：缓存频繁访问的数据
- **负载均衡**：如果流量较大，使用负载均衡

## 7. 监控和维护

### 7.1 日志管理

- **应用日志**：使用 PM2 或其他进程管理工具收集日志
- **错误监控**：使用 Sentry 等工具监控错误
- **性能监控**：使用 New Relic 等工具监控性能

### 7.2 定期维护

- **更新依赖**：定期更新项目依赖
- **备份数据**：定期备份数据库
- **检查安全漏洞**：使用 npm audit 检查安全漏洞

## 8. 常见问题

### Q: 部署后无法访问 LLM API

A: 检查服务器的网络连接，确保可以访问 LLM API 提供商的服务。

### Q: 部署后页面加载缓慢

A: 检查服务器性能，启用 gzip 压缩，使用 CDN 加速静态资源。

### Q: 数据库连接失败

A: 检查数据库文件权限，确保 Node.js 进程有读写权限。

### Q: 生产环境中 LLM 调用失败

A: 检查 API Key 是否有效，网络连接是否稳定，以及 LLM 提供商是否有服务中断。

## 9. 故障排除

### 9.1 服务器启动失败

- 检查端口是否被占用
- 检查环境变量是否正确配置
- 检查依赖是否正确安装

### 9.2 API 响应缓慢

- 检查 LLM 提供商的响应速度
- 优化数据库查询
- 考虑使用缓存

### 9.3 内存使用过高

- 检查是否有内存泄漏
- 优化代码，减少内存使用
- 考虑增加服务器内存

---

希望本指南能够帮助你成功部署 SkillMap 项目！
