import { useState } from "react";
import { notificationService } from "../../services/notification/index";
import type { NotificationConfig } from "../../services/notification/types";

const LABELS: Record<keyof NotificationConfig["events"], string> = {
  taskCompleted: "任务完成",
  taskFailed: "任务失败",
  taskNeedsReview: "需要人工审核",
  qualityCheckResult: "质量检查结果",
};

export function NotificationConfigPanel() {
  const [config, setConfig] = useState<NotificationConfig>(notificationService.getConfig());
  const [permissionStatus, setPermissionStatus] = useState(notificationService.permission);

  const supported = notificationService.supported;

  const handleEnableToggle = () => {
    const updated = notificationService.updateConfig({ enabled: !config.enabled });
    setConfig(updated);
  };

  const handleEventToggle = (eventName: keyof NotificationConfig["events"]) => {
    const updated = notificationService.updateConfig({
      events: {
        ...config.events,
        [eventName]: !config.events[eventName],
      },
    });
    setConfig(updated);
  };

  const handleQuietHoursChange = (field: "start" | "end", value: string) => {
    const current = config.quietHours ?? { start: "22:00", end: "08:00" };
    const updated = notificationService.updateConfig({
      quietHours: { ...current, [field]: value },
    });
    setConfig(updated);
  };

  const handleEnableQuietHours = (enabled: boolean) => {
    const updated = notificationService.updateConfig({
      quietHours: enabled ? { start: "22:00", end: "08:00" } : undefined,
    });
    setConfig(updated);
  };

  const handleRequestPermission = async () => {
    const result = await notificationService.requestPermission();
    setPermissionStatus(result);
  };

  if (!supported) {
    return (
      <div className="notification-config-panel">
        <p className="text-muted-foreground text-sm">
          当前浏览器不支持桌面通知功能。
        </p>
      </div>
    );
  }

  return (
    <div className="notification-config-panel space-y-4">
      {/* Permission section */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">通知权限</span>
        <div className="flex items-center gap-2">
          <span className={
            permissionStatus === "granted" ? "text-green-600" :
            permissionStatus === "denied" ? "text-red-600" :
            "text-muted-foreground"
          }>
            {permissionStatus === "granted" ? "已授权" :
             permissionStatus === "denied" ? "已拒绝" :
             "未设置"}
          </span>
          {permissionStatus !== "granted" && (
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={handleRequestPermission}
            >
              请求权限
            </button>
          )}
        </div>
      </div>

      <hr />

      {/* Global toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">通知开关</span>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={config.enabled}
            onChange={handleEnableToggle}
          />
          <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary peer-focus:outline-none after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
        </label>
      </div>

      {/* Event type toggles */}
      <div className="space-y-2">
        <span className="text-sm font-medium">通知事件</span>
        {(Object.keys(LABELS) as Array<keyof NotificationConfig["events"]>).map((eventName) => (
          <div key={eventName} className="flex items-center justify-between">
            <span className="text-sm">{LABELS[eventName]}</span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={config.events[eventName]}
                onChange={() => handleEventToggle(eventName)}
              />
              <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary peer-focus:outline-none after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
            </label>
          </div>
        ))}
      </div>

      <hr />

      {/* Quiet hours */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">免打扰模式</span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={!!config.quietHours}
              onChange={(e) => handleEnableQuietHours(e.target.checked)}
            />
            <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary peer-focus:outline-none after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
          </label>
        </div>

        {config.quietHours && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="time"
              className="border rounded px-2 py-1 text-sm"
              value={config.quietHours.start}
              onChange={(e) => handleQuietHoursChange("start", e.target.value)}
            />
            <span className="text-sm text-muted-foreground">至</span>
            <input
              type="time"
              className="border rounded px-2 py-1 text-sm"
              value={config.quietHours.end}
              onChange={(e) => handleQuietHoursChange("end", e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
