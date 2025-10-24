import React, { useState, useRef, useEffect } from 'react';
import { Grid3X3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import EditAppDialog from '@/components/EditAppDialog';
import AddAppDialog from '@/components/AddAppDialog';
import { computeAppLetter } from '@/lib/utils';

const AppSelector = ({ apps, setApps, triggerRef = null, dropHighlight = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddAppOpen, setIsAddAppOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [targetIndex, setTargetIndex] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [pressStartPos, setPressStartPos] = useState({ x: 0, y: 0 });
  const [isDraggedOutside, setIsDraggedOutside] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [snapPosition, setSnapPosition] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completingIndex, setCompletingIndex] = useState(null);
  const [suppressTransition, setSuppressTransition] = useState(false);
  const [editApp, setEditApp] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const suppressNativeContextRef = useRef(false);

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
  
  // 使用 ref 来跟踪拖拽状态，避免事件时序问题
  const hasDraggedRef = useRef(false);
  const isDraggingRef = useRef(false);
  
  const gridRef = useRef(null);
  const contentRef = useRef(null);
  const [gridMetrics, setGridMetrics] = useState({ cols: 3, itemWidth: 0, itemHeight: 0 });

  // 计算与更新网格度量
  const updateGridMetrics = () => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const cols = window.innerWidth >= 640 ? 4 : 3;
    const rows = Math.max(1, Math.ceil(apps.length / cols));
    const itemWidth = rect.width / cols;
    const itemHeight = rect.height / rows;
    setGridMetrics({ cols, itemWidth, itemHeight });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateGridMetrics();
    const onResize = () => updateGridMetrics();
    window.addEventListener('resize', onResize);
    const id = setInterval(updateGridMetrics, 250); // 避免内容高度异步变化错过一次测量
    return () => { window.removeEventListener('resize', onResize); clearInterval(id); };
  }, [isOpen, apps.length]);

  const handleMouseDown = (e, index) => {
    // 仅左键参与长按拖拽；右键/中键不触发拖拽
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();
    const startPos = { x: e.clientX, y: e.clientY };
    setPressStartPos(startPos);
    
    const timer = setTimeout(() => {
      startDrag(index, startPos);
    }, 500);
    
    setLongPressTimer(timer);
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

  // 统一取消长按定时器与拖拽状态
  const cancelDragAndTimer = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (isDragging || hasDraggedRef.current || isDraggingRef.current) {
      resetDragState();
    }
  };

  const startDrag = (index, startPos) => {
    setIsDragging(true);
    setDragIndex(index);
  setTargetIndex(index);
    setDragStartPos(startPos);
    setDragOffset({ x: 0, y: 0 });
    setIsDraggedOutside(false);
    setHasDragged(false);
    setSnapPosition(null);
    
    // 同时更新 ref
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (longPressTimer) {
      const currentPos = { x: e.clientX, y: e.clientY };
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
        x: e.clientX - dragStartPos.x,
        y: e.clientY - dragStartPos.y
      };
      
      if (Math.abs(newOffset.x) > 5 || Math.abs(newOffset.y) > 5) {
        setHasDragged(true);
        hasDraggedRef.current = true;
      }

  const contentRect = contentRef.current?.getBoundingClientRect();
  const gridRect = gridRef.current?.getBoundingClientRect();
      if (contentRect) {
        const outsideContent =
          e.clientY < contentRect.top ||
          e.clientY > contentRect.bottom ||
          e.clientX < contentRect.left ||
          e.clientX > contentRect.right;
        const isInBottomArea = e.clientY > window.innerHeight - 150;
        const isOutside = outsideContent || isInBottomArea;
        setIsDraggedOutside(isOutside);

        if (!isOutside && gridRect) {
          const { cols, itemWidth, itemHeight } = gridMetrics;
          const relativeX = e.clientX - gridRect.left;
          const relativeY = e.clientY - gridRect.top;
          const col = Math.max(0, Math.min(cols - 1, Math.round(relativeX / itemWidth)));
          const row = Math.max(0, Math.floor(relativeY / itemHeight));
          const newTarget = Math.min(apps.length - 1, row * cols + col);
          setTargetIndex(newTarget);
          const targetCol = newTarget % cols;
          const targetRow = Math.floor(newTarget / cols);
          const snapX = targetCol * itemWidth - (dragIndex % cols) * itemWidth;
          const snapY = targetRow * itemHeight - Math.floor(dragIndex / cols) * itemHeight;
          setSnapPosition({ x: snapX, y: snapY });
          const smoothOffset = {
            x: newOffset.x + (snapX - newOffset.x) * 0.2,
            y: newOffset.y + (snapY - newOffset.y) * 0.2
          };
          setDragOffset(smoothOffset);
        } else {
          setDragOffset(newOffset);
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

  const contentRect = contentRef.current?.getBoundingClientRect();
  const gridRect = gridRef.current?.getBoundingClientRect();
      if (contentRect) {
        const outsideContent =
          touch.clientY < contentRect.top ||
          touch.clientY > contentRect.bottom ||
          touch.clientX < contentRect.left ||
          touch.clientX > contentRect.right;
        const isInBottomArea = touch.clientY > window.innerHeight - 150;
        const isOutside = outsideContent || isInBottomArea;
        setIsDraggedOutside(isOutside);

        if (!isOutside && gridRect) {
          const { cols, itemWidth, itemHeight } = gridMetrics;
          const relativeX = touch.clientX - gridRect.left;
          const relativeY = touch.clientY - gridRect.top;
          const col = Math.max(0, Math.min(cols - 1, Math.round(relativeX / itemWidth)));
          const row = Math.max(0, Math.floor(relativeY / itemHeight));
          const newTarget = Math.min(apps.length - 1, row * cols + col);
          setTargetIndex(newTarget);
          const targetCol = newTarget % cols;
          const targetRow = Math.floor(newTarget / cols);
          const snapX = targetCol * itemWidth - (dragIndex % cols) * itemWidth;
          const snapY = targetRow * itemHeight - Math.floor(dragIndex / cols) * itemHeight;
          setSnapPosition({ x: snapX, y: snapY });
          const smoothOffset = {
            x: newOffset.x + (snapX - newOffset.x) * 0.2,
            y: newOffset.y + (snapY - newOffset.y) * 0.2
          };
          setDragOffset(smoothOffset);
        } else {
          setDragOffset(newOffset);
        }
      }
    }
  };

  const handleMouseUp = (e) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (isDragging && dragIndex !== null) {
      // 以最终位置判断是否在卡片外
      let finalOutside = isDraggedOutside;
      if (contentRef.current && e) {
        let x = e.clientX;
        let y = e.clientY;
        if ((!x || !y) && e.changedTouches && e.changedTouches[0]) {
          x = e.changedTouches[0].clientX;
          y = e.changedTouches[0].clientY;
        }
        if (typeof x === 'number' && typeof y === 'number') {
          const rect = contentRef.current.getBoundingClientRect();
          const outsideContent = y < rect.top || y > rect.bottom || x < rect.left || x > rect.right;
          const isInBottomArea = y > window.innerHeight - 150;
          finalOutside = outsideContent || isInBottomArea;
        }
      }

      if (finalOutside) {
        // 计算当前底栏展示数量 bottomCount（与 DraggableBottomBar 保持一致，存放在 localStorage）
        let bottomCount = Math.min(apps.length, 8);
        try {
          const saved = localStorage.getItem('bottomCount');
          if (saved != null) {
            const val = parseInt(saved, 10);
            if (!Number.isNaN(val)) bottomCount = Math.max(0, Math.min(val, 8));
          }
        } catch {}

        const draggedApp = apps[dragIndex];
        
        // 检查应用是否已经在底栏中（底栏定义为 apps 的前 bottomCount 项）
        const isAlreadyInBottom = dragIndex < bottomCount;
        
        if (!isAlreadyInBottom) {
          const newApps = [...apps];
          // 移除原位置
          newApps.splice(dragIndex, 1);
          // 插入到底栏末尾（保持原底栏相对顺序）
          newApps.splice(bottomCount, 0, draggedApp);
          // 扩充底栏展示数量（不超过 8）
          const next = Math.min(bottomCount + 1, 8);
          try {
            localStorage.setItem('bottomCount', String(next));
            window.dispatchEvent(new CustomEvent('nocode:bottomCountChanged', { detail: String(next) }));
          } catch {}
          setApps(newApps);
        }
        setIsOpen(false);
      } else {
        // 在网格内松手：若未能得到有效 targetIndex，则基于指针位置回退一次计算
        let tgt = targetIndex;
        if ((tgt === null || tgt === dragIndex) && gridRef.current) {
          let x = e?.clientX;
          let y = e?.clientY;
          if ((!x || !y) && e?.changedTouches && e.changedTouches[0]) {
            x = e.changedTouches[0].clientX;
            y = e.changedTouches[0].clientY;
          }
          const rect = gridRef.current.getBoundingClientRect();
          const { cols, itemWidth, itemHeight } = gridMetrics;
          if (typeof x === 'number' && typeof y === 'number' && itemWidth && itemHeight) {
            const relX = x - rect.left;
            const relY = y - rect.top;
            const col = Math.max(0, Math.min(cols - 1, Math.round(relX / itemWidth)));
            const row = Math.max(0, Math.floor(relY / itemHeight));
            const computed = Math.min(apps.length - 1, row * cols + col);
            tgt = computed;
          }
        }

        if (tgt != null && dragIndex != null && tgt !== dragIndex) {
          // 完成阶段动画：将拖拽项以受控动画移动到目标位置
          const { cols, itemWidth, itemHeight } = gridMetrics;
          const fromCol = dragIndex % cols;
          const fromRow = Math.floor(dragIndex / cols);
          const toCol = tgt % cols;
          const toRow = Math.floor(tgt / cols);
          const dx = (toCol - fromCol) * itemWidth;
          const dy = (toRow - fromRow) * itemHeight;
        setIsCompleting(true);
        setCompletingIndex(dragIndex);
        setDragOffset({ x: dx, y: dy });
        setIsDragging(false);
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        setTimeout(() => {
          setSuppressTransition(true);
          setApps((prev) => {
            const arr = [...prev];
            const item = arr[dragIndex];
            arr.splice(dragIndex, 1);
            arr.splice(tgt, 0, item);
            return arr;
          });
          // 归零状态
          setIsCompleting(false);
          setCompletingIndex(null);
          setDragOffset({ x: 0, y: 0 });
          setHasDragged(false);
          hasDraggedRef.current = false;
          setDragIndex(null);
          setTargetIndex(null);
          requestAnimationFrame(() => setSuppressTransition(false));
        }, 300);
        return; // 关键：避免立刻 reset，从而允许完成动画
        }
      }
    }

    resetDragState();
  };

  const resetDragState = () => {
    setIsDragging(false);
    setDragIndex(null);
    setTargetIndex(null);
    setDragOffset({ x: 0, y: 0 });
    setIsDraggedOutside(false);
    setHasDragged(false);
    setSnapPosition(null);
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

  useEffect(() => {
    let onBlur;
    let onVisibility;
    let onContextMenu;

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);

      onBlur = () => cancelDragAndTimer();
      onVisibility = () => cancelDragAndTimer();
      onContextMenu = () => cancelDragAndTimer();
      window.addEventListener('blur', onBlur);
      document.addEventListener('visibilitychange', onVisibility);
      document.addEventListener('contextmenu', onContextMenu, { capture: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);

      if (onBlur) {
        window.removeEventListener('blur', onBlur);
      }
      if (onVisibility) {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      if (onContextMenu) {
        document.removeEventListener('contextmenu', onContextMenu, { capture: true });
      }
    };
  }, [isDragging, dragIndex, dragStartPos, apps.length]);

  // 计算某个元素在拖拽时应应用的位移（除拖拽项外）
  const getGridItemTransform = (index) => {
    if (!(isDragging || isCompleting) || dragIndex === null || targetIndex === null) {
      return 'translate(0px, 0px)';
    }
    if (index === dragIndex) return 'translate(0px, 0px)';

    const { cols, itemWidth, itemHeight } = gridMetrics;
    if (!cols || !itemWidth || !itemHeight) return 'translate(0px, 0px)';

    // 拖拽方向：从 dragIndex -> targetIndex
    if (dragIndex < targetIndex) {
      // [dragIndex+1, targetIndex] 向前移动一格（index-1）
      if (index > dragIndex && index <= targetIndex) {
        const fromCol = index % cols;
        // 从 index -> index-1：通常左移一个单元；若在列首则需换行
        if (fromCol === 0) {
          // 向上到上一行末尾
          return `translate(${(cols - 1) * itemWidth}px, -${itemHeight}px)`;
        }
        return `translate(-${itemWidth}px, 0px)`;
      }
    } else if (dragIndex > targetIndex) {
      // [targetIndex, dragIndex-1] 向后移动一格（index+1）
      if (index >= targetIndex && index < dragIndex) {
        const fromCol = index % cols;
        // 从 index -> index+1：通常右移一个单元；若在列末则需换行
        if (fromCol === cols - 1) {
          // 向下到下一行开头
          return `translate(-${(cols - 1) * itemWidth}px, ${itemHeight}px)`;
        }
        return `translate(${itemWidth}px, 0px)`;
      }
    }
    return 'translate(0px, 0px)';
  };

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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
      <Button
            ref={triggerRef}
            variant="ghost"
            className="group relative flex h-auto w-12 shrink-0 flex-col items-center justify-center rounded-none bg-transparent p-0 transition-transform duration-200 ease-out will-change-transform focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent dark:hover:bg-transparent"
            style={{
        transform: dropHighlight ? 'scale(1.06)' : 'scale(1)',
        transformOrigin: 'bottom center',
        boxShadow: dropHighlight ? '0 0 0 3px rgba(59,130,246,0.25)' : 'none',
        transition: 'transform 140ms ease, box-shadow 140ms ease'
            }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1 bg-gray-200/50 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300">
              <Grid3X3 size={24} />
            </div>
          </Button>
        </DialogTrigger>
  <DialogContent ref={contentRef} className="max-w-md p-6 rounded-2xl apple-popover">
          <DialogTitle className="sr-only">应用选择器</DialogTitle>
          {isDraggedOutside && isDragging && dragIndex !== null && (() => {
            // 计算当前底栏展示数量以确定提示文本
            let bottomCount = Math.min(apps.length, 8);
            try {
              const saved = localStorage.getItem('bottomCount');
              if (saved != null) {
                const val = parseInt(saved, 10);
                if (!Number.isNaN(val)) bottomCount = Math.max(0, Math.min(val, 8));
              }
            } catch {}
            
            const isAlreadyInBottom = dragIndex < bottomCount;
            
            return (
              <div className="absolute top-0 left-0 right-0 bg-blue-500/20 text-blue-800 dark:text-blue-200 text-center py-2 rounded-t-2xl text-sm font-medium">
                {isAlreadyInBottom ? "应用已在底部栏中" : "松开鼠标添加到底部栏"}
              </div>
            );
          })()}
          <div ref={gridRef} className="grid grid-cols-3 sm:grid-cols-4 gap-4 relative">
            {apps.map((app, index) => (
              <ContextMenu key={app.id}>
                <ContextMenuTrigger asChild>
              <div
                key={app.id}
                className={`relative ${
                  (isDragging && index === dragIndex) || (isCompleting && index === dragIndex) ? 'z-50' : ''
                }`}
                style={{
                  transform: (isDragging && index === dragIndex)
                    ? `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.06) rotate(3deg)`
                    : (isCompleting && index === dragIndex)
                    ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
                    : getGridItemTransform(index),
                  opacity: (isDragging && index === dragIndex) ? 0.9 : 1,
                  transition: suppressTransition
                    ? 'none'
                    : (isDragging && index === dragIndex)
                    ? 'none'
                    : (isCompleting && index === dragIndex)
                    ? 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
                    : 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: ((isDragging && index === dragIndex) || (isCompleting && index === dragIndex)) ? 1000 : 'auto'
                }}
                onMouseDown={(e) => handleMouseDown(e, index)}
                onTouchStart={(e) => handleTouchStart(e, index)}
              >
                <Button
                  variant="ghost"
                  className="flex flex-col items-center justify-center p-2 h-auto rounded-2xl hover:bg-white/20 dark:hover:bg-black/10 transition-all duration-200 group w-full"
                  onClick={(e) => {
                    // 使用 ref 检测拖拽状态，避免事件时序问题
                    if (hasDraggedRef.current) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    // 在跳转前清理任何潜在的长按或拖拽状态，避免返回后粘住
                    cancelDragAndTimer();
                    window.open(app.url, '_blank');
                  }}
                >
                  {(() => {
                    const ic = app.icon || '';
                    const isUrlLike = /^https?:\/\//i.test(ic) || ic.startsWith('data:');
                    if (isUrlLike) {
                      return (
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 bg-white/90 dark:bg-black/30 overflow-hidden">
                          <img
                            src={ic}
                            alt={app.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
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
                                parent.className = `w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${getIconColor(app.icon)} text-white`;
                                const span = document.createElement('span');
                                span.className = 'font-bold text-lg';
                                span.textContent = computeAppLetter(app);
                                parent.appendChild(span);
                              }
                            }}
                          />
                        </div>
                      );
                    }
                    return (
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${getIconColor(app.icon)} text-white`}>
                        <span className="font-bold text-lg">{computeAppLetter(app)}</span>
                      </div>
                    );
                  })()}
                  <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 text-center">
                    {app.name}
                  </span>
                </Button>
              </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="rounded-2xl shadow-lg border bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-1 min-w-[10rem]">
                  <ContextMenuItem className="rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onSelect={() => { setEditApp(app); setIsEditOpen(true); }}>编辑</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem className="rounded-xl px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400" onSelect={() => {
                    setApps((prev) => prev.filter((a) => a.id !== app.id));
                  }}>删除</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center p-2 h-auto rounded-2xl hover:bg-white/20 dark:hover:bg-black/10 transition-all duration-200"
              onClick={() => {
                setIsOpen(false);
                setIsAddAppOpen(true);
              }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 bg-gray-200/50 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300">
                <Plus size={24} />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
                添加应用
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  <EditAppDialog isOpen={isEditOpen} setIsOpen={setIsEditOpen} app={editApp} setApps={setApps} />
      
      <AddAppDialog 
        isOpen={isAddAppOpen} 
        setIsOpen={setIsAddAppOpen} 
        setApps={setApps}
        apps={apps}
      />
    </>
  );
};

export default AppSelector;
