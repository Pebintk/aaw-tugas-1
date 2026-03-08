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
>* **Saat Consumer Mati**: Event yang dipublikasikan akan tetap tersimpan dan mengantre di dalam antrean (queue) RabbitMQ.
>* **Saat Consumer Aktif** Kembali: Layanan tersebut akan secara otomatis mulai mengonsumsi dan memproses semua pesan yang sempat tertunda tadi.


#### 3. Mengapa kita menyimpan lensSnapshot di record pesanan alih-alih memanggil Catalog Service setiap kali membutuhkan detail lensa?
>* **Kemandirian Record**: Snapshot merecord pesanan bersifat mandiri dan tetap memiliki data yang benar meskipun data asli di katalog berubah atau dihapus.
>* **Performa & Otonomi**: Menghilangkan kebutuhan untuk memanggil Catalog Service setiap kali ingin menampilkan detail pesanan, mengurangi ketergantungan.

#### 4. Dalam monolit, pembuatan pesanan + notifikasi adalah satu transaksi atomik. Dalam mikroservis, tidak demikian. Apa yang bisa salah?
>* **Kegagalan Parsial:** Ada risiko di mana pesanan berhasil dibuat, tetapi sistem notifikasi gagal mengirimkan pesan karena masalah jaringan atau layanan.
>* **Konsistensi Akhir:** Sistem harus menerima eventual consistency, di mana data mungkin tidak langsung sinkron di semua layanan pada detik yang sama.

#### 5. Mengapa pemanggilan Katalog → Pesanan bersifat sinkron tetapi pemanggilan Pesanan → Notifikasi bersifat asinkron? Bisakah sebaliknya?
>* **Katalog → Pesanan (Sinkron):** Bersifat sinkron karena membutuhkan hasil instan (seperti verifikasi stok atau harga) sebelum bisa melanjutkan proses konfirmasi pesanan kepada pengguna.

>* **Pesanan → Notifikasi (Asinkron):** Bersifat asinkron karena hasil pengiriman email/SMS tidak diperlukan segera untuk menyelesaikan proses transaksi utama, dan operasi ini bisa mentoleransi keterlambatan.

>* **Dampaknya jika dibalik:** Jika notifikasi dibuat sinkron, kegagalan pada server email bisa menyebabkan seluruh proses pembuatan pesanan gagal (cascading failure), yang tentu merugikan bisnis.

### Tulisan Perbandingan:
#### (a) Identifikasi satu skenario spesifik di mana arsitektur mikroservis lebih tangguh dari monolit. Demonstrasikan.
> Contoh skenario di mana arsitektur microservice akan lebih tangguh dari mobolith adalah ketika salah satu database / service fitur mengalami down. Dengan menggunakan Inventory DB / Service sebagai contoh, misalkan ada seorang user yang ingin membatalkan pesanan yang ia miliki namun saat itu ternyata DB / Service yang di hosting sedang mengalami suatu masalah. Jika menggunakan monolith, proses mengubah status order beserta stok di inventory akan dilakukan secara synchronous, maka seluruh proses akan terpengaruhi akibat transaksi database akan mengalami kegagalan dan mengharuskan untuk melakukan rollback. User akan mellihat pesan error yang diberikan, dan berpikir bahwa aplikasi sedang rusak.

> Sementara jika menggunakan microservice, Suilens menggunakan RabbitMQ sebagai message broker antara Order dan Inventory service. Order service akan menerima request pembatalan pesanan, dan membatalkan pesanan pada database miliknya, dan akan menggunakan RabbitMQ untuk memberikan pesan bahwa ada order yang dibatalkan. Hal inilah yang dapat menjagai aplikasi Suilens tetap beroperasional ketika salah satu service (dalam contoh ini Inventory) nya down, dimana RabbitMQ akan menyimpan pesan kiriman Order dalam queue hingga Inventory service dapat menerima pesan kembali. Sehingga penerapan ini akan menjaga tidak ada data yang hilang.

