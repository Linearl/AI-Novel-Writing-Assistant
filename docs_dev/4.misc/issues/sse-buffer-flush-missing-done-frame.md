# SSE 流结束时缓冲区帧丢失导致修复状态卡住

**状态**: 已修复
**影响版本**: 当前 main 分支
**严重程度**: 中 — 修复完成后前端仍显示"修复中"

## 问题描述

用户执行章节修复后，即使修复已完成，前端仍显示"修复中"状态，刷新页面后显示"已修复"但 `chapterStatus` 仍为 `needs_repair`。

## 根因分析

### 问题 1：SSE 缓冲区帧丢失

`useSSE` hook 在 SSE 流结束时没有处理缓冲区中剩余的帧：

```typescript
// useSSE.ts - 修复前
while (true) {
  const { value, done } = await reader.read();
  if (done) {
    break;  // ← 直接跳出，buffer 中可能还有未处理的帧
  }
  // ... 处理帧
}
// buffer 中剩余的帧被丢弃
```

SSE 协议使用 `\n\n` 作为帧分隔符。在循环中，`frames.pop()` 会移除最后一个元素（可能是不完整的帧），然后处理剩余的帧。但是当循环结束时，`buffer` 中可能还有未处理的帧（包括最后一个 `done` 帧）。

**结果**：

1. 最后一个 `done` 帧没有被处理
2. `isStreaming` 一直是 `true`
3. `activeRepairStream` 没有被清空
4. 前端一直显示"修复中"

### 问题 2：修复完成时未更新 chapterStatus

`ChapterRepairStreamRuntime.finalizeRepairResult()` 在审校通过后只更新了 `generationState`，没有更新 `chapterStatus`：

```typescript
// ChapterRepairStreamRuntime.ts - 修复前
if (isPass(review.score)) {
  await prisma.chapter.update({
    where: { id: input.chapterId },
    data: { generationState: "approved" },  // ← 只更新了 generationState
  });
}
```

**结果**：

1. `generationState` 正确更新为 `approved`
2. `chapterStatus` 仍为 `needs_repair`
3. 刷新页面后显示"已修复"但状态不一致

## 复现步骤

1. 打开小说编辑页面
2. 选择一个章节，点击"修复"
3. 等待修复完成
4. 观察前端状态，仍显示"修复中"
5. 刷新页面后状态恢复正常（但 `chapterStatus` 仍为 `needs_repair`）

## 修复方案

### 修复 1：SSE 缓冲区帧处理

在循环结束后处理缓冲区中剩余的帧：

```typescript
// useSSE.ts - 修复后
while (true) {
  const { value, done } = await reader.read();
  if (done) {
    break;
  }
  // ... 处理帧
}

// 处理缓冲区中剩余的帧（包括最后一个 done 帧）
if (buffer.trim()) {
  const payloadLine = buffer
    .split("\n")
    .find((line) => line.startsWith("data:"));
  if (payloadLine) {
    const rawData = payloadLine.replace("data:", "").trim();
    if (rawData) {
      const frame = JSON.parse(rawData) as SSEFrame;
      handleFrame(frame);
    }
  }
}
```

### 修复 2：修复完成时同步更新 chapterStatus

```typescript
// ChapterRepairStreamRuntime.ts - 修复后
if (isPass(review.score)) {
  await prisma.chapter.update({
    where: { id: input.chapterId },
    data: {
      generationState: "approved",
      chapterStatus: "completed",  // ← 同步更新 chapterStatus
    },
  });
}
```

## 变更文件

- `client/src/hooks/useSSE.ts` — SSE 缓冲区处理
- `server/src/services/novel/runtime/repair/ChapterRepairStreamRuntime.ts` — chapterStatus 更新

## 影响范围

- 所有使用 SSE 流的功能（章节生成、修复、Bible 生成等）
- 修复后 SSE 流结束时的帧处理更加可靠
