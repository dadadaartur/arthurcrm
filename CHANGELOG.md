# CHANGELOG — фикс-сет по аудиту от 21 августа 2026

Все 17 находок аудита обработаны: 16 исправлены в коде, 1 (rate limiting)
закрыта частично — детали ниже. Этот файл — карта того, что изменилось и
что нужно сделать вручную, чтобы это реально заработало.

## ⚠️ ПЕРЕД ДЕПЛОЕМ — обязательно, иначе приложение сломается

1. **Примените SQL-миграции** из `/migrations`, по порядку номеров, в
   Supabase SQL Editor. Без `001` перевод кармиков не будет работать
   вообще (упадёт с ошибкой), без `002` — не заработает rate limiting на
   переводах и создании платежей. Подробности и порядок — в
   `migrations/README.md`. **Прогоните на стейджинге перед продакшеном** —
   я писал эту SQL по коду приложения, не имея прямого доступа к вашей БД.

2. **Проверьте RLS-политику UPDATE на `profiles`** в Supabase Dashboard →
   Authentication → Policies (или `select * from pg_policies where
   tablename='profiles'`). Находка №3 из аудита была самой неопределённой
   именно потому, что я не вижу вашу текущую политику. Я закрыл риск двумя
   способами (см. ниже), но лично посмотреть на политику всё равно стоит.

3. **Задайте новые переменные окружения** (добавлены в `.env.example`):
   - `CRON_SECRET` — без неё `/api/cron/check-deadlines` перестанет
     работать вообще (это осознанно — лучше сломанный cron, чем открытый
     публичный эндпоинт). Сгенерировать: `openssl rand -hex 32`. То же
     значение нужно прописать в заголовок, с которым Vercel Cron дёргает
     этот путь (Vercel Dashboard → Settings → Cron Jobs, либо через
     `vercel.json`, если у вас Pro-план с поддержкой custom headers для
     cron — если нет, самый простой вариант: добавить проверку секрета как
     query-параметр в самом `vercel.json` пути, я оставил это вам, т.к.
     это зависит от вашего тарифа Vercel).
   - `FOUNDER_EMAIL` — необязательно (есть дефолт-фолбэк на прежний
     захардкоженный email), но лучше задать явно.

## 🔴 Критичные находки — что сделано

**№1, платежи: клиент сам задавал курс обмена.**
Новый файл `lib/pricing.js` — единственный источник цены. `pages/api/payments/create.js`
переписан: клиент теперь говорит только *что* покупает (`karmaAmount` для
пополнения или `tariffCode` для апгрейда), а сумму в рублях всегда считает
сервер — по фиксированному курсу (топап) или по реальным `price_per_employee_rub`
и реальному числу сотрудников из БД (тариф). Клиентские `amountRub` больше
нигде не используются.

**№2, платежи: webhook принимал статус без проверки.**
Новый файл `lib/yookassa.js` — `fetchYooKassaPayment()`, перепроверяет
статус напрямую у ЮKassa. `pages/api/payments/callback.js` переписан:
тело webhook-запроса используется только чтобы понять, какой платёж
проверить, реальный статус всегда переспрашивается у ЮKassa перед
зачислением. Заодно добавлена идемпотентность (см. №6 ниже).

**№3, профиль: эскалация прав через прямой апдейт.**
Закрыто двумя независимыми слоями:
- Новый серверный роут `pages/api/profile/update.js` с явным allowlist
  полей — `is_company_admin`/`role_id`/`can_*`/`company_id` физически не
  долетают до БД через этот путь, что бы клиент ни прислал.
  `pages/profile.js` теперь ходит через него вместо прямого
  `supabase.from('profiles').update(...)`.
- `migrations/003_profiles_privilege_columns.sql` — триггер на уровне
  таблицы, защищающий эти же поля НЕЗАВИСИМО от формулировки вашей RLS-
  политики и от того, идёт ли запрос через новый роут или напрямую с
  клиента (в том числе закрывает такой же паттерн в
  `pages/company-admin/employees.js`, который я нашёл по ходу дела — там
  редактирование прав сотрудника тоже идёт прямым клиентским update()).

## 🟠 Высокий приоритет — что сделано

**№4, переводы: race condition (двойное списание).**
`migrations/001_transfer_karma.sql` — атомарная SQL-функция с блокировкой
строк (`SELECT ... FOR UPDATE`, лочит обе стороны перевода в консистентном
порядке, чтобы не ловить deadlock на встречных переводах). Функция
доступна только `service_role` — явно отозвано право вызова у `anon`/`authenticated`,
иначе её можно было бы дёрнуть напрямую через PostgREST с чужим
`p_from_user_id`. `pages/api/transfer.js` переписан на вызов этой функции.
Заодно перенесён и доработан UX с поиском коллег вместо ручного ввода
email (он уже был у вас написан, просто лежал не в той папке) —
`pages/transfer.js`.

**№5, уведомления: рассылка кому угодно.**
`pages/api/notifications/send.js` переписан: только админ компании/супер-
админ, получатели фильтруются до сотрудников своей же компании, ссылка
должна быть внутренним путём (не произвольный внешний URL).

**№6, платежи: webhook и check-status рассинхронизированы.**
`pages/api/payments/check-status.js` переписан — теперь вызывает ту же
`settleSucceededPayment()`, что и webhook, вместо своей урезанной копии
логики. Апгрейд тарифа теперь применяется независимо от того, каким путём
подтвердился платёж. Заодно в обоих файлах добавлена защита от повторной
обработки одного и того же платежа (условный `UPDATE ... WHERE status = <старый>`
перед вызовом `settleSucceededPayment` — ЮKassa официально может слать
один и тот же webhook повторно).

