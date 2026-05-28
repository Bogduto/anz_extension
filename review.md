# 📊 Anzio Extension — Повний Code Review

> Дата: 2026-05-26  
> Гілка: `dev`  
> Автор аналізу: Claude Sonnet 4.6

---

## 1. Загальний огляд

**Anzio** — VSCode-розширення для відстеження часу, витраченого на роботу в репозиторіях. Фіксує, в яких файлах працює розробник, групує активність у сесії та зберігає дані в Supabase.

### Технологічний стек

| Компонент | Версія |
|---|---|
| VSCode Engine | `^1.109.0` |
| TypeScript | `^5.9.3` |
| Supabase JS | `^2.99.2` |
| esbuild | `^0.27.2` |
| ESLint + typescript-eslint | `^9.39.2` / `^8.54.0` |

### Структура проекту

```
src/
├── extension.ts                  # Точка входу
├── commands.ts                   # Константи команд
├── lib/
│   └── supabase.ts               # Клієнт Supabase + RPC
├── api/dto/
│   ├── payloadDTO.ts             # Тип пейлоаду для API
│   ├── sessionDTO.ts             # Маппер сесій
│   └── workspaceDTO.ts           # Маппер воркспейсу
├── services/
│   ├── auth/                     # Авторизація (GitHub OAuth via Supabase)
│   ├── timer/                    # Таймер + відображення
│   ├── activities/               # Трекінг файлів + AFK
│   └── backup/                   # Резервне збереження
└── utils/                        # Утиліти
```

---

## 2. Архітектура та Data Flow

### Lifecycle

```
activate()
  ├── AuthManager.restoreSession()       — відновлення токену з globalState
  ├── TimerService + PreciseTimer        — ядро таймера
  ├── TimerView.register()               — статус-бар (оновлення 100ms)
  ├── authController()                   — реєстрація URI handler (OAuth callback)
  ├── timerController()                  — команди START/STOP/RESET
  ├── activitiesRegistrationController() — слухачі VSCode events
  ├── registerMenu()                     — QuickPick меню
  └── autoRestore()                      — одноразове відновлення backup
```

### Потік даних при зупинці таймера (STOP)

```
User → STOP_TIMER_COMMAND
  → TimerService.stop()
    → finalizeHistory()       — закриває відкритий інтервал, фільтрує сесії
    → getUserId()             — Supabase auth.getUser()
    → workspaceMetadata()     — GitHub remote URL через vscode.git API
    → toSessionDTO()          — маппінг intervals → flat SessionDTO[]
    → toWorkspaceDTO()        — маппінг workspace
    → insertActivity(payload) — supabase.rpc('flush_activity', ...)
    → clearHistory()
  → stopBackupCircle()        — зупинка periodic backup + clearSession
```

---

## 3. Аналіз модулів

### 3.1 `extension.ts` — Точка входу

**Оцінка: ✅ Добре**

- Чиста DI-ін'єкція залежностей.
- `activate` правильно компонує всі сервіси.
- `deactivate` порожній — не очищає таймер, але VSCode сам disposal-не підписки через `ctx.subscriptions`.

---

### 3.2 `services/timer/core/PreciseTimer.ts`

**Оцінка: ✅ Добре, є нюанси**

- Використовує `performance.now()` для точності UI — правильно.
- `_startTimeStamp` зберігає `Date.now()` (Unix timestamp ms) — для API.

**⚠️ Проблема:** Метод `stop()` існує, але ніколи не викликається в коді (тільки `pause()` і `reset()`). При `stop()` `elapsedMs` повертає `0`.

---

### 3.3 `services/timer/TimerService.ts`

**Оцінка: ⚠️ Є критичні баги**

#### 🐛 БАГ 1: `activity_id` — глобальна змінна поза класом

```typescript
// рядок 13 — поза класом TimerService!
let activity_id: number | null = null;
```

Глобальний стан на рівні модуля. Порушує інкапсуляцію. Повинно бути `private activityId` всередині класу.

#### 🐛 БАГ 2: Ранній `return` в dev-режимі ламає стан

```typescript
if (isDevelopment) {
    const v_activity_id = 1;
    activity_id = v_activity_id;
    console.log("Payload for stop:", payload);
    return;  // clearHistory() і _onDidUpdateTime.fire(false) НЕ викликаються!
}
```

В dev-режимі після `stop()`:
- `clearHistory()` не викликається → стара історія залишається
- `this._onDidUpdateTime.fire(false)` не викликається → UI не оновлюється

#### 🐛 БАГ 3: Аналогічно в `reset()` при dev-режимі

```typescript
if (isDevelopment) {
    console.log("Payload for reset:", payload);
    return;  // clearHistory() і activity_id = null НЕ виконуються
}
```

