import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, FileText, Pencil } from "lucide-react";

export type CreationPath = 'A' | 'B' | 'C';

interface PathOption {
  id: CreationPath;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const PATH_OPTIONS: PathOption[] = [
  {
    id: 'A',
    title: '我有初步想法',
    description: 'AI自动导演开书',
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    id: 'B',
    title: '我有完善想法',
    description: '从素材导入',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 'C',
    title: '都不需要',
    description: '我要手动填写',
    icon: <Pencil className="h-5 w-5" />,
  },
];

interface PathSelectionCardProps {
  selectedPath: CreationPath | null;
  onSelectPath: (path: CreationPath) => void;
}

export default function PathSelectionCard({
  selectedPath,
  onSelectPath,
}: PathSelectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>选择你的创作方式</CardTitle>
        <CardDescription>
          三种路径，最终都填充同一组字段，根据你的需求选择最适合的方式
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {PATH_OPTIONS.map((option) => (
            <Button
              key={option.id}
              variant={selectedPath === option.id ? "default" : "outline"}
              className={`h-auto flex-col items-start p-4 text-left ${
                selectedPath === option.id
                  ? "border-primary bg-primary/10"
                  : ""
              }`}
              onClick={() => onSelectPath(option.id)}
            >
              <div className="flex items-center gap-2 mb-2">
                {option.icon}
                <span className="font-semibold">{option.title}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {option.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
