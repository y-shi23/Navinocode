import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

// 番茄钟小组件（Apple Design风格 + 玻璃材质卡片）
const PomodoroTimer = () => {
  // 可配置总时长（分钟）
  const [minutesSetting, setMinutesSetting] = useState(() => {
    const m = parseInt(localStorage.getItem('pomodoro_minutes') || '25', 10);
    return Number.isFinite(m) && m > 0 ? m : 25;
  });
  const [remaining, setRemaining] = useState(() => minutesSetting * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  // 持久化设置
  useEffect(() => {
    localStorage.setItem('pomodoro_minutes', String(minutesSetting));
  }, [minutesSetting]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const reset = () => {
    setRunning(false);
    setRemaining(minutesSetting * 60);
  };

  const toggle = () => setRunning((v) => !v);

  const formatted = useMemo(() => {
    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
    const s = Math.floor(remaining % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [remaining]);

  const applyMinutes = (v) => {
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n > 0 && n <= 180) {
      setMinutesSetting(n);
      setRemaining(n * 60);
      setRunning(false);
    }
  };

  return (
  <div className="apple-card rounded-3xl p-3 w-[260px] aspect-square select-none relative overflow-hidden">
      {/* 设置按钮（左上角） */}
      <div className="absolute top-3 left-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-xl w-8 h-8 apple-button"
              aria-label="设置番茄钟"
            >
              <Settings className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 rounded-2xl apple-popover">
            <div className="space-y-3">
              <div className="text-sm font-medium">设置倒计时（分钟）</div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={minutesSetting}
                  onChange={(e) => applyMinutes(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="text-xs text-gray-500">范围 1-180 分钟</div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 中央倒计时 */}
  <div className="flex items-center justify-center py-10 h-full">
  <div className="text-4xl font-semibold tracking-tight text-gray-800 dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatted}
        </div>
      </div>

      {/* 底部操作：左下 Start / 右下 Reset */}
  <div className="flex items-center justify-between mt-2 absolute left-4 right-4 bottom-4">
        <Button
          onClick={toggle}
          className="rounded-2xl px-3 py-1.5 apple-button text-sm"
          variant="secondary"
        >
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button
          onClick={reset}
          className="rounded-2xl px-3 py-1.5 apple-button text-sm"
          variant="outline"
        >
          Reset
        </Button>
      </div>
    </div>
  );
};

export default PomodoroTimer;
