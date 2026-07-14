---
description: "REQ-7058: 环境变量启动校验 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7058: 环境变量启动校验 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `server/src/config/` 下新增环境变量校验模块，在服务启动入口（`app.ts`）中执行。

```
调用链路：
server启动 → loadEnvConfig()
  ↓
validateEnvironment()
  ↓
校验通过 → 继续启动
校验失败 → 输出错误 + 进程退出
```

### 1.2 核心组件

```typescript
// 新增文件：server/src/config/envValidator.ts

export interface EnvVariableDefinition {
  name: string;
  required: boolean;
  defaultValue?: string;
  validator?: (value: string) => boolean;
  description: string;
  example: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: EnvValidationError[];
  warnings: EnvValidationWarning[];
}

export interface EnvValidationError {
  name: string;
  message: string;
  suggestion: string;
}

export interface EnvValidationWarning {
  name: string;
  message: string;
}
```

## 2. 详细设计

### 2.1 变量定义

```typescript
const ENV_VARIABLES: EnvVariableDefinition[] = [
  // 必填变量
  {
    name: 'API_KEY',
    required: true,
    validator: (v) => v.length >= 10,
    description: 'LLM API密钥',
    example: 'sk-xxxx',
  },
  {
    name: 'DATABASE_URL',
    required: true,
    validator: (v) => v.startsWith('sqlite:') || v.startsWith('postgresql://'),
    description: '数据库连接字符串',
    example: 'sqlite:./data/dev.db',
  },
  {
    name: 'LLM_PROVIDER',
    required: true,
    validator: (v) => ['openai', 'anthropic', 'custom'].includes(v),
    description: 'LLM服务提供商',
    example: 'openai',
  },

  // 可选变量
  {
    name: 'PORT',
    required: false,
    defaultValue: '13000',
    validator: (v) => {
      const port = parseInt(v, 10);
      return !isNaN(port) && port >= 1 && port <= 65535;
    },
    description: '服务端口',
    example: '13000',
  },
  {
    name: 'RAG_ENABLED',
    required: false,
    defaultValue: 'false',
    validator: (v) => ['true', 'false'].includes(v),
    description: '是否启用RAG功能',
    example: 'false',
  },
  {
    name: 'LOG_LEVEL',
    required: false,
    defaultValue: 'info',
    validator: (v) => ['debug', 'info', 'warn', 'error'].includes(v),
    description: '日志级别',
    example: 'info',
  },
];
```

### 2.2 校验逻辑

```typescript
export function validateEnvironment(): ValidationResult {
  const errors: EnvValidationError[] = [];
  const warnings: EnvValidationWarning[] = [];

  for (const def of ENV_VARIABLES) {
    const value = process.env[def.name];

    if (value === undefined || value === '') {
      if (def.required) {
        errors.push({
          name: def.name,
          message: `Missing required environment variable: ${def.name}`,
          suggestion: `Set ${def.name}=${def.example} in server/.env`,
        });
      } else if (def.defaultValue) {
        process.env[def.name] = def.defaultValue;
        warnings.push({
          name: def.name,
          message: `${def.name} not set, using default: ${def.defaultValue}`,
        });
      }
      continue;
    }

    if (def.validator && !def.validator(value)) {
      errors.push({
        name: def.name,
        message: `Invalid value for ${def.name}: "${value}"`,
        suggestion: `Expected format: ${def.description}. Example: ${def.example}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

### 2.3 启动报告输出

```typescript
export function printValidationReport(result: ValidationResult): void {
  console.log('\n=== Environment Configuration Report ===\n');

  // 显示警告
  for (const warning of result.warnings) {
    console.log(`  \x1b[33m⚠\x1b[0m ${warning.name}: ${warning.message}`);
  }

  // 显示必填变量状态
  const requiredVars = ENV_VARIABLES.filter(v => v.required);
  console.log('\n  Required Variables:');
  for (const def of requiredVars) {
    const value = process.env[def.name];
    if (value) {
      const masked = def.name.includes('KEY') ? value.slice(0, 4) + '***' : value;
      console.log(`  \x1b[32m✓\x1b[0m ${def.name}: ${masked}`);
    } else {
      console.log(`  \x1b[31m✗\x1b[0m ${def.name}: NOT SET`);
    }
  }

  // 显示可选变量状态
  const optionalVars = ENV_VARIABLES.filter(v => !v.required);
  console.log('\n  Optional Variables:');
  for (const def of optionalVars) {
    const value = process.env[def.name] ?? def.defaultValue ?? '(not set)';
    console.log(`  \x1b[36m○\x1b[0m ${def.name}: ${value}`);
  }

  // 错误汇总
  if (result.errors.length > 0) {
    console.log('\n\x1b[31mErrors:\x1b[0m');
    for (const error of result.errors) {
      console.log(`  \x1b[31m✗\x1b[0m ${error.name}: ${error.message}`);
      console.log(`    \x1b[90m${error.suggestion}\x1b[0m`);
    }
  }

  console.log('\n========================================\n');
}
```

### 2.4 集成到启动流程

```typescript
// server/src/app.ts 修改

import { validateEnvironment, printValidationReport } from './config/envValidator';

async function main() {
  // 启动校验
  const validation = validateEnvironment();
  printValidationReport(validation);

  if (!validation.valid) {
    console.error('Environment validation failed. Please fix the errors above.');
    process.exit(1);
  }

  // 继续正常启动...
  await startServer();
}

main().catch(console.error);
```

## 3. 数据模型

无需新增数据模型。

## 4. 接口设计

### 4.1 REST API（可选）

```
GET /api/admin/env-check  - 查询环境变量校验状态（管理接口）
```

## 5. 实现步骤

### Phase 1: 核心校验逻辑（0.15天）

1. 创建envValidator.ts
2. 定义变量校验规则
3. 实现校验逻辑

### Phase 2: 报告输出和集成（0.1天）

1. 实现彩色报告输出
2. 集成到app.ts启动流程
3. 实现快速失败逻辑

### Phase 3: 测试（0.05天）

1. 单元测试：各变量校验规则
2. 集成测试：完整校验流程
3. 边界用例：空值、无效格式

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 误报 | 正常配置无法启动 | 低 | 校验规则准确+可配置 |
| 向后兼容 | 现有部署受影响 | 低 | 渐进式引入+警告模式 |

## 7. 交付物

- [ ] `server/src/config/envValidator.ts` - 校验逻辑
- [ ] 修改 `server/src/app.ts` 集成校验
- [ ] 单元测试
