import React, { useState, useEffect, useRef } from 'react';
import { Search, Settings, Plus, Upload, Globe, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import AppSelector from '@/components/AppSelector';
import DraggableBottomBar from '@/components/DraggableBottomBar';
import '../../github.css';
import PomodoroTimer from '@/components/PomodoroTimer';
import GitHubUsageHeatmap from '@/components/GitHubUsageHeatmap';
import TodoWidget from '@/components/TodoWidget';
import { recordUsageEvent } from '@/lib/usageEvents';
import DraggableWidget from '@/components/DraggableWidget';

const Index = () => {
  const [searchValue, setSearchValue] = useState('');
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
  const [hitokoto, setHitokoto] = useState('正在加载一言...');
  // 背景直链输入与校验状态
  const [bgUrlInput, setBgUrlInput] = useState('');
  const [bgUrlError, setBgUrlError] = useState('');
  
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
      pomodoro: true,
      heatmap: true,
      todo: true
    };
  });

  // 搜索框引用
  const searchInputRef = useRef(null);
  // 搜索引擎图标触发器引用
  const engineTriggerRef = useRef(null);
  // 搜索按钮引用
  const searchButtonRef = useRef(null);

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

  // 持久化应用顺序
  useEffect(() => {
    try {
      localStorage.setItem('apps', JSON.stringify(apps));
    } catch {}
  }, [apps]);

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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue) {
      // 记录搜索事件
      recordUsageEvent('search');
      // 检查是否为有效URL
      if (searchValue.startsWith('http://') || searchValue.startsWith('https://')) {
        window.open(searchValue, '_blank');
      } else {
        // 根据选择的搜索引擎进行搜索
        const searchUrls = {
          google: `https://www.google.com/search?q=${encodeURIComponent(searchValue)}`,
          bing: `https://www.bing.com/search?q=${encodeURIComponent(searchValue)}`,
          baidu: `https://www.baidu.com/s?wd=${encodeURIComponent(searchValue)}`,
          duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(searchValue)}`
        };
        window.open(searchUrls[searchEngine], '_blank');
      }
      
      // 清空搜索框并保持聚焦
      setSearchValue('');
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

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
    { id: 'google', name: 'Google', icon: 'G', color: '#4285F4' },
    { id: 'bing', name: 'Bing', icon: 'B', color: '#008373' },
    { id: 'baidu', name: '百度', icon: '百', color: '#2932E1' },
    { id: 'duckduckgo', name: 'DuckDuckGo', icon: 'D', color: '#DE5833' }
  ];

  // 确定使用的背景图片
  const effectiveBackgroundImage = backgroundImage || getRandomBackground();

  // 切换组件启用状态
  const toggleComponent = (component) => {
    setComponentSettings(prev => ({
      ...prev,
      [component]: !prev[component]
    }));
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
          backdropFilter: isSearchFocused 
            ? `brightness(${backgroundBrightness}%) blur(${backgroundBlur}px)` 
            : 'none',
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
                        // 仅同步弹层状态；不在关闭时自动回焦，确保外部一次点击即可关闭+失焦
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
                        const color = currentEngine?.color || '#4285F4';
                        return (
                          <span className="font-bold text-2xl" style={{ 
                            color: color,
                            filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 4px rgba(0,0,0,0.3))'
                          }}>
                            {currentEngine?.icon || 'G'}
                          </span>
                        );
                      })()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-48 p-2 apple-popover" 
                    style={{ transform: 'translateX(-0.25rem)' }} 
                    align="start" 
                    side="bottom"
                    sideOffset={12}
                    onOpenAutoFocus={(e) => {
                      // 阻止 Radix 打开时将焦点移入内容区域，保持输入框不失焦
                      e.preventDefault();
                    }}
                    onFocusOutside={(e) => {
                      const t = e.target;
                      // 若焦点落到输入框或触发器上，则阻止关闭；否则允许默认行为（关闭并触发输入框 blur）
                      if (searchInputRef.current?.contains(t) || engineTriggerRef.current?.contains(t)) {
                        e.preventDefault();
                      }
                    }}
                    onInteractOutside={(e) => {
                      const t = e.target;
                      // 点击输入框或触发器时不关闭；点击其他位置一次即可关闭并触发输入框 blur
                      if (searchInputRef.current?.contains(t) || engineTriggerRef.current?.contains(t)) {
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
                          onClick={() => {
                            setSearchEngine(engine.id);
                            setIsEngineMenuOpen(false);
                            // 重新聚焦搜索框
                            setTimeout(() => {
                              if (searchInputRef.current) {
                                searchInputRef.current.focus();
                              }
                            }, 0);
                          }}
                        >
                          <span className="font-bold mr-2" style={{ color: engine.color }}>{engine.icon}</span>
                          <span>{engine.name}</span>
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
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
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
            <TodoWidget />
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
            <div className="space-y-6 overflow-y-auto flex-grow pr-2" style={{ 
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
              <h2 className="text-xl font-bold">设置</h2>
              
              {/* 组件设置 */}
              <div>
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
              
              {/* 搜索引擎设置 */}
              <div>
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
                        <span className="font-bold text-lg mr-3" style={{ color: engine.color }}>{engine.icon}</span>
                        <span>{engine.name}</span>
                        {searchEngine === engine.id && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 ml-auto" />
                        )}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              {/* 背景图片设置 */}
              <div>
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
              <div>
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
              <div>
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
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