#### (b) Identifikasi satu skenario di mana monolit lebih sederhana atau lebih benar. Jelaskan.
> Salah satu skenario di mana monolith akan lebih baik digunakan adalah ketika merancang Minimum Viable Product(MVP). Dengan membangun sistem secara monolith, maka waktu yang dihabiskan dalam pengembangan akan jauh lebih cepat jika dibandingkan dengan microservice. Kompleksitas infrastruktur yang minim, kemudahan melakukan perubahan secara cepat, kemudahan untuk debugging merupakan beberapa alasan mengapa monolith unggul dalam merancang MVP..

#### (c) Apa yang terjadi jika Inventory Service down saat pelanggan mencoba membuat pesanan? Bagaimana mitigasinya?
> Dalam kondisi Suilens saat ini, ketika pelanggan mencoba membuat pesanan melalui sistem, sistem akan memanggil Inventory Service secara synchronous. Ketika order service menerima request untuk melakukan pemesanan lensa, API pada inventory service dipanggil secara synchronous yang akan menyebabkan Timeout/Connection refused akibat Inventory service yang sedang down dan tidak memberikan response. Hal ini adalah salah satu contoh dari Single Point of Failure dimana salah satu fitur mengalami kegagalan dan merambat kepada fitur-fitur lainnya

> Salah satu mitigasi yang dapat diterapkan dalam kasus ini, adalah dengan mengubah transaksi menjadi asynchronous. RabbitMQ menjadi salah satu solusi yang dapat digunakan dalam kasus ini. Sama seperti proses pembatalan pada Order dan Inventory service, dengan menggunakan RabbitMQ saat pemesanan lensa. Dimana order service akan memberikan pesan kepada RabbitMQ, dan Inventory service akan menerima pesan tersebut untuk melakukan perubahan pada databasenya. Ketika Inventory Service down maka RabbitMQ akan menaro pesan dari Order kedalam queue dan menunggu Inventory Service kembali online untuk menerima pesan tersebut.

#### (d) Trade-off apa yang Anda buat? Apakah ada pendekatan alternatif?
> Salah satu trade-off adalah dari penerapan inventory dan Order service suilens secara service terpisah. Pemisahan ini menimbulkan kompleksitas infrastruktur, dimana harus memantau docker container terpisah, mengatur jaringan agar container dapat saling berkomunikasi, serta mengimplementasikan RabbitMQ untuk menangani adanya kegagalan pesan yang terkirim, serta proses debugging yang lebih sulit. Dari implementasi microservice ini mendapatkan Fault Issolation, dimana jika salah satu service mengalami kegagalan/down, maka layanan lain tetap dapat berjalan tanpa masalah.

> Pendekatan alternatif yang tersedia adalah dengan implementasi sistem secara monolith. Dimana keunggulan pendekatan ini adalah sistem yang jauh lebih simpel. Tidak membutuhkan docker container yang banyak serta mengatur masing-masing jaringannya. Proses debugging yang jauh lebih mudah, serta kemudahan untuk mengubah data dari berbagai tabel dalam satu transaksi, dan jika terdapat kegagalan maka akan terjadi rollback pada seluruh transaksi data. Namun dengan dihilangkannya RabbitMQ, ketika salah satu service mengalami masalah maka seluruh system akan ikut down akibat tidak adanya Fault Issolation. 

### Asumsi Implementasi:
1. Sistem yang digunakan saat ini, adalah untuk digunakan dari customer
2. Karena tidak ada implementasi Auth saat ini, maka diasumsikan bahwa user berhasil login, dan ketika melihat pesanan lensa yang dimiliki, adalah milik user tersebut.

### Disclosure Penggunaan AI:
1. Saya menggunakan AI dalam membantu saya memahami lebih lanjut penerapan microservice ini
2. Saya menggunakan AI dalam membantu saya memahami bagaimana integrasi RabbitMQ bekerja
3. Saya menggunakan AI dalam membantu saya membuat frontend