#### ⚠️ `stop()` не перевіряє `historySize()` перед `finalizeHistory()`

`finalizeHistory()` кидає `Error("No sessions")`. Таймер зупиниться, але `clearHistory()` не викличеться → inconsistent state.

---

### 3.4 `services/timer/TimerView.ts`

**Оцінка: ⚠️ Dead code + оптимізація**

```typescript
public isRestored() { ... }
```

Метод `isRestored()` ніде не викликається в проекті.

**⚠️ Проблема:** `setInterval` оновлює статус-бар кожні 100ms навіть коли таймер зупинений — зайве навантаження.

---

### 3.5 `services/activities/ActivityManager.ts`

**Оцінка: ⚠️ Є проблеми**

#### ⚠️ Глобальний мутабельний стан

`historyList` та `activeFile` — module-level змінні. Складно тестувати та контролювати lifecycle.

#### ⚠️ Дедуплікація сесій — сумнівна

```typescript
// may it be here? duplicate   ← сам автор не впевнений
session.intervals.push(...duplicate.intervals);
```

Коментар `// may it be here?` свідчить про непевність у коді.

#### ⚠️ `IGNORE_FILE_MIN_DURATION` читається один раз при завантаженні

Якщо користувач змінив налаштування під час роботи — значення залишиться старим. Потрібна підписка на `onDidChangeConfiguration`.

#### ⚠️ `finalizeHistory` кидає error якщо сесій нема

При цьому таймер вже зупинений (`isRunning = false`), але дані не збережені і `clearHistory()` не викликана.

---

### 3.6 `services/activities/AfkManager.ts`

**Оцінка: ⚠️ Є проблеми**

#### 🐛 БАГ: Неправильний коментар у змінній

```typescript
const IDLE_TIMEOUT = ... ?? 1000 * 60 * 5; // 3 секунди
```

Коментар каже "3 секунди", але значення — 5 хвилин (300 000 ms).

#### ⚠️ AFK трекується як псевдо-файл

```typescript
openNewSession(id, "unknown", timeNow()); // id = 'AFK' або 'alt+tab'
setActiveFile(id);
```

AFK-стан зберігається як файл з pathname `'AFK'`. Це потрапляє в API як файлова сесія — засмічує дані на бекенді.

---

### 3.7 `services/activities/Activitycontroller.ts`

**Оцінка: ✅ Логіка зрозуміла**

`openNewSession` захищена від подвійного відкриття — коректно.

**⚠️ Нюанс:** При старті розширення — тільки `setActiveFile`, але `openNewSession` не викликається. Перший інтервал відкриється лише при першій зміні тексту.

---

### 3.8 `services/auth/`

**Оцінка: ✅ Загалом добре, є нюанси**

#### ✅ OAuth Flow
- Відкриває браузер → GitHub OAuth → redirect на `vscode://bogduto.anz/auth/callback`
- Токени зберігаються в `ctx.globalState` (зашифрований VSCode storage)

#### 🔴 КРИТИЧНО: Access token логується в консоль

```typescript
console.log(`[RESTORE SESSION PART 1] ACCESS ${accessToken} REFRESH ${refreshToken}`);
```

У production токен видимий в Extension Output панелі VSCode.

#### ⚠️ `AuthService.logout()` — неповний logout

```typescript
public logout(): void {
    this.authSessionMenager.clearSession(); // тільки локально!
}
```

`supabase.auth.signOut()` не викликається. Supabase сесія на сервері залишається активною.

---

### 3.9 `services/backup/`

**Оцінка: ⚠️ Є проблеми**

#### 🐛 БАГ: `BackupData.activeFile` не заповнюється при збереженні

```typescript
// Інтерфейс
export interface BackupData {
    timer: number;
    history: HistorySessions;
    activeFile: ActiveFile;  // обов'язкове поле
}

// Збереження — activeFile відсутній!
const data: BackupData = {
    timer: elapsed,
    history,
};
```

TypeScript compile error — незавершений рефакторинг.

#### 🐛 БАГ: `autoRestore` передає elapsed ms замість start timestamp

```typescript
p_start: response.timer,  // це elapsed ms, а не Unix timestamp!
```

`BackupData.timer` = `getElapsedMs()` (скільки мілісекунд пройшло).  
`PayloadDTO.p_start` очікує Unix timestamp початку сесії.

#### ⚠️ `autoRestore` не перевіряє авторизацію

```typescript
const [userId, workspace] = await Promise.all([
    getUserId(),  // кине помилку якщо не залогінений
    workspaceMetadata(),
]);
```

Помилка не перехоплюється в `activate()`.

---

### 3.10 `lib/supabase.ts`

**Оцінка: 🔴 Security проблеми**

#### 🔴 Hardcoded credentials

