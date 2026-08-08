# Handoff Report — Configuration Mismatch Audit (R3)

**Agent**: Spec Miner & Explorer for Configuration Mismatch Audit (R3)  
**Working Directory**: `f:\htdocs\ProjectRosaura\.agents\explorer_r3`  
**Report Output**: `f:\htdocs\ProjectRosaura\.agents\explorer_r3\r3_findings.md`  
**Handoff Type**: Hard (Task Complete)  

---

## 1. Observation

- **Docker & Ports**:
  - `docker-compose.ws.yml`: Lines 3-13 define `websocket_node` without publishing ports (`ports: - "${WS_PORT:-8765}:8765"` missing).
  - Dev vs Deploy mismatch: Dev (`docker-compose.ws.yml` lines 6-7 & `docker/nginx/nginx.conf` line 22) uses Rust (`rosaura_websocket_node_rust`), while deploy (`deploy/docker-compose.data.yml` lines 96-116 & `deploy/docker-compose.local-cluster.yml` lines 159-179) uses Python (`scripts/websocket_server.py`).
  - `go_service`: Present in `docker-compose.yml` (lines 68-82) and `docker/nginx/nginx.conf` (lines 38-42), but completely missing from `deploy/docker-compose.app.yml`, `deploy/docker-compose.data.yml`, and `deploy/docker-compose.local-cluster.yml`.
  - `db_cassandra`: Defined in `docker-compose.yml` (lines 269-284, port 9042) but absent in `deploy/docker-compose.data.yml` and `deploy/docker-compose.local-cluster.yml`.
  - Hardcoded Redis port: `includes/core/bootstrap.php` (line 37), `api/index.php` (line 128), and `docker/go/main.go` (line 32) hardcode `:6379`, ignoring `REDIS_PORT`.
  - Ignored MySQL port: `config/Database/DatabaseManager.php` (lines 40, 78) constructs DSN without `port=$port`, ignoring `DB_PORT=3306` from `.env`.
  - Invalid MinIO URL scheme: `deploy/docker-compose.local-cluster.yml` (lines 38, 63) uses `AWS_ENDPOINT=minio:9000` (missing `http://`), while `.env` (line 101) uses `AWS_ENDPOINT=http://minio:9000`.

- **Environment Variables**:
  - `STRIPE_PRICE_COINS_*`: Declared in `.env.example` (lines 101-104), missing from `.env`.
  - `STRIPE_PRICE_PLUS_*`, `STRIPE_PRICE_PRO_*`, `STRIPE_PRICE_ULTRA_*`: Expected in `api/services/Stripe/StripeServices.php` (lines 18-30), missing from `.env` and `.env.example`.
  - Worker batch/sync settings: `WORKER_CANVAS_BATCH_SIZE` is 5000 in `.env` vs 50 in `.env.example`. `WORKER_CHAT_SYNC_INTERVAL` is 2 in `.env` vs 10 in `.env.example`.
  - QoS & connections: `WS_QOS_THRESHOLD` is 800 in `.env` vs 100 in `.env.example` vs 27000 in `.env.ws`. `WS_MAX_CONNECTIONS` is 1000 in `.env` vs 30000 in `.env.ws`.
  - Directory paths: `/var/www/html/storage/...` in `.env` vs `/app/storage/...` in `.env.example`. `SNAPSHOTS_ARCHIVE_DIR` key name / path mismatch.
  - Production host vars: `${DB_HOST_PROD}`, `${REDIS_HOST_PROD}`, `${TYPESENSE_HOST_PROD}` in `deploy/docker-compose.app.yml` (lines 19-21) missing from `.env.example`.
  - Telemetry DB credentials: `DB_TELEMETRY_USER` and `DB_TELEMETRY_PASSWORD` in `.env` (lines 51-54) ignored by `DatabaseManager.php` (lines 22-24).
  - `APP_TIMEZONE`: Direct array access `$_ENV['APP_TIMEZONE']` in `DatabaseManager.php` (lines 44, 82) without fallback.

- **Stripe Setup**:
  - Missing route: `stripe.webhook` not registered in `config/Routes/routes_tertiary.php` or `route-map.php`, present only in standalone file `stripe/webhook.php`.
  - Price resolution precedence: Env-first in `StripeServices.php` (lines 56-59) vs DB-first in `StorePackagesConfig.php` (lines 48-49).
  - Hardcoded currency: USD hardcoded in `StripeWebhookController.php` (lines 124, 134, 180) and `StripeServices.php` (lines 355, 548, 558). No `STRIPE_CURRENCY` variable in `.env` or `.env.example`.
  - Test keys in default `.env`: Test Stripe keys populated in `.env` (lines 94-96).

