# หน้าแสดงเวลาว่าง + ลิงก์ชั่วคราว (GitHub Pages)

หน้าเว็บแสดงเวลา **ว่าง / ไม่ว่าง** รายชั่วโมงจากปฏิทินของคุณ (จ.–ศ. 09:00–20:00) เปิดดูได้ **เฉพาะคนที่มีลิงก์ชั่วคราว** ที่คุณสร้างให้ ลิงก์หมดอายุตามเวลาที่ตั้ง หรือยกเลิกเองได้

```
ปฏิทิน (.ics ลับ) ─► GitHub Actions ทุก 30 นาที ─► เข้ารหัสแยกตามลิงก์ที่ยังไม่หมดอายุ ─► GitHub Pages
                                                    ▲ links.json (id + วันหมดอายุ)
ผู้ที่ได้ลิงก์  https://…/#<id>.<กุญแจ>  ─► ถอดรหัสในเบราว์เซอร์ ─► เห็นเวลาว่าง
```

**ความสามารถ**
- ปฏิทินรายสัปดาห์ + สรุปเวลาว่าง (Next available, รายวัน) + ตัวเลือกสัปดาห์แบบปฏิทินรายเดือน + ปุ่ม Today
- คลิกช่วงว่าง → ปุ่ม **Request by email** (เปิดอีเมลถึงคุณ พร้อมวันเวลา)
- ปุ่มคัดลอกลิงก์ไปสัปดาห์ที่กำลังดู (`?week=YYYY-MM-DD`)
- สลับภาษา EN / TH, ปุ่ม Refresh และอัปเดตเองทุก 5 นาทีขณะเปิดหน้า
- **ปุ่ม ⚙ Admin (ล็อกด้วยรหัสผ่าน)**: สร้างลิงก์ชั่วคราว (1 วัน – 1 ภาคการศึกษา หรือเลือกวัน), ดู/ยกเลิกลิงก์, QR code, พิมพ์ป้าย QR ติดหน้าห้อง, ปุ่มซิงก์ปฏิทินทันที

**ความปลอดภัย**
- ไม่มีไฟล์ข้อมูลสาธารณะเลย: ข้อมูลเวลาถูกเข้ารหัส (AES-256-GCM) แยกไฟล์ต่อลิงก์
- กุญแจอยู่หลัง `#` ในลิงก์ เบราว์เซอร์ไม่ส่งส่วนนี้ไปที่เซิร์ฟเวอร์
- พอหมดอายุหรือถูกยกเลิก ไฟล์ของลิงก์นั้นจะไม่ถูก deploy ในรอบถัดไป (ภายใน ~30 นาทีหลังหมดเวลา หรือ ~2 นาทีหลังกด Revoke) และหน้าเว็บก็ปฏิเสธลิงก์ที่เลยเวลาเองด้วย
- ไม่มีชื่อนัด สถานที่ หรือผู้เข้าร่วมในข้อมูล มีแค่เวลาเริ่ม-จบ
- ข้อจำกัด: คนที่ได้ลิงก์ไปสามารถบันทึกภาพหน้าจอไว้ได้ แต่จะไม่เห็นข้อมูลใหม่หลังลิงก์หมดอายุ

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `site/config.js` | **แก้ไฟล์นี้**: ชื่อ (EN/TH), ภาษาเริ่มต้น, วัน/ช่วงเวลา, ดูล่วงหน้ากี่วัน |
| `site/index.html`, `app.js`, `style.css` | หน้าดูเวลาว่าง (หลังแก้ ให้เปลี่ยนเลข `?v=` ใน html) |
| `site/admin.html`, `admin.js` | หน้าจัดการลิงก์ (ล็อกด้วยรหัสผ่าน) |
| `site/admin-lock.json` | token + link secret ที่เข้ารหัสด้วยรหัสผ่าน admin (สร้างอัตโนมัติตอน setup) |
| `links.json` | รายการลิงก์ (มีแค่ id และวันหมดอายุ ไม่มีกุญแจ) แก้ผ่าน admin.html |
| `scripts/fetch_busy.py` | อ่านปฏิทิน .ics → `build/busy.json` (ไม่ถูก publish ตรง ๆ) |
| `scripts/publish_links.py` | เข้ารหัสข้อมูลให้แต่ละลิงก์ → `site/d/<id>.bin` |
| `scripts/make_link.py` | สร้างลิงก์จาก command line (ทางเลือกแทน admin.html) |
| `.github/workflows/deploy.yml` | ซิงก์ + เข้ารหัส + deploy ทุก 30 นาที และทุกครั้งที่ push |

