# 并行章节生产

当用户要求继续多章、完成长章范围、提高生成速度、并行工作或使用子代理时读取本页。

## 1. 并行策略

### 1.1 串行模式（默认）

- 一次只处理一章
- 完成当前章再处理下一章
- 确保连续性一致

### 1.2 并行模式

- 同时处理多章
- 每章独立上下文
- 完成后统一验证

### 1.3 混合模式

- 核心章节串行
- 非核心章节并行
- 平衡速度与质量

## 2. 并行约束

### 2.1 依赖约束

- 有依赖关系的章节必须串行
- 无依赖关系的章节可以并行
- 依赖关系包括：剧情承接、角色状态、伏笔回收

### 2.2 资源约束

- 每章需要独立上下文
- 避免资源冲突
- 控制并行数量

### 2.3 质量约束

- 每章独立审核
- 统一连续性验证
- 发现问题及时暂停

## 3. 并行流程

### 3.1 规划阶段

1. 分析章节依赖
2. 确定并行策略
3. 分配上下文

### 3.2 执行阶段

1. 并行生成正文
2. 独立审核每章
3. 记录问题

### 3.3 验证阶段

1. 统一连续性验证
2. 解决冲突
3. 更新状态

## 4. 并行工具

### 4.1 依赖分析

```bash
# 分析章节依赖
python scripts/novelctl.py analyze-dependencies novels/<小说名> --range 1-10

# 生成并行计划
python scripts/novelctl.py parallel-plan novels/<小说名> --range 1-10
```

### 4.2 并行执行

```bash
# 并行生成
python scripts/novelctl.py parallel-generate novels/<小说名> --range 1-10 --max-parallel 3

# 并行审核
python scripts/novelctl.py parallel-review novels/<小说名> --range 1-10
```

### 4.3 并行验证

```bash
# 统一验证
python scripts/novelctl.py parallel-validate novels/<小说名> --range 1-10

# 解决冲突
python scripts/novelctl.py resolve-conflicts novels/<小说名> --range 1-10
```

## 5. 并行限制

### 5.1 禁止并行

- 有强依赖关系的章节
- 涉及重大转折的章节
- 需要用户确认的章节

### 5.2 谨慎并行

- 涉及伏笔回收的章节
- 涉及角色状态变化的章节
- 涉及世界观变化的章节

### 5.3 允许并行

- 无依赖关系的章节
- 独立事件的章节
- 背景填充的章节

## 6. 并行问题

### 6.1 冲突检测

```bash
# 检测并行冲突
python scripts/novelctl.py detect-conflicts novels/<小说名> --range 1-10

# 生成冲突报告
python scripts/novelctl.py conflict-report novels/<小说名> --range 1-10
```

### 6.2 冲突解决

1. 识别冲突类型
2. 评估影响范围
3. 选择解决策略
4. 应用解决方案

### 6.3 冲突预防

1. 提前分析依赖
2. 合理分配上下文
3. 控制并行数量
4. 及时沟通协调
