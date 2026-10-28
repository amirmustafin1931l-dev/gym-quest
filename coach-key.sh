#!/usr/bin/env bash
# Подключить общего ИИ-тренера: кладёт ключ Anthropic из буфера обмена в секреты сервера.
# Перед запуском скопируй ключ на console.anthropic.com → API Keys (начинается с sk-ant-).
set -euo pipefail
cd "$(dirname "$0")"
KEY="$(pbpaste | tr -d '[:space:]')"
[[ "$KEY" =~ ^sk-ant-[A-Za-z0-9_-]{20,}$ ]] || { printf '\n\033[1;31m✖ В буфере нет ключа Anthropic (sk-ant-...). Скопируй ключ и запусти снова.\033[0m\n'; exit 1; }
CHAT="${1:-30}"; PLAN="${2:-2}"
npx -y supabase secrets set ANTHROPIC_API_KEY="$KEY" COACH_CHAT_LIMIT="$CHAT" COACH_PLAN_LIMIT="$PLAN" >/dev/null
printf '' | pbcopy
printf '\n\033[1;33m▶ Тренер подключён. Лимиты в день на игрока: %s сообщений, %s задания.\033[0m\n' "$CHAT" "$PLAN"
