// Edit these values. This file is public: put no secrets here.
// (Your contact email goes in the CONTACT_EMAIL GitHub Secret, so only link holders see it.)
window.AVAILABILITY_CONFIG = {
  ownerName: { en: "Nattawat Pinrath", th: "ณัฐวัฒน์ พิณรัตน์" },
  defaultLang: "en", // "en" or "th"

  tzOffset: "+07:00", // Thailand time

  workDays: [1, 2, 3, 4, 5], // 0=Sun 1=Mon ... 6=Sat
  workHours: [
    { start: "09:00", end: "12:00" },
    { start: "13:00", end: "20:00" }, // 12:00-13:00 shows as lunch
  ],
  daysAhead: 30, // how far ahead people can look
  autoRefreshMinutes: 5, // reload the data while the page is open
};
