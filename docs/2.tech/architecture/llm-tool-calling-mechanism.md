---
description: "LLM 工具调用机制详解 — 从LLM响应到数据库写入的完整流程"
created: 2026-07-11
updated: 2026-07-11
status: active
---

# LLM 工具调用机制

> 本文档详细解释项目中LLM工具调用的完整流程，包括LLM响应解析、工具执行、数据库写入等关键环节。

---

## 1. 核心概念

### 什么是工具调用？

LLM可以"调用"外部工具来获取信息或执行操作。这不是LLM直接执行代码，而是：

```
LLM说："我需要调用XXX工具，参数是..."
  ↓
系统检测到工具调用请求
  ↓
系统执行对应的工具函数
  ↓
系统把结果返回给LLM
  ↓
LLM基于结果生成最终回答
```

### 为什么需要工具调用？

- **获取实时信息**：查询数据库、调用API
- **执行操作**：创建记录、更新状态
- **扩展能力**：LLM本身只能生成文本，工具让它能做更多事

---

## 2. LLM响应格式

### 工具调用响应示例

```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_xxx123",
      "type": "function",
      "function": {
        "name": "list_base_characters",
        "arguments": "{\"category\": \"hero\", \"limit\": 10}"
      }
    }
  ]
}
```

### 字段说明

| 字段 | 说明 |
|------|------|
| `role` | 消息角色，`assistant`表示来自LLM |
| `content` | 文本内容，工具调用时为`null` |
| `tool_calls` | 数组，包含所有工具调用请求 |
| `tool_calls[].id` | 唯一标识，用于匹配结果 |
| `tool_calls[].function.name` | 工具名称 |
| `tool_calls[].function.arguments` | JSON字符串，包含参数 |

### 关键点

1. **content为null** → LLM没有直接输出文本，而是请求调用工具
2. **tool_calls是数组** → 可能同时调用多个工具
3. **arguments是字符串** → 需要JSON.parse解析

---

## 3. 工具定义结构

### AgentToolDefinition 接口

```typescript
interface AgentToolDefinition<Input, Output> {
  name: string;                    // 工具名称
  title: string;                   // 标题
  description: string;             // 描述
  category: 'read' | 'write';      // 类别：读操作 or 写操作
  riskLevel: 'low' | 'medium' | 'high';  // 风险等级
  domainAgent: string;             // 所属领域Agent
  resourceScopes: string[];        // 资源范围
  
  inputSchema: ZodSchema<Input>;   // 输入参数Schema
  outputSchema: ZodSchema<Output>; // 输出结果Schema
  
  execute: (                       // ★★★ 实际执行函数 ★★★
    context: ToolExecutionContext,
    input: Input
  ) => Promise<Output>;
}
```

### 工具定义示例

```typescript
// server/src/agents/tools/characterTools.ts

export const characterToolDefinitions = {
  list_base_characters: {
    name: "list_base_characters",
    title: "列出基础角色模板",
    description: "读取基础角色库的模板列表",
    category: "read",
    riskLevel: "low",
    
    inputSchema: z.object({
      category: z.string().optional(),
      limit: z.number().optional().default(20),
    }),
    
    outputSchema: z.object({
      items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        role: z.string(),
      })),
      summary: z.string(),
    }),
    
    // ★★★ 实际执行函数 ★★★
    execute: async (context, input) => {
      // 1. 验证输入
      const validatedInput = schema.parse(input);
      
      // 2. 执行数据库查询
      const rows = await prisma.baseCharacter.findMany({
        where: { category: validatedInput.category },
        take: validatedInput.limit,
      });
      
      // 3. 返回结果
      return {
        items: rows,
        summary: `已读取 ${rows.length} 个角色`,
      };
    },
  },
};
```

---

## 4. 完整调用流程

### 流程图

```
用户调用LLM
  ↓
系统发送请求到LLM API（带tools定义）
  ↓
LLM分析请求，决定调用工具
  ↓
LLM返回响应（包含tool_calls）
  ↓
★ 系统检测到tool_calls ★
  ↓
对每个tool_call：
  ├─ 获取工具定义（从toolRegistry）
  ├─ 解析输入参数（Zod schema验证）
  ├─ 执行execute函数（实际操作）
  ├─ 解析输出结果（Zod schema验证）
  └─ 保存结果到数据库
  ↓
将所有工具结果返回给LLM
  ↓
LLM基于结果生成最终回答
  ↓
返回给用户
```

### 详细步骤

#### Step 1: 发送请求

```typescript
// server/src/llm/structuredInvoke.ts

const response = await llm.invoke({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "list_base_characters",
        description: "列出基础角色库",
        parameters: { /* Zod schema转JSON Schema */ }
      }
    }
  ]
});
```

#### Step 2: 检测tool_calls

```typescript
// server/src/agents/runtime/RunExecutionService.ts

// LLM响应
const response = await llm.invoke(...);

// 检测是否有tool_calls
if (response.tool_calls && response.tool_calls.length > 0) {
  // 对每个tool_call执行
  for (const toolCall of response.tool_calls) {
    await executeToolCall(context, toolCall);
  }
}
```

