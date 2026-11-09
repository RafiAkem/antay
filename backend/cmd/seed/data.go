package main

// Hash bcrypt dari admin123 dan petugas123. Disimpan sebagai konstanta supaya
// program seed tidak perlu menambah dependency x/crypto ke modul ini.
const (
	adminHash = "$2a$10$cSFtobPS9WdK8HmqzAU0CuTL7lCYPDY0PHO4lCopWhFvlTpRDXtfm"
	staffHash = "$2a$10$5xkdoXxLMPIC/xzfDglMUesnvkJvZVteXYruM.75WXDPowjQ7rR7u"
)

const ticketAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

type eventSeed struct {
	prefix, name, place, item, requirement              string
	open, close, slotMinutes, capacity, counters, wait int32
	serviceSeconds                                      int32
}

var eventSeeds = []eventSeed{
	{
		prefix: "GL", name: "Penukaran Gelang Laga Kandang", place: "Sawarga Courtyard",
		item: "Gelang laga", requirement: "E-ticket + KTP sesuai nama",
		open: 600, close: 900, slotMinutes: 30, capacity: 60, counters: 3,
		serviceSeconds: 72, wait: 34,
	},
	{
		prefix: "RF", name: "Pengambilan Race Pack Lari", place: "Atrium utama",
		item: "Race pack (BIB + jersey)", requirement: "Bukti registrasi + KTP",
		open: 600, close: 1200, slotMinutes: 30, capacity: 40, counters: 3,
		serviceSeconds: 90, wait: 16,
	},
	{
		prefix: "MG", name: "Meet & Greet Maskot Anak", place: "Atrium timur",
		item: "Gelang meet & greet", requirement: "E-ticket + KTP orang tua",
		open: 780, close: 1020, slotMinutes: 20, capacity: 25, counters: 1,
		serviceSeconds: 150, wait: 0,
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
