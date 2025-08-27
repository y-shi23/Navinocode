import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const EditAppDialog = ({ isOpen, setIsOpen, app, setApps }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');

  useEffect(() => {
    if (app) {
      setUrl(app.url || '');
      setName(app.name || '');
      setIcon(app.icon || '');
    }
  }, [app]);

  const normalizeUrl = (raw) => {
    if (!raw) return '';
    let u = raw.trim();
    if (u.startsWith('//')) return `https:${u}`;
    if (!/^https?:\/\//i.test(u)) {
      u = `https://${u}`;
    }
    return u;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!app) return;
    const normalizedUrl = normalizeUrl(url);
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, url: normalizedUrl, name: name || a.name, icon: icon || a.icon } : a)));
    setIsOpen(false);
  };

  if (!app) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md p-6 rounded-2xl apple-popover">
        <DialogHeader>
          <DialogTitle>编辑应用</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="url">网址</Label>
            <Input id="url" type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="apple-input" />
          </div>
          <div>
            <Label htmlFor="name">名称</Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="apple-input" />
          </div>
          <div>
            <Label htmlFor="icon">图标</Label>
            <Input id="icon" type="text" value={icon} onChange={(e) => setIcon(e.target.value)} className="apple-input" placeholder="支持自定义URL或关键字" />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="apple-button">取消</Button>
            <Button type="submit" className="bg-white text-black hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 rounded-2xl px-4 py-2">保存</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAppDialog;
