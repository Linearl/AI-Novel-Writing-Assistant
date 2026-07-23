import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import { renderBasicSetupCoreFields, renderBasicSetupFramingFields } from "../components/autoDirectorCreate/shared/StageBasicSetupCore";
import { Button } from "@/components/ui/button";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

interface StageBasicSetupProps {
  basicForm: NovelBasicFormState;
  genreOptions: Array<{ id: string; path: string; label: string }>;
  idea: string;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export default function StageBasicSetup({
  basicForm,
  genreOptions,
  idea,
  onBasicFormChange,
  onBack,
  onConfirm,
}: StageBasicSetupProps) {
  const controlClassName = "w-full rounded-lg border-0 bg-muted/40 px-3 py-2.5 text-sm outline-none ring-1 ring-transparent transition hover:bg-muted/55 focus:bg-background focus:ring-2 focus:ring-primary/25";

  return (
    <section className="mx-auto w-full max-w-5xl space-y-7 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-normal text-foreground">先定这本书的手感</div>
          <div className={`mt-2 max-w-2xl text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            这里只确认影响整本书阅读感的基础参数。不确定时保持默认，AI 会继续根据你的起始想法判断。
          </div>
        </div>
        <div className="rounded-full bg-muted/55 px-3 py-1 text-xs text-muted-foreground">
          约 1 分钟
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        {renderBasicSetupCoreFields({
          basicForm,
          onBasicFormChange,
          controlClassName,
          idPrefix: "director-basic-",
        })}
      </div>

      <details className="group pt-2">
        <summary className="cursor-pointer list-none">
          <div>
            <div className="text-base font-semibold text-foreground">补充读者与卖点</div>
            <div className={`mt-1 max-w-3xl text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              不确定可以先跳过。补充后，AI 会更清楚这本书写给谁、前 30 章要给读者什么。
            </div>
          </div>
        </summary>
        <div className="mt-5 space-y-4 md:grid md:grid-cols-2 md:gap-4">
          {renderBasicSetupFramingFields({
            basicForm,
            onBasicFormChange,
            genreOptions,
            idea,
            controlClassName,
            idPrefix: "director-basic-",
          })}
        </div>
      </details>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>返回想法</Button>
        <Button type="button" onClick={onConfirm}>确认起始设置</Button>
      </div>
    </section>
  );
}
