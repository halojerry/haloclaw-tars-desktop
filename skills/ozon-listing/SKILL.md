# Ozon-Listing Skill

## 概述

Ozon-Listing 是 HaloClaw 电商 AI 助手的商品上架模块，自动化处理从选品到上架的全流程。

## 功能特性

### 1. 产品信息生成
- **标题优化**：AI 生成符合 Ozon SEO 的产品标题
- **关键词提取**：从标题和描述中提取搜索关键词
- **属性填充**：根据类目自动填充必填属性

### 2. 图片处理
- **AI 抠图**：移除背景，生成白底图
- **图片生成**：AI 生成场景图、细节图
- **多图处理**：支持批量处理商品图片

### 3. 价格策略
- **成本计算**：基于 1688 货源成本计算售价
- **利润优化**：考虑运费、佣金、平台活动定价
- **竞品对标**：参考同类产品价格区间

### 4. MCP 工具接口

```typescript
// 上架参数
interface ListingParams {
  source_sku: string;         // 货源SKU
  ozon_category_id: string;   // Ozon类目ID
  title?: string;             // 产品标题(AI生成)
  description?: string;        // 产品描述
  images?: string[];          // 产品图片URLs
  price: number;              // 售价(RUB)
  weight?: number;            // 重量(kg)
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  attributes?: Record<string, any>;  // 类目属性
}

// 上架结果
interface ListingResult {
  ozon_product_id: string;
  sku: string;
  status: 'pending' | 'published' | 'failed';
  errors?: string[];
  warnings?: string[];
}
```

### 5. 核心工具

| 工具 | 功能 | 调用频率 |
|------|------|----------|
| `ozon_pricing` | 计算最优售价 | ≤10次/小时/商品 |
| `ozon_category` | 获取类目和属性 | 无限制 |
| `ozon_listing` | 批量上架商品 | ≤80次/分钟 |
| `ozon_image_gen` | AI生成产品图 | 视配额 |

### 6. 工作流

```
货源确定 → 生成标题 → 处理图片 → 计算价格 → 填充属性 → 上架Ozon
    ↓           ↓          ↓          ↓          ↓          ↓
  SKU识别   标题优化    AI抠图/生成  成本利润分析 必填项检查   API提交
```

### 7. 必填参数清单

根据 Ozon API 要求：

- [ ] 品牌属性 (attr_id: 4180)
- [ ] 型号属性 (attr_id: 9048)
- [ ] 完整尺寸（长宽高 cm）
- [ ] 重量（kg）
- [ ] 货币单位（CNY）
- [ ] 图片（至少1张）
- [ ] 类目属性（按类目要求）

### 8. 错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| `PRODUCT_HAS_NOT_BEEN_TAGGED_YET` | 缺少尺寸重量 | 补充参数后重试 |
| `PRICE_IS_NOT_SENT` | 价格未设置 | 等待价格隔离期 |
| `Неверно указана валюта` | 货币错误 | 使用 CNY 单位 |
| `VALIDATION_ERROR` | 参数校验失败 | 检查必填项 |

### 9. 使用示例

```markdown
用户: "帮我上架这个产品：[1688链接]"
助手: 调用 ozon-listing skill
    1. 获取货源信息和图片
    2. 搜索合适的Ozon类目
    3. AI生成标题和描述
    4. 计算最优售价
    5. 提交上架
    返回: 上架状态和SKU
```

## 集成配置

```json
{
  "mcpServers": {
    "ozon-listing": {
      "command": "npx",
      "args": ["@haloclaw/ozon-listing-mcp"]
    }
  }
}
```

## 注意事项

1. **IP 白名单**：服务器 IP 需在 Ozon Seller 后台添加
2. **价格隔离**：修改价格后有冷却期，建议分步调整
3. **图片规范**：尺寸 ≥ 800x800，格式 JPG/PNG
4. **属性匹配**：严格按照 Ozon 类目属性要求填写
