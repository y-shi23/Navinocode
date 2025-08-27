import React, { useEffect, useRef, useState } from 'react';
import { Pin, PinOff } from 'lucide-react';

// 通用可拖动小组件包装器：fixed 定位，位置保存在 localStorage(widget_positions)
// props: id (string, 必填), defaultPos: { x, y }, children

const STORAGE_KEY = 'widget_positions';

const PIN_STORAGE_KEY = 'widget_pins';

const DraggableWidget = ({ id, defaultPos = { x: 24, y: 24 }, children }) => {
  // 懒加载初始位置，避免首帧抖动
  const [pos, setPos] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const all = JSON.parse(raw);
        if (all && all[id]) return all[id];
      }
    } catch {
      // ignore
    }
    return defaultPos;
  });
  const posRef = useRef(pos);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const zRef = useRef(100); // 提升层级时的 zIndex
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // 懒加载固定状态，确保首帧就是正确的固定/贴边状态
  const [isPinned, setIsPinned] = useState(() => {
    try {
      const rawPins = localStorage.getItem(PIN_STORAGE_KEY);
      if (rawPins) {
        const pins = JSON.parse(rawPins);
        if (typeof pins?.[id] === 'boolean') return pins[id];
      }
    } catch {
      // ignore
    }
    return false;
  });
  const [dockedSide, setDockedSide] = useState(null); // 'left' | 'right' | 'top' | 'bottom' | null
  const [isExpanded, setIsExpanded] = useState(true); // dock 后是否展开（鼠标悬停时）

  // 当 id 变化时重新从存储恢复（通常 id 稳定，此处为健壮性处理）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const all = JSON.parse(raw);
        if (all && all[id]) {
          setPos(all[id]);
          posRef.current = all[id];
        } else {
          setPos(defaultPos);
          posRef.current = defaultPos;
        }
      } else {
        setPos(defaultPos);
        posRef.current = defaultPos;
      }
    } catch {
      setPos(defaultPos);
      posRef.current = defaultPos;
    }

    try {
      const rawPins = localStorage.getItem(PIN_STORAGE_KEY);
      if (rawPins) {
        const pins = JSON.parse(rawPins);
        if (typeof pins?.[id] === 'boolean') setIsPinned(pins[id]);
        else setIsPinned(false);
      } else {
        setIsPinned(false);
      }
    } catch {
      setIsPinned(false);
    }
  }, [id, defaultPos.x, defaultPos.y]);

  // 同步最新位置到 ref，避免事件回调闭包导致的过期值
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  // 测量容器尺寸
  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      const rect = containerRef.current.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const savePos = (p) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[id] = p;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // ignore
    }
  };

  const savePin = (val) => {
    try {
      const raw = localStorage.getItem(PIN_STORAGE_KEY);
      const pins = raw ? JSON.parse(raw) : {};
      pins[id] = val;
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pins));
    } catch {
      // ignore
    }
  };

  const onPointerDown = (e) => {
    // 避免在点击按钮/输入时开始拖拽
    const noDrag = e.target.closest('button, input, textarea, a, [data-no-drag]');
    if (noDrag) return;
    draggingRef.current = true;
    zRef.current = 200; // 提升
    // 取消贴边隐藏，准备拖拽
    if (dockedSide) {
      setDockedSide(null);
      setIsExpanded(true);
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    offsetRef.current = { x: clientX - pos.x, y: clientY - pos.y };
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    e.preventDefault?.();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let x = clientX - offsetRef.current.x;
    let y = clientY - offsetRef.current.y;

    // 简单边界限制，防止拖出视口
    const W = window.innerWidth;
    const H = window.innerHeight;
    const padding = 8;
    x = Math.max(padding, Math.min(W - padding, x));
    y = Math.max(padding, Math.min(H - padding, y));
  const next = { x, y };
  setPos(next);
  posRef.current = next;
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    zRef.current = 100;
    savePos(posRef.current);
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);

    // 自动贴边隐藏（未固定时）
    if (!isPinned) {
      autoDock();
    }
  };

  // 计算并执行贴边隐藏
  const autoDock = () => {
    if (!containerRef.current) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const padding = 8;
    const rect = containerRef.current.getBoundingClientRect();
    const distances = {
      left: Math.abs(rect.left - padding),
      right: Math.abs(W - padding - (rect.left + rect.width)),
      top: Math.abs(rect.top - padding),
      bottom: Math.abs(H - padding - (rect.top + rect.height)),
    };
    // 选择最近边
    let side = 'left';
    let min = distances.left;
    (['right','top','bottom']).forEach(s => {
      if (distances[s] < min) { min = distances[s]; side = s; }
    });

    // 计算吸附后的位置
    let next = { ...posRef.current };
    if (side === 'left') next.x = padding;
    if (side === 'right') next.x = Math.max(padding, W - rect.width - padding);
    if (side === 'top') next.y = padding;
    if (side === 'bottom') next.y = Math.max(padding, H - rect.height - padding);
    setPos(next);
    posRef.current = next;
    savePos(next);

    // 设置贴边并收起
    setDockedSide(side);
    // 稍后再收起，确保位置先完成
    setTimeout(() => setIsExpanded(false), 0);
  };

  const togglePin = () => {
    const v = !isPinned;
    setIsPinned(v);
    savePin(v);
    if (v) {
      // 固定后取消贴边隐藏并展开
      setDockedSide(null);
      setIsExpanded(true);
    } else {
      // 取消固定：立即贴边隐藏
      // 若尺寸尚未测量，延迟一帧再执行
      if (!containerRef.current || size.w === 0 || size.h === 0) {
        requestAnimationFrame(() => autoDock());
      } else {
        autoDock();
      }
    }
  };

  // 计算贴边隐藏的 transform
  const visibleStrip = 16; // 露出的边缘宽度/高度
  let transform = 'none';
  if (dockedSide && !isExpanded) {
    if (dockedSide === 'left') transform = `translateX(-${Math.max(0, size.w - visibleStrip)}px)`;
    if (dockedSide === 'right') transform = `translateX(${Math.max(0, size.w - visibleStrip)}px)`;
    if (dockedSide === 'top') transform = `translateY(-${Math.max(0, size.h - visibleStrip)}px)`;
    if (dockedSide === 'bottom') transform = `translateY(${Math.max(0, size.h - visibleStrip)}px)`;
  }

  const onMouseEnter = () => {
    if (dockedSide && !isPinned) setIsExpanded(true);
  };
  const onMouseLeave = () => {
    if (dockedSide && !isPinned) setIsExpanded(false);
  };

  // 监听键盘事件，支持Tab快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 检查是否按下了Tab键
      if (e.key === 'Tab') {
        // 阻止默认行为（切换焦点）
        e.preventDefault();
        
        // 切换固定状态
        togglePin();
      }
    };

    // 添加事件监听器
    window.addEventListener('keydown', handleKeyDown);
    
    // 清理事件监听器
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPinned]);

  // 固定状态时，确保取消贴边并保持展开（防御式，防止早期副作用遗留）
  useEffect(() => {
    if (isPinned) {
      if (dockedSide !== null) setDockedSide(null);
      if (!isExpanded) setIsExpanded(true);
    }
  }, [isPinned, dockedSide, isExpanded]);

  // 在挂载或固定状态变化后检查是否需要贴边（仅在未固定时）
  useEffect(() => {
    if (isPinned) return; // 固定时不贴边
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const W = window.innerWidth;
        const H = window.innerHeight;
        const padding = 8;

        const isNearLeft = rect.left <= padding;
        const isNearRight = rect.right >= W - padding;
        const isNearTop = rect.top <= padding;
        const isNearBottom = rect.bottom >= H - padding;

        if (isNearLeft || isNearRight || isNearTop || isNearBottom) {
          autoDock();
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isPinned]);

  return (
    <div
      ref={containerRef}
      className="fixed group"
      style={{ 
        left: pos.x, 
        top: pos.y, 
        zIndex: zRef.current, 
        cursor: 'grab',
        transform,
        transition: 'transform 280ms ease-in-out',
      }}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 固定按钮（右上角小图标） */}
      <button
        type="button"
        className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center bg-white/70 dark:bg-black/60 border border-white/40 dark:border-black/40 shadow-sm backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white/90 dark:hover:bg-black/80 transition-colors"
        style={{ cursor: 'pointer' }}
        onClick={togglePin}
        data-no-drag
        title={isPinned ? '已固定' : '未固定'}
      >
        {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
      </button>

      {children}
    </div>
  );
};

export default DraggableWidget;