- **Route Mismatches**:
  - Worker status route mismatch: Frontend `public/assets/js/core/api/ApiRoutes.js` (line 108) and `api/index.php` (line 93) use `'admin.backups.check_worker_status'`. Backend `config/Routes/routes_tertiary.php` (line 606) registers `'admin.check_worker_status'`.
  - Dead frontend routes: `ApiRoutes.js` (lines 65, 78-81, 157-158) contains 7 routes (`admin.add_admin_note`, `admin.maintenance_flush_sessions`, `admin.maintenance_clear_cache`, `admin.maintenance_reset_rate_limits`, `admin.toggle_panic_mode`, `canvases.get_recent_colors`, `canvases.add_recent_color`) missing from all PHP route maps.
  - Route lookup logic risk: `api/index.php` (line 329) uses `$routes[$routes[$route] ? $route : '']`.

---

## 2. Logic Chain

1. **Port & Docker Inspection**: By cross-referencing all 6 docker-compose files (`docker-compose.yml`, `docker-compose.ws.yml`, `deploy/docker-compose.*.yml`) with Nginx configuration (`docker/nginx/nginx.conf`), PHP entrypoints, Go microservice (`main.go`), and database managers (`DatabaseManager.php`, `CassandraManager.php`, `RedisCache.php`), we identified omitted services (`go_service`, `db_cassandra`), missing port exposes (`docker-compose.ws.yml`), engine discrepancies (Rust vs Python WebSockets), hardcoded ports ignoring `.env` (`REDIS_PORT`, `DB_PORT`), and URI scheme bugs (`AWS_ENDPOINT=minio:9000`).
2. **Environment Variable Comparison**: Line-by-line comparison of `.env` against `.env.example`, `.env.ws`, `.env.ws.example`, and PHP source code revealed missing variables (`STRIPE_PRICE_COINS_*`, `STRIPE_PRICE_PLUS_*`, `DB_HOST_PROD`), severe default value mismatches (worker batch 5000 vs 50, QoS threshold 800 vs 100 vs 27000), path mismatches, and ignored credential keys (`DB_TELEMETRY_USER`).
3. **Stripe Audit**: Auditing `StripeController.php`, `StripeWebhookController.php`, `StripeServices.php`, `StorePackagesConfig.php`, `stripe/webhook.php`, and `.env` revealed that webhook requests to `api/index.php?route=stripe.webhook` fail with 404, price ID resolution precedence is contradictory across modules, currency is unconfigurable (hardcoded USD), and test keys remain in default `.env`.
4. **Route Mapping Cross-Reference**: Extracting all 145 PHP routes from `routes.php`, `routes_primary.php`, `routes_secondary.php`, `routes_tertiary.php` and comparing them against all 100+ JS route constants in `ApiRoutes.js` and controller action methods revealed a critical naming mismatch (`admin.backups.check_worker_status` vs `admin.check_worker_status`) causing 404 errors on worker status checks, 7 orphaned frontend routes lacking backend handlers, and fragile ternary lookup logic in `api/index.php`.

---

## 3. Caveats

- Codebase files remained untouched (strictly read-only audit in accordance with Rule 9 of `AI_INSTRUCTIONS.md`).
- Live Stripe webhook verification and live Docker container execution were not performed; findings are derived directly from specification, source code, and configuration analysis.

---

## 4. Conclusion

The codebase contains 22 distinct configuration mismatches, port inconsistencies, environment variable discrepancies, Stripe setup issues, and route name mismatches. All findings are fully documented with exact relative file paths, exact line numbers, problem descriptions, and concrete recommendations in `f:\htdocs\ProjectRosaura\.agents\explorer_r3\r3_findings.md`.

---

## 5. Verification Method

To verify these findings independently:
1. View `f:\htdocs\ProjectRosaura\.agents\explorer_r3\r3_findings.md` to review the complete findings table.
2. Cross-reference file paths and line numbers cited in the findings report using `view_file`.
3. Check route matching: Compare line 108 of `public/assets/js/core/api/ApiRoutes.js` (`admin.backups.check_worker_status`) against line 606 of `config/Routes/routes_tertiary.php` (`admin.check_worker_status`).
4. Check port handling: Compare line 37 of `includes/core/bootstrap.php` and line 128 of `api/index.php` against `REDIS_PORT` in `.env`.