```typescript
export const SUPABASE_URL = process.env.SUPABASE_URL || "https://oygjfacifeejqzyrrloy.supabase.co";
export const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_...";
```

URL і ключ захардкоджені як fallback — видимі в GitHub та в скомпільованому бандлі.

#### ⚠️ Немає retry логіки

При мережевій помилці дані загублені без можливості повтору.

---

### 3.11 `api/dto/`

**Оцінка: ⚠️ Є невідповідності**

#### ⚠️ `WorkspaceDTO` та `Workspace` — ідентичні типи без трансформації

Надлишковість без додаткової логіки.

#### ⚠️ `close_time: interval.close_time ?? 0`

Якщо `close_time` є `null` (відкритий інтервал), він замінюється на `0` → час закриття `1970-01-01` на бекенді.

---

### 3.12 `activity.types.ts`

**Оцінка: 🔴 Невикористаний файл**

```typescript
interface Session {
    enter_time: Date;   // Date object
    close_time: Date | null;
}
```

Файл НІДЕ не імпортується. Типи тут використовують `Date`, тоді як реальна реалізація використовує `number` (Unix timestamps). Застарілий dead code.

---

## 4. Dead Code / Невикористані файли

| Файл | Проблема |
|---|---|
| `src/utils/readActiveFile.ts` | Ніде не імпортується |
| `src/utils/currentDirectory.ts` | Ніде не імпортується |
| `src/services/activities/activity.types.ts` | Ніде не імпортується, застаріла схема |
| `TimerView.isRestored()` | Метод визначений але ніколи не викликається |
| `commands.ts: CHECK_AUTH_COMMAND` | Визначена але ніде не реєструється |
| `PreciseTimer.stop()` | Метод визначений але ніколи не викликається |

---

## 5. Security Issues

| Рівень | Проблема | Місце |
|---|---|---|
| 🔴 HIGH | Access + Refresh token логуються у відкритому вигляді | `AuthManager.ts:16` |
| 🔴 HIGH | Supabase URL і Key захардкоджені у source code | `supabase.ts:6-7` |
| 🟡 MEDIUM | `supabase.auth.signOut()` не викликається при logout | `AuthService.ts:15` |
| 🟡 MEDIUM | `autoRestore` не перевіряє авторизацію перед API | `BackupController.ts:68` |

---

## 6. Bugs Summary

| # | Серйозність | Опис | Файл |
|---|---|---|---|
| 1 | 🔴 Critical | `activity_id` — module-level замість class property | `TimerService.ts:13` |
| 2 | 🔴 Critical | `stop()` у dev-режимі не очищає history і не оновлює UI | `TimerService.ts:78` |
| 3 | 🔴 Critical | `reset()` у dev-режимі не очищає history, не скидає activity_id | `TimerService.ts:125` |
| 4 | 🔴 Critical | `BackupData.activeFile` не заповнюється при збереженні | `BackupController.ts:39` |
| 5 | 🔴 Critical | `autoRestore` передає elapsed ms замість start timestamp | `BackupController.ts:91` |
| 6 | 🔴 Critical | Access token логується в консоль | `AuthManager.ts:16` |
| 7 | 🟡 Medium | `IDLE_TIMEOUT` comment каже "3 секунди" але значення 5 хвилин | `AfkManager.ts:7` |
| 8 | 🟡 Medium | AFK трекується як псевдо-файл — засмічує API | `AfkManager.ts:23` |
| 9 | 🟡 Medium | `autoRestore` не перевіряє isLoggedIn | `BackupController.ts:68` |
| 10 | 🟡 Medium | `close_time ?? 0` — відправляє epoch замість реального часу | `sessionDTO.ts:17` |
| 11 | 🟢 Low | `anz.RESET` не описана в `package.json` contributes | `package.json` |
| 12 | 🟢 Low | `TimerView` ре-рендериться 10 разів/сек навіть коли таймер стоїть | `TimerView.ts:30` |

---

## 7. Code Quality

### ✅ Що зроблено добре

- **Separation of Concerns**: чіткий розподіл Controller / Service / Manager / View
- **EventEmitter pattern**: `onDidChangeAuth`, `onDidUpdateTime` — реактивний підхід
- **Backup система**: концепція periodic backup з відновленням — правильна ідея
- **Path normalization**: `normalizePath` нормалізує backslash і case — критично для Windows
- **esbuild + dotenv**: env змінні інжектуються в бандл через `define`
- **TypeScript strict mode**: увімкнений `strict: true`

### ❌ Що потребує покращення

