# Antay

*Ngantay mah santai.* Prototipe sistem penukaran tiket dan check-in untuk event di Summarecon Mall Bandung, dibuat untuk Bandung Build Challenge 2026.

Semua event, nama, dan angka di prototipe adalah data contoh, bukan layanan resmi Summarecon.

## Isi

| Halaman | Untuk | Fungsi |
|---|---|---|
| `#pengunjung` | Pengunjung event | Pilih slot jam datang, dapat tiket dengan kode + QR, lihat status antrean |
| `#petugas` | Petugas loket | Cek kode, cocokkan KTP, tolak tiket dobel/salah event, kamera AI + Jev |
| `#papan` | Layar TV di lokasi | Jumlah antre, perkiraan tunggu, loket buka, kondisi antrean dari AI |
| `#dasbor` | Manajemen mal | Statistik per slot, semua event, buat event baru |

## Menjalankan

Butuh Node.js 20 atau lebih baru. Tidak ada dependency yang perlu di-install.

```bash
cp .env.example .env   # lalu isi TYPESAFE_API_KEY
npm start              # atau: node server.mjs
```

Buka http://localhost:4173 di Chrome. Untuk layar TV, buka `http://localhost:4173/#papan` di jendela kedua.

Tanpa `TYPESAFE_API_KEY`, aplikasi tetap jalan; hanya penilaian Jev yang nonaktif.

## AI di dalamnya

- **Hitung orang (COCO-SSD, di browser):** model `mobilenet_v2`, deteksi di frame penuh + 4 potongan supaya orang jauh ikut terdeteksi, angka antrean = median 5 hitungan terakhir. Tanpa pengenalan wajah, video tidak disimpan.
- **Jev (`jev-1.14.0`, TypeSafe):** tiap 3 detik menilai kepadatan (kosong–meluber), antrean meluber, dan orang terjatuh dari frame kamera. Dipanggil lewat `server.mjs` supaya API key tidak pernah sampai ke browser. Biaya sekitar $0,09 per jam pada 1 frame per 3 detik.
- **Kode biasa:** perkiraan tunggu = antre × menit per orang ÷ loket; saran buka loket saat tunggu > 15 menit.

## Catatan

- Data tersimpan di `localStorage` browser, jadi satu perangkat saja (beberapa tab di laptop yang sama ikut sinkron).
- Di link artifact claude.ai, kamera diblokir, jadi antrean dihitung manual.
- Frame kamera dikirim ke API TypeSafe saat Jev aktif. Untuk pemakaian di mal sungguhan perlu izin dan pemberitahuan ke pengunjung (UU PDP).
- Belum ada: sinkron antar perangkat, scan QR di loket, asisten WhatsApp, batas area hitung (ROI).
