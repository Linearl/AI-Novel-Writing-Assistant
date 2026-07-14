# 步骤0（素材导入）架构设计 - Mermaid 流程图

## 整体用户流程

```mermaid
flowchart TD
    A[创建项目页面 NovelCreate] --> B{是否导入素材?}
    
    B -->|是| C[打开 MaterialParseDialog]
    B -->|否| D[填写基本信息]
    
    C --> C1[导入文本/文件]
    C1 --> C2[AI 解析素材]
    C2 --> C3[预览解析结果]
    C3 --> C4[用户确认/编辑]
    C4 --> D
    
    D --> E{选择创建模式?}
    
    E -->|手动创建| F[创建 Novel 记录]
    E -->|AI 接管| G[启动 auto_director 任务]
    
    F --> H[进入 NovelEdit]
    H --> I[步骤0: 素材管理]
    I --> I1[导入/修改素材]
    I1 --> I2[同步到各步骤]
    I2 --> J[步骤1: 项目设定]
    J --> K[步骤2: 故事宏观规划]
    K --> L[步骤3-7: 后续步骤]
    
    G --> M{检查是否有素材?}
    M -->|有素材| N1[保存到 Novel 表]
    M -->|无素材| N2[AI 生成初始规划]
    
    N1 --> O[同步到 StoryMacroPlan.storyInput]
    N2 --> P[用户确认/修改]
    P --> Q[继续执行步骤1-7]
    O --> Q
```

## 素材数据流向图

```mermaid
flowchart LR
    subgraph 输入层
        A1[用户输入文本]
        A2[文件导入]
    end
    
    subgraph 处理层
        B1[MaterialParseDialog]
        B2[AI 解析 API]
    end
    
    subgraph 存储层
        C1[Novel.worldSetting]
        C2[Novel.characters]
        C3[Novel.outline]
        C4[StoryMacroPlan.storyInput]
    end
    
    subgraph 消费层
        D1[步骤2: 故事宏观规划]
        D2[步骤4-5: 卷战略]
        D3[其他步骤]
    end
    
    A1 --> B1
    A2 --> B1
    B1 --> B2
    B2 --> C1
    B2 --> C2
    B2 --> C3
    C1 --> C4
    C2 --> C4
    C3 --> C4
    C4 --> D1
    C1 --> D2
    C2 --> D2
    C3 --> D2
    C1 --> D3
    C2 --> D3
    C3 --> D3
```

## AI 接管模式流程

```mermaid
flowchart TD
    A[用户点击 AI 接管] --> B[打开 NovelAutoDirectorDialog]
    
    B --> C{是否有导入素材按钮?}
    C -->|是| D[点击导入素材按钮]
    C -->|否| E[选择运行模式]
    
    D --> F[打开 MaterialParseDialog]
    F --> G[导入并解析素材]
    G --> H[确认素材]
    H --> E
    
    E --> I[选择起始步骤]
    I --> J[启动 auto_director 任务]
    
    J --> K{检查 seedPayload}
    
    K -->|worldSetting/characters/outline 存在| L1[有素材模式]
    K -->|字段为空| L2[无素材模式]
    
    L1 --> M1[保存素材到 Novel 表]
    M1 --> M2[同步到 StoryMacroPlan.storyInput]
    M2 --> M3[使用素材执行步骤1-7]
    
    L2 --> N1[AI 生成初始规划]
    N1 --> N2[生成世界观/角色/大纲]
    N2 --> N3[用户确认/修改]
    N3 --> N4[继续执行步骤1-7]
    
    M3 --> O[完成自动导演]
    N4 --> O
```

## 素材同步机制流程

```mermaid
flowchart TD
    A[用户修改素材] --> B{选择同步选项}
    
    B -->|仅同步到 storyInput| C1[更新 Novel 表]
    B -->|重新生成故事引擎| C2[更新 Novel 表]
    B -->|不同步| D[只保存修改]
    
    C1 --> E1[构建新 storyInput]
    E1 --> F1[更新 StoryMacroPlan.storyInput]
    F1 --> G1[完成]
    
    C2 --> E2[构建新 storyInput]
    E2 --> F2[更新 StoryMacroPlan.storyInput]
    F2 --> H2[调用重新生成 API]
    H2 --> I2[更新 StoryMacroPlan 其他字段]
    I2 --> G2[完成]
    
    D --> G3[保存修改]
```

## 数据库表关系图

```mermaid
erDiagram
    NOVEL {
        string id PK
        string title
        string description
        string worldSetting "世界观设定"
        string characters "角色信息"
        string outline "故事大纲"
    }
    
    STORY_MACRO_PLAN {
        string id PK
        string novelId FK
        string storyInput "故事想法输入"
        jsonb expansion "展开前提"
        jsonb decomposition "分解"
        jsonb constraints "约束"
    }
    
    VOLUME_PLAN {
        string id PK
        string novelId FK
    }
    
    CHAPTER {
        string id PK
        string novelId FK
        string volumeId FK
    }
    
    NOVEL ||--o{ STORY_MACRO_PLAN : "1:1"
    NOVEL ||--o{ VOLUME_PLAN : "1:N"
    NOVEL ||--o{ CHAPTER : "1:N"
    
    NOVEL {
        worldSetting: "从 MaterialParseDialog 导入"
        characters: "从 MaterialParseDialog 导入"
        outline: "从 MaterialParseDialog 导入"
    }
    
    STORY_MACRO_PLAN {
        storyInput: "自动从 worldSetting+characters+outline 构建"
    }
```

## 关键决策流程图

```mermaid
flowchart TD
    A[用户操作] --> B{操作类型}
    
    B -->|创建项目| C{是否导入素材?}
    B -->|修改素材| D{是否同步?}
    B -->|AI 接管| E{是否有素材?}
    
    C -->|是| C1[解析素材并保存]
    C -->|否| C2[使用空字段创建]
    
    D -->|同步到 storyInput| D1[更新 StoryMacroPlan.storyInput]
    D -->|重新生成故事引擎| D2[调用重新生成 API]
    D -->|不同步| D3[只保存修改]
    
    E -->|有素材| E1[保存并同步到各步骤]
    E -->|无素材| E2[AI 生成初始规划]
    
    C1 --> F[创建完成]
    C2 --> F
    D1 --> G[同步完成]
    D2 --> G
    D3 --> G
    E1 --> H[自动导演启动]
    E2 --> H
```

## 实施阶段流程图

```mermaid
gantt
    title 步骤0 实施计划
    dateFormat  YYYY-MM-DD
    section Phase 1: 后端 API
    素材解析 API           :a1, 2024-01-01, 2d
    素材同步 API           :a2, after a1, 1d
    更新 auto_director    :a3, after a2, 1d
    
    section Phase 2: 前端 UI
    MaterialParseDialog 改进 :b1, 2024-01-01, 2d
    步骤0 UI 设计          :b2, after b1, 2d
    AI 接管对话框集成      :b3, after b2, 1d
    
    section Phase 3: 测试优化
    单元测试              :c1, 2024-01-01, 1d
    E2E 测试              :c2, after c1, 1d
    用户体验优化          :c3, after c2, 1d
```
