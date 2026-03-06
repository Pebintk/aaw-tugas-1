# suilens-microservice-tutorial

Microservices tutorial implementation for Assignment 1 Part 2.2.

## Run

```bash
docker compose up --build -d
```

## Migrate + Seed (from host)

```bash
(cd services/catalog-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/order-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/notification-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/catalog-service && bun run src/db/seed.ts)
```

## Smoke Test

```bash
curl http://localhost:3001/api/lenses | jq
LENS_ID=$(curl -s http://localhost:3001/api/lenses | jq -r '.[0].id')

curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Budi Santoso",
    "customerEmail": "budi@example.com",
    "lensId": "'"$LENS_ID"'",
    "startDate": "2025-03-01",
    "endDate": "2025-03-05"
  }' | jq

docker compose logs notification-service --tail 20
```

## Stop

```bash
docker compose down
```

### Menjawab Pertanyaan-Pertanyaan yang diberikan:
#### 1. Mengapa Order Service tidak bisa langsung query tabel lenses dalam versi mikroservis?
> Karena arsitektur microservice memiliki konsep setiap layanan wajib memliki databasenya sendiri. "Loose Coupling" mencegah suatu servis membaca atau menulis langsung ke database layanan lain untuk memastikan keterikatan yang rendah. Dimana ini mencegah terjadinya "monolit terdistribusi" di mana semua layanan terikat erat pada satu database pusat.


#### 2. Apa yang terjadi pada event di RabbitMQ jika tidak ada consumer yang berjalan? Apa yang terjadi ketika consumer mulai berjalan lagi?
>
* **Saat Consumer Mati**: Event yang dipublikasikan akan tetap tersimpan dan mengantre di dalam antrean (queue) RabbitMQ.
* **Saat Consumer Aktif** Kembali: Layanan tersebut akan secara otomatis mulai mengonsumsi dan memproses semua pesan yang sempat tertunda tadi.


#### 3. Mengapa kita menyimpan lensSnapshot di record pesanan alih-alih memanggil Catalog Service setiap kali membutuhkan detail lensa?
>
* **Kemandirian Record**: Snapshot merecord pesanan bersifat mandiri dan tetap memiliki data yang benar meskipun data asli di katalog berubah atau dihapus.
* **Performa & Otonomi**: Menghilangkan kebutuhan untuk memanggil Catalog Service setiap kali ingin menampilkan detail pesanan, mengurangi ketergantungan.

#### 4. Dalam monolit, pembuatan pesanan + notifikasi adalah satu transaksi atomik. Dalam mikroservis, tidak demikian. Apa yang bisa salah?
>
* **Kegagalan Parsial:** Ada risiko di mana pesanan berhasil dibuat, tetapi sistem notifikasi gagal mengirimkan pesan karena masalah jaringan atau layanan.
* **Konsistensi Akhir:** Sistem harus menerima eventual consistency, di mana data mungkin tidak langsung sinkron di semua layanan pada detik yang sama.

#### 5. Mengapa pemanggilan Katalog → Pesanan bersifat sinkron tetapi pemanggilan Pesanan → Notifikasi bersifat asinkron? Bisakah sebaliknya?
>
* **Katalog → Pesanan (Sinkron):** Bersifat sinkron karena membutuhkan hasil instan (seperti verifikasi stok atau harga) sebelum bisa melanjutkan proses konfirmasi pesanan kepada pengguna.

* **Pesanan → Notifikasi (Asinkron):** Bersifat asinkron karena hasil pengiriman email/SMS tidak diperlukan segera untuk menyelesaikan proses transaksi utama, dan operasi ini bisa mentoleransi keterlambatan.

* **Dampaknya jika dibalik:** Jika notifikasi dibuat sinkron, kegagalan pada server email bisa menyebabkan seluruh proses pembuatan pesanan gagal (cascading failure), yang tentu merugikan bisnis.
