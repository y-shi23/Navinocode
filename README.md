项目为MIT LICENSE，任何基于本项目的改动都不强制申明、引用。欢迎各种修改、衍生。

# 环境安装指南

## Node.js 16 安装
```
nvm install 16
nvm use 16
```
## 启动开发服务器
```
npm run dev
```

## Supabase 云同步（前端直连）
1. 在你的 Supabase 项目中执行：
```
create table if not exists navinocode_states (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table navinocode_states enable row level security;

-- 示例策略（匿名访问）：如果只你自己使用该项目，可以放宽为 anon 全权限
create policy "anon read own state" on navinocode_states
  for select using (true);
create policy "anon upsert state" on navinocode_states
  for insert with check (true);
create policy "anon update state" on navinocode_states
  for update using (true);
 ```
2. 在设置面板中填写 `Supabase URL` 与 `anon key`，即可使用“从云端拉取 / 上传本地数据”。客户端标识 `client_id` 会保存在浏览器 `localStorage`。
3. 如果你需要更严格的 RLS，可以自行调整策略让 `client_id` 等于 JWT 中自定义的 claim 或者要求登录后再访问。
4. 多设备同步：在“同步 ID”里填相同字符串（默认使用本机生成的 ID），各设备会共用同一行数据；打开“自动同步”后数据更新会自动上传，切换设备时会自动尝试拉取。