#### Step 3: 执行工具

```typescript
// server/src/agents/runtime/RunExecutionService.ts

private async executeToolCall(
  context: ToolExecutionContext,
  call: ToolCall
): Promise<ToolExecutionResult> {
  
  // 1. 获取工具定义
  const definition = getAgentToolDefinition(call.function.name);
  
  // 2. 解析输入参数
  const input = definition.inputSchema.parse(
    JSON.parse(call.function.arguments)
  );
  
  // 3. 执行工具
  const output = await definition.execute(context, input);
  
  // 4. 保存结果到数据库
  await this.store.addStep({
    stepType: "tool_call",
    toolName: call.function.name,
    input: input,
    output: output,
    status: "succeeded"
  });
  
  return { tool: call.function.name, success: true, output };
}
```

#### Step 4: 返回结果给LLM

```typescript
// 构建tool_results消息
const toolResults = executedTools.map(tool => ({
  role: 'tool',
  tool_call_id: tool.callId,
  content: JSON.stringify(tool.output)
}));

// 发送给LLM
const finalResponse = await llm.invoke({
  messages: [
    ...previousMessages,
    { role: 'assistant', tool_calls: originalToolCalls },
    ...toolResults
  ]
});
```

---

## 5. 代码位置

### 关键文件

| 文件 | 作用 | 行号 |
|------|------|------|
| `server/src/agents/runtime/RunExecutionService.ts` | 工具执行服务 | 第68-221行 |
| `server/src/agents/toolRegistry.ts` | 工具注册表 | 第15-26行, 第71-73行 |
| `server/src/agents/tools/*.ts` | 各工具定义 | 各文件的execute函数 |
| `server/src/llm/structuredInvoke.ts` | LLM调用入口 | 第...行 |

### 工具定义文件

```
server/src/agents/tools/
├─ bookAnalysisTools.ts      # 书籍分析工具
├─ characterTools.ts         # 人物工具
├─ directorRuntimeTools.ts   # 导演运行时工具
├─ formulaTools.ts           # 公式工具
├─ knowledgeTools.ts         # 知识库工具
├─ novelTools.ts             # 小说工具
├─ taskTools.ts              # 任务工具
├─ themeConsistencyTools.ts  # 主题一致性工具
├─ worldTools.ts             # 世界设定工具
└─ writeTools.ts             # 写作工具
```

---

## 6. 工具执行流程详解

### executeToolCall方法

```typescript
private async executeToolCall(
  context: ToolExecutionContext,
  call: ToolCall,
  callbacks?: AgentRuntimeCallbacks,
  options?: { parentStepId?: string; ignoreFailedCache?: boolean }
): Promise<ToolExecutionResult> {
  
  // ★ 幂等性检查
  const dedupeKey = `${call.tool}:${call.idempotencyKey}`;
  const cached = await this.store.findToolResultByIdempotencyKey(
    context.runId, dedupeKey
  );
  if (cached) {
    return cached;  // 已执行过，直接返回
  }
  
  // ★ 创建执行步骤记录
  const callStep = await this.store.addStep({
    runId: context.runId,
    stepType: "tool_call",
    status: "running",
    inputJson: JSON.stringify({
      tool: call.function.name,
      input: call.function.arguments
    })
  });
  
  // ★ 获取工具定义
  const definition = getAgentToolDefinition(call.function.name);
  
  try {
    // ★ 解析输入参数
    const parsedInput = definition.inputSchema.parse(
      JSON.parse(call.function.arguments)
    );
    
    // ★★★ 执行工具 ★★★
    const rawOutput = await definition.execute(context, parsedInput);
    
    // ★ 解析输出结果
    const parsedOutput = definition.outputSchema.parse(rawOutput);
    
    // ★ 保存成功结果
    await this.store.addStep({
      stepType: "tool_result",
      status: "succeeded",
      outputJson: JSON.stringify(parsedOutput)
    });
    
    return {
      tool: call.function.name,
      success: true,
      output: parsedOutput
    };
    
  } catch (error) {
    // ★ 保存失败结果
    await this.store.addStep({
      stepType: "tool_result",
      status: "failed",
      error: error.message
    });
    
    return {
      tool: call.function.name,
      success: false,
      error: error.message
    };
  }
}
```

---

## 7. 数据库写入方式

### 直接在execute函数中写入

```typescript
execute: async (context, input) => {
  // ★ 直接使用Prisma写入数据库
  const row = await prisma.characterState.create({
    data: {
      novelId: context.novelId,
      chapterNumber: input.chapterNumber,
      characterName: input.characterName,
      attributes: input.attributes,
      confidence: input.confidence
    }
  });
  
  return { id: row.id, success: true };
}
```

### 批量写入

