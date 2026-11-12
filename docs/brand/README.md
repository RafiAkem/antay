# Panduan Logo SummaPass

Satu halaman ini cukup untuk memakai logo dengan benar di aplikasi, media sosial, dan cetakan.

## Idenya

Simbolnya huruf S yang dipotong dari sebuah tiket. Dua ujung S adalah sudut tiket yang dilubangi
(potongan cekung di kanan atas dan kiri bawah). Itu satu detail yang membuatnya milik SummaPass,
jadi jangan dihaluskan atau dihilangkan.

Wordmark memakai Plus Jakarta Sans ExtraBold (lisensi OFL, boleh untuk logo) yang sudah diubah jadi
outline. Jangan mengetik ulang kata "SummaPass" dengan font. Pakai berkas yang tersedia.

## Berkas

| Berkas | Dipakai untuk |
|---|---|
| `summapass-symbol.svg` | Simbol utama, biru |
| `summapass-symbol-ink.svg`, `-black.svg` | Satu warna di atas latar terang |
| `summapass-symbol-reversed.svg` | Putih di atas latar gelap (batangnya sedikit ditipiskan supaya tidak terlihat gemuk) |
| `summapass-symbol-white.svg` | Putih dengan bentuk sama persis dengan master (untuk cetak satu warna, emboss, dan sejenisnya) |
| `summapass-symbol-small.svg` | Simbol ukuran kecil, 16 sampai 32 px, tepinya sudah pas di grid piksel |
| `summapass-tile.svg` | S putih di kotak biru, untuk ikon aplikasi dan avatar |
| `summapass-tile-small.svg` | Versi kotak untuk tab browser 16 sampai 48 px (sumber favicon) |
| `summapass-horizontal.svg` | Lockup utama: simbol biru, tulisan ink |
| `summapass-horizontal-white.svg`, `-on-night.svg` | Lockup putih untuk latar gelap (yang kedua sudah termasuk latar night) |
| `summapass-horizontal-black.svg` | Lockup hitam satu warna |
| `summapass-stacked.svg`, `-white.svg` | Lockup bertumpuk untuk ruang yang sempit dan tinggi |
| `summapass-mark-inline.svg` | Simbol `currentColor` untuk ditempel langsung di komponen React |
| `web/` | Favicon, ikon PWA, manifest, dan potongan `<head>` |

## Warna

| Nama | HEX | RGB | Peran |
|---|---|---|---|
| Biru SummaPass | `#1747e6` | 23 71 230 | Warna simbol, tombol utama, tile ikon |
| Ink | `#0b1620` | 11 22 32 | Wordmark dan teks di latar terang |
| Night | `#08131b` | 8 19 27 | Latar gelap |
| Ground | `#fafbfb` | 250 251 251 | Latar terang |
| Putih | `#ffffff` | 255 255 255 | Logo di atas biru atau night |

Kontras biru di atas putih sekitar 6,8 : 1, aman. Biru di atas night hanya sekitar 2,8 : 1, jadi di latar
gelap logo selalu putih. Untuk cetak, nilai CMYK dan Pantone belum ditetapkan. Minta percetakan mencocokkan
`#1747e6` dengan proof dulu, jangan konversi otomatis.

## Ruang kosong

Ukurannya pakai **X = tebal satu batang mendatar pada S** (kira-kira seperlima tinggi simbol).

- Di sekeliling simbol: minimal 1X di semua sisi.
- Di sekeliling lockup horizontal dan bertumpuk: minimal 1X dari tepi terluar simbol dan tulisan.
- Jarak simbol ke tulisan di lockup sudah dikunci di berkasnya. Jangan digeser.

## Ukuran minimum

| Bentuk | Layar | Cetak |
|---|---|---|
| Simbol master | 24 px tinggi | 6 mm |
| Simbol di bawah 24 px | pakai `summapass-symbol-small.svg` atau `summapass-tile-small.svg` | |
| Lockup horizontal | simbol 20 px tinggi (lockup sekitar 90 px lebar) | 25 mm lebar |
| Lockup bertumpuk | 48 px tinggi | 15 mm tinggi |

Di header aplikasi, simbol 26 px di samping tulisan "SummaPass" sudah nyaman dibaca.

## Latar yang boleh

- **Ground atau putih:** simbol biru dengan tulisan ink. Ini versi utama.
- **Biru `#1747e6`:** semua putih.
- **Night atau gelap lainnya:** pakai versi reversed (putih). Jangan biru.
- **Foto:** hanya di area yang tenang dan rata. Kalau fotonya ramai, pakai tile (S putih di kotak biru).
- **Tab browser:** favicon memakai versi kotak, jadi tetap terbaca di tema terang maupun gelap.

## Yang tidak boleh

- Mengubah warna simbol di luar daftar di atas, atau memberi gradien, bayangan, glow, dan outline.
- Membuang atau menghaluskan dua sudut cekung pada S. Tanpa itu, S-nya jadi S biasa.
- Memutar, memiringkan, mencerminkan, atau menarik logo sampai gepeng.
- Mengetik ulang "SummaPass" dengan font lain atau mengubah jarak hurufnya.
- Menukar posisi simbol dan tulisan, atau mengubah perbandingan ukurannya.
- Menaruh simbol biru di atas latar gelap atau di atas foto yang ramai.
- Memakai simbol master di bawah 24 px. Untuk ukuran sekecil itu sudah ada versi kecilnya.
- Menaruh simbol di dalam lingkaran atau bentuk lain selain tile resmi.

## Catatan

- Logo ini belum melewati pengecekan merek dagang. Sebelum dipakai resmi, cek dulu di pangkalan data merek
  DJKI dan lakukan pencarian gambar terbalik.
- Berkas master hanya berupa path vektor: tidak ada teks hidup, gambar raster, atau filter.
