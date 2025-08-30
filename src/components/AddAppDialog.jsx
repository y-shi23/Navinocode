import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';

const AddAppDialog = ({ isOpen, setIsOpen, setApps, apps }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [iconFile, setIconFile] = useState(null);

  // 规范化网址：支持输入 baidu.com / linux.do 等无协议的域名
  const normalizeUrl = (raw) => {
    if (!raw) return '';
    let u = raw.trim();
    // 如果以 // 开头，补上 https:
    if (u.startsWith('//')) return `https:${u}`;
    // 如果没有协议，则默认 https
    if (!/^https?:\/\//i.test(u)) {
      u = `https://${u}`;
    }
    return u;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 生成新的应用ID
    const newId = Math.max(...apps.map(app => app.id), 0) + 1;
    
    // 先对输入的 URL 进行规范化（补全协议）
    const normalizedUrl = normalizeUrl(url);

    // 确定应用名称
    let appName = name;
    if (!appName) {
      try {
        const hostname = new URL(normalizedUrl).hostname || '';
        appName = hostname.replace(/^www\./, '') || '应用';
      } catch (err) {
        // new URL 解析失败时回退
        appName = '应用';
      }
    }
    
    // 确定图标
    let appIcon = icon;
    if (!icon && iconFile) {
      // 如果上传了文件但没有图标URL，则使用文件（预览使用 dataURL，这里仍存占位标记）
      appIcon = 'custom';
    } else if (!icon && !iconFile) {
      // 图标输入为空时，使用 icon.bqb.cool 提供的网站图标，避免主动 fetch 以规避 CORS，仅通过 <img src> 加载
      try {
        const target = normalizedUrl || url;
        if (target) {
          appIcon = `https://icon.bqb.cool/?url=${encodeURIComponent(target)}`;
        } else {
          // 若无有效网址则回退首字母
          appIcon = appName.charAt(0).toLowerCase();
        }
      } catch {
        appIcon = appName.charAt(0).toLowerCase();
      }
    }
    
    const newApp = {
      id: newId,
      name: appName,
      url: normalizedUrl,
      icon: appIcon
    };
    
    setApps([...apps, newApp]);
    setIsOpen(false);
    
    // 重置表单
    setUrl('');
    setName('');
    setIcon('');
    setIconFile(null);
  };

  const handleIconFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIconFile(file);
      // 生成预览URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setIcon(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md p-6 rounded-2xl apple-popover">
        <DialogHeader>
          <DialogTitle>添加新应用</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="url">网址 *</Label>
            <Input
              id="url"
              type="text"
              placeholder="例如：linux.do"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="apple-input"
            />
          </div>
          
          <div>
            <Label htmlFor="name">应用名称</Label>
            <Input
              id="name"
              type="text"
              placeholder="留空则自动获取"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="apple-input"
            />
          </div>
          
          <div>
            <Label htmlFor="icon">图标URL</Label>
            <div className="relative">
              <Input
                id="icon"
                type="text"
                placeholder="留空则自动获取网站图标"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="apple-input pr-10"
              />
              <label 
                htmlFor="icon-upload" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Upload size={16} className="text-gray-500 dark:text-gray-400" />
              </label>
              <input
                id="icon-upload"
                type="file"
                accept="image/*"
                onChange={handleIconFileChange}
                className="hidden"
              />
            </div>
            {icon && icon.startsWith('data:') && (
              <div className="mt-2">
                <img src={icon} alt="预览" className="w-12 h-12 rounded-2xl" />
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="apple-button"
            >
              取消
            </Button>
            <Button 
              type="submit"
              className="bg-white text-black hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 rounded-2xl px-4 py-2"
            >
              添加应用
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAppDialog;
