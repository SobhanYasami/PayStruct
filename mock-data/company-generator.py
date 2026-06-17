import json
import random

# لیست‌های پایه برای تولید نام‌های تصادفی و واقع‌گرایانه
first_names_male = ["امیرحسین", "علیرضا", "محمد", "علی", "حسین", "رضا", "مسعود", "حامد", "سعید", "جواد", "امین", "مهدی", "سینا", "فرزاد", "امید"]
first_names_female = ["مهسا", "سارا", "نیلوفر", "زهرا", "مریم", "الهام", "فاطمه", "نسرین", "آرزو", "کیمیا", "رویا", "عاطفه", "صبا", "شیما", "یکتا"]
first_names = first_names_male + first_names_female

last_names = ["رضایی", "احمدی", "کریمی", "محمدی", "حسینی", "صادقی", "مرادی", "حیدری", "موسوی", "قنبری", "نظری", "توکلی", "ابراهیمی", "زارعی", "سلیمانی", "اکبری", "قاسمی", "محمودی", "طاهری", "صفری", "فلاحی", "نوری", "هاشمی", "اسدی", "خسروی", "شفیعی", "ملکی", "رحیمی", "صادقیان", "فرهمند"]

# شمارنده سراسری برای ID کارمندان
global_employee_id = 1

def generate_employees(count):
    global global_employee_id
    employees = []
    for _ in range(count):
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        # تولید ایمیل منحصر به فرد با استفاده از ID برای جلوگیری از تکرار
        email = f"{random.choice(['a', 'm', 's', 'z', 'r', 'f'])}_{ln.replace(' ', '')}{global_employee_id}@example.com"
        
        # تولید کد ملی صوری ۱۰ رقمی با فرمت درست
        national_id = f"00{random.randint(10000000, 99999999)}"[:10]
        # تولید شماره تلفن
        phone_number = f"0912{random.randint(1000000, 9999999)}"
        # پسورد تستی
        password = f"Pass_{random.randint(1000, 9999)}!"
        
        employees.append({
            "id": global_employee_id,
            "first_name": fn,
            "last_name": ln,
            "email": email,
            "password": password,
            "national_id": national_id,
            "phone_number": phone_number
        })
        global_employee_id += 1
    return employees

