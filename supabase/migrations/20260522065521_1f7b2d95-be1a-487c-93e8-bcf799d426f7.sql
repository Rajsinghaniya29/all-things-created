
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  streak_count integer not null default 0,
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_thought text,
  title text not null,
  description text,
  category text,
  target_date date,
  status text not null default 'active',
  progress integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.goals enable row level security;
create policy "goals_all_own" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger goals_set_updated_at before update on public.goals for each row execute function public.set_updated_at();
create index goals_user_idx on public.goals(user_id);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null default 0,
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.milestones enable row level security;
create policy "milestones_all_own" on public.milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index milestones_goal_idx on public.milestones(goal_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete cascade,
  title text not null,
  description text,
  scheduled_date date,
  due_date date,
  priority text not null default 'medium',
  completed boolean not null default false,
  completed_at timestamptz,
  estimated_minutes integer,
  created_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
create policy "tasks_all_own" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index tasks_user_date_idx on public.tasks(user_id, scheduled_date);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  frequency text not null default 'daily',
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  color text default '#2dd4a8',
  created_at timestamptz not null default now()
);
alter table public.habits enable row level security;
create policy "habits_all_own" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique(habit_id, log_date)
);
alter table public.habit_logs enable row level security;
create policy "habit_logs_all_own" on public.habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "chat_messages_all_own" on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index chat_messages_user_idx on public.chat_messages(user_id, created_at);

create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'tip',
  title text,
  content text not null,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ai_recommendations enable row level security;
create policy "ai_recs_all_own" on public.ai_recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