## ติดตั้งบน GitHub (ประมาณ 15 นาที)

### 1. เอาลิงก์ .ics ลับของปฏิทิน

**Google Calendar**: calendar.google.com → ⚙ การตั้งค่า → เลือกปฏิทินทางซ้าย → *ผสานรวมปฏิทิน (Integrate calendar)* → คัดลอก **ที่อยู่ลับในรูปแบบ iCal** (ทำทุกปฏิทินที่ต้องการรวม: Nattawat, ผู้ช่วยอธิการบดี, CCS Director; ถ้าเป็นปฏิทินที่คุณมีสิทธิ์แค่ดู อาจต้องให้เจ้าของปฏิทินส่งลิงก์ให้)

**Outlook / Microsoft 365**: outlook.office.com → ⚙ → ปฏิทิน → *ปฏิทินที่แชร์* → *เผยแพร่ปฏิทิน* → เลือก **"สามารถดูเมื่อฉันไม่ว่าง"** → คัดลอกลิงก์ **ICS**

> ⚠️ ลิงก์ .ics ใครได้ไปจะอ่านปฏิทินคุณได้ **ห้ามใส่ในไฟล์ใด ๆ ใน repo** ใส่ใน Secrets เท่านั้น

### 2. สร้าง repo และอัปโหลดไฟล์

github.com → **New repository** เช่นชื่อ `availability` → **Public** (Pages ฟรีใช้กับ repo สาธารณะ; ในไฟล์ไม่มีข้อมูลลับ) แล้วอัปโหลดไฟล์ทั้งหมด

```bash
git init && git add . && git commit -m "Availability page"
git branch -M main
git remote add origin https://github.com/<username>/availability.git
git push -u origin main
```

### 3. ใส่ Secrets

repo → **Settings → Secrets and variables → Actions → New repository secret**

| Name | ค่า |
|---|---|
| `ICS_URLS` | ลิงก์ .ics (หลายอันคั่นด้วยการขึ้นบรรทัดใหม่) |
| `LINK_SECRET` | ข้อความสุ่มยาว ๆ — สร้างใน Terminal: `python3 -c "import secrets;print(secrets.token_urlsafe(32))"` แล้วเก็บไว้ (ต้องใช้อีกครั้งในขั้นที่ 6) |
| `CONTACT_EMAIL` | อีเมลที่ให้คนขอนัด (เฉพาะคนมีลิงก์เห็น) — ไม่ใส่ก็ได้ ปุ่ม Request จะซ่อน |

### 4. เปิด GitHub Pages

**Settings → Pages → Source: GitHub Actions**

### 5. สร้าง GitHub token สำหรับหน้า admin

github.com → รูปโปรไฟล์ → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
- Repository access: **Only select repositories** → เลือก repo นี้เท่านั้น
- Permissions: **Contents: Read and write**, **Actions: Read and write**
- ตั้งวันหมดอายุตามสะดวก (เช่น 1 ปี)

### 6. ตั้งค่าหน้า admin (ครั้งเดียว)

เปิดหน้าเว็บ → กดปุ่ม **⚙ Admin** มุมขวาบน → จะขึ้นหน้า **First-time setup**
- Repository กรอกให้อัตโนมัติ
- วาง token จากขั้นที่ 5
- Link secret: วาง **ค่าเดียวกับ** `LINK_SECRET` ในขั้นที่ 3 (อย่ากด New)
- ตั้ง **รหัสผ่าน admin** (อย่างน้อย 10 ตัวอักษร) → **Save**

token และ link secret จะถูก **เข้ารหัสด้วยรหัสผ่านนี้** แล้วเก็บไว้ในเว็บ (`site/admin-lock.json`) ครั้งต่อไปใช้แค่รหัสผ่าน จากเครื่องไหนก็ได้

### 7. สร้างลิงก์

