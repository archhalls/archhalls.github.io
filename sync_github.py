#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Синхронизация сайта «Залы мира 2025» с GitHub Pages.

Что делает:
  1. Сканирует локальную папку photos/ и пересобирает photos.json
     (манифест: папка -> список файлов).
  2. Добавляет ВСЕ изменения в git (index.html, catalog.js, halls-2025.csv,
     photos.json, новые/изменённые фото).
  3. Делает коммит и пушит в GitHub — сайт на GitHub Pages обновляется
     автоматически.

Запуск (из папки Сайт):
    python sync_github.py

Требуется:
  - git (уже установлен)
  - файл github_token.txt рядом со скриптом (содержит Personal Access Token).
    Этот файл в .gitignore и на GitHub НЕ попадает.
"""
import os, json, sys, subprocess, datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ================= НАСТРОЙКИ =================
REPO_URL = "https://github.com/archhalls/archhalls.github.io.git"
BRANCH   = "main"
# Токен читается из файла github_token.txt (в .gitignore, на GitHub не уходит)
TOKEN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'github_token.txt')
# =============================================

LOCAL = os.path.dirname(os.path.abspath(__file__))
IMG = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif')


def build_manifest():
    """Сканирует photos/ и пишет photos.json."""
    photos_dir = os.path.join(LOCAL, 'photos')
    manifest = {}
    if os.path.isdir(photos_dir):
        for folder in sorted(os.listdir(photos_dir)):
            fp = os.path.join(photos_dir, folder)
            if os.path.isdir(fp):
                files = sorted(f for f in os.listdir(fp) if f.lower().endswith(IMG))
                if files:
                    manifest[folder] = files
    with open(os.path.join(LOCAL, 'photos.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    return manifest


def run(cmd, cwd=LOCAL):
    """Запускает команду и возвращает вывод."""
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.stdout.strip():
        print(r.stdout.strip())
    if r.returncode != 0:
        if r.stderr.strip():
            print('  [stderr]', r.stderr.strip())
        raise RuntimeError(f'Команда не удалась: {" ".join(cmd)}')
    return r.stdout


def main():
    print('1) Пересобираю photos.json…')
    manifest = build_manifest()
    total = sum(len(v) for v in manifest.values())
    print(f'   Папок с фото: {len(manifest)}, файлов: {total}')

    if not os.path.exists(TOKEN_FILE):
        print('ОШИБКА: файл github_token.txt не найден рядом со скриптом.')
        sys.exit(1)
    token = open(TOKEN_FILE, encoding='utf-8').read().strip()
    if not token:
        print('ОШИБКА: github_token.txt пуст.')
        sys.exit(1)

    # URL с токеном для аутентификации при push
    push_url = REPO_URL.replace('https://', f'https://{token}@')

    print('2) Проверяю git-репозиторий…')
    if not os.path.isdir(os.path.join(LOCAL, '.git')):
        print('   Репозитория нет — инициализирую…')
        run(['git', 'init'])
        run(['git', 'checkout', '-b', BRANCH])
        run(['git', 'remote', 'add', 'origin', push_url])
    else:
        # Обновляем remote на всякий случай
        run(['git', 'remote', 'set-url', 'origin', push_url])

    # Автонастройка identity, если не задана (нужна для коммитов)
    if not run(['git', 'config', 'user.email']).strip():
        run(['git', 'config', 'user.email', 'foolloader@users.noreply.github.com'])
    if not run(['git', 'config', 'user.name']).strip():
        run(['git', 'config', 'user.name', 'foolloader'])

    print('3) Добавляю изменения…')
    run(['git', 'add', '-A'])

    # Проверяем, есть ли что коммитить
    diff = run(['git', 'status', '--porcelain'])
    if not diff.strip():
        print('   Изменений нет — сайт уже актуален. Готово!')
        return

    msg = 'Обновление сайта ' + datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    print(f'4) Коммит: {msg}')
    run(['git', 'commit', '-m', msg])

    print('5) Пушу в GitHub…')
    run(['git', 'push', '-u', 'origin', BRANCH])

    print('Готово! GitHub Pages обновится через 1–2 минуты.')
    print('Адрес: https://archhalls.github.io/')


if __name__ == '__main__':
    main()
