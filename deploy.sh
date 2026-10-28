#!/usr/bin/env bash
# Публикация GymQuest: секрет бота в Supabase, репозиторий на GitHub, хостинг GitHub Pages.
# Перед запуском скопируй токен бота из чата с @BotFather (нажми на него — он скопируется).
set -euo pipefail
cd "$(dirname "$0")"

say() { printf '\n\033[1;33m▶ %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31m✖ %s\033[0m\n' "$1"; exit 1; }

# 1. Токен бота из буфера обмена
TOKEN="$(pbpaste | tr -d '[:space:]')"
[[ "$TOKEN" =~ ^[0-9]{6,12}:[A-Za-z0-9_-]{30,}$ ]] || fail "В буфере нет токена бота. Открой чат с @BotFather, нажми на токен (строка вида 123456:ABC...), чтобы скопировать, и запусти снова."
say "Сохраняю токен бота в секретах Supabase"
npx -y supabase secrets set BOT_TOKEN="$TOKEN" >/dev/null
printf '' | pbcopy   # очистить буфер

# 2. Переменные сборки из .env
set -a; source .env; set +a
OWNER="$(gh api user -q .login)"
REPO="gym-quest"

# 3. Репозиторий
if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  say "Репозиторий $OWNER/$REPO уже есть"
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO.git"
else
  say "Создаю публичный репозиторий $OWNER/$REPO"
  gh repo create "$REPO" --public --source=. --remote=origin --description "GymQuest: игровой дневник тренировок в стиле GTA (Telegram Mini App)"
fi

# 4. Переменные для сборки на GitHub
say "Прописываю переменные сборки"
for v in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_BOT_NAME; do gh variable set "$v" --repo "$OWNER/$REPO" --body "${!v}"; done
gh variable set VITE_APP_NAME --repo "$OWNER/$REPO" --body "${VITE_APP_NAME:- }"

# 5. GitHub Pages через Actions
say "Включаю GitHub Pages"
gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || gh api -X PUT "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null

# 6. Отправка кода — запускает сборку и публикацию
say "Отправляю код"
git push -u origin main

say "Готово! Через 1–2 минуты игра будет по адресу https://$OWNER.github.io/$REPO/"
echo "Открыть в Telegram: https://t.me/${VITE_BOT_NAME}"
