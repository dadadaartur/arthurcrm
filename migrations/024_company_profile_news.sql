-- Профиль компании и внутренняя новостная лента (пункт 1 фидбека от
-- 2 сентября 2026) — у компании раньше не было ни логотипа, ни
-- описания, ни способа публиковать новости для своих сотрудников.
-- Раздел «Моя компания» у сотрудника существовал только как заглушка
-- «в разработке».

alter table public.companies
  add column if not exists logo_url text,
  add column if not exists description text;

comment on column public.companies.logo_url is 'Логотип/аватар компании — показывается в шапке приложения и на странице «Моя компания» у сотрудников';
comment on column public.companies.description is 'Краткое описание компании для сотрудников — чем занимается, миссия и т.д.';

create table if not exists public.company_news (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies(id) on delete cascade,
  title text not null,
  content text,
  image_url text,
  video_url text,
  link_url text,
  link_label text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

comment on table public.company_news is 'Новости/статьи компании для внутренней ленты сотрудников — картинка/видео/ссылка необязательны, можно комбинировать';

create index if not exists idx_company_news_company on public.company_news(company_id, created_at desc);

alter table public.company_news enable row level security;

drop policy if exists "Company members view own company news" on public.company_news;
create policy "Company members view own company news" on public.company_news
  for select using (
    company_id in (select company_id from public.profiles where user_id = auth.uid())
  );
