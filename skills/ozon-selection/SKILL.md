# Ozon-Selection Skill

## 概述

Ozon-Selection 是 HaloClaw 电商 AI 助手的核心选品模块，基于 MCP 协议实现蓝海产品智能筛选功能。

## 功能特性

### 1. 蓝海产品挖掘
- **竞争度分析**：通过 Ozon API 获取类目销量、评论数、卖家数量
- **利润率评估**：结合成本、运费、汇率计算预期利润率
- **趋势预测**：分析产品历史数据，预测未来市场需求

### 2. 数据源
- Ozon Seller API：产品目录、价格、评价数据
- Supabase 数据库：存储选品结果和分析数据
- NewAPI：AI 模型调用（产品分析、文案生成）

### 3. 筛选指标
| 指标 | 说明 | 阈值建议 |
|------|------|----------|
| 月销量 | 过去30天销量 | 100-500 |
| 评论数 | 产品评价数量 | <50 |
| 卖家数 | 在售卖家数量 | <10 |
| 平均价格 | 竞品均价 | 1500-5000 RUB |
| 利润率 | 预期净利润率 | >25% |

### 4. MCP 工具接口

```typescript
// 选品搜索
interface SelectionSearchParams {
  category_id?: string;      // 类目ID
  min_price?: number;         // 最低价(RUB)
  max_price?: number;         // 最高价(RUB)
  keywords?: string[];        // 关键词
  sort_by?: 'sales' | 'price' | 'rating';
}

// 获取蓝海产品列表
interface BlueOceanProduct {
  sku_id: string;
  title: string;
  category_id: string;
  current_price: number;
  monthly_sales: number;
  review_count: number;
  seller_count: number;
  margin_estimate: number;
  competition_level: 'low' | 'medium' | 'high';
  recommendation: string;
}
```

### 5. 工作流

```
用户输入选品需求
    ↓
解析需求（关键词/类目/价格区间）
    ↓
调用 ozon_pricing MCP 工具获取产品数据
    ↓
AI 分析竞争度和利润率
    ↓
存入 Supabase 选品池
    ↓
返回精选产品列表
```

### 6. 使用示例

```markdown
用户: "帮我找一些宠物用品类的蓝海产品"
助手: 调用 ozon-selection skill
    - 搜索宠物类目
    - 筛选低竞争产品
    - 计算预期利润
    - 返回TOP 10蓝海产品
```

## 集成方式

通过 MCP 协议接入 HaloClaw：

```json
{
  "mcpServers": {
    "ozon-selection": {
      "command": "npx",
      "args": ["@haloclaw/ozon-selection-mcp"]
    }
  }
}
```

## 依赖项

- `@supabase/supabase-js`：数据存储
- `newapi-sdk`：AI 分析能力
- `@ozon/api-client`：Ozon 接口调用

## 注意事项

1. 遵守 Ozon API 频率限制（库存≤80次/分钟）
2. 定期更新汇率数据
3. 选品结果需人工审核后再上架
