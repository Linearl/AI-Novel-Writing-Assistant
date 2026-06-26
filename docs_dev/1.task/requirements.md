# Requirements Pool (ll-workflow-core)

> 由 `req` 路由维护。`init` 路由首次创建时为空文件 + 占位头。
>
> 不与 `docs/architecture/` 下的业务需求混用 —— 业务需求写在 `docs/plans/`,
> 本表只跟踪 ll-workflow 内部流程产生的工作项(治理改进、skill 升级等)。

## 状态机

| 状态 | 位置 | 说明 |
| --- | --- | --- |
| inactive | `1.task/A.inactive/` | 暂不考虑 |
| todo | `1.task/B.todo/${ version }/` | 待开发 |
| paused | `1.task/B.1.paused/` | 暂停 |
| done | `1.task/B.2.done/${ version }/` | 已完成 |
| cancelled | `1.task/B.3.cancelled/` | 取消 |

## 编号段含义

| 编号 | 分类 |
| --- | --- |
| 1xxx | 架构和基础设施 |
| 2xxx | 核心功能开发 |
| 3xxx | 用户界面和体验 |
| 4xxx | 测试和质量保证 |
| 5xxx | 文档和规范 |
| 6xxx | 运维和部署 |
| 7xxx | 技术债务和重构 |
| 8xxx | 研究和调研 |
| 9xxx | 未分类 |

## 工作项

<!-- 由 req 路由自动 append,格式:
### REQ-XXXX: <title>
- 状态: todo | done | paused | cancelled
- 分类: <numbering segment>
- 复杂度: simple | medium | complex
- 创建: <date>
- 版本: <version>
- 描述: <description>
- 接受标准: <criteria>
-->