# ساختار هلدینگ‌ها و شرکت‌های زیرمجموعه
companies_data = [
    {
        "company_name": "هلدینگ فناوری اطلاعات پارسیان",
        "registration_number": "45218",
        "subsidiaries": [
            {"company_name": "توسعه نرم‌افزار رایان‌گستر", "registration_number": "51024"},
            {"company_name": "امنیت شبکه دژافزار", "registration_number": "51025"},
            {"company_name": "داده‌پردازی ابری آسمان", "registration_number": "51026"},
            {"company_name": "هوش مصنوعی دانا", "registration_number": "51027"},
            {"company_name": "پشتیبانی فنی رایان‌سرویس", "registration_number": "51028"}
        ]
    },
    {
        "company_name": "گروه صنعتی فولاد البرز",
        "registration_number": "32154",
        "subsidiaries": [
            {"company_name": "نورد و ذوب آهن شمال", "registration_number": "39401"},
            {"company_name": "صنایع گالوانیزه فجر", "registration_number": "39402"},
            {"company_name": "معدن‌کاوی سنگ‌آهن شرق", "registration_number": "39403"},
            {"company_name": "لجستیک و حمل‌ونقل سنگین البرز", "registration_number": "39404"},
            {"company_name": "توسعه سازه‌های فلزی کاوه", "registration_number": "39405"}
        ]
    },
    {
        "company_name": "شرکت سرمایه‌گذاری دارویی شفا",
        "registration_number": "78412",
        "subsidiaries": [
            {"company_name": "داروسازی اکسیر سلامت", "registration_number": "82110"},
            {"company_name": "تولید مواد اولیه شیمیایی پارس", "registration_number": "82111"},
            {"company_name": "پخش و توزیع دارویی هجرت", "registration_number": "82112"},
            {"company_name": "گیاهان دارویی سینا", "registration_number": "82113"},
            {"company_name": "تجهیزات پزشکی زیست‌فناور", "registration_number": "82114"}
        ]
    },
    {
        "company_name": "صنایع غذایی بهار کاشان",
        "registration_number": "12569",
        "subsidiaries": [
            {"company_name": "فرآورده‌های لبنی پاک‌شیر", "registration_number": "18450"},
            {"company_name": "کشت و صنعت بهارستان", "registration_number": "18451"},
            {"company_name": "بسته‌بندی و کارتن‌سازی صدف", "registration_number": "18452"},
            {"company_name": "تولید روغن نباتی آفتاب", "registration_number": "18453"},
            {"company_name": "بازرگانی و صادرات بهار کیش", "registration_number": "18454"}
        ]
    },
    {
        "company_name": "گروه ساختمانی و عمران ارگ",
        "registration_number": "95142",
        "subsidiaries": [
            {"company_name": "مهندسین مشاور سازه پایدار", "registration_number": "99601"},
            {"company_name": "صنایع سیمان ایلام", "registration_number": "99602"},
            {"company_name": "انبوه سازی مسکن فردا", "registration_number": "99603"},
            {"company_name": "راه‌سازی و زیرساخت آکام", "registration_number": "99604"},
            {"company_name": "تولید بتن آماده آپادانا", "registration_number": "99605"}
        ]
    },
    {
        "company_name": "هلدینگ انرژی و پتروشیمی کارون",
        "registration_number": "63258",
        "subsidiaries": [
            {"company_name": "پتروشیمی توسعه جنوب", "registration_number": "67100"},
            {"company_name": "پالایش نفت ستاره ساحل", "registration_number": "67101"},
            {"company_name": "تولید روان‌کارهای صنعتی پیشرو", "registration_number": "67102"},
            {"company_name": "انرژی‌های تجدیدپذیر تابش", "registration_number": "67103"},
            {"company_name": "حفر چاه‌های نفتی اروند", "registration_number": "67104"}
        ]
    },
    {
        "company_name": "شرکت بازرگانی و تجارت بین‌الملل آسیا",
        "registration_number": "54128",
        "subsidiaries": [
            {"company_name": "ترخیص کالا و خدمات گمرکی سریع", "registration_number": "58920"},
            {"company_name": "کشتیرانی و حمل دریایی اقیانوس", "registration_number": "58921"},
            {"company_name": "مدیریت زنجیره تامین کاسپین", "registration_number": "58922"},
            {"company_name": "توسعه تجارت الکترونیک مرزنشین", "registration_number": "58923"},
            {"company_name": "سرمایه‌گذاری ارزی هما", "registration_number": "58924"}
        ]
    },
    {
        "company_name": "گروه مالی و اعتباری تدبیر",
        "registration_number": "85296",
        "subsidiaries": [
            {"company_name": "کارگزاری بورس تدبیر سهام", "registration_number": "89310"},
            {"company_name": "بیمه کارآفرینان فردا", "registration_number": "89311"},
            {"company_name": "لیزینگ خودرو و تجهیزات مهر", "registration_number": "89312"},
            {"company_name": "صندوق سرمایه‌گذاری مشترک امید", "registration_number": "89313"},
            {"company_name": "مشاوره مالی و ارزیابی ریسک معیار", "registration_number": "89314"}
        ]
    },
    {
        "company_name": "توسعه صنایع معادن مس کرمان",
        "registration_number": "26354",
        "subsidiaries": [
            {"company_name": "استخراج معادن مس سرچشمه", "registration_number": "29140"},
            {"company_name": "تغلیظ و ذوب فلزات کویر", "registration_number": "29141"},
            {"company_name": "صنایع مفتول و سیم مسی ایران", "registration_number": "29142"},
            {"company_name": "اکتشافات معدنی پایا", "registration_number": "29143"},
            {"company_name": "ماشین‌آلات سنگین معدنی راهبر", "registration_number": "29144"}
        ]
    },
    {
        "company_name": "هلدینگ مخابرات و ارتباطات سیار موج",
        "registration_number": "14785",
        "subsidiaries": [
            {"company_name": "اپراتور مجازی ارتباطات نوین", "registration_number": "19520"},
            {"company_name": "توسعه فیبر نوری ضیاء", "registration_number": "19521"},
            {"company_name": "تولید دکل و تجهیزات مخابراتی سینال", "registration_number": "19522"},
            {"company_name": "خدمات ارزش افزوده زنگار", "registration_number": "19523"},
            {"company_name": "مرکز داده و دیتاسنتر امین", "registration_number": "19524"}
        ]
    }
]

# تزریق کارمندان به ساختار داده
for company in companies_data:
    # تولید ۲۰ کارمند برای شرکت اصلی
    company["employees"] = generate_employees(20)
    
    # تولید ۱۵ کارمند برای هر زیرمجموعه
    for sub in company["subsidiaries"]:
        sub["employees"] = generate_employees(15)

# خروجی گرفتن به صورت فایل JSON تمیز با اینکودینگ UTF-8 برای نمایش درست زبان فارسی
with open("companies_with_employees.json", "w", encoding="utf-8") as f:
    json.dump(companies_data, f, ensure_ascii=False, indent=2)

print("فایل companies_with_employees.json با موفقیت و دیتای کامل ۹۵۰ کارمند ساخته شد!")