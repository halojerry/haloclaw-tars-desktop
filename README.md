# HaloClaw Desktop

Ozon电商AI助手，基于字节跳动 [UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop) 构建。

## 功能特性

- 🤖 **AI Agent**: 内置 GUI Agent 和浏览器自动化能力
- 🛒 **电商 Skills**: Ozon选品、1688货源匹配、商品上架
- 🔐 **Supabase 认证**: 用户注册/登录/配额管理
- 💰 **NewAPI 计费**: 自动同步用户计费系统

## 快速开始

```bash
# 1. Clone 原项目
git clone https://github.com/bytedance/UI-TARS-desktop.git
cd UI-TARS-desktop

# 2. 下载改造文件，覆盖到对应位置

# 3. 配置环境变量
cp apps/ui-tars/.env.example apps/ui-tars/.env
# 编辑 .env 填入 Supabase/NewAPI 配置

# 4. 安装依赖
pnpm install

# 5. 启动开发
pnpm run dev:ui-tars
```

## Skills 目录

- `skills/ozon-selection/` - Ozon蓝海选品
- `skills/source-1688/` - 1688货源匹配
- `skills/ozon-listing/` - 商品自动上架

## License

Apache 2.0 (继承自 UI-TARS-desktop)
