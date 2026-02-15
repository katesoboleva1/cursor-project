# Настройка синхронизации с GitHub через SSH

## Шаг 1: Создание SSH ключа

Откройте терминал и выполните:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

- Нажмите Enter для сохранения в стандартном месте (`~/.ssh/id_ed25519`)
- При запросе пароля можете оставить пустым или установить пароль для дополнительной безопасности

## Шаг 2: Запуск SSH-агента и добавление ключа

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

## Шаг 3: Копирование публичного ключа

```bash
cat ~/.ssh/id_ed25519.pub
```

Скопируйте весь вывод (начинается с `ssh-ed25519` и заканчивается вашим email).

## Шаг 4: Добавление ключа в GitHub

1. Откройте GitHub.com и войдите в аккаунт
2. Перейдите в **Settings** → **SSH and GPG keys**
3. Нажмите **New SSH key**
4. Введите название (например, "MacBook Cursor")
5. Вставьте скопированный ключ в поле **Key**
6. Нажмите **Add SSH key**

## Шаг 5: Проверка подключения

```bash
ssh -T git@github.com
```

Должно появиться сообщение: `Hi username! You've successfully authenticated...`

## Шаг 6: Инициализация Git репозитория в проекте

```bash
cd "/Users/kate/Cursor project"
git init
git branch -M main
```

## Шаг 7: Создание репозитория на GitHub

1. Откройте GitHub.com
2. Нажмите **New repository**
3. Введите название репозитория (например, `cursor-project`)
4. **НЕ** добавляйте README, .gitignore или лицензию (у нас уже есть файлы)
5. Нажмите **Create repository**

## Шаг 8: Подключение локального репозитория к GitHub

После создания репозитория GitHub покажет инструкции. Используйте SSH URL:

```bash
git remote add origin git@github.com:ВАШ_USERNAME/НАЗВАНИЕ_РЕПОЗИТОРИЯ.git
```

Например:
```bash
git remote add origin git@github.com:kate/cursor-project.git
```

## Шаг 9: Первый коммит и отправка

```bash
# Добавить все файлы
git add .

# Создать первый коммит
git commit -m "Initial commit"

# Отправить на GitHub
git push -u origin main
```

## Дальнейшая работа

После настройки для синхронизации изменений используйте:

```bash
git add .
git commit -m "Описание изменений"
git push
```

## Полезные команды

- `git status` - проверить статус изменений
- `git pull` - получить изменения с GitHub
- `git log` - посмотреть историю коммитов
- `git remote -v` - проверить подключенные удаленные репозитории

## Решение проблем

### Если SSH ключ не работает:
```bash
# Проверить, добавлен ли ключ в агент
ssh-add -l

# Если пусто, добавить снова
ssh-add ~/.ssh/id_ed25519
```

### Если нужно использовать другой SSH ключ:
Создайте файл `~/.ssh/config`:
```
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
```
