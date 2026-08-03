# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Публичный адрес самого приложения (используется для redirectTo в письмах-
# приглашениях, pages/api/company-admin/invite-employee.js). Обязательно
# укажите в проде, иначе используется req.headers.host — работает, но
# лучше явно.
NEXT_PUBLIC_SITE_URL=https://your-domain.example

# Общий секрет между ArthurCRM и внешним CRM-приложением (summercrm) для
# одноразового обмена sso-кода на токены сессии. См.
# pages/api/crm-handoff/exchange.js. Сгенерируйте длинную случайную строку,
# например: openssl rand -base64 32
CRM_HANDOFF_SECRET=
