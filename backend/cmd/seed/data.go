package main

// Hash bcrypt dari admin123 dan petugas123. Akun yang lebih baru di-hash saat
// seed jalan, karena x/crypto sekarang memang sudah jadi dependency modul.
const (
	adminHash = "$2a$10$cSFtobPS9WdK8HmqzAU0CuTL7lCYPDY0PHO4lCopWhFvlTpRDXtfm"
	staffHash = "$2a$10$5xkdoXxLMPIC/xzfDglMUesnvkJvZVteXYruM.75WXDPowjQ7rR7u"
)

const ticketAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

const organizerName = "Summarecon Mall Bandung Events"

type packageSeed struct {
	name  string
	pax   int32
	price int64
}

// categorySeed: seated true artinya quota dibiarkan kosong; kursinya dipasang
// lewat denah, bukan di seed ini.
type categorySeed struct {
	name, description string
	seated            bool
	quota             int32
	packages          []packageSeed
}

type eventSeed struct {
	// key dipakai manifest media: newyear, runfest, persib, mascot.
	key                                                 string
	prefix, name, place, item, requirement, description string
	// date kosong artinya hari ini di Jakarta, supaya demo selalu punya slot terbuka.
	date                                               string
	open, close, slotMinutes, capacity, counters, wait int32
	serviceSeconds                                     int32
	feeBP                                              int32
	// saleEnds dalam WIB, format "2006-01-02 15:04". Kosong artinya sampai jam
	// tutup penukaran di hari event.
	saleEnds string
	// sampleTickets mengisi tiket versi 1 supaya papan antrean dan dasbor tidak kosong.
	sampleTickets bool
	categories    []categorySeed
}

func trio(single, couple, group int64) []packageSeed {
	return []packageSeed{
		{name: "Single", pax: 1, price: single},
		{name: "Couple", pax: 2, price: couple},
		{name: "Group", pax: 3, price: group},
	}
}

var eventSeeds = []eventSeed{
	{
		key: "persib", prefix: "GL", name: "Penukaran Gelang Laga Kandang", place: "Sawarga Courtyard",
		item: "Gelang laga", requirement: "E-ticket + KTP sesuai nama",
		description: "Tukarkan e-ticket laga kandang dengan gelang masuk stadion. Datang sesuai jam yang dipilih supaya antrean tidak menumpuk.",
		open:        480, close: 1260, slotMinutes: 30, capacity: 60, counters: 3,
		serviceSeconds: 72, wait: 34, sampleTickets: true,
		categories: []categorySeed{
			{name: "Tribun Timur", description: "Tribun berdiri sisi timur.", quota: 300, packages: trio(75000, 140000, 200000)},
			{name: "VIP Barat", description: "Tribun VIP sisi barat, dekat bangku pemain.", quota: 80, packages: trio(150000, 280000, 400000)},
		},
	},
	{
		key: "runfest", prefix: "RF", name: "Pengambilan Race Pack Lari", place: "Atrium utama",
		item: "Race pack (BIB + jersey)", requirement: "Bukti registrasi + KTP",
		description: "Ambil race pack berisi BIB dan jersey. Bawa bukti registrasi dan KTP pelari.",
		open:        480, close: 1260, slotMinutes: 30, capacity: 40, counters: 3,
		serviceSeconds: 90, wait: 16, sampleTickets: true,
		categories: []categorySeed{
			{name: "5K", description: "Kategori 5 kilometer.", quota: 400, packages: []packageSeed{{name: "Single", pax: 1, price: 175000}}},
			{name: "10K", description: "Kategori 10 kilometer.", quota: 300, packages: []packageSeed{{name: "Single", pax: 1, price: 225000}}},
		},
	},
	{
		key: "mascot", prefix: "MG", name: "Meet & Greet Maskot Anak", place: "Atrium timur",
		item: "Gelang meet & greet", requirement: "E-ticket + KTP orang tua",
		description: "Foto bareng maskot favorit anak. Satu sesi foto untuk anak, orang tua boleh ikut di paket Couple.",
		open:        480, close: 1260, slotMinutes: 20, capacity: 25, counters: 1,
		serviceSeconds: 150, wait: 0, sampleTickets: true,
		categories: []categorySeed{
			{name: "Sesi Foto", description: "Satu kali foto bersama maskot.", quota: 120, packages: []packageSeed{
				{name: "Single", pax: 1, price: 50000},
				{name: "Couple (Anak + Ortu)", pax: 2, price: 90000},
			}},
		},
	},
	{
		key: "newyear", prefix: "NY", name: "Malam Tahun Baru Summaba 2027", place: "Sawarga Courtyard",
		item: "Gelang masuk", requirement: "E-ticket + KTP",
		description: "Rayakan pergantian tahun di Sawarga Courtyard dengan panggung musik dan hitung mundur bersama. Gelang masuk ditukar di loket mulai 18.00.",
		date:        "2026-12-31", open: 1080, close: 1410, slotMinutes: 30, capacity: 100, counters: 4,
		serviceSeconds: 60, wait: 0, feeBP: 200, saleEnds: "2026-12-31 18:00",
		categories: []categorySeed{
			{name: "VIP A", description: "Kursi paling depan menghadap panggung.", seated: true, packages: trio(750000, 1400000, 2025000)},
			{name: "VIP B", description: "Kursi baris tengah.", seated: true, packages: trio(550000, 1000000, 1450000)},
			{name: "VIP C", description: "Kursi baris belakang.", seated: true, packages: trio(400000, 750000, 1050000)},
			{name: "Festival", description: "Area berdiri di depan panggung.", quota: 600, packages: trio(250000, 450000, 650000)},
		},
	},
}

var visitorNames = []string{
	"Rizky Pratama", "Siti Nurhaliza", "Budi Santoso", "Dewi Lestari",
	"Agus Setiawan", "Putri Ramadhani", "Andi Wijaya", "Maya Sari",
	"Fajar Nugroho", "Intan Permata", "Hendra Gunawan", "Lina Marlina",
	"Yoga Pratama", "Nadia Safitri", "Reza Maulana", "Ayu Wulandari",
	"Dimas Saputra", "Rani Oktaviani", "Bayu Kurniawan", "Sari Melati",
	"Taufik Hidayat", "Fitri Handayani", "Eko Prasetyo", "Wulan Anggraini",
}