- **Глобальний мутабельний стан**: `historyList`, `activeFile`, `activity_id`, `idleTimer`, `backupInterval` — module-level. Ускладнює тестування
- **Немає тестів**: `extension.test.ts` містить тільки placeholder
- **Немає error boundaries**: помилки в `autoRestore` можуть вбити весь `activate()`
- **Typo у назві файлу**: `Activitycontroller.ts` — маленька `c` (непослідовно з іншими)
- **Архітектурний гібрид**: частина коду — classes, частина — functional з module-level state (не є справжнім FP)

---

## 8. Конфігурація та Build

### `package.json`

- `activationEvents: ["*"]` — активується при будь-якій події. Краще `onStartupFinished`
- `"anz.RESET"` реєструється в коді але відсутня в `contributes.commands`
- `version: "0.0.1"` — не оновлюється між релізами

### `esbuild.js`

- `dotenv.config().parsed || {}` — якщо `.env` не існує, спрацюють hardcoded fallbacks у `supabase.ts`

### `tsconfig.json`

- `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedParameters` — закоментовані. Варто увімкнути

---

## 9. Рекомендації (пріоритети)

> Оновлено: 2026-05-26 після рефакторингу

### ✅ Виправлено

| # | Що виправлено |
|---|---|
| 1 | Логування токенів прибрано — тепер `Tokens found: true/false` |
| 2 | Захардкоджені credentials видалені — `supabase.ts` використовує `process.env.X!` |
| 3 | Dev-режим `stop()` і `reset()` — `clearHistory()` та `fire(false)` завжди виконуються |
| 4 | `activity_id` перенесено в клас як `private activityId` |
| 5 | `BackupData.activeFile` прибрано з інтерфейсу |
| 6 | `supabase.auth.signOut()` викликається при logout через `logoutFromSupabase()` |
| 7 | `autoRestore` перевіряє `isLoggedIn` перед API викликом |
| 8 | Коментар IDLE_TIMEOUT виправлено — тепер "5 minutes" |
| 9 | Timer option прихований в меню коли не залогінений |
| 10 | `anz.RESET` додано в `package.json` contributes.commands |
| 11 | `ActivityManager`, `AfkManager`, `BackupController` переведено на `class` |

---

### 🟡 Залишилось — важливо

1. **`BackupController.run()`** — `activeFile` ще передається в об'єкт `data`, але вже відсутній в інтерфейсі `BackupData` → TypeScript excess property error. Потрібно прибрати рядок `activeFile: this.activityManager.getActiveFile()`

2. **`stop()` не перевіряє `historySize()` перед `finalizeHistory()`** — якщо таймер запущений але жоден файл не редагувався, `finalizeHistory()` кине `Error("No active file to finalize")`. Таймер зупиниться але стан залишиться inconsistent. Варто додати перевірку:
    ```typescript
    if (this.activityManager.historySize() === 0) {
        this.activityManager.clearHistory();
        this._onDidUpdateTime.fire(false);
        return;
    }
    ```

3. **`close_time: interval.close_time ?? 0`** в `sessionDTO.ts` — якщо інтервал ще відкритий (`close_time === null`), на бекенд відправляється `0` (epoch `1970-01-01`). Варто передавати `Date.now()` замість `0`

5. **AFK сесії потрапляють в API** — `'AFK'` і `'alt+tab'` зберігаються як pathname і відправляються на бекенд разом зі звичайними файлами. Варто фільтрувати в `finalizeHistory()` або `toSessionDTO()`

---

### 🟢 Nice-to-have

6. **`TimerView.isRestored()`** — метод визначений але ніколи не викликається. Dead code
7. **`TimerView` ре-рендериться кожні 100ms** навіть коли таймер зупинений — оптимізація: рендерити тільки при `isRunning === true`
8. **`CHECK_AUTH_COMMAND`** — визначено в `commands.ts` але ніде не реєструється
9. **`activationEvents: ["*"]`** — розширення активується при будь-якій події. Краще `onStartupFinished`
10. **Мертві файли** — `readActiveFile.ts`, `currentDirectory.ts`, `activity.types.ts` ніде не імпортуються
11. **Написати юніт-тести** — `extension.test.ts` містить тільки placeholder
12. **`noImplicitReturns: true`** у `tsconfig.json` — зараз закоментовано

---

## 10. Метрики коду

| Метрика | Значення |
|---|---|
| TypeScript файлів | 23 |
| Рядків коду (src) | ~800 |
| Сервісів | 4 (auth, timer, activities, backup) |
| Команд VSCode | 6 визначено, 5 в contributes |
| Конфігурацій | 3 (backupInterval, ignoreFileMinDuration, afkIntervalTime) |
| Тестів | 1 (placeholder) |
| Мертвих файлів | 3 |
| Критичних багів | 6 |
| Security проблем | 4 |

---

*Аналіз виконано на основі читання вихідного коду. Жодний робочий файл не був змінений.*
