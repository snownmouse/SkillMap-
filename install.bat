@echo off
chcp 65001 >nul 2>&1

echo ====================================
echo   SkillMap 安装脚本
echo ====================================
echo.

rem 检查 Node.js 是否已安装
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

rem 检查是否在项目目录
if not exist "package.json" (
    echo [错误] 未找到 package.json，请在项目根目录运行此脚本
    pause
    exit /b 1
)

rem 复制环境配置文件
if not exist ".env" (
    if exist ".env.example" (
        echo [步骤1] 创建环境配置文件...
        copy ".env.example" ".env" >nul
        echo [完成] 已创建 .env 文件，请编辑此文件配置 API Key
    ) else (
        echo [警告] 未找到 .env.example 文件，请手动创建 .env 文件
    )
) else (
    echo [跳过] .env 文件已存在
)
echo.

rem 安装依赖
echo [步骤2] 安装项目依赖...
call npm install
if %errorLevel% neq 0 (
    echo [错误] 依赖安装失败，请检查网络连接或 npm 配置
    pause
    exit /b 1
)
echo [完成] 依赖安装成功
echo.

rem 创建数据目录
if not exist "data" mkdir data
echo [完成] 数据目录已就绪
echo.

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
echo      打开浏览器，访问 http://localhost:3000
echo.
echo 注意事项：
echo   - 首次运行时会自动创建数据库
echo   - 确保端口 3000 未被其他应用占用
echo   - 如需修改端口，请编辑 .env 文件中的 PORT 参数
echo.
pause
