import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getArrearSubjectStatus } from '@/service/arrears';
import {
  getArrearMotivationSettings,
  getRandomMotivationalMessage,
  calculateNextRandomIntervalMs,
} from '@/service/arrearMotivation';
import type { MotivationalMessage, ArrearMotivationSettings } from '@/types';

// Safely access React Native AppState if in React Native environment
let RNAppState: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  RNAppState = RN.AppState;
} catch {
  RNAppState = null;
}

interface UseArrearMotivationOptions {
  subjectId?: string;
  isStudyActive?: boolean;
  initialDelayMs?: number; // Optional override for demo/test
}

export function useArrearMotivation({
  subjectId,
  isStudyActive = true,
  initialDelayMs,
}: UseArrearMotivationOptions) {
  const { user } = useAuth();

  const [isArrear, setIsArrear] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<MotivationalMessage | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [settings, setSettings] = useState<ArrearMotivationSettings | null>(null);

  const timerRef = useRef<any>(null);
  const isScreenActiveRef = useRef(isStudyActive);
  const isAppVisibleRef = useRef(true);
  const isArrearRef = useRef(false);

  isScreenActiveRef.current = isStudyActive;

  // 1. Check if the subject is an active arrear
  const checkArrearStatus = useCallback(async () => {
    if (!user || !subjectId) {
      setIsArrear(false);
      isArrearRef.current = false;
      return;
    }

    try {
      const statusInfo = await getArrearSubjectStatus(subjectId, user.id);
      const activeArrear = statusInfo.isArrear && statusInfo.status === 'active';
      setIsArrear(activeArrear);
      isArrearRef.current = activeArrear;
    } catch {
      setIsArrear(false);
      isArrearRef.current = false;
    }
  }, [user, subjectId]);

  // 2. Load Settings
  const loadSettings = useCallback(async () => {
    try {
      const s = await getArrearMotivationSettings();
      setSettings(s);
      return s;
    } catch {
      return null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    setIsToastVisible(false);
    // Schedule next message after dismissal
    scheduleNextMessage();
  }, []);

  const showRandomMessage = useCallback(async () => {
    if (!isArrearRef.current || !isScreenActiveRef.current || !isAppVisibleRef.current) {
      return;
    }

    const currentSettings = settings || (await getArrearMotivationSettings());
    if (!currentSettings.enabled) return;

    const msg = getRandomMotivationalMessage(currentSettings.language);
    setCurrentMessage(msg);
    setIsToastVisible(true);
  }, [settings]);

  const scheduleNextMessage = useCallback(
    (customDelayMs?: number) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (!isArrearRef.current || !isScreenActiveRef.current) {
        return;
      }

      const minMins = settings?.min_interval_minutes ?? 5;
      const maxMins = settings?.max_interval_minutes ?? 12;
      const delay = customDelayMs ?? calculateNextRandomIntervalMs(minMins, maxMins);

      timerRef.current = setTimeout(() => {
        if (isArrearRef.current && isScreenActiveRef.current && isAppVisibleRef.current) {
          showRandomMessage();
        }
      }, delay);
    },
    [settings, showRandomMessage]
  );

  // Initialize status and timer
  useEffect(() => {
    let isMounted = true;

    async function init() {
      await checkArrearStatus();
      const s = await loadSettings();

      if (!isMounted) return;

      if (isArrearRef.current && isStudyActive && s?.enabled) {
        // Schedule first motivation pop-up
        scheduleNextMessage(initialDelayMs);
      }
    }

    init();

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [checkArrearStatus, loadSettings, isStudyActive, initialDelayMs, scheduleNextMessage]);

  // App Visibility & Focus Listeners
  useEffect(() => {
    let appStateSub: any = null;

    // 1. React Native AppState listener (if running in React Native)
    if (RNAppState && RNAppState.addEventListener) {
      const handleAppStateChange = (nextAppState: string) => {
        const isVisible = nextAppState === 'active';
        isAppVisibleRef.current = isVisible;

        if (!isVisible && timerRef.current) {
          clearTimeout(timerRef.current);
        } else if (isVisible && isArrearRef.current && isScreenActiveRef.current) {
          scheduleNextMessage();
        }
      };

      appStateSub = RNAppState.addEventListener('change', handleAppStateChange);
    }

    // 2. Web visibility listener (for browser tabs)
    const handleWebVisibility = () => {
      if (typeof document !== 'undefined') {
        const isVisible = document.visibilityState === 'visible';
        isAppVisibleRef.current = isVisible;

        if (!isVisible && timerRef.current) {
          clearTimeout(timerRef.current);
        } else if (isVisible && isArrearRef.current && isScreenActiveRef.current) {
          scheduleNextMessage();
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleWebVisibility);
    }

    return () => {
      if (appStateSub && appStateSub.remove) {
        appStateSub.remove();
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleWebVisibility);
      }
    };
  }, [scheduleNextMessage]);

  return {
    isArrear,
    currentMessage,
    isToastVisible,
    dismissToast,
    showRandomMessage, // Can be used for testing
    settings,
    reloadSettings: loadSettings,
  };
}
