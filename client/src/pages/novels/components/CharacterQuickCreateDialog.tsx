import type { BaseCharacter, Character } from "@ai-novel/shared/types/novel";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { QuickCharacterCreatePayload } from "./characterPanel.utils";

interface QuickCharacterFormState {
  name: string;
  role: string;
}

interface CharacterQuickCreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  quickCharacterForm: QuickCharacterFormState;
  onQuickCharacterFormChange: (field: keyof QuickCharacterFormState, value: string) => void;
  onQuickCreate: (payload: QuickCharacterCreatePayload) => void;
  isQuickCreating: boolean;
  relationToProtagonist: string;
  onRelationToProtagonistChange: (value: string) => void;
  storyFunction: string;
  onStoryFunctionChange: (value: string) => void;
  wizardKeywords: string;
  onWizardKeywordsChange: (value: string) => void;
  autoGenerateProfile: boolean;
  onAutoGenerateProfileChange: (value: boolean) => void;
  baseCharacters: BaseCharacter[];
  selectedBaseCharacterId: string;
  onSelectedBaseCharacterChange: (id: string) => void;
  selectedBaseCharacter?: BaseCharacter;
  importedBaseCharacterIds: Set<string>;
  onImportBaseCharacter: () => void;
  isImportingBaseCharacter: boolean;
}

export default function CharacterQuickCreateDialog(props: CharacterQuickCreateDialogProps) {
  const {
    isOpen,
    onOpenChange,
    quickCharacterForm,
    onQuickCharacterFormChange,
    onQuickCreate,
    isQuickCreating,
    relationToProtagonist,
    onRelationToProtagonistChange,
    storyFunction,
    onStoryFunctionChange,
    wizardKeywords,
    onWizardKeywordsChange,
    autoGenerateProfile,
    onAutoGenerateProfileChange,
    baseCharacters,
    selectedBaseCharacterId,
    onSelectedBaseCharacterChange,
    selectedBaseCharacter,
    importedBaseCharacterIds,
    onImportBaseCharacter,
    isImportingBaseCharacter,
  } = props;

  const handleQuickCreate = () => {
    onQuickCreate({
      name: quickCharacterForm.name,
      role: quickCharacterForm.role,
      relationToProtagonist,
      storyFunction,
      keywords: wizardKeywords,
      autoGenerateProfile,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新增角色</DialogTitle>
          <DialogDescription>
            只有在新建角色或从基础角色库导入时才需要打开这里。日常维护请直接使用角色资产工作台。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="space-y-3 rounded-2xl border p-4">
            <div className="space-y-1">
              <div className="font-medium">快速创建</div>
              <div className="text-xs text-muted-foreground">
                适合临时补一个新人物占位，再交给下方工作台慢慢打磨。
              </div>
            </div>
            <Input
              placeholder="角色名称（必填）"
              value={quickCharacterForm.name}
              onChange={(event) => onQuickCharacterFormChange("name", event.target.value)}
            />
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={quickCharacterForm.role}
              onChange={(event) => onQuickCharacterFormChange("role", event.target.value)}
            >
              <option value="主角">主角</option>
              <option value="配角">配角</option>
              <option value="反派">反派</option>
              <option value="导师">导师</option>
              <option value="情感线">情感线</option>
              <option value="功能角色">功能角色</option>
            </select>
            <Input
              placeholder="与主角关系（如：试探合作）"
              value={relationToProtagonist}
              onChange={(event) => onRelationToProtagonistChange(event.target.value)}
            />
            <Input
              placeholder="在故事中的作用（如：推动真相线）"
              value={storyFunction}
              onChange={(event) => onStoryFunctionChange(event.target.value)}
            />
            <Input
              placeholder="角色关键词（逗号分隔）"
              value={wizardKeywords}
              onChange={(event) => onWizardKeywordsChange(event.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={autoGenerateProfile}
                onChange={(event) => onAutoGenerateProfileChange(event.target.checked)}
              />
              自动补齐性格、背景、成长弧和当前状态
            </label>
            <AiButton onClick={handleQuickCreate} disabled={isQuickCreating || !quickCharacterForm.name.trim()}>
              {isQuickCreating ? "生成中..." : "AI 生成角色卡"}
            </AiButton>
          </div>

          <div className="space-y-3 rounded-2xl border p-4">
            <div className="space-y-1">
              <div className="font-medium">从基础角色库导入</div>
              <div className="text-xs text-muted-foreground">
                适合快速引入成熟模板，再按当前小说需求继续微调。
              </div>
            </div>
            {baseCharacters.length > 0 ? (
              <>
                <select
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={selectedBaseCharacterId}
                  onChange={(event) => onSelectedBaseCharacterChange(event.target.value)}
                >
                  {baseCharacters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}（{character.role}）
                    </option>
                  ))}
                </select>
                {selectedBaseCharacter ? (
                  <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{selectedBaseCharacter.name}</span>
                      <Badge variant={importedBaseCharacterIds.has(selectedBaseCharacter.id) ? "outline" : "secondary"}>
                        {importedBaseCharacterIds.has(selectedBaseCharacter.id) ? "已关联" : "未关联"}
                      </Badge>
                    </div>
                    <div className="line-clamp-3 text-xs text-muted-foreground">
                      性格：{selectedBaseCharacter.personality || "暂无"}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={onImportBaseCharacter}
                    disabled={
                      isImportingBaseCharacter
                      || !selectedBaseCharacter
                      || importedBaseCharacterIds.has(selectedBaseCharacter.id)
                    }
                  >
                    {isImportingBaseCharacter ? "导入中..." : "导入为小说角色"}
                  </Button>
                  <Button asChild variant="outline">
                    <a href="/base-characters">管理基础角色库</a>
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                基础角色库为空，请先创建。
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
