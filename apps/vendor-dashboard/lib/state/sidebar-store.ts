import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      openMobileSidebar: () => set({ isMobileOpen: true }),
      closeMobileSidebar: () => set({ isMobileOpen: false }),
      setCollapsed: (isCollapsed) => set({ isCollapsed }),
    }),
    {
      name: 'sidebar-storage',
    }
  )
);