import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { recordUsageEvent } from '@/lib/usageEvents';
import AppSelector from '@/components/AppSelector';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import EditAppDialog from '@/components/EditAppDialog';
import { computeAppLetter } from '@/lib/utils';

const DOCK_ICON_SIZE = 48; // Tailwind w-12

// 根据应用数量动态计算间距
const getDockGap = (appCount) => {
  if (appCount <= 2) return 16;      // 少量应用时增加间距
  if (appCount <= 4) return 12;      // 中等数量应用适中间距
  if (appCount <= 6) return 8;       // 较多应用时减小间距
  return 6;                          // 很多应用时最小间距
};

// 动态计算插槽宽度
const getDockSlotWidth = (appCount) => DOCK_ICON_SIZE + getDockGap(appCount);
// 动态计算Dock参数的函数
const getDockParams = (appCount) => {
  const slotWidth = getDockSlotWidth(appCount);
  return {
    maxScale: appCount <= 3 ? 1.8 : 1.6,  // 少量应用时可以更大
    sigma: slotWidth * 0.7,                // 放大曲线的宽度
    offsetAmplitude: slotWidth * 0.4,      // 邻近图标的水平让位幅度（像素）
    offsetSigma: slotWidth * 0.9,          // 位移曲线的宽度（略宽于放大）
    influenceRadius: slotWidth * 4.0,      // hover 影响半径（用于边界与离开动画）
  };
};

