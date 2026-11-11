# Backend API Template

Elysia + Drizzle (Postgres) + Redis (cache, rate limit) + S3-compatible storage, di atas Bun.

## Mulai cepat

```bash
bun install
cp .env.example .env
docker compose up -d            # postgres, redis, minio (+ bucket)
bun run db:migrate              # jalankan migrasi
bun run dev                     # postgres, redis, seaweedfs (S3 + bucket otomatis)
```

## Script

| Script | Fungsi |
|---|---|
| `dev` / `start` | Jalankan API (watch / biasa) |
| `typecheck` / `test` | Cek tipe / tes (butuh Postgres + Redis hidup) |
| `db:generate` | Buat migrasi dari `src/db/schema.ts` (commit folder `drizzle/`) |
| `db:migrate` | Terapkan migrasi. Jalankan sebagai langkah deploy terpisah, bukan saat boot |
| `build:types` | Emit paket tipe minimal ke `dist-types/` |

## Struktur

```
src/config/env.ts      env tervalidasi (gagal cepat)
src/db/                schema, client, migrate
src/lib/               redis, cache, storage (S3)
src/plugins/           request-id, request-logging, error, rate-limit
src/modules/           health, posts, files  (tambah modul baru di sini)
src/app.ts             rakit app + export type App
src/index.ts           listen + graceful shutdown
```

## Menambah modul

1. Tabel di `src/db/schema.ts` lalu `bun run db:generate`.
2. File `src/modules/<nama>.ts` (`new Elysia({ prefix: '/nama' })`).
3. Daftarkan di `src/app.ts` di dalam group `/api/v1`.

## Logging request

Setiap request dicatat ke stdout sebagai satu baris JSON terstruktur. Log ini dapat
langsung dikumpulkan oleh Docker, Kubernetes, atau log aggregator lain:

```json
{"level":"info","msg":"request","requestId":"…","method":"GET","path":"/api/v1/posts","status":200,"durationMs":12,"ip":"1.2.3.4","userAgent":"…","userId":null}
```

Field yang tersedia:

- `requestId`: nilai `x-request-id` dari client atau UUID yang dibuat server;
- `method`, `path`, `status`, `durationMs`: detail dan timing request;
- `ip`: alamat pertama dari `x-forwarded-for`, atau alamat koneksi langsung;
- `userAgent`: header `user-agent` (atau `null` jika tidak ada);
- `userId`: selalu `null` sampai autentikasi/user context diaktifkan.

Request dengan error dicatat dengan `level: "error"`. Jangan meneruskan
`x-forwarded-for` dari client secara langsung kecuali API berada di belakang
reverse proxy yang dikendalikan sendiri.

## Kontrak tipe untuk frontend

Tag rilis `vX.Y.Z` (samakan dengan `version` di package.json) memicu workflow `release`:
mem-publish **`@myorg/api`** (hanya `.d.ts`, peer dep `elysia`) ke GitHub Packages
dan image Docker ke GHCR. Ganti `@myorg` lewat field `typesPackage` di package.json.

Catatan: versi `elysia` di frontend harus sama dengan backend (`~1.4.x`), dan tsconfig
frontend butuh `skipLibCheck: true`.

## Storage (S3)

Dev memakai SeaweedFS (`weed mini`, S3 di `:8333`, admin UI di `:23646`); bucket `app-uploads`
dibuat otomatis. Untuk production cukup ganti `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET` dan kunci
(S3 / Cloudflare R2 / DigitalOcean Spaces, dll). Catatan: MinIO CE sudah tidak menerbitkan image Docker.

## Catatan production

- Rate limit membaca `x-forwarded-for`: aktifkan hanya di belakang reverse proxy milikmu.
- `ENABLE_DOCS=false` di production kecuali memang dibutuhkan.
- Redis mati = cache dan rate limit dilewati (fail-open); `/ready` tetap gagal sehingga LB bisa bertindak.
