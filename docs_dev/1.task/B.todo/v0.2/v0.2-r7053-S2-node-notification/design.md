---
description: "REQ-7053: 关键节点通知 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7053: 关键节点通知 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `client/src/` 下新增通知管理器，使用浏览器原生Web Notifications API。后端任务状态变更通过事件触发通知。

```
调用链路：
任务状态变更 → EventBus
  ↓
NotificationService.shouldNotify(event)
  ↓
NotificationManager.send(title, body, options)
  ↓
浏览器通知
```

### 1.2 核心组件

```typescript
// 新增文件：client/src/services/notification/NotificationManager.ts

export class NotificationManager {
  private permission: NotificationPermission = 'default';
  private config: NotificationConfig;

  async requestPermission(): Promise<NotificationPermission>;
  async send(title: string, body: string, options?: NotificationOptions): Promise<void>;
  private getConfig(): NotificationConfig;
  private saveConfig(config: NotificationConfig): void;
}
```

```typescript
// 新增文件：client/src/services/notification/types.ts

export interface NotificationConfig {
  enabled: boolean;                    // 全局开关
  events: {
    taskCompleted: boolean;            // 任务完成
    taskFailed: boolean;               // 任务失败
    taskNeedsReview: boolean;          // 需要人工审核
    qualityCheckResult: boolean;       // 质量检查结果
  };
  quietHours?: {
    start: string;  // "22:00"
    end: string;    // "08:00"
  };
}

export interface NotificationEvent {
  type: 'task_completed' | 'task_failed' | 'task_needs_review' | 'quality_check';
  novelId: string;
  novelTitle: string;
  chapterNumber?: number;
  message: string;
  taskId: string;
}
```

## 2. 详细设计

### 2.1 通知权限管理

```typescript
class NotificationManager {
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    this.permission = await Notification.requestPermission();
    return this.permission;
  }

  async send(title: string, body: string, options?: NotificationOptions): Promise<void> {
    // 检查权限
    if (this.permission !== 'granted') {
      return;
    }

    // 检查全局开关
    if (!this.config.enabled) {
      return;
    }

    // 检查免打扰时间
    if (this.isQuietHours()) {
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: '/logo.png',
      ...options,
    });

    // 点击通知跳转
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}
```

### 2.2 通知内容模板

```typescript
const NOTIFICATION_TEMPLATES: Record<string, (event: NotificationEvent) => { title: string; body: string }> = {
  task_completed: (event) => ({
    title: `${event.novelTitle} 生成完成`,
    body: event.chapterNumber
      ? `第${event.chapterNumber}章已生成完成，点击查看`
      : `任务已完成，点击查看`,
  }),
  task_failed: (event) => ({
    title: `${event.novelTitle} 生成失败`,
    body: event.chapterNumber
      ? `第${event.chapterNumber}章生成失败：${event.message}`
      : `任务执行失败：${event.message}`,
  }),
  task_needs_review: (event) => ({
    title: `${event.novelTitle} 等待审核`,
    body: event.chapterNumber
      ? `第${event.chapterNumber}章等待人工审核`
      : `任务等待人工审核`,
  }),
  quality_check: (event) => ({
    title: `${event.novelTitle} 质量检查完成`,
    body: event.message,
  }),
};
```

### 2.3 免打扰模式

```typescript
private isQuietHours(): boolean {
  if (!this.config.quietHours) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = this.config.quietHours.start.split(':').map(Number);
  const [endHour, endMin] = this.config.quietHours.end.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // 跨午夜
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}
```

## 3. 数据模型

### 3.1 配置存储

```typescript
// 用户偏好设置中的通知配置
interface UserPreferences {
  // ... 其他设置
  notifications: NotificationConfig;
}
```

## 4. 接口设计

### 4.1 前端接口

```typescript
// client/src/services/notification/index.ts

export const notificationService = {
  requestPermission: () => notificationManager.requestPermission(),
  send: (event: NotificationEvent) => notificationManager.send(...),
  updateConfig: (config: Partial<NotificationConfig>) => notificationManager.updateConfig(config),
  getConfig: () => notificationManager.getConfig(),
};
```

### 4.2 与任务管理集成

```typescript
// 在TaskSSEManager中集成通知
class TaskSSEManager {
  handleTaskEvent(event: TaskEvent): void {
    // 更新任务状态
    this.updateTaskState(event);

    // 触发通知
    if (this.shouldNotify(event)) {
      notificationService.send(this.buildNotificationEvent(event));
    }
  }
}
```

## 5. 实现步骤

### Phase 1: 核心通知管理器（0.1天）

1. 创建NotificationManager
2. 实现权限管理
3. 实现配置存储

### Phase 2: 通知模板和事件集成（0.1天）

1. 实现通知内容模板
2. 集成到TaskSSEManager
3. 实现免打扰模式

### Phase 3: 测试（0.1天）

1. 单元测试：权限管理、配置、免打扰
2. 集成测试：事件触发通知
3. 浏览器兼容性测试

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 用户拒绝权限 | 功能不可用 | 中 | 引导流程+降级方案 |
| 浏览器兼容性 | 部分用户不可用 | 低 | 功能检测+静默降级 |
| 通知疲劳 | 用户关闭通知 | 中 | 频率限制+合并通知 |

## 7. 测试计划

### 7.1 单元测试

```typescript
describe('NotificationManager', () => {
  it('should request permission correctly');
  it('should respect global enable/disable');
  it('should respect quiet hours');
  it('should respect per-event config');
});
```

### 7.2 集成测试

```typescript
describe('Notification integration', () => {
  it('should send notification on task completion');
  it('should not send when notifications disabled');
});
```

## 8. 交付物

- [ ] `client/src/services/notification/` - 通知服务目录
- [ ] NotificationManager实现
- [ ] 通知配置管理
- [ ] 与任务系统集成
- [ ] 单元测试