const DraggableBottomBar = ({ apps, setApps, maxBottomApps = 8 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [targetIndex, setTargetIndex] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [pressStartPos, setPressStartPos] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false); // 新增：正在完成拖拽动画
  const [completingIndex, setCompletingIndex] = useState(null); // 正在完成动画的元素索引
  const [suppressTransition, setSuppressTransition] = useState(false); // 完成阶段后的瞬间禁用过渡，避免二次飞行

  // 使用 ref 来跟踪拖拽状态，避免事件时序问题
  const hasDraggedRef = useRef(false);
  const isDraggingRef = useRef(false);

  const containerRef = useRef(null);
  const selectorTriggerRef = useRef(null);
  const [bottomCount, setBottomCount] = useState(() => {
    try {
      const saved = localStorage.getItem('bottomCount');
      if (saved != null) {
        const val = parseInt(saved, 10);
        if (!Number.isNaN(val)) return Math.max(0, Math.min(val, maxBottomApps));
      }
    } catch {}
    return Math.min(apps.length, maxBottomApps);
  });
  const bottomApps = apps.slice(0, bottomCount);
  const [overSelector, setOverSelector] = useState(false);
  const [editApp, setEditApp] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const suppressNativeContextRef = useRef(false);
  const [hoverX, setHoverX] = useState(null);
  const hoverXRef = useRef(null);
  const hoverAnimationFrameRef = useRef(null);

  // 计算动态参数 - 移到组件开头避免初始化顺序问题
  const actualBottomApps = bottomApps.length;
  const dockParams = getDockParams(actualBottomApps);
  const dockGap = getDockGap(actualBottomApps);
  const dockSlotWidth = getDockSlotWidth(actualBottomApps);

  const scheduleHoverUpdate = useCallback((value) => {
    hoverXRef.current = value;
    if (hoverAnimationFrameRef.current != null) {
      return;
    }
    hoverAnimationFrameRef.current = requestAnimationFrame(() => {
      setHoverX(hoverXRef.current);
      hoverAnimationFrameRef.current = null;
    });
  }, []);

  const clearHover = useCallback(() => {
    // 离开时做一个丝滑的“退场”动画：将 hoverX 推到容器外侧，避免左端图标保留放大
    if (hoverXRef.current !== null) {
      const startValue = hoverXRef.current;
      const rectW = containerRef.current?.getBoundingClientRect().width || (Math.max(0, (apps?.length || 0)) * dockSlotWidth);
      const target = startValue < rectW / 2 ? -dockParams.influenceRadius * 2 : rectW + dockParams.influenceRadius * 2;
      const startTime = Date.now();
      const duration = 280; // 280ms 平滑过渡

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3); // ease-out cubic

        hoverXRef.current = startValue + (target - startValue) * easeOut;
        setHoverX(hoverXRef.current);

        if (progress < 1) {
          hoverAnimationFrameRef.current = requestAnimationFrame(animate);
        } else {
          hoverXRef.current = null;
          setHoverX(null);
          hoverAnimationFrameRef.current = null;
        }
      };

      if (hoverAnimationFrameRef.current) {
        cancelAnimationFrame(hoverAnimationFrameRef.current);
      }
      hoverAnimationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [apps?.length, dockSlotWidth, dockParams]);

  useEffect(() => {
    const handler = (e) => {
      if (suppressNativeContextRef.current) {
        e.preventDefault();
        e.stopPropagation();
        suppressNativeContextRef.current = false;
      }
    };
    document.addEventListener('contextmenu', handler, true);
    return () => document.removeEventListener('contextmenu', handler, true);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverAnimationFrameRef.current != null) {
        cancelAnimationFrame(hoverAnimationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isDragging || isCompleting) {
      clearHover();
    }
  }, [isDragging, isCompleting, clearHover]);

  // 动态计算容器宽度
  const getContainerWidth = () => {
    if (actualBottomApps === 0) return 200; // 最小宽度

    // 计算所有图标的总宽度
    const iconsWidth = actualBottomApps * DOCK_ICON_SIZE;

    // 计算图标之间的间距（包括AppSelector与最后一个图标之间的间距）
    // 实际元素数量 = 图标数量 + 1个选择器，所以间隔数 = 元素数量
    const totalElements = actualBottomApps + 1; // 图标 + AppSelector
    const totalGaps = totalElements > 1 ? totalElements - 1 : 0; // 元素之间的间隔
    const gapsWidth = totalGaps * dockGap;

    // AppSelector的宽度（与图标相同）
    const selectorWidth = DOCK_ICON_SIZE;

    const totalWidth = iconsWidth + gapsWidth + selectorWidth;

    // 调试信息
    console.log('Dock宽度计算:', {
      actualBottomApps,
      iconsWidth,
      selectorWidth,
      totalElements,
      totalGaps,
      dockGap,
      gapsWidth,
      totalWidth
    });

    return totalWidth;
  };

  const containerWidth = getContainerWidth();
  const cardExtraPadding = 24; // apple-card p-3 左右各12px
  const overflowGuard = Math.max(20, dockGap * 2); // 根据间距动态调整预留空间

  const handleDockMouseMove = useCallback((e) => {
    if (!containerRef.current || isDragging || isCompleting || actualBottomApps === 0) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    if (!Number.isFinite(relativeX)) {
      return;
    }
    // 使用动态插槽宽度
    const maxWidth = Math.max(0, actualBottomApps * dockSlotWidth);
    const clampedX = Math.max(0, Math.min(relativeX, maxWidth));
    scheduleHoverUpdate(clampedX);
  }, [actualBottomApps, isDragging, isCompleting, scheduleHoverUpdate, dockSlotWidth]);

  const handleDockMouseEnter = useCallback((e) => {
    handleDockMouseMove(e);
  }, [handleDockMouseMove]);

  const handleDockMouseLeave = useCallback(() => {
    clearHover();
  }, [clearHover]);

  // 计算每个元素在拖拽/落位过程中应该显示的位置
  const getItemTransform = (index) => {
    // 仅在既不拖拽也不处于落位动画时归零
    if (!(isDragging || isCompleting) || dragIndex === null || targetIndex === null) {
      return 'translateX(0px)';
    }

    // 被拖拽的元素不需要transform（它有自己的拖拽偏移）
    if (index === dragIndex) {
      return 'translateX(0px)';
    }

    const itemWidth = dockSlotWidth; // 动态图标宽度 + 间距
    
    // 如果拖拽目标位置就是当前位置，不需要移动
    if (targetIndex === dragIndex) {
      return 'translateX(0px)';
    }

    // 计算元素应该移动的距离
    if (dragIndex < targetIndex) {
      // 向右拖拽：dragIndex 到 targetIndex 之间的元素向左移动
      if (index > dragIndex && index <= targetIndex) {
        return `translateX(-${itemWidth}px)`;
      }
    } else if (dragIndex > targetIndex) {
      // 向左拖拽：targetIndex 到 dragIndex 之间的元素向右移动
      if (index >= targetIndex && index < dragIndex) {
        return `translateX(${itemWidth}px)`;
      }
    }

    return 'translateX(0px)';
  };

  const getDockScale = useCallback((index) => {
    if (hoverX == null || isDragging || isCompleting) return 1;

    const center = index * dockSlotWidth + dockSlotWidth / 2;
    const d = Math.abs((hoverX ?? 0) - center);
    if (d >= dockParams.influenceRadius) return 1;

    const mag = (dockParams.maxScale - 1) * Math.exp(-(d * d) / (2 * dockParams.sigma * dockParams.sigma));
    const scale = 1 + mag;
    return Math.max(1, Math.min(scale, dockParams.maxScale));
  }, [hoverX, isDragging, isCompleting, dockSlotWidth, dockParams]);

  const getDockOffset = useCallback((index) => {
    if (hoverX == null || isDragging || isCompleting) return 0;
    const center = index * dockSlotWidth + dockSlotWidth / 2;
    const dx = center - (hoverX ?? 0);
    const adx = Math.abs(dx);
    if (adx >= dockParams.influenceRadius) return 0;
    if (adx < 1e-3) return 0;
    const dir = dx > 0 ? 1 : -1; // 指针左侧的图标向左，右侧的图标向右
    const amp = dockParams.offsetAmplitude * Math.exp(-(adx * adx) / (2 * dockParams.offsetSigma * dockParams.offsetSigma));
    return amp * dir;
  }, [hoverX, isDragging, isCompleting, dockSlotWidth, dockParams]);

  const getIconColor = (iconName) => {
    const colorMap = {
      gmail: 'bg-red-500',
      youtube: 'bg-red-600', 
      github: 'bg-gray-900',
      twitter: 'bg-blue-400',
      facebook: 'bg-blue-600',
      instagram: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
      linkedin: 'bg-blue-700',
      reddit: 'bg-orange-500',
    };
    return colorMap[iconName] || 'bg-gray-500';
  };

  const handleMouseDown = (e, index) => {
    // 仅左键触发长按拖拽
    if (e.button !== 0) return;
    e.preventDefault();
    const startPos = { x: e.clientX, y: e.clientY };
    setPressStartPos(startPos);
    
    const timer = setTimeout(() => {
      startDrag(index, startPos);
    }, 500);
    
    setLongPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (isDraggingRef.current) {
      resetDragState();
    }
  };

  const handleTouchStart = (e, index) => {
    e.preventDefault();
    const touch = e.touches[0];
    const startPos = { x: touch.clientX, y: touch.clientY };
    setPressStartPos(startPos);
    
    const timer = setTimeout(() => {
      startDrag(index, startPos);
    }, 500);
    
    setLongPressTimer(timer);
  };

  const startDrag = (index, startPos) => {
    clearHover();
    setIsDragging(true);
    setDragIndex(index);
    setTargetIndex(index); // 初始目标位置就是原位置
    setDragStartPos(startPos);
    setDragOffset({ x: 0, y: 0 });
    setHasDragged(false);
    
    // 同时更新 ref
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleMouseUp = (e) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // 拖到九宫格按钮上：从底栏删除（移动到 apps 尾部）
  if (isDragging && dragIndex !== null && overSelector) {
      setApps((prev) => {
        const prevBottom = prev.slice(0, bottomCount);
        const rest = prev.slice(bottomCount);
    const removed = prevBottom[dragIndex];
    const newBottom = prevBottom.filter((_, i) => i !== dragIndex);
    // 移出底栏但保留在全部应用中（追加到尾部）
    return [...newBottom, ...rest, removed];
      });
      setBottomCount((v) => {
        const nv = Math.max(0, v - 1);
        try { localStorage.setItem('bottomCount', String(nv)); } catch {}
        return nv;
      });
      setOverSelector(false);
      resetDragState();
      return;
    }

    // 以当前指针位置最终判定是否位于九宫格按钮上（兼容鼠标/触摸）
    if (isDragging && dragIndex !== null && selectorTriggerRef.current && e && (e.clientX || e.changedTouches)) {
      let x = e.clientX;
      let y = e.clientY;
      if (e.changedTouches && e.changedTouches[0]) {
        x = e.changedTouches[0].clientX;
        y = e.changedTouches[0].clientY;
      }
      const rect = selectorTriggerRef.current.getBoundingClientRect();
      const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    if (inside) {
        setApps((prev) => {
          const prevBottom = prev.slice(0, bottomCount);
          const rest = prev.slice(bottomCount);
      const removed = prevBottom[dragIndex];
      const newBottom = prevBottom.filter((_, i) => i !== dragIndex);
      return [...newBottom, ...rest, removed];
        });
        setBottomCount((v) => {
          const nv = Math.max(0, v - 1);
          try { localStorage.setItem('bottomCount', String(nv)); } catch {}
          return nv;
        });
        setOverSelector(false);
        resetDragState();
        return;
      }
    }

    if (isDragging && dragIndex !== null && targetIndex !== null && dragIndex !== targetIndex) {
      // 计算目标位置的偏移量（从原始位置算起）
      const itemWidth = dockSlotWidth; // 动态图标宽度 + 间距
      const positionDiff = targetIndex - dragIndex;
      const targetOffsetX = positionDiff * itemWidth;
      
      // 设置完成动画状态 - 立即将dragOffset设置为目标位置
      setIsCompleting(true);
      setDragOffset({ x: targetOffsetX, y: 0 }); // 直接设置为目标偏移
      setCompletingIndex(dragIndex);
      
      // 暂停指针跟随，进入受控动画
      setIsDragging(false);
      isDraggingRef.current = false;
      
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // 动画完成后再提交重排：先禁用过渡，重排并清零位移，然后下一帧恢复过渡，避免二次飞行
      setTimeout(() => {
        setSuppressTransition(true);

        setApps((prevApps) => {
          const prevBottom = prevApps.slice(0, bottomCount);
          const rest = prevApps.slice(bottomCount);
          const reordered = [...prevBottom];
          const item = reordered[dragIndex];
          reordered.splice(dragIndex, 1);
          reordered.splice(targetIndex, 0, item);
          return [...reordered, ...rest];
        });

        // 清理到最终静止状态（无 transform）
        setIsCompleting(false);
        setDragOffset({ x: 0, y: 0 });
        setCompletingIndex(null);
        setHasDragged(false);
        hasDraggedRef.current = false;
        setDragIndex(null);
        setTargetIndex(null);

        // 下一帧恢复过渡
        requestAnimationFrame(() => {
          setSuppressTransition(false);
        });
      }, 350); // 与CSS动画时间匹配
      
    } else {
      // 如果没有移动位置，立即重置状态
      resetDragState();
    }
  };

  const handleMouseMove = (e) => {
    if (longPressTimer) {
      const currentPos = { x: e.clientX, y: e.clientY };
      const distance = Math.sqrt(
        Math.pow(currentPos.x - pressStartPos.x, 2) + 
        Math.pow(currentPos.y - pressStartPos.y, 2)
      );
      
      if (distance > 10) {
      setOverSelector(false);
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }

    if (isDragging && dragIndex !== null) {
      const newOffset = {
        x: e.clientX - dragStartPos.x,
        y: e.clientY - dragStartPos.y
      };
      
      if (Math.abs(newOffset.x) > 5 || Math.abs(newOffset.y) > 5) {
        setHasDragged(true);
        hasDraggedRef.current = true;
      }
      
      setDragOffset(newOffset);
      
      // 命中检测：九宫格按钮
      const triggerRect = selectorTriggerRef.current?.getBoundingClientRect();
      if (triggerRect) {
        const inside = e.clientX >= triggerRect.left && e.clientX <= triggerRect.right && e.clientY >= triggerRect.top && e.clientY <= triggerRect.bottom;
        if (inside !== overSelector) setOverSelector(inside);
      } else if (overSelector) {
        setOverSelector(false);
      }
      
      // 计算目标位置
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const relativeX = e.clientX - containerRect.left;
        const itemWidth = dockSlotWidth; // 动态图标宽度 + 间距
        
        // 计算最接近的插槽位置
        let newTargetIndex = Math.round(relativeX / itemWidth);
        newTargetIndex = Math.max(0, Math.min(actualBottomApps - 1, newTargetIndex));
        
        // 只有当目标位置改变时才更新
        if (newTargetIndex !== targetIndex) {
          setTargetIndex(newTargetIndex);
        }
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    
    if (longPressTimer) {
      const currentPos = { x: touch.clientX, y: touch.clientY };
      const distance = Math.sqrt(
        Math.pow(currentPos.x - pressStartPos.x, 2) + 
        Math.pow(currentPos.y - pressStartPos.y, 2)
      );
      
      if (distance > 10) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }

    if (isDragging && dragIndex !== null) {
      const newOffset = {
        x: touch.clientX - dragStartPos.x,
        y: touch.clientY - dragStartPos.y
      };
      
      if (Math.abs(newOffset.x) > 5 || Math.abs(newOffset.y) > 5) {
        setHasDragged(true);
        hasDraggedRef.current = true;
      }
      
      setDragOffset(newOffset);
      
      // 命中检测：九宫格按钮（触摸）
      const triggerRect = selectorTriggerRef.current?.getBoundingClientRect();
      if (triggerRect) {
        const inside = touch.clientX >= triggerRect.left && touch.clientX <= triggerRect.right && touch.clientY >= triggerRect.top && touch.clientY <= triggerRect.bottom;
        if (inside !== overSelector) setOverSelector(inside);
      } else if (overSelector) {
        setOverSelector(false);
      }
      
      // 计算目标位置
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const relativeX = touch.clientX - containerRect.left;
        const itemWidth = dockSlotWidth; // 动态图标宽度 + 间距
        
        // 计算最接近的插槽位置
        let newTargetIndex = Math.round(relativeX / itemWidth);
        newTargetIndex = Math.max(0, Math.min(actualBottomApps - 1, newTargetIndex));
        
        // 只有当目标位置改变时才更新
        if (newTargetIndex !== targetIndex) {
          setTargetIndex(newTargetIndex);
        }
      }
    }
  };

  const resetDragState = () => {
    setIsDragging(false);
    setDragIndex(null);
    setTargetIndex(null);
    setDragOffset({ x: 0, y: 0 });
    setHasDragged(false);
    setIsCompleting(false);
    setCompletingIndex(null);
    
    // 立即更新 isDragging ref
    isDraggingRef.current = false;
    
    // 延迟重置 hasDragged ref，确保 click 事件能正确检测到拖拽状态
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 100);
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // 统一取消长按与拖拽的工具函数
  const cancelDragAndTimer = () => {
    cancelLongPress();
    if (isDraggingRef.current || isDragging) {
      resetDragState();
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragIndex, dragStartPos, targetIndex, apps, bottomCount]);

  // 页面失焦或切到后台时，取消长按与拖拽，避免回到页面时“粘住”
  useEffect(() => {
    const onBlur = () => cancelDragAndTimer();
    const onVisibility = () => {
      if (document.hidden) cancelDragAndTimer();
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // apps 或配置变化时，确保 bottomCount 合法并持久化
  useEffect(() => {
    // 先从 localStorage 读取最新值，避免与其他组件写入存在短暂不一致
    let lsCount = null;
    try {
      const saved = localStorage.getItem('bottomCount');
      if (saved != null) {
        const val = parseInt(saved, 10);
        if (!Number.isNaN(val)) lsCount = val;
      }
    } catch {}

    setBottomCount((v) => {
      const base = lsCount != null ? lsCount : v;
      const nv = Math.min(Math.max(0, base), apps.length, maxBottomApps);
      try { localStorage.setItem('bottomCount', String(nv)); } catch {}
      return nv;
    });
  }, [apps.length, maxBottomApps]);

  // 监听自定义事件：其他组件更新了 bottomCount（例如 AppSelector 增加到底栏）
  useEffect(() => {
    const onBottomCountChanged = (ev) => {
      let next = null;
      if (ev && ev.detail != null && !Number.isNaN(parseInt(ev.detail, 10))) {
        next = parseInt(ev.detail, 10);
      } else {
        try {
          const saved = localStorage.getItem('bottomCount');
          if (saved != null) {
            const val = parseInt(saved, 10);
            if (!Number.isNaN(val)) next = val;
          }
        } catch {}
      }
      if (next != null) {
        setBottomCount((v) => {
          const nv = Math.min(Math.max(0, next), apps.length, maxBottomApps);
          try { localStorage.setItem('bottomCount', String(nv)); } catch {}
          return nv;
        });
      }
    };
    window.addEventListener('nocode:bottomCountChanged', onBottomCountChanged);
    return () => window.removeEventListener('nocode:bottomCountChanged', onBottomCountChanged);
  }, [apps.length, maxBottomApps]);

  const handleAppClick = (app, e) => {
    // 使用 ref 检测拖拽状态，避免事件时序问题
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  // 点击跳转前，务必清理任何潜在长按或拖拽状态，避免返回后进入粘连状态
  cancelDragAndTimer();
    
    recordUsageEvent('jump');
    window.open(app.url, '_blank');
  };

  return (
    <div className="py-6">
      <div className="mx-auto px-4">
        <div
          className="apple-card p-4 mx-auto transition-all duration-300 ease-in-out"
          style={{
            width: `${containerWidth + cardExtraPadding + overflowGuard}px`,
            maxWidth: '95vw',
            minWidth: '250px'
          }}
        >
          <div
            ref={containerRef}
            className="flex justify-center items-center mx-auto"
            onMouseMove={handleDockMouseMove}
            onMouseEnter={handleDockMouseEnter}
            onMouseLeave={handleDockMouseLeave}
            style={{
              width: 'fit-content',
              gap: `${dockGap}px`
            }}
          >
            {bottomApps.map((app, index) => {
              const dockScale = getDockScale(index);
              const baseTransform = getItemTransform(index);
              const shouldLift = dockScale > 1.05 && !(isDragging || isCompleting);
              const shadowIntensity = Math.min((dockScale - 1) * 2, 1); // 阴影强度基于缩放程度
              const computedTransform = (() => {
                if (isDragging && index === dragIndex) {
                  return `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.1) rotate(3deg)`;
                }
                if (isCompleting && index === dragIndex) {
                  return `translate(${dragOffset.x}px, ${dragOffset.y}px)`;
                }
                const transforms = [];
                if (baseTransform) transforms.push(baseTransform);
                if (!(isDragging || isCompleting)) {
                  const hoverOffset = getDockOffset(index);
                  if (Math.abs(hoverOffset) > 0.1) transforms.push(`translateX(${hoverOffset.toFixed(2)}px)`);
                  if (dockScale !== 1) transforms.push(`scale(${dockScale.toFixed(3)})`);
                }
                return transforms.join(' ').trim() || 'translateX(0px)';
              })();
              const computedTransition = suppressTransition
                ? 'none'
                : isDragging && index === dragIndex
                ? 'none'
                : isCompleting && index === dragIndex
                ? 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)'
                : 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94), filter 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
              const computedZIndex =
                (isDragging && index === dragIndex) || (isCompleting && index === dragIndex)
                  ? 1000
                  : shouldLift
                  ? Math.round(dockScale * 100)
                  : 'auto';

              return (
                <ContextMenu key={app.id}>
                  <ContextMenuTrigger asChild>
                    <Button
                      key={app.id}
                      variant="ghost"
                      className={`group relative flex h-auto w-12 shrink-0 flex-col items-center justify-center rounded-none bg-transparent p-0 transition-transform duration-200 ease-out will-change-transform focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent dark:hover:bg-transparent ${
                        isDragging && index === dragIndex ? 'z-50' : ''
                      }`}
                      style={{
                        transform: computedTransform,
                        opacity: isDragging && index === dragIndex ? 0.9 : 1,
                        cursor: isDragging && index === dragIndex ? 'grabbing' : 'pointer',
                        transition: computedTransition,
                        zIndex: computedZIndex,
                        transformOrigin: 'bottom center',
                        filter: shouldLift
                          ? `drop-shadow(0 ${8 * shadowIntensity}px ${16 * shadowIntensity}px rgba(15, 23, 42, ${0.15 * shadowIntensity})) drop-shadow(0 ${4 * shadowIntensity}px ${8 * shadowIntensity}px rgba(15, 23, 42, ${0.1 * shadowIntensity}))`
                          : 'drop-shadow(0 2px 8px rgba(15, 23, 42, 0.08))'
                      }}
                      onMouseDown={(e) => handleMouseDown(e, index)}
                      onTouchStart={(e) => handleTouchStart(e, index)}
                      onContextMenu={() => cancelLongPress()}
                      onClick={(e) => handleAppClick(app, e)}
                    >
                      {(() => {
                        const ic = app.icon || '';
                        const isUrlLike = /^https?:\/\//i.test(ic) || ic.startsWith('data:');
                        if (isUrlLike) {
                          return (
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1 bg-white/90 dark:bg-black/30 overflow-hidden">
                              <img
                                src={ic}
                                alt={app.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  // 先尝试备用 favicon 源（Google s2），再退回字母块
                                  const imgEl = e.currentTarget;
                                  if (!imgEl.dataset.fallbackTried) {
                                    try {
                                      const hostname = new URL(app.url).hostname;
                                      imgEl.dataset.fallbackTried = '1';
                                      imgEl.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
                                      return;
                                    } catch {}
                                  }
                                  imgEl.style.display = 'none';
                                  const parent = imgEl.parentElement;
                                  if (parent) {
                                    parent.className = `w-12 h-12 rounded-2xl flex items-center justify-center mb-1 ${getIconColor(app.icon)} text-white`;
                                    const span = document.createElement('span');
                                    span.className = 'font-bold text-sm';
                                    span.textContent = computeAppLetter(app);
                                    parent.appendChild(span);
                                  }
                                }}
                              />
                            </div>
                          );
                        }
                        // 关键字或空：渲染字母块
                        return (
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-1 ${getIconColor(app.icon)} text-white`}>
                            <span className="font-bold text-sm">{computeAppLetter(app)}</span>
                          </div>
                        );
                      })()}
                    </Button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="rounded-2xl shadow-lg border bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-1 min-w-[10rem]">
                    <ContextMenuItem
                      className="rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onSelect={() => {
                        setEditApp(app);
                        setIsEditOpen(true);
                        suppressNativeContextRef.current = true;
                      }}
                    >
                      编辑
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="rounded-xl px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                      onSelect={() => {
                        // 从全部应用中删除该项；若该项在底栏内，同时减少 bottomCount
                        setApps((prev) => prev.filter((a) => a.id !== app.id));
                        setBottomCount((v) => {
                          const nv = Math.max(0, v - 1);
                          try {
                            localStorage.setItem('bottomCount', String(nv));
                          } catch {}
                          try {
                            window.dispatchEvent(new CustomEvent('nocode:bottomCountChanged', { detail: String(nv) }));
                          } catch {}
                          return nv;
                        });
                        suppressNativeContextRef.current = true;
                      }}
                    >
                      删除
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
            <AppSelector
              apps={apps}
              setApps={setApps}
              triggerRef={selectorTriggerRef}
              dropHighlight={isDragging && overSelector}
            />
          </div>
        </div>
        <EditAppDialog isOpen={isEditOpen} setIsOpen={setIsEditOpen} app={editApp} setApps={setApps} />
      </div>
    </div>
  );
};

export default DraggableBottomBar;
