// 记录导航页使用事件（搜索、跳转）到 localStorage
// 数据结构：[{ date: 'YYYY-MM-DD', type: 'search'|'jump' }]

export function recordUsageEvent(type) {
  try {
    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const raw = localStorage.getItem('usage_events');
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ date, type });
    localStorage.setItem('usage_events', JSON.stringify(arr));
    // 通知订阅者更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('usage-events-updated'));
    }
  } catch {
    // ignore
  }
}

export function clearUsageEvents() {
  localStorage.removeItem('usage_events');
}