```typescript
execute: async (context, input) => {
  // ★ 批量写入（事务）
  await prisma.$transaction(
    input.characters.map(char =>
      prisma.characterState.create({
        data: {
          novelId: context.novelId,
          chapterNumber: input.chapterNumber,
          characterName: char.name,
          attributes: char.attributes
        }
      })
    )
  );
  
  return { count: input.characters.length };
}
```

### Upsert（更新或插入）

```typescript
execute: async (context, input) => {
  // ★ Upsert：存在则更新，不存在则创建
  const row = await prisma.characterState.upsert({
    where: {
      novelId_chapterNumber_characterName: {
        novelId: context.novelId,
        chapterNumber: input.chapterNumber,
        characterName: input.characterName
      }
    },
    update: {
      attributes: input.attributes,
      confidence: input.confidence
    },
    create: {
      novelId: context.novelId,
      chapterNumber: input.chapterNumber,
      characterName: input.characterName,
      attributes: input.attributes,
      confidence: input.confidence
    }
  });
  
  return { id: row.id, created: !row };
}
```

---

## 8. 实际示例：人物状态提取

### 场景

第5章生成完成后，需要提取人物状态并保存到数据库。

### 流程

```
1. 触发人物状态提取
   ↓
2. 调用LLM（带extract_character_states工具）
   ↓
3. LLM返回tool_calls
   {
     "tool_calls": [{
       "function": {
         "name": "extract_character_states",
         "arguments": "{\"chapter_text\": \"第5章文本...\"}"
       }
     }]
   }
   ↓
4. 系统检测到tool_calls
   ↓
5. 获取工具定义（characterTools.ts）
   ↓
6. 执行execute函数
   execute: async (context, input) => {
     // 提取人物状态
     const states = extractFromText(input.chapter_text);
     
     // 写入数据库
     await prisma.characterState.createMany({
       data: states.map(s => ({
         novelId: context.novelId,
         chapterNumber: 5,
         characterName: s.name,
         attributes: s.attributes,
         confidence: s.confidence
       }))
     });
     
     return { count: states.length };
   }
   ↓
7. 保存执行结果
   ↓
8. 将结果返回给LLM
   ↓
9. LLM生成最终回答
   "第5章人物状态提取完成，共提取10个人物的状态"
```

---

## 9. 性能优化

### 幂等性检查

```typescript
// 避免重复执行相同的工具调用
const dedupeKey = `${call.tool}:${call.idempotencyKey}`;
const cached = await this.store.findToolResultByIdempotencyKey(
  context.runId, dedupeKey
);
if (cached) {
  return cached;  // 直接返回缓存结果
}
```

### 异步执行

```typescript
// 不阻塞主线程
setImmediate(async () => {
  await executeToolCall(context, toolCall);
});
```

### 批量处理

```typescript
// 多个工具调用一起处理
const results = await Promise.all(
  toolCalls.map(call => executeToolCall(context, call))
);
```

---

## 10. 常见问题

### Q1: LLM返回的arguments是字符串，怎么解析？

**A**: 使用JSON.parse

```typescript
const args = JSON.parse(call.function.arguments);
const validatedInput = definition.inputSchema.parse(args);
```

### Q2: 工具执行失败怎么办？

**A**: 保存错误信息，返回失败结果

```typescript
try {
  const output = await definition.execute(context, input);
  return { success: true, output };
} catch (error) {
  await this.store.addStep({
    status: "failed",
    error: error.message
  });
  return { success: false, error: error.message };
}
```

### Q3: 如何保证工具执行的幂等性？

**A**: 使用idempotencyKey

```typescript
const dedupeKey = `${toolName}:${idempotencyKey}`;
const cached = await this.store.findByIdempotencyKey(dedupeKey);
if (cached) return cached;
```

### Q4: 数据库写入在哪里执行？

**A**: 在工具的execute函数中直接使用Prisma

```typescript
execute: async (context, input) => {
  // 直接写入数据库
  await prisma.characterState.create({ data: {...} });
  return { success: true };
}
```

---

## 11. 总结

### 数据流动

```
LLM响应(JSON)
  ↓
解析tool_calls
  ↓
获取工具定义
  ↓
执行execute函数
  ↓
写入数据库
  ↓
返回结果给LLM
  ↓
LLM生成最终回答
```

### 关键代码位置

| 功能 | 位置 |
|------|------|
| 检测tool_calls | `RunExecutionService.ts` 第68-221行 |
| 执行工具 | `definition.execute()` |
| 工具定义 | `server/src/agents/tools/*.ts` |
| 工具注册 | `server/src/agents/toolRegistry.ts` |
| 数据库写入 | 在execute函数中使用Prisma |

### 核心要点

1. **LLM返回** → 结构化JSON，包含tool_calls数组
2. **系统检测** → 解析tool_calls，提取工具名称和参数
3. **工具执行** → 调用definition.execute()函数
4. **数据库写入** → 在execute函数中直接使用Prisma
5. **结果返回** → 将执行结果返回给LLM

---

*本文档由技术文档流程维护，定期更新以反映最新进展。*
