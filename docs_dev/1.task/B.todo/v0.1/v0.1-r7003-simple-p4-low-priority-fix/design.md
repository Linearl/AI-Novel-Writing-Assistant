---
description: "P4 问题修复技术设计文档"
---

# 技术设计文档

## 1. 正面发现记录

### 1.1 记录位置

正面发现记录到项目 Wiki 或 README 中：

```markdown
## 代码审计正面发现

### 安全方面
- ✅ Client 端无 XSS 漏洞
- ✅ .env 文件已正确 gitignore
- ✅ 输入验证覆盖率良好
- ✅ 无命令注入风险

### 代码质量
- ✅ TODO 标记极少，代码整洁
- ✅ 命名规范良好

### 性能优化
- ✅ 前端路由已全部使用 React.lazy 懒加载
- ✅ useSSE hook 和多个组件正确使用 useCallback/useMemo
```

## 2. 稳定性修复

### 2.1 STB-005/006/007: 空 catch 添加日志

```typescript
// 修复前
.catch(() => {})

// 修复后
.catch((error) => {
  logger.debug('Operation failed', { error: error.message })
})
```

### 2.2 STB-013: Timer unref

```typescript
// 修复前
const timer = setInterval(() => { ... }, 1000)

// 修复后
const timer = setInterval(() => { ... }, 1000)
timer.unref()
```

### 2.3 STB-015: Promise catch

```typescript
// 修复前
void ragWorker.start()

// 修复后
ragWorker.start().catch((error) => {
  logger.error('RAG worker start failed', { error: error.message })
})
```

## 3. 可维护性修复

### 3.1 MAINT-021: 环境变量类型声明

```typescript
// client/src/env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_ENABLE_DEBUG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 3.2 MAINT-023: 删除注释代码

直接删除 `skeleton.prompts.ts` 中 33 行注释掉的旧版代码。

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 日志过多 | 使用 debug 级别，生产环境可关闭 |
| 类型声明不完整 | 参考 Vite 文档补充 |
