import { create } from "zustand";

/**
 * 小说编辑工作区 — 导演任务抽屉与接管 UI 状态
 *
 * 这些状态在 NovelEdit 主组件与多个子组件（TaskDrawer、TakeoverPanel、
 * DirectorProgressPanel 等）之间共享。之前通过 useState + props 传递，
 * 收敛到 Zustand 后子组件可直接读取，减少 prop drilling。
 *
 * 注意：业务数据（volumeDraft、basicForm 等）仍由 React Query + hooks 管理，
 * 本 store 只收敛跨子组件共享的 UI 开关状态。
 */
export interface NovelEditTaskDrawerState {
  /** 抽屉是否展开 */
  isOpen: boolean;
  /** 是否展开导演退出操作区 */
  isDirectorExitActionExpanded: boolean;
  /** 已被用户收起的接管提醒签名 */
  dismissedTakeoverSignature: string;
}

interface NovelEditTaskDrawerActions {
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setIsOpen: (open: boolean) => void;
  setDirectorExitActionExpanded: (expanded: boolean) => void;
  setDismissedTakeoverSignature: (signature: string) => void;
  reset: () => void;
}

export type NovelEditTaskDrawerStore = NovelEditTaskDrawerState & NovelEditTaskDrawerActions;

const initialState: NovelEditTaskDrawerState = {
  isOpen: false,
  isDirectorExitActionExpanded: false,
  dismissedTakeoverSignature: "",
};

export const useNovelEditTaskDrawerStore = create<NovelEditTaskDrawerStore>((set) => ({
  ...initialState,
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
  setIsOpen: (open) => set({ isOpen: open }),
  setDirectorExitActionExpanded: (expanded) =>
    set({ isDirectorExitActionExpanded: expanded }),
  setDismissedTakeoverSignature: (signature) =>
    set({ dismissedTakeoverSignature: signature }),
  reset: () => set({ ...initialState }),
}));
