import type { AutoDirectorCreateController } from "../useAutoDirectorCreateController";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import NovelAutoDirectorIdeaInspirationPanel from "../NovelAutoDirectorIdeaInspirationPanel";

interface StageIdeaProps {
  controller: Pick<
    AutoDirectorCreateController,
    | "idea"
    | "setIdea"
    | "ideaInspirations"
    | "isGeneratingIdeaInspirations"
    | "generateIdeaInspirations"
    | "setActiveStep"
    | "markStepCompleted"
    | "handleQuickGenerate"
  >;
}

export default function StageIdea({ controller }: StageIdeaProps) {
  const {
    idea,
    setIdea,
    ideaInspirations,
    isGeneratingIdeaInspirations,
    generateIdeaInspirations,
    setActiveStep,
    markStepCompleted,
    handleQuickGenerate,
  } = controller;

  const handleContinueToBasic = () => {
    markStepCompleted("idea");
    setActiveStep("basic");
  };

  const canProceed = idea.trim().length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">步骤 1：起始想法</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          用一段话描述你想写的故事。AI 会基于这个想法帮你细化整本书的方向。
        </p>
      </div>

      <div>
        <div className="text-sm font-medium text-foreground">你的起始想法</div>
        <Textarea
          className="mt-2 min-h-[160px]"
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="例如：普通女大学生误入异能组织，一边上学打工，一边调查父亲失踪真相。"
        />
      </div>

      <NovelAutoDirectorIdeaInspirationPanel
        ideas={ideaInspirations}
        isGenerating={isGeneratingIdeaInspirations}
        onGenerate={generateIdeaInspirations}
        onUseIdea={(text) => setIdea(text)}
      />

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleQuickGenerate}
          disabled={!canProceed}
        >
          用默认设置直接生成方向
        </Button>
        <Button type="button" size="sm" onClick={handleContinueToBasic} disabled={!canProceed}>
          继续完善设定
        </Button>
      </div>
    </div>
  );
}
