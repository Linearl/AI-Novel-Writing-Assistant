/**
 * 预览设置类型定义
 * 用于小说预览页面的控制面板
 */

/** 字体族枚举 */
export type FontFamily = 'song' | 'hei' | 'kai' | 'fangsong' | 'yahei' | 'system';

/** 行间距倍数 */
export type LineHeight = 0.3 | 0.6 | 1.0;

/** 主题颜色配置 */
export interface ThemeColors {
  background: string;
  text: string;
}

/** 预览设置接口 */
export interface PreviewSettings {
  fontSize: number;
  fontFamily: FontFamily;
  isBold: boolean;
  pageWidth: number;
  autoFit: boolean;
  backgroundColor: ThemeColors;
  lineHeight: LineHeight;
}

/** 控制面板更新回调 */
export interface PreviewSettingsUpdate {
  fontSize: (size: number) => void;
  fontFamily: (family: FontFamily) => void;
  bold: () => void;
  pageWidth: (width: number) => void;
  autoFit: () => void;
  background: (theme: ThemeColors) => void;
  lineHeight: (height: LineHeight) => void;
}

/** 字体选项 */
export interface FontOption {
  value: FontFamily;
  label: string;
  cssFamily: string;
}

/** 主题选项 */
export interface ThemeOption {
  value: ThemeColors;
  label: string;
  preview: string;
}

/** 默认预览设置 */
export const DEFAULT_PREVIEW_SETTINGS: PreviewSettings = {
  fontSize: 16,
  fontFamily: 'song',
  isBold: false,
  pageWidth: 800,
  autoFit: false,
  backgroundColor: {
    background: '#FFFFFF',
    text: '#000000',
  },
  lineHeight: 0.6,
};

/** 行间距选项 */
export interface LineHeightOption {
  value: LineHeight;
  label: string;
  description: string;
}

/** 行间距选项列表 */
export const LINE_HEIGHT_OPTIONS: LineHeightOption[] = [
  { value: 0.3, label: '紧凑', description: '行高0.3倍' },
  { value: 0.6, label: '适中', description: '行高0.6倍' },
  { value: 1.0, label: '宽松', description: '行高1.0倍' },
];

/** 字体选项列表 */
export const FONT_OPTIONS: FontOption[] = [
  { value: 'song', label: '宋体', cssFamily: '"SimSun", "Song", serif' },
  { value: 'hei', label: '黑体', cssFamily: '"SimHei", "Heiti", sans-serif' },
  { value: 'kai', label: '楷体', cssFamily: '"KaiTi", "楷体", serif' },
  { value: 'fangsong', label: '仿宋', cssFamily: '"FangSong", "仿宋", serif' },
  { value: 'yahei', label: '微软雅黑', cssFamily: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { value: 'system', label: '系统字体', cssFamily: 'system-ui, -apple-system, sans-serif' },
];

/** 主题选项列表 */
export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: { background: '#FFFFFF', text: '#000000' },
    label: '默认白',
    preview: '#FFFFFF',
  },
  {
    value: { background: '#F5F5DC', text: '#333333' },
    label: '米黄色',
    preview: '#F5F5DC',
  },
  {
    value: { background: '#CCE8CF', text: '#2D2D2D' },
    label: '护眼绿',
    preview: '#CCE8CF',
  },
  {
    value: { background: '#1A1A1A', text: '#CCCCCC' },
    label: '夜间黑',
    preview: '#1A1A1A',
  },
];