**№7, Центробанк: "атомарная" эмиссия не была атомарной.**
`pages/api/central-bank/emit.js` переписан: списание с `central_bank`
теперь через условный `UPDATE ... WHERE balance = <прочитанное значение>` —
если баланс изменился параллельно, возвращается 409 вместо тихой потери
данных.

## 🟡 Средний приоритет — что сделано

- **№8** — `pages/api/company-admin/karma.js`, `resources.js`,
  `pending-invites.js` теперь требуют `is_company_admin`/`can_manage_employees`
  (были доступны любому сотруднику компании).
- **№9** — `pages/api/cron/check-deadlines.js` требует `CRON_SECRET` в
  заголовке; ошибка вставки в `task_auto_grants` теперь проверяется перед
  начислением награды (раньше начисление шло независимо от результата).
- **№10** — решено вместе с №4: SQL-функция `transfer_karma` использует
  `INSERT ... ON CONFLICT DO UPDATE` для обеих сторон перевода вместо
  `.update()` на потенциально несуществующую строку.
- **№11** — захардкоженные тестовые ключи ЮKassa убраны из `create.js` и
  `check-status.js` — при отсутствии `YOOKASSA_SHOP_ID`/`YOOKASSA_SECRET`
  сервер теперь явно отвечает 500 вместо тихой работы с тестовым шопом.
- **№12** — `pages/api/tasks/my.js` переписан на `requireAuth` (эта версия
  тоже уже была у вас написана, лежала в `/tasks-my.js` в корне).

## 🟢 Низкий приоритет / гигиена — что сделано

- **№13** — все осиротевшие файлы-дубли из корня (`transfer.js`,
  `tasks-my.js`, `transfer-page.js`, `tasks-page.js`, `central-bank.js`,
  `transfer (1).js`) удалены — их полезный код перенесён на правильные
  пути (см. выше). Заодно применена мелкая правка из `tasks-page.js` в
  `pages/tasks.js` — доп. условие `.eq('status', ...)` при смене статуса
  задания (defense in depth рядом с БД-триггером
  `trg_enforce_task_assignment_transition`, если он у вас есть).
- **№14** — email основателя больше не хардкожен в 4 разных местах.
  Добавлены `getFounderEmail()`/`isFounder()` в `lib/auth.js`,
  используются в `paymentSettlement.js`, `emit.js`, `movements.js`,
  `dashboard.js`. Настраивается через `FOUNDER_EMAIL` в `.env`.
- **№15** — **частично**. Добавлен `lib/rateLimit.js` (простой счётчик на
  Postgres, fail-open при ошибке — не блокирует запросы, если сам лимитер
  сломан) и применён к двум самым чувствительным эндпоинтам:
  `pages/api/transfer.js` (30 переводов/5 мин на пользователя) и
  `pages/api/payments/create.js` (10 платежей/10 мин на компанию). **Не**
  применён к остальным эндпоинтам (`purchase.js` и т.д.) — сама
  инфраструктура (таблица + хелпер) готова, расширить на другие роуты —
  дело одной строчки `checkRateLimit(...)` в начале хендлера по этому же
  образцу.
- **№16** — `pages/index2.js` (точный дубль главной страницы) удалён.
- **№17** — `migrations/004_minor_db_hygiene.sql`: unique-индекс на
  `payments.yookassa_payment_id`, убран дублирующийся индекс на
  `admin_users.user_id`.

## Новые файлы

```
lib/pricing.js                              — серверный источник цен
lib/yookassa.js                             — переопрос статуса платежа у ЮKassa
lib/rateLimit.js                            — простой rate limiter на Postgres
pages/api/profile/update.js                 — allowlist-эндпоинт для профиля
migrations/001_transfer_karma.sql
migrations/002_rate_limiting.sql
migrations/003_profiles_privilege_columns.sql
migrations/004_minor_db_hygiene.sql
migrations/README.md
```

## Изменённые файлы

```
.env.example
lib/auth.js
lib/paymentSettlement.js
pages/api/central-bank/dashboard.js
pages/api/central-bank/emit.js
pages/api/central-bank/movements.js
pages/api/company-admin/karma.js
pages/api/company-admin/pending-invites.js
pages/api/company-admin/resources.js
pages/api/cron/check-deadlines.js
pages/api/notifications/send.js
pages/api/payments/callback.js
pages/api/payments/check-status.js
pages/api/payments/create.js
pages/api/tasks/my.js
pages/api/transfer.js
pages/profile.js
pages/tasks.js
pages/transfer.js
```

## Что осталось не сделано (сознательно, вне рамок этого фикс-сета)

- Rate limiting не расширен на все эндпоинты (см. №15 выше) — инфраструктура готова.
- `pages/company-admin/employees.js` — `handleDeleteEmployee` тоже делает
  прямой клиентский `update({ deleted_at: ... })`, полагаясь на клиентскую
  проверку прав. Миграция `003` попутно защищает `deleted_at` при
  само-редактировании, но полноценный allowlist-эндпоинт по образцу
  `profile/update.js` для этого конкретного действия я не писал — если
  хотите, могу сделать отдельным заходом.
- Я не запускал ничего из этого против реальной базы (нет доступа) — весь
  SQL проверен только на синтаксическую и логическую состоятельность по
  тому, что видно в коде и в CSV-индексах, не на реальных данных.