เลือกระยะเวลา → ใส่ว่าให้ใคร (ไม่บังคับ) → **Generate link** → รอ ~1–2 นาทีจนขึ้น "✓ The link is live" → Copy ส่งให้คนที่จะนัด หรือ **Print QR sign** ติดหน้าห้อง (แนะนำแบบ Semester)

> ถ้าเปลี่ยน `LINK_SECRET` ลิงก์ทั้งหมดที่เคยสร้างจะใช้ไม่ได้ทันที (ใช้เป็นปุ่มฉุกเฉินได้)

### เข้าหน้า admin ครั้งต่อไป

กดปุ่ม **⚙ Admin** มุมขวาบนของหน้าเวลาว่าง (หรือเปิด `…/admin.html`) → ใส่รหัสผ่าน → **Unlock**
- ปลดล็อกค้างไว้จนปิดแท็บ หรือกด **Lock**
- **Settings** — เปลี่ยน token / link secret / รหัสผ่าน
- **Preview my page** — เปิดหน้าเวลาว่างด้วยลิงก์ที่ยังใช้ได้นานที่สุด
- ชื่อผู้รับลิงก์ ("Who is it for?") ถูกเข้ารหัสเก็บใน `links.json` จึงเห็นได้จากทุกเครื่องที่ปลดล็อก

> ⚠️ ไฟล์ล็อกอยู่บนเว็บสาธารณะ (เข้ารหัสแบบ PBKDF2 600,000 รอบ + AES-256) ความปลอดภัยขึ้นกับรหัสผ่าน: ใช้รหัสยาว ๆ ที่ไม่ได้ใช้ที่อื่น เช่น วลี 4–5 คำ ถ้าสงสัยว่ารหัสหลุด ให้กด Settings เปลี่ยนรหัสผ่าน และสร้าง GitHub token ใหม่ (ลบอันเก่าทิ้ง)
>
> ลืมรหัสผ่าน: ลบไฟล์ `site/admin-lock.json` ใน repo แล้วเข้า Admin ใหม่ จะขึ้นหน้า First-time setup (ใช้ link secret เดิมได้ ลิงก์เก่ายังใช้ได้)

## ปรับแต่ง

แก้ `site/config.js` แล้ว commit ระบบจะ deploy ใหม่เอง
- `ownerName` — ชื่อ EN / TH, `defaultLang` — ภาษาเริ่มต้น
- `workDays`, `workHours` — วันและช่วงเวลาที่แสดง (พักเที่ยง 12:00–13:00)
- `daysAhead` — ให้ดูล่วงหน้ากี่วัน, `autoRefreshMinutes` — อัปเดตเองทุกกี่นาที
- ชั่วโมงที่มีนัดแม้บางส่วนนับว่าไม่ว่างทั้งชั่วโมง; นัดที่ตั้งเป็น "ว่าง (Free)" ในปฏิทินไม่นับ

## ทดสอบในเครื่อง

```bash
pip install -r scripts/requirements.txt
ICS_URLS=sample/sample.ics python scripts/fetch_busy.py
export LINK_SECRET=$(python -c "import secrets;print(secrets.token_urlsafe(32))")
python scripts/make_link.py 7          # พิมพ์ลิงก์ทดสอบ (เพิ่มลง links.json)
python scripts/publish_links.py
cd site && python -m http.server 8765
```
เปิดลิงก์ที่พิมพ์ออกมา (http://localhost:8765/#…) — อย่าลืมคืน `links.json` ก่อน commit

## ข้อจำกัดที่ควรรู้

- ข้อมูลล่าช้าได้ ~30 นาที บวกเวลาที่ Google/Outlook อัปเดตลิงก์ .ics (กด *Sync calendar now* ในหน้า admin เพื่อซิงก์ทันที)
- GitHub จะหยุด workflow ตามเวลาถ้า repo ไม่มีความเคลื่อนไหว 60 วัน — การสร้าง/ยกเลิกลิงก์นับเป็นความเคลื่อนไหว หรือกด *Enable workflow* ในแท็บ Actions
- `links.json` อยู่ใน repo สาธารณะ: เห็นได้ว่ามีกี่ลิงก์และหมดอายุเมื่อไร แต่ไม่มีกุญแจ และชื่อผู้รับถูกเข้ารหัสไว้
