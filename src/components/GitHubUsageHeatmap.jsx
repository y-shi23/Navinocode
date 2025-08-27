import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

// 数据来源：localStorage key 'usage_events'，数组形式：[{ date: 'YYYY-MM-DD', type: 'search'|'jump' }]
// 本组件将其聚合为每天次数并以 GitHub 风格热力图展示（样式与 github.css 一致）。

const GitHubUsageHeatmap = () => {
  const [eventsByDay, setEventsByDay] = useState({});
  // 当前季度范围（包含当前日期的三个月）
  const [range, setRange] = useState(() => {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3); // 0..3
    const startMonth = q * 3;
    const start = new Date(now.getFullYear(), startMonth, 1);
    const end = new Date(now.getFullYear(), startMonth + 3, 0); // 季度末日
    return { start, end };
  });

  // 读取并聚合
  const refresh = () => {
    try {
      const raw = localStorage.getItem('usage_events');
      const arr = raw ? JSON.parse(raw) : [];
      const map = {};
      arr.forEach((e) => {
        const d = e?.date;
        if (!d) return;
        map[d] = (map[d] || 0) + 1;
      });
      setEventsByDay(map);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('usage-events-updated', onUpdate);
    return () => window.removeEventListener('usage-events-updated', onUpdate);
  }, []);

  const generateCalendar = () => {
    const grid = [];
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);

    const firstWeekStart = new Date(startDate);
    firstWeekStart.setDate(startDate.getDate() - startDate.getDay());
    const lastWeekEnd = new Date(endDate);
    lastWeekEnd.setDate(endDate.getDate() + (6 - endDate.getDay()));

    for (let weekStart = new Date(firstWeekStart); weekStart <= lastWeekEnd; weekStart.setDate(weekStart.getDate() + 7)) {
      const weekColumn = [];
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + dayOffset);

        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const isInRange = currentDate >= startDate && currentDate <= endDate;
        const eventCount = eventsByDay[dateStr] || 0;
        const level = Math.min(eventCount, 4);

        weekColumn.push(
          <div
            key={dateStr}
            className={`calendar-cell level-${level} ${!isInRange ? 'opacity-30' : ''}`}
            title={`${dateStr}：${eventCount === 0 ? '无使用' : `${eventCount} 次使用`}`}
            style={{ cursor: 'default' }}
          />
        );
      }
      grid.push(
        <div key={weekStart.toString()} className="week-column">
          {weekColumn}
        </div>
      );
    }
    return grid;
  };

  // 月份缩写（展示当前季度三个月）
  const monthAbbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabels = useMemo(() => {
    const s = range.start.getMonth();
    return [monthAbbr[s], monthAbbr[s + 1], monthAbbr[s + 2]];
  }, [range]);

  return (
    <div className="apple-card rounded-3xl p-3 w-[300px]">
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center text-xs text-gray-700 dark:text-gray-300">
          <span>少</span>
          <div className="flex mx-1">
            {[0,1,2,3,4].map((level) => (
              <div key={level} className={`legend-item level-${level}`} />
            ))}
          </div>
          <span>多</span>
        </div>
      </div>
      {/* 月份缩写 */}
  <div className="px-0.5 mb-0.5">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          {monthLabels.map((m) => (
            <div key={m} className="text-center flex-1">
              {m}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-transparent rounded overflow-hidden">
        <div className="flex gap-0.5 cursor-default" data-no-drag>
          {generateCalendar()}
        </div>
      </div>
    </div>
  );
};

export default GitHubUsageHeatmap;
