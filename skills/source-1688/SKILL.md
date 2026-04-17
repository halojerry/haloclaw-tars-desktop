# Source-1688 Skill

## 概述

Source-1688 是 HaloClaw 电商 AI 助手的货源匹配模块，通过对接 1688 平台实现优质供应商筛选和货源匹配。

## 功能特性

### 1. 货源搜索
- **关键词搜索**：基于 Ozon 产品标题搜索 1688 同款
- **图搜货源**：支持上传图片以图搜货
- **供应商筛选**：按诚信等级、成交量、服务评分筛选

### 2. 价格分析
- **阶梯价格**：获取不同拿货量的单价
- **拿样服务**：支持小额拿样测试
- **代发服务**：识别支持一件代发的供应商

### 3. 数据对接
- **1688 Open API**：官方接口获取商品和供应商信息
- **Playwright 爬虫**：GUI 自动化获取页面数据
- **Supabase**：存储货源匹配结果

### 4. MCP 工具接口

```typescript
// 货源搜索参数
interface SourceSearchParams {
  keywords: string;           // 搜索关键词
  category_id?: string;        // 类目ID
  min_price?: number;         // 最低价(CNY)
  max_price?: number;         // 最高价(CNY)
  supplier_rating?: number;    // 供应商评分要求
  support_dropship?: boolean; // 支持代发
}

// 货源信息
interface SourceProduct {
  source_id: string;          // 1688商品ID
  title: string;
  price: number;              // 起批量价格
  min_order: number;         // 最小起订量
  supplier: {
    id: string;
    name: string;
    rating: number;
    credit_level: string;
  };
  images: string[];
  freight_template: string;
  support_dropship: boolean;
  match_score: number;        // 与Ozon产品的匹配度
}
```

### 5. 工作流

```
Ozon 选品确定
    ↓
提取产品关键特征
    ↓
搜索 1688 同款货源
    ↓
筛选优质供应商
    ↓
对比价格和利润
    ↓
生成货源报告
    ↓
存入 Supabase 货源库
```

### 6. 使用示例

```markdown
用户: "帮我找这个产品的1688货源：[产品链接]"
助手: 调用 source-1688 skill
    - 识别产品特征
    - 搜索1688同款
    - 筛选供应商
    - 返回最佳货源推荐
```

## 认证配置

1688 API 需要以下认证信息：

```bash
# .env 配置
CHINESE_APP_KEY=your_app_key
CHINESE_APP_SECRET=your_app_secret
CHINESE_ACCESS_TOKEN=your_access_token
```

## 注意事项

1. 需要 1688 账号登录 Cookie 用于 Playwright 爬取
2. 遵守平台反爬策略，设置合理的请求间隔
3. 货源信息需人工核实后再下单
4. 汇率按实时或每日更新
