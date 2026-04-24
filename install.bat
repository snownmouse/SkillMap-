@echo off
chcp 65001 >nul 2>&1

echo ====================================
echo   SkillMap 安装脚本
echo ====================================
echo.
echo 此脚本将帮助您安装 SkillMap 所需的环境
echo.
pause

rem 检查 Node.js 是否已安装
echo [步骤1] 检查 Node.js 安装情况...
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js LTS 版本
    echo 下载地址: https://nodejs.org/zh-cn/
    echo.
    pause
    exit /b 1
)

rem 显示 Node.js 版本
echo [信息] Node.js 版本:
node -v
echo [信息] npm 版本:
npm -v
echo.
pause

rem 检查是否在项目目录
echo [步骤2] 检查项目目录...
if not exist "package.json" (
    echo [错误] 未找到 package.json，请在项目根目录运行此脚本
    pause
    exit /b 1
)

rem 复制环境配置文件
echo [步骤3] 配置环境文件...
if not exist ".env" (
    if exist ".env.example" (
        echo [步骤3.1] 创建环境配置文件...
        copy ".env.example" ".env" >nul
        if %errorLevel% neq 0 (
            echo [错误] 无法创建 .env 文件，请检查权限
            pause
            exit /b 1
        )
        echo [完成] 已创建 .env 文件，请编辑此文件配置 API Key
    ) else (
        echo [警告] 未找到 .env.example 文件，请手动创建 .env 文件
    )
) else (
    echo [跳过] .env 文件已存在
)
echo.
pause

rem 安装依赖
echo [步骤4] 安装项目依赖...
echo 这可能需要一些时间，请耐心等待...
call npm install
if %errorLevel% neq 0 (
    echo [错误] 依赖安装失败，请检查网络连接或 npm 配置
    echo 尝试使用 npm install --registry=https://registry.npmmirror.com 命令 
    pause
    exit /b 1
)
echo [完成] 依赖安装成功
echo.
pause

rem 创建数据目录
echo [步骤5] 准备数据目录...
if not exist "data" (
    mkdir data
    if %errorLevel% neq 0 (
        echo [错误] 无法创建数据目录，请检查权限
        pause
        exit /b 1
    )
)
echo [完成] 数据目录已就绪
echo.
pause

rem 显示完成信息
echo ====================================
echo   SkillMap 安装完成！
echo ====================================
echo.
echo 使用说明：
echo   1. 配置 API Key：
echo      编辑 .env 文件，填写 LLM 提供商的 API Key
echo      支持的提供商：ark / siliconflow / deepseek / gemini / 自定义       
echo.
echo   2. 启动应用：
echo      npm run dev
echo.
echo   3. 访问应用：
echo      打开浏览器，访问 http://localhost:3008
echo.
echo 注意事项：
echo   - 首次运行时会自动创建数据库
echo   - 确保端口 3008 未被其他应用占用
echo   - 如需修改端口，请编辑 .env 文件中的 PORT 参数
echo   - 如果遇到 WebSocket 端口冲突（如 24678），请关闭其他 Node.js 进程
echo.
echo 常见问题解决：
echo   1. 端口被占用：
echo      - 查看占用端口的进程：netstat -ano | findstr :端口号
echo      - 结束占用端口的进程：taskkill /PID 进程ID /F
echo   2. 依赖安装失败：
echo      - 使用国内镜像：npm install --registry=https://registry.npmmirror.com
echo   3. WebSocket 错误：
echo      - 确保没有其他 Vite 开发服务器在运行
echo      - 尝试重启计算机释放端口
echo.
echo 按任意键退出...
pause
