# cursor-project

Статический проект: списки компаний, отчёты по сделкам, материалы по BD и LinkedIn.

## Структура

- `startups/` — материалы по стартапам, BD, AltaClub, LinkedIn
- `Companies_List_VC_and_SaaS.html` — список компаний (VC и SaaS)
- `SaaS_Stage_Plan_and_Hypotheses_Report.html` — отчёт по этапам и гипотезам SaaS

## Локальный запуск

```bash
python3 -m http.server 8765
```

Открыть в браузере: http://localhost:8765/

## Запуск скриптов на GitHub

Скрипты из `startups/` (например, `export_founders_for_outreach.py`) можно **запускать автоматически на GitHub** при пуше или вручную:

1. В репозитории на GitHub открой вкладку **Actions**.
2. Выбери workflow **Run scripts**.
3. Нажми **Run workflow** → **Run workflow** (запуск всех настроенных скриптов в одном запуске).

Workflow срабатывает также при пуше в `main`, если менялись файлы `startups/*.py` или `startups/*.html`. Результаты (например, сгенерированные CSV) можно скачать в разделе Artifacts у завершённого запуска.
