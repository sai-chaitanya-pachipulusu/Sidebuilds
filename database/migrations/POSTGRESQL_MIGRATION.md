# PostgreSQL Compatibility Migration - December 23, 2025

## Summary

This document describes all the changes made to migrate the codebase from SQLite-compatible syntax to PostgreSQL-compatible syntax for production deployment.

## Key Changes Made

### 1. Database Helper Functions (`server/db.js`)

Added a `SQL` helper object with PostgreSQL-compatible functions:

```javascript
const SQL = {
  checkBool: (col) => `${col} = true`,
  checkBoolFalse: (col) => `${col} = false`,
  setBoolTrue: () => `true`,
  setBoolFalse: () => `false`,
  dateInterval: (interval) => `NOW() - INTERVAL '${interval}'`,
  dateAfter: (col, interval) => `${col} > NOW() - INTERVAL '${interval}'`,
  dateBetween: (col, startInterval, endInterval) =>
    `${col} BETWEEN NOW() - INTERVAL '${startInterval}' AND NOW() - INTERVAL '${endInterval}'`,
  datetime: (offset = "") =>
    offset ? `NOW() - INTERVAL '${offset}'` : "NOW()",
  strftime: (format, col) => `TO_CHAR(${col}, 'format')`,
  daysDiff: (col1, col2 = "NOW()") =>
    `EXTRACT(EPOCH FROM (${col2} - ${col1})) / 86400`,
  coalesceBool: (col, defaultVal = false) => `COALESCE(${col}, ${defaultVal})`,
  countCaseWhenBool: (col, alias) =>
    `COUNT(CASE WHEN ${col} = true THEN 1 END) as ${alias}`,
  sumCaseWhenBool: (col, valueCol, alias) =>
    `SUM(CASE WHEN ${col} = true THEN ${valueCol} ELSE 0 END) as ${alias}`,
};
```

### 2. Boolean Value Changes

Converted all SQLite-style boolean checks from `= 1` / `= 0` to PostgreSQL-style `= true` / `= false`:

| File                            | Changes                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| `routes/analytics.js`           | `is_for_sale = 1` → `is_for_sale = true`                         |
| `routes/ai.js`                  | Multiple `is_for_sale = 1` → `is_for_sale = true`                |
| `routes/users.js`               | `is_for_sale = 1` → `is_for_sale = true` in CASE statements      |
| `routes/purchaseRequests.js`    | `is_for_sale = 1/0` → `is_for_sale = true/false`                 |
| `routes/payments.js`            | `is_for_sale = 1/0`, `transfer_completed = 1` → `true/false`     |
| `routes/notifications.js`       | `is_read = 0/1` → `is_read = false/true`                         |
| `routes/dashboard.js`           | `is_for_sale = 1`, `is_read = 0` → `true/false`                  |
| `services/webhookService.js`    | `onboarding_complete = 1/0` → `true/false` (using boolean param) |
| `services/enhancedAIService.js` | `is_for_sale = 1` → `is_for_sale = true`                         |

### 3. Date/Time Function Changes

Converted all SQLite `datetime()` and `strftime()` functions to PostgreSQL equivalents:

| SQLite Syntax                       | PostgreSQL Syntax                           |
| ----------------------------------- | ------------------------------------------- |
| `datetime('now', '-30 days')`       | `NOW() - INTERVAL '30 days'`                |
| `datetime('now', '-1 hour')`        | `NOW() - INTERVAL '1 hour'`                 |
| `strftime('%Y-%m-%d %H:00', col)`   | `TO_CHAR(col, 'YYYY-MM-DD HH24:00')`        |
| `julianday('now') - julianday(col)` | `EXTRACT(EPOCH FROM (NOW() - col)) / 86400` |

Files updated:

- `routes/webhooks.js` - All date comparisons and GROUP BY formatting
- `routes/analytics.js` - Removed db.isSQLite conditionals, using pure PostgreSQL
- `routes/ai.js` - Removed db.isSQLite conditionals, using pure PostgreSQL
- `services/webhookService.js` - Health check queries
- `services/enhancedAIService.js` - Removed db.isSQLite conditionals

### 4. Table Schema Changes (CREATE TABLE)

Converted SQLite-specific table definitions to PostgreSQL:

| SQLite                               | PostgreSQL                              |
| ------------------------------------ | --------------------------------------- |
| `INTEGER PRIMARY KEY AUTOINCREMENT`  | `SERIAL PRIMARY KEY`                    |
| `TEXT` (for dates)                   | `TIMESTAMPTZ`                           |
| `DATETIME DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP` |

Files updated:

- `services/webhookService.js` - `webhook_events` table
- `services/webhookQueue.js` - `webhook_queue` table

### 5. Parameter Value Changes

Converted boolean parameter passing from integers to actual booleans:

```javascript
// Before (SQLite)
[isComplete ? 1 : 0, userId][
  // After (PostgreSQL)
  (isComplete, userId)
];
```

Files updated:

- `routes/payments.js`
- `services/webhookService.js`

## Files Modified

### Routes

1. `routes/analytics.js` - Removed all db.isSQLite conditionals, pure PostgreSQL
2. `routes/ai.js` - Removed db.isSQLite conditionals, fixed boolean checks
3. `routes/webhooks.js` - Fixed datetime() and strftime() calls
4. `routes/users.js` - Fixed boolean CASE expressions
5. `routes/purchaseRequests.js` - Fixed is_for_sale boolean checks
6. `routes/payments.js` - Fixed multiple boolean checks and settings
7. `routes/notifications.js` - Fixed is_read boolean checks
8. `routes/dashboard.js` - Fixed is_for_sale and is_read checks

### Services

9. `services/webhookService.js` - Fixed table schema and datetime functions
10. `services/webhookQueue.js` - Fixed table schema
11. `services/enhancedAIService.js` - Removed db.isSQLite conditional

### Core

12. `db.js` - Added SQL helper functions for PostgreSQL, exported in module

## Testing Notes

- All changes maintain backward compatibility with the existing ? placeholder syntax
- The db.js `convertPlaceholders()` function still handles `?` → `$1, $2, etc.` conversion
- Local development with `USE_SQLITE=true` will still use SQLite-specific syntax in the SQLite code branch

## Environment Variables

Ensure these are set for production:

- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV=production` - To use PostgreSQL mode
- `USE_SQLITE` should NOT be set to 'true' in production
