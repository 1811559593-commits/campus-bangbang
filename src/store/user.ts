import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { api } from '@/services/api';
import type { UserProfile } from '@/types';

interface UserState {
  profile: UserProfile | null;
  logging: boolean;
  /** 登录并拉取档案（幂等，页面 onShow 可重复调用） */
  login: (force?: boolean) => Promise<UserProfile | null>;
  setProfile: (profile: UserProfile) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  logging: false,

  login: async (force = false) => {
    const existing = get().profile;
    if (existing && !force) return existing;
    if (get().logging) return existing;
    set({ logging: true });
    try {
      const profile = await api.login();
      console.info('[Auth] login success', profile.nickName);
      set({ profile, logging: false });
      return profile;
    } catch (err) {
      console.error('[Auth] login failed:', err);
      set({ logging: false });
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
      return null;
    }
  },

  setProfile: (profile) => set({ profile }),
  reset: () => set({ profile: null })
}));
