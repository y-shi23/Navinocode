import React from 'react';
import { Button } from '@/components/ui/button';
import { recordUsageEvent } from '@/lib/usageEvents';
import { computeAppLetter } from '@/lib/utils';

const AppIcon = ({ name, url, icon }) => {
  // 根据图标名称返回相应的颜色类
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

  const handleClick = () => {
  recordUsageEvent('jump');
    window.open(url, '_blank');
  };

  return (
    <Button
      variant="ghost"
      className="flex flex-col items-center justify-center p-2 h-auto rounded-2xl hover:bg-white/20 dark:hover:bg-black/10 transition-all duration-200 group"
      onClick={handleClick}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${getIconColor(icon)} text-white`}>
        <span className="font-bold text-lg">{computeAppLetter({ name, url, icon })}</span>
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 text-center">
        {name}
      </span>
    </Button>
  );
};

export default AppIcon;
