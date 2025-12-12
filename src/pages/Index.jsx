
import { CardContent, Card } from '@/components/ui/card';
import GitHubUsageHeatmap from '@/components/GitHubUsageHeatmap';
import { PopoverContent, Popover, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import React, { useEffect, useRef, useState } from 'react';
import { DialogContent, Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import TodoWidget from '@/components/TodoWidget';
import DraggableWidget from '@/components/DraggableWidget';
import { Input } from '@/components/ui/input';
import { Globe, Search, X, Upload, Settings, RefreshCcw } from 'lucide-react';
import PomodoroTimer from '@/components/PomodoroTimer';
import { recordUsageEvent } from '@/lib/usageEvents';
import AppSelector from '@/components/AppSelector';
import DraggableBottomBar from '@/components/DraggableBottomBar';
import { Button } from '@/components/ui/button';
import { useGitHubStars } from '@/components/useGitHubStars';
import { toast } from 'sonner';
import { getStoredSupabaseConfig, getSupabaseClientId, getStoredSyncId, persistSupabaseConfig, persistSyncId } from '@/integrations/supabase/client';
import { pullCloudState, pushCloudState } from '@/lib/cloudSync';
const Index = () => {
  const { stars, loading: starsLoading, error: starsError } = useGitHubStars();
  const [searchValue, setSearchValue] = useState('');
  const SEARCH_HISTORY_KEY = 'searchHistory';
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });
  const [bingSuggestions, setBingSuggestions] = useState([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [activeSuggestIndex, setActiveSuggestIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(() => {
    // 从localStorage读取背景图片
    return localStorage.getItem('backgroundImage') || '';
  });
  const [backgroundBrightness, setBackgroundBrightness] = useState(() => {
    // 从localStorage读取亮度设置
    return parseInt(localStorage.getItem('backgroundBrightness')) || 100;
  });
  const [backgroundBlur, setBackgroundBlur] = useState(() => {
    // 从localStorage读取模糊设置
    return parseInt(localStorage.getItem('backgroundBlur')) || 0;
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isEngineMenuOpen, setIsEngineMenuOpen] = useState(false);
  const [apps, setApps] = useState(() => {
    try {
      const saved = localStorage.getItem('apps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {}
    return [
      { id: 1, name: 'Gmail', url: 'https://mail.google.com', icon: 'gmail' },
      { id: 2, name: 'YouTube', url: 'https://www.youtube.com', icon: 'youtube' },
      { id: 3, name: 'GitHub', url: 'https://github.com', icon: 'github' },
      { id: 4, name: 'Twitter', url: 'https://twitter.com', icon: 'twitter' },
      { id: 5, name: 'Facebook', url: 'https://facebook.com', icon: 'facebook' },
      { id: 6, name: 'Instagram', url: 'https://instagram.com', icon: 'instagram' },
      { id: 7, name: 'LinkedIn', url: 'https://linkedin.com', icon: 'linkedin' },
      { id: 8, name: 'Reddit', url: 'https://reddit.com', icon: 'reddit' },
    ];
  });
  const [searchEngine, setSearchEngine] = useState(() => {
    // 从localStorage读取搜索引擎设置
    return localStorage.getItem('searchEngine') || 'bing';
  });
  const [todos, setTodos] = useState(() => {
    const savedTodos = localStorage.getItem('todos');
    return savedTodos ? JSON.parse(savedTodos) : [
      { id: 1, text: 'Hello World', completed: false }
    ];
  });
  const [hitokoto, setHitokoto] = useState('正在加载一言...');
  // 背景直链输入与校验状态
  const [bgUrlInput, setBgUrlInput] = useState('');
  const [bgUrlError, setBgUrlError] = useState('');
  const initialSupabaseConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialSupabaseConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initialSupabaseConfig.anonKey);
  const [supabaseSyncId, setSupabaseSyncId] = useState(getStoredSyncId());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => localStorage.getItem('lastSyncedAt') || '');
  const clientIdRef = useRef(getSupabaseClientId());
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSyncEnabled');
    return saved ? saved === 'true' : true;
  });
  const autoSyncTimerRef = useRef(null);
  
  // 内置句子作为一言API失败时的备选
  const fallbackSentences = [
    '搜索或输入网址...',
    'Search or enter URL...',
    '探索无限可能',
    'Explore endless possibilities',
    '让每一天都有新发现',
    'Make every day a new discovery',
    '简单生活，高效工作',
    'Simple life, efficient work',
    '你的专属起始页',
    'Your personal start page'
  ];
  
  const [componentSettings, setComponentSettings] = useState(() => {
    // 从localStorage读取组件设置
    const saved = localStorage.getItem('componentSettings');
    return saved ? JSON.parse(saved) : {
      pomodoro: false,
      heatmap: false,
      todo: false
    };
  });

  // 搜索框引用
  const searchInputRef = useRef(null);
  // 搜索引擎图标触发器引用
  const engineTriggerRef = useRef(null);
  // 搜索引擎弹层引用
  const engineContentRef = useRef(null);
  // 搜索按钮引用
  const searchButtonRef = useRef(null);
  // 搜索建议面板引用
  const suggestionPanelRef = useRef(null);
  // 记录弹层关闭后是否需要恢复搜索框焦点
  const shouldRestoreSearchFocusRef = useRef(false);
  // 标记是否由搜索框主动关闭弹层
  const closingPopoverViaInputRef = useRef(false);
  const suggestionDebounceRef = useRef(null);
  const suggestionJsonpCleanupRef = useRef(null);
  const suggestionRequestIdRef = useRef(0);

  // 实时更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 获取一言
  useEffect(() => {
    const fetchHitokoto = async () => {
      try {
        const response = await fetch('https://v1.hitokoto.cn');
        const { hitokoto: hitokotoText } = await response.json();
        setHitokoto(hitokotoText);
      } catch (error) {
        // API失败时随机选择一个内置句子
        const randomSentence = fallbackSentences[Math.floor(Math.random() * fallbackSentences.length)];
        setHitokoto(randomSentence);
      }
    };

    fetchHitokoto();
  }, []);

  // 持久化背景设置
  useEffect(() => {
    if (backgroundImage) {
      localStorage.setItem('backgroundImage', backgroundImage);
    } else {
      localStorage.removeItem('backgroundImage');
    }
  }, [backgroundImage]);

  useEffect(() => {
    localStorage.setItem('backgroundBrightness', backgroundBrightness.toString());
  }, [backgroundBrightness]);

  useEffect(() => {
    localStorage.setItem('backgroundBlur', backgroundBlur.toString());
  }, [backgroundBlur]);

  // 持久化搜索引擎设置
  useEffect(() => {
    localStorage.setItem('searchEngine', searchEngine);
  }, [searchEngine]);

  // 持久化组件设置
  useEffect(() => {
    localStorage.setItem('componentSettings', JSON.stringify(componentSettings));
  }, [componentSettings]);

  useEffect(() => {
    persistSyncId(supabaseSyncId);
  }, [supabaseSyncId]);

  useEffect(() => {
    localStorage.setItem('autoSyncEnabled', autoSyncEnabled ? 'true' : 'false');
  }, [autoSyncEnabled]);

  // 持久化应用顺序
  useEffect(() => {
    try {
      localStorage.setItem('apps', JSON.stringify(apps));
    } catch {}
  }, [apps]);

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  // 页面加载时自动聚焦到搜索框
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // 监听空格键按下事件
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 检查是否按下了空格键
      if (e.code === 'Space') {
        // 如果当前没有输入框聚焦，则聚焦到搜索框
        if (document.activeElement.tagName !== 'INPUT') {
          e.preventDefault();
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        } 
        // 如果搜索框已聚焦且为空，则失焦
        else if (document.activeElement === searchInputRef.current && !searchValue) {
          e.preventDefault();
          searchInputRef.current.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchValue]);

  const persistSearchHistory = (nextHistory) => {
    setSearchHistory(nextHistory);
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
    } catch {}
  };

  const addToSearchHistory = (rawTerm) => {
    const term = (rawTerm || '').trim();
    if (!term) return;

    const next = [term, ...searchHistory.filter((t) => t !== term)].slice(0, 30);
    persistSearchHistory(next);
  };

  const doSearch = (rawValue) => {
    const value = (rawValue || '').trim();
    if (!value) return;

    setIsSuggestOpen(false);
    setActiveSuggestIndex(-1);
    setIsEngineMenuOpen(false);
    shouldRestoreSearchFocusRef.current = false;

    // 记录搜索事件 + 本地历史
    recordUsageEvent('search');
    addToSearchHistory(value);

    // 检查是否为有效URL
    if (value.startsWith('http://') || value.startsWith('https://')) {
      window.open(value, '_blank');
    } else {
      // 根据选择的搜索引擎进行搜索
      const searchUrls = {
        google: `https://www.google.com/search?q=${encodeURIComponent(value)}`,
        bing: `https://www.bing.com/search?q=${encodeURIComponent(value)}`,
        baidu: `https://www.baidu.com/s?wd=${encodeURIComponent(value)}`,
        duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(value)}`
      };
      window.open(searchUrls[searchEngine], '_blank');
    }

    // 清空搜索框并保持聚焦
    setSearchValue('');
    requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch(searchValue);
  };

  const normalizedQuery = (searchValue || '').trim();
  const localHistoryMatches = normalizedQuery
    ? searchHistory.filter((t) => t.toLowerCase().includes(normalizedQuery.toLowerCase())).slice(0, 5)
    : [];

  const mergedSuggestions = (() => {
    const seen = new Set();
    const out = [];
    for (const t of localHistoryMatches) {
      const key = `h:${t}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: t, source: 'history' });
    }
    for (const t of bingSuggestions) {
      if (typeof t !== 'string') continue;
      const key = `s:${t}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: t, source: 'bing' });
    }
    // 去重（历史与 bing 相同文案时）
    const seenText = new Set();
    const dedup = [];
    for (const item of out) {
      const k = item.value.toLowerCase();
      if (seenText.has(k)) continue;
      seenText.add(k);
      dedup.push(item);
    }
    return dedup.slice(0, 8);
  })();

  useEffect(() => {
    if (!isSearchFocused || !normalizedQuery) {
      setBingSuggestions([]);
      setIsSuggestLoading(false);
      setIsSuggestOpen(false);
      setActiveSuggestIndex(-1);
      if (suggestionDebounceRef.current) {
        clearTimeout(suggestionDebounceRef.current);
        suggestionDebounceRef.current = null;
      }
      if (suggestionJsonpCleanupRef.current) {
        suggestionJsonpCleanupRef.current();
        suggestionJsonpCleanupRef.current = null;
      }
      return;
    }

    setIsSuggestOpen(true);
    setActiveSuggestIndex(-1);
    setIsSuggestLoading(true);

    if (suggestionDebounceRef.current) {
      clearTimeout(suggestionDebounceRef.current);
    }

    if (suggestionJsonpCleanupRef.current) {
      suggestionJsonpCleanupRef.current();
      suggestionJsonpCleanupRef.current = null;
    }

    const requestId = ++suggestionRequestIdRef.current;

    const fetchBingSuggestionsJsonp = (query) => {
      return new Promise((resolve, reject) => {
        const callbackName = `__bing_suggest_cb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
        const script = document.createElement('script');
        const timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('Bing suggestions timeout'));
        }, 4500);

        const cleanup = () => {
          clearTimeout(timeoutId);
          try {
            delete window[callbackName];
          } catch {
            window[callbackName] = undefined;
          }
          script.remove();
        };

        window[callbackName] = (data) => {
          cleanup();
          resolve(data);
        };

        // OpenSearch JSONP 常见参数是 callback
        script.src = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}&callback=${encodeURIComponent(callbackName)}`;
        script.async = true;
        script.onerror = () => {
          cleanup();
          reject(new Error('Bing suggestions load error'));
        };

        document.body.appendChild(script);

        // 允许外部主动取消
        suggestionJsonpCleanupRef.current = cleanup;
      });
    };
    suggestionDebounceRef.current = setTimeout(async () => {
      try {
        const json = await fetchBingSuggestionsJsonp(normalizedQuery);
        if (requestId !== suggestionRequestIdRef.current) return;
        const list = Array.isArray(json) && Array.isArray(json[1]) ? json[1] : [];
        setBingSuggestions(list.slice(0, 8));
      } catch (error) {
        if (requestId !== suggestionRequestIdRef.current) return;
        setBingSuggestions([]);
      } finally {
        if (requestId === suggestionRequestIdRef.current) {
          setIsSuggestLoading(false);
        }
      }
    }, 220);

    return () => {
      if (suggestionDebounceRef.current) {
        clearTimeout(suggestionDebounceRef.current);
        suggestionDebounceRef.current = null;
      }
      if (suggestionJsonpCleanupRef.current) {
        suggestionJsonpCleanupRef.current();
        suggestionJsonpCleanupRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedQuery, isSearchFocused]);

  // 获取格式化时间
  const getFormattedTime = () => {
    return currentTime.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 处理背景图片上传
  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理拖拽上传
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 阻止默认拖拽行为
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // 清除背景图片
  const clearBackground = () => {
    setBackgroundImage('');
    localStorage.removeItem('backgroundImage');
  };

  // 应用图片直链为背景
  const applyBackgroundUrl = () => {
    const url = (bgUrlInput || '').trim();
    if (!url) {
      setBgUrlError('请输入图片直链');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setBgUrlError('请输入以 http(s) 开头的有效链接');
      return;
    }
    // 尝试加载图片，成功后应用
    const img = new Image();
    img.onload = () => {
      setBackgroundImage(url);
      setBgUrlError('');
    };
    img.onerror = () => {
      setBgUrlError('无法加载该图片，请检查链接是否有效');
    };
    img.src = url;
  };

  // 获取随机背景图片
  const getRandomBackground = () => {
    return 'https://imgapi.xl0408.top/index.php';
  };

  // 搜索引擎配置
  const searchEngines = [
    { id: 'google', name: 'Google', iconSrc: '/svgs/google.svg', fallback: 'G', color: '#4285F4' },
    { id: 'bing', name: 'Bing', iconSrc: '/svgs/bing.svg', fallback: 'B', color: '#008373' },
    { id: 'baidu', name: '百度', iconSrc: '/svgs/baidu.svg', fallback: '百',color: '#2932E1' },
    { id: 'duckduckgo', name: 'DuckDuckGo', iconSrc: '/svgs/duckduckgo.svg', fallback: 'D', color: '#DE5833' }
  ];

  const renderEngineIcon = (engine, { sizeClass = 'h-6 w-6', textClass = 'text-2xl' } = {}) => {
    if (engine?.iconSrc) {
      return (
        <img
          src={engine.iconSrc}
          alt={`${engine.name} icon`}
          className={sizeClass}
          draggable="false"
        />
      );
    }

    return (
      <span
        className={`font-bold ${textClass}`}
        style={{ 
          color: engine?.color || '#4285F4',
          filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 4px rgba(0,0,0,0.3))'
        }}
      >
        {engine?.fallback || 'G'}
      </span>
    );
  };

  // 确定使用的背景图片
  const effectiveBackgroundImage = backgroundImage || getRandomBackground();
  const supabaseConfig = {
    url: (supabaseUrl || '').trim(),
    anonKey: (supabaseAnonKey || '').trim()
  };

  // 切换组件启用状态
  const toggleComponent = (component) => {
    setComponentSettings(prev => ({
      ...prev,
      [component]: !prev[component]
    }));
  };

  const backdropFilterValue = `brightness(${backgroundBrightness}%) blur(${backgroundBlur}px)`;

  useEffect(() => {
    if (!isEngineMenuOpen) {
      closingPopoverViaInputRef.current = false;
    }
  }, [isEngineMenuOpen]);

  useEffect(() => {
    const hasSyncId = (supabaseSyncId || '').trim().length > 0;
    if (!autoSyncEnabled || !supabaseConfig.url || !supabaseConfig.anonKey || !hasSyncId) {
      return;
    }
    handlePullFromCloud({ silent: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseConfig.url, supabaseConfig.anonKey, supabaseSyncId, autoSyncEnabled]);

  useEffect(() => {
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }
    const hasSyncId = (supabaseSyncId || '').trim().length > 0;
    if (!autoSyncEnabled || !supabaseConfig.url || !supabaseConfig.anonKey || !hasSyncId) {
      return;
    }
    autoSyncTimerRef.current = setTimeout(() => {
      handlePushToCloud({ silent: true });
    }, 1500);

    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    apps,
    todos,
    componentSettings,
    searchEngine,
    backgroundImage,
    backgroundBrightness,
    backgroundBlur,
    supabaseConfig.url,
    supabaseConfig.anonKey,
    supabaseSyncId,
    autoSyncEnabled
  ]);

  const applyCloudPayload = (payload) => {
    if (Array.isArray(payload.apps)) setApps(payload.apps);
    if (Array.isArray(payload.todos)) setTodos(payload.todos);
    if (payload.componentSettings) setComponentSettings(payload.componentSettings);
    if (typeof payload.searchEngine === 'string') setSearchEngine(payload.searchEngine);
    if (typeof payload.backgroundBrightness === 'number') {
      setBackgroundBrightness(payload.backgroundBrightness);
    }
    if (typeof payload.backgroundBlur === 'number') {
      setBackgroundBlur(payload.backgroundBlur);
    }
    if (payload.backgroundImage === null) {
      setBackgroundImage('');
    } else if (typeof payload.backgroundImage === 'string') {
      setBackgroundImage(payload.backgroundImage);
    }
  };

  const handleSaveSupabaseConfig = () => {
    persistSupabaseConfig(supabaseConfig);
    toast('已保存 Supabase 配置');
  };

  const handlePullFromCloud = async (options = { silent: false }) => {
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      if (!options.silent) toast('请先填写 Supabase URL 和 anon key');
      return;
    }
    const syncId = (supabaseSyncId || '').trim();
    if (!syncId) {
      if (!options.silent) toast('请设置同步 ID');
      return;
    }
    setIsSyncing(true);
    try {
      const { payload, updatedAt } = await pullCloudState(supabaseConfig, undefined, syncId);
      if (!payload) {
        if (!options.silent) toast('云端暂无数据，可先上传本地数据');
        return;
      }
      applyCloudPayload(payload);
      if (updatedAt) {
        setLastSyncedAt(updatedAt);
        localStorage.setItem('lastSyncedAt', updatedAt);
      }
      if (!options.silent) toast('已从云端恢复数据');
    } catch (error) {
      console.error('拉取云端数据失败', error);
      if (!options.silent) toast(`拉取失败：${error.message || '未知错误'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushToCloud = async (options = { silent: false }) => {
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      if (!options.silent) toast('请先填写 Supabase URL 和 anon key');
      return;
    }
    const syncId = (supabaseSyncId || '').trim();
    if (!syncId) {
      if (!options.silent) toast('请设置同步 ID');
      return;
    }
    setIsSyncing(true);
    try {
      const payload = {
        apps,
        todos,
        componentSettings,
        searchEngine,
        backgroundImage,
        backgroundBrightness,
        backgroundBlur
      };
      await pushCloudState(supabaseConfig, payload, undefined, syncId);
      const now = new Date().toISOString();
      setLastSyncedAt(now);
      localStorage.setItem('lastSyncedAt', now);
      persistSupabaseConfig(supabaseConfig);
      if (!options.silent) toast('已上传到云端');
    } catch (error) {
      console.error('上传云端数据失败', error);
      if (!options.silent) toast(`上传失败：${error.message || '未知错误'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      {/* 背景图片容器 */}
      <div 
        className={`fixed inset-0 z-0 pointer-events-none transition-all duration-500 ease-in-out ${
          isSearchFocused ? 'scale-110' : 'scale-100'
        }`}
        style={{
          backgroundImage: `url(${effectiveBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      />
      
      {/* 磨砂效果层 */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none transition-all duration-500 ease-in-out"
        style={{
          backdropFilter: backdropFilterValue,
          WebkitBackdropFilter: backdropFilterValue,
          backgroundColor: isSearchFocused 
            ? 'rgba(0, 0, 0, 0.3)' 
            : 'transparent'
        }}
      />
      
      {/* 内容层 */}
      <div className="relative z-10 flex flex-col min-h-screen overflow-hidden">
        {/* 主搜索区域 */}
        <div className="flex-grow flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-gray-800 dark:text-white">
              {getFormattedTime()}
            </h1>
            
            <form onSubmit={handleSearch} className="relative">
              <div className="relative flex items-center">
                <Popover open={isEngineMenuOpen} onOpenChange={(open) => {
                        if (open) {
                          // 仅当打开前搜索框已聚焦时，记录需要回焦
                          shouldRestoreSearchFocusRef.current = document.activeElement === searchInputRef.current;
                        }
                        setIsEngineMenuOpen(open);
                      }}>
                  <PopoverTrigger asChild>
                    <Button 
                      ref={engineTriggerRef}
                      type="button"
                      variant="ghost"
                      className={`absolute left-1 top-1/2 transform -translate-y-1/2 rounded-2xl w-12 h-12 p-0 flex items-center justify-center bg-transparent border-0 hover:bg-white/10 dark:hover:bg-black/10 transition-opacity duration-200 z-10 ${
                        isSearchFocused || isEngineMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                      onMouseDown={(e) => {
            // 阻止默认行为但不阻止冒泡，让 Popover 正常工作，同时避免按钮获取焦点
                        e.preventDefault();
                      }}
                    >
                      {(() => {
                        const currentEngine = searchEngines.find(engine => engine.id === searchEngine);
                        return renderEngineIcon(currentEngine, { sizeClass: 'h-7 w-7', textClass: 'text-2xl' });
                      })()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    ref={engineContentRef}
                    className="w-48 p-2 apple-popover" 
                    style={{ transform: 'translateX(-0.25rem)' }} 
                    align="start" 
                    side="bottom"
                    sideOffset={12}
                    onOpenAutoFocus={(e) => {
                      // 阻止 Radix 打开时将焦点移入内容区域，保持输入框不失焦
                      e.preventDefault();
                    }}
                    onCloseAutoFocus={(e) => {
                      if (shouldRestoreSearchFocusRef.current) {
                        e.preventDefault();
                        // 等待关闭动画结束后再回焦，防止焦点被触发器重新夺回
                        requestAnimationFrame(() => {
                          searchInputRef.current?.focus({ preventScroll: true });
                        });
                        shouldRestoreSearchFocusRef.current = false;
                      }
                    }}
                    onFocusOutside={(e) => {
                      if (closingPopoverViaInputRef.current) {
                        return;
                      }
                      const t = e.target;
                      // 若焦点落到输入框或触发器或弹层内容上，则阻止关闭
                      if (searchInputRef.current?.contains(t) ||
                          engineTriggerRef.current?.contains(t) ||
                          e.currentTarget?.contains(t)) {
                        e.preventDefault();
                      }
                    }}
                    onInteractOutside={(e) => {
                      if (closingPopoverViaInputRef.current) {
                        return;
                      }
                      const t = e.target;
                      // 点击输入框、触发器或弹层内容时不关闭
                      if (searchInputRef.current?.contains(t) ||
                          engineTriggerRef.current?.contains(t) ||
                          e.currentTarget?.contains(t)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <div className="grid gap-1">
                      {searchEngines.map((engine) => (
                        <Button
                          key={engine.id}
                          variant="ghost"
                          className={`justify-start px-3 py-2 h-auto rounded-xl ${
                            searchEngine === engine.id 
                              ? 'bg-gray-100/60 dark:bg-gray-700/20' 
                              : 'hover:bg-gray-50/60 dark:hover:bg-gray-700/10'
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault(); // 阻止失去焦点
                          }}
                          onClick={() => {
                            shouldRestoreSearchFocusRef.current = true;
                            setSearchEngine(engine.id);
                            setIsEngineMenuOpen(false);
                            // 立即重新聚焦搜索框，确保点击后不失去焦点
                            searchInputRef.current?.focus({ preventScroll: true });
                          }}
                        >
                          <div className="flex items-center">
                            {renderEngineIcon(engine, { sizeClass: 'h-5 w-5', textClass: 'text-lg' })}
                            <span className="ml-2">{engine.name}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder={isSearchFocused ? '' : hitokoto}
                  className={`w-full py-7 text-lg rounded-2xl shadow-lg focus:ring-2 focus:ring-blue-500/30 focus:outline-none apple-input transition-all duration-200 ${
                    isSearchFocused ? 'pl-14 pr-16 text-left' : 'pl-4 pr-4 text-center placeholder:text-center'
                  }`}
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    setActiveSuggestIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    if (!isSuggestOpen) {
                      return;
                    }

                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setIsSuggestOpen(false);
                      setActiveSuggestIndex(-1);
                      return;
                    }

                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (!mergedSuggestions.length) return;
                      setActiveSuggestIndex((prev) => {
                        const next = prev + 1;
                        return next >= mergedSuggestions.length ? 0 : next;
                      });
                      return;
                    }

                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (!mergedSuggestions.length) return;
                      setActiveSuggestIndex((prev) => {
                        const next = prev - 1;
                        return next < 0 ? mergedSuggestions.length - 1 : next;
                      });
                      return;
                    }

                    if (e.key === 'Enter' && activeSuggestIndex >= 0) {
                      e.preventDefault();
                      const picked = mergedSuggestions[activeSuggestIndex];
                      if (picked?.value) {
                        doSearch(picked.value);
                      }
                    }
                  }}
                  onPointerDown={() => {
                    if (isEngineMenuOpen) {
                      closingPopoverViaInputRef.current = true;
                      setIsEngineMenuOpen(false);
                    }
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={(e) => {
                    setIsSearchFocused(false);
                    const next = e.relatedTarget;
                    const withinTrigger = next ? engineTriggerRef.current?.contains(next) : false;
                    const withinContent = next ? engineContentRef.current?.contains(next) : false;
                    const withinSuggest = next ? suggestionPanelRef.current?.contains(next) : false;
                    if (!withinTrigger && !withinContent) {
                      shouldRestoreSearchFocusRef.current = false;
                      setIsEngineMenuOpen(false);
                    }

                    if (!withinSuggest) {
                      setIsSuggestOpen(false);
                      setActiveSuggestIndex(-1);
                    }
                  }}
                  style={{ fontFamily: '"LXGW WenKai", sans-serif' }}
                />
                <Button 
                  ref={searchButtonRef}
                  type="submit"
                  className={`absolute right-1 top-1/2 transform -translate-y-1/2 rounded-2xl w-12 h-12 p-0 flex items-center justify-center bg-transparent border-0 hover:bg-white/10 dark:hover:bg-black/10 transition-opacity duration-200 z-10 ${
                    isSearchFocused ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  onMouseDown={(e) => {
                    // 阻止按钮获取焦点，保持输入框聚焦
                    e.preventDefault();
                  }}
                >
                  <Search className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </Button>
              </div>

              {isSearchFocused && isSuggestOpen && normalizedQuery && (mergedSuggestions.length > 0 || isSuggestLoading) && (
                <div
                  ref={suggestionPanelRef}
                  className="absolute left-0 right-0 top-full mt-2 z-20"
                >
                  <div className="apple-popover rounded-2xl overflow-hidden bg-white/70 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/40 dark:border-gray-800/40 shadow-lg">
                    <div className="max-h-72 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
                      {isSuggestLoading && (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          正在获取搜索建议…
                        </div>
                      )}

                      {mergedSuggestions.map((item, idx) => {
                        const active = idx === activeSuggestIndex;
                        return (
                          <button
                            key={`${item.source}:${item.value}`}
                            type="button"
                            className={`w-full flex items-center gap-2 px-4 py-3 text-left text-gray-800 dark:text-gray-100 transition-colors ${
                              active
                                ? 'bg-gray-100/70 dark:bg-gray-700/30'
                                : 'hover:bg-gray-50/70 dark:hover:bg-gray-700/20'
                            } ${idx === 0 ? '' : 'border-t border-gray-100/40 dark:border-gray-800/40'}`}
                            onMouseDown={(e) => {
                              // 保持输入框不失焦，避免 blur 导致面板瞬间关闭
                              e.preventDefault();
                            }}
                            onMouseEnter={() => setActiveSuggestIndex(idx)}
                            onClick={() => doSearch(item.value)}
                          >
                            <span className="flex-1 truncate">{item.value}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                item.source === 'history'
                                  ? 'border-gray-200/60 dark:border-gray-700/60 text-gray-600 dark:text-gray-300'
                                  : 'border-gray-200/60 dark:border-gray-700/60 text-gray-600 dark:text-gray-300'
                              }`}
                            >
                              {item.source === 'history' ? '历史' : 'Bing'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* 底部应用导航 */}
        <DraggableBottomBar apps={apps} setApps={setApps} />

        {/* 小组件：可拖动并记忆位置 */}
        {componentSettings.pomodoro && (
          <DraggableWidget id="widget-pomodoro" defaultPos={{ x: 24, y: 24 }}>
            <PomodoroTimer />
          </DraggableWidget>
        )}
        {componentSettings.heatmap && (
          <DraggableWidget id="widget-heatmap" defaultPos={{ x: 24, y: 320 }}>
            <GitHubUsageHeatmap />
          </DraggableWidget>
        )}
        {componentSettings.todo && (
          <DraggableWidget id="widget-todo" defaultPos={{ x: 24, y: 620 }}>
            <TodoWidget todos={todos} onChange={setTodos} />
          </DraggableWidget>
        )}

        {/* 设置按钮 */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed top-6 right-6 rounded-2xl w-14 h-14 apple-button z-10 transition-all duration-300 opacity-30 hover:opacity-100"
            >
              <Settings className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-6 rounded-2xl apple-popover max-h-[80vh] flex flex-col w-[calc(100vw-2rem)] max-w-sm sm:max-w-md">
            {/* 固定标题 - 不滚动 */}
            <h2 className="text-xl font-bold pb-3 border-b border-gray-200/50 dark:border-gray-800/50">设置</h2>

            {/* 滚动内容区域 */}
            <div className="overflow-y-auto flex-grow pr-2" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
            }}>
              <style>
                {`
                  .overflow-y-auto::-webkit-scrollbar {
                    width: 6px;
                  }
                  .overflow-y-auto::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .overflow-y-auto::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.5);
                    border-radius: 3px;
                  }
                  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(156, 163, 175, 0.7);
                  }
                `}
              </style>
              
              {/* 组件设置 */}
              <div className="mt-4">
                <Label className="text-sm font-medium">组件设置</Label>
                <Card className="mt-2 rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    <Button
                      variant="ghost"
                      className="w-full justify-between rounded-none h-12 px-4 py-2 text-left"
                      onClick={() => toggleComponent('pomodoro')}
                    >
                      <span>番茄钟</span>
                      <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${componentSettings.pomodoro ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${componentSettings.pomodoro ? 'translate-x-5' : ''}`} />
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-between rounded-none h-12 px-4 py-2 text-left border-t border-gray-100/20 dark:border-gray-800/50"
                      onClick={() => toggleComponent('heatmap')}
                    >
                      <span>使用热力图</span>
                      <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${componentSettings.heatmap ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${componentSettings.heatmap ? 'translate-x-5' : ''}`} />
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-between rounded-none h-12 px-4 py-2 text-left border-t border-gray-100/20 dark:border-gray-800/50"
                      onClick={() => toggleComponent('todo')}
                    >
                      <span>待办事项</span>
                      <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${componentSettings.todo ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${componentSettings.todo ? 'translate-x-5' : ''}`} />
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* 云同步 */}
              <div className="mt-6">
                <Label className="text-sm font-medium">云同步（Supabase 直连）</Label>
                <Card className="mt-2 rounded-2xl overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid gap-2">
                      <Input
                        type="url"
                        inputMode="url"
                        placeholder="Supabase 项目 URL，如 https://xxx.supabase.co"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        className="rounded-2xl"
                      />
                      <Input
                        type="password"
                        placeholder="Supabase anon key"
                        value={supabaseAnonKey}
                        onChange={(e) => setSupabaseAnonKey(e.target.value)}
                        className="rounded-2xl"
                      />
                      <Input
                        placeholder="同步 ID（多个设备填同一个字符串即可共享数据）"
                        value={supabaseSyncId}
                        onChange={(e) => setSupabaseSyncId(e.target.value)}
                        className="rounded-2xl"
                      />
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 leading-relaxed">
                      <p>表名：navinocode_states，列：client_id(text)、data(jsonb)、updated_at(timestamptz)。开启 RLS 后给 anon 角色添加只允许 client_id 匹配的读写策略。</p>
                      <p className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        本机默认 ID：<code className="bg-black/5 dark:bg-white/10 px-2 py-1 rounded">{clientIdRef.current}</code>（若不填“同步 ID”则使用本机 ID）
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        className="rounded-2xl"
                        onClick={handleSaveSupabaseConfig}
                        disabled={isSyncing}
                      >
                        保存配置
                      </Button>
                      <Button
                        variant={autoSyncEnabled ? "secondary" : "outline"}
                        className="rounded-2xl"
                        onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                      >
                        {autoSyncEnabled ? '自动同步：开' : '自动同步：关'}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={handlePullFromCloud}
                        disabled={isSyncing}
                      >
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        从云端拉取
                      </Button>
                      <Button
                        className="rounded-2xl"
                        onClick={handlePushToCloud}
                        disabled={isSyncing}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        上传本地数据
                      </Button>
                    </div>
                    {lastSyncedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        上次同步：{new Date(lastSyncedAt).toLocaleString('zh-CN')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* 搜索引擎设置 */}
              <div className="mt-6">
                <Label className="text-sm font-medium">搜索引擎</Label>
                <Card className="mt-2 rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    {searchEngines.map((engine) => (
                      <Button
                        key={engine.id}
                        variant="ghost"
                        className={`w-full justify-start rounded-none h-12 px-4 py-2 text-left ${
                          searchEngine === engine.id 
                            ? 'bg-gray-100/60 dark:bg-gray-700/20' 
                            : 'hover:bg-gray-50/60 dark:hover:bg-gray-700/10'
                        } ${engine.id !== 'google' ? 'border-t border-gray-100/20 dark:border-gray-800/50' : ''}`}
                        onClick={() => setSearchEngine(engine.id)}
                      >
                        <div className="flex items-center">
                          {renderEngineIcon(engine, { sizeClass: 'h-5 w-5', textClass: 'text-lg' })}
                          <span className="ml-2">{engine.name}</span>
                        </div>
                        {searchEngine === engine.id && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 ml-auto" />
                        )}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              {/* 背景图片设置 */}
              <div className="mt-6">
                <Label className="text-sm font-medium">背景图片</Label>
                {!backgroundImage ? (
                  <div 
                    className="mt-2 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:bg-white/20 dark:hover:bg-black/10 transition-colors apple-popover"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => document.getElementById('background-upload').click()}
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      拖拽图片到此处或点击选择文件
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      支持 JPG, PNG, GIF 格式
                    </p>
                    <input
                      id="background-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBackgroundUpload}
                    />
                  </div>
                ) : (
                  <div className="mt-2 relative rounded-2xl overflow-hidden apple-popover">
                    <img 
                      src={backgroundImage} 
                      alt="背景图片" 
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2 rounded-2xl w-8 h-8 apple-button"
                      onClick={clearBackground}
                    >
                      <X className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    </Button>
                  </div>
                )}

                {/* 图片直链输入 */}
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex gap-2 relative z-10">
                    <Input
                      type="url"
                      inputMode="url"
                      placeholder="输入直链"
                      value={bgUrlInput}
                      onChange={(e) => setBgUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyBackgroundUrl();
                        }
                      }}
                      className="rounded-2xl border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-zinc-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/60"
                    />
                    <Button className="rounded-2xl relative z-10" variant="secondary" onClick={applyBackgroundUrl}>
                      应用
                    </Button>
                  </div>
                  {bgUrlError && (
                    <span className="text-xs text-red-500">{bgUrlError}</span>
                  )}
                  {!backgroundImage && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">未设置背景时，将显示在线随机背景。设置直链可覆盖随机背景。</span>
                  )}
                </div>
              </div>
              
              {/* 亮度设置 */}
              <div className="mt-6">
                <Label className="text-sm font-medium">背景亮度: {backgroundBrightness}%</Label>
                <Slider
                  value={[backgroundBrightness]}
                  onValueChange={(value) => setBackgroundBrightness(value[0])}
                  min={0}
                  max={200}
                  step={1}
                  className="mt-2"
                />
              </div>
              
              {/* 磨砂效果设置 */}
              <div className="mt-6">
                <Label className="text-sm font-medium">磨砂效果: {backgroundBlur}px</Label>
                <Slider
                  value={[backgroundBlur]}
                  onValueChange={(value) => setBackgroundBlur(value[0])}
                  min={0}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>

            {/* 关于项目部分 - 固定在底部，不滚动 */}
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="text-gray-800 dark:text-gray-200"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Navinocode
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400" id="github-stars">
                  {starsLoading ? (
                    <span className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      加载中...
                    </span>
                  ) : starsError ? (
                    <span className="text-red-500">加载失败</span>
                  ) : stars !== null ? (
                    <span className="inline-flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {stars.toLocaleString()}
                    </span>
                  ) : null}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                一个现代化的导航页面，帮助您快速访问常用网站和应用。
              </p>
              <a 
                href="https://github.com/y-shi23/Navinocode" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                查看项目源码
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 ml-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
