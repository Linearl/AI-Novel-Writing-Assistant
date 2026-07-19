import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UnifiedTaskDetail } from "@ai-novel/shared";
import { updateAutoDirectorModel } from "@/api/novelWorkflow";
import { queryKeys } from "@/api/queryKeys";
import LLMSelector from "@/components/common/LLMSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

interface TaskCenterModelSwitchCardProps {
  task: UnifiedTaskDetail;
  isActive: boolean;
}

export default function TaskCenterModelSwitchCard({ task, isActive }: TaskCenterModelSwitchCardProps) {
  const queryClient = useQueryClient();
  const [modelValue, setModelValue] = useState<{
    provider?: string;
    model?: string;
    temperature?: number;
    useRouteModel?: boolean;
  }>({});

  const updateModelMutation = useMutation({
    mutationFn: () => {
      const payload: {
        provider?: string;
        model?: string;
        temperature?: number;
      } = {};

      if (!modelValue.useRouteModel) {
        if (modelValue.provider) {
          payload.provider = modelValue.provider;
        }
        if (modelValue.model) {
          payload.model = modelValue.model;
        }
      }

      if (typeof modelValue.temperature === "number") {
        payload.temperature = modelValue.temperature;
      }

      return updateAutoDirectorModel(task.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(task.kind, task.id) });
      toast.success("模型配置已更新，将在下一步骤生效");
    },
    onError: () => {
      toast.error("模型更新失败，请重试");
    },
  });

  if (!isActive) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">切换模型</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          修改将在当前步骤完成后生效，无需暂停任务。
        </div>
        <LLMSelector
          allowRouteModel
          showTemperature
          showHelperText={false}
          value={modelValue}
          onChange={setModelValue}
        />
        <Button
          size="sm"
          onClick={() => updateModelMutation.mutate()}
          disabled={updateModelMutation.isPending}
        >
          {updateModelMutation.isPending ? "更新中..." : "应用模型配置"}
        </Button>
      </CardContent>
    </Card>
  );
}
