import json
import random
from datetime import datetime, timedelta

# فرهنگ لغت پروژه‌ها متناسب با حوزه فعالیت شرکت‌ها برای تولید دیتای واقع‌گرایانه
industry_projects = {
    "IT": {
        "categories": ["توسعه نرم‌افزار", "امنیت سایبری", "زیرساخت ابری", "هوش مصنوعی"],
        "names": ["سامانه جامع ERP", "پلتفرم احراز هویت بیومتریک", "مهاجرت به زیرساخت ابری ترکیبی", "موتور پردازش زبان طبیعی", "انبار داده هوشمند", "سیستم کشف تقلب مالی", "اپلیکیشن موبایل سازمانی", "تست نفوذ سراسری شبکه", "سامانه مانیتورینگ متمرکز", "پلتفرم مدیریت زنجیره تامین"],
        "descriptions": ["طراحی و پیاده‌سازی سیستم مدیریت منابع سازمانی به صورت ماژولار.", "توسعه ابزار هوشمند برای احراز هویت کاربران بر اساس ویژگی‌های بیومتریک.", "انتقال سرورهای فیزیکی مجموعه به دیتاسنترهای ابری توزیع‌شده.", "طراحی مدل هوش مصنوعی برای تحلیل پیشرفته متون فارسی.", "ایجاد انبار داده (Data Warehouse) برای یکپارچه‌سازی گزارش‌های مدیریتی.", "پیاده‌سازی الگوریتم‌های یادگیری ماشین جهت شناسایی رفتارهای مشکوک مالی.", "توسعه نسخه اندروید و iOS پرتال خدمات‌رسانی به مشتریان.", "ارزیابی امنیتی جعبه سیاه و جعبه خاکستری بر روی زیرساخت‌های حیاتی.", "راه‌اندازی داشبورد یکپارچه برای رصد لحظه‌ای پایداری سرویس‌ها.", "توسعه سیستم توزیع‌شده برای رهگیری کالا از مبدا تا مقصد."]
    },
    "صنعتی و معدنی": {
        "categories": ["اتوماسیون صنعتی", "بهینه‌سازی خط تولید", "اکتشاف و استخراج", "لجستیک"],
        "names": ["هوشمندسازی خط نورد", "اکتشاف پهنه معدنی جدید", "نوسازی ماشین‌آلات سنگین", "سیستم بازیافت پساب صنعتی", "کاهش مصرف انرژی کوره‌ها", "اتوماسیون انبار قطعات", "توسعه خط ذوب پیشرفته", "کنترل کیفیت مبتنی بر بینایی ماشین", "تامین تجهیزات هیدرولیک", "مدیریت پسماندهای معدنی"],
        "descriptions": ["نصب تجهیزات IoT برای مانیتورینگ خودکار خطوط تولید فولاد.", "عملیات ژئوفیزیک و مغناطیس‌سنجی جهت کشف ذخایر جدید سرمایه‌ای.", "خرید و واردات قطعات یدکی لودرها و دامتراک‌های معدنی غول‌پیکر.", "راه‌اندازی تصفیه‌خانه اختصاصی برای بازگرداندن آب به چرخه تولید.", "اصلاح فرآیند احتراق برای کاهش ۱۰ درصدی مصرف گاز طبیعی.", "مکانیزه کردن فرآیند ثبت و خروج قطعات با تگ‌های RFID.", "راه‌اندازی فاز دوم کوره قوس الکتریکی جهت افزایش ظرفیت تولید.", "استفاده از دوربین‌های پرسرعت و هوش مصنوعی برای کشف نقایص ساختاری.", "جایگزینی پمپ‌ها و جک‌های هیدرولیک فرسوده با نمونه‌های راندمان بالا.", "پیاده‌سازی استانداردهای زیست‌محیطی در دپوی باطله‌های معدنی."]
    },
    "دارویی و غذایی": {
        "categories": ["تحقیق و توسعه (R&D)", "کشت و صنعت", "تولید انبوه", "استانداردسازی"],
        "names": ["فرمولاسیون داروی ضد سرطان", "اتوماسیون خط بسته‌بندی", "احداث گلخانه هیدروپونیک", "اخذ تاییدیه FDA", "توسعه خط تولید فرآورده لبنی", "کشت ارگانیک گیاهان دارویی", "تجهیز آزمایشگاه کنترل کیفی", "بهینه‌سازی زنجیره سرد", "تولید انبوه مکمل‌های تقویتی", "سیستم ردیابی اصالت دارو"],
        "descriptions": ["تحقیق بر روی سنتز مواد اولیه دارویی با فناوری بالا.", "خرید و راه‌اندازی دستگاه‌های چیدمان و لیبل‌زنی خودکار.", "طراحی سازه مدرن کشت بدون خاک برای محصولات حساس.", "آماده‌سازی مستندات و مستر فایل کارخانه جهت صادرات بین‌المللی.", "راه‌اندازی خط تولید پنیرهای سخت با ماندگاری بالا.", "کشت مکانیزه مزارع اسطوخودوس و بابونه در مقیاس صنعتی.", "خرید دستگاه‌های HPLC و اسپکتروفتومتر جدید.", "تجهیز ناوگان حمل‌ونقل به سنسورهای پایش آنلاین دما.", "فرمولاسیون و تولید مولتی‌ویتامین‌های نانو-انکپسوله.", "اجرای طرح شناسه رهگیری (دیتاماتریکس) بر روی تمامی محصولات."]
    },
    "عمران و ساختمانی": {
        "categories": ["شهرسازی", "ابنیه سنگین", "راه‌سازی", "تولید مصالح"],
        "names": ["احداث مجتمع مسکونی ۱۰۰ واحدی", "طراحی برج تجاری اداری", "زیرسازی بزرگراه غربی", "کارخانه بتن آماده عیار بالا", "مقاوم‌سازی لرزه‌ای سازه", "احداث پل بتنی پیش‌تنیده", "طراحی معماری پردیس دانشگاهی", "توسعه شبکه فاضلاب کارگاهی", "هوشمندسازی سیستم اطفاء حریق", "خرید تجهیزات تاور کرین"],
        "descriptions": ["پروژه گودبرداری، سازه نگهبان و ساخت مجتمع مسکونی رفاهی.", "طراحی نقشه‌های فاز ۱ و ۲ معماری و سازه برج ۳۰ طبقه.", "عملیات خاک‌برداری و ساب‌بیس قطعه سوم بزرگراه اصلی.", "نصب تجهیزات بچینگ پلنت مدرن با ظرفیت تولید ۱۲۰ مترمکعب در ساعت.", "تقویت ستون‌ها و ژاکت بتنی ساختمان قدیمی مجموعه.", "اجرای پایه‌ها و عرشه بتنی پل تقاطع غیرهمسطح.", "طراحی محوطه‌سازی و فضاهای آموزشی بر اساس استانداردهای سبز.", "لوله‌گذاری و مدیریت آب‌های سطحی محدوده کارگاهی.", "تجهیز برج به سنسورهای نشت گاز و پمپ‌های فشار قوی آب.", "خرید و نصب جرثقیل‌های برجی با ظرفیت باربری بالا."]
    },
    "مالی و بازرگانی": {
        "categories": ["توسعه بازار", "مدیریت ریسک", "سرمایه‌گذاری", "لجستیک بین‌الملل"],
        "names": ["راه‌اندازی الگوریتم تریدینگ", "ارزیابی ریسک سبد سهام", "توسعه پلتفرم صرافی آنلاین", "خرید کشتی فله‌بر", "تاسیس شعبه بین‌المللی", "طراحی بیمه‌نامه نوین", "پورتفوی سرمایه‌گذاری طلا", "مکانیزه کردن اسناد گمرکی", "جذب سرمایه توده‌ای (Crowdfunding)", "سیستم رتبه‌بندی اعتباری مشتریان"],
        "descriptions": ["توسعه کدهای معاملاتی خودکار بر پایه اندیکاتورهای تکنیکال.", "تحلیل آماری و محاسبه ارزش در معرض ریسک (VaR) دارایی‌ها.", "طراحی زیرساخت مبادلات ارزی بر بستر وب با امنیت بالا.", "مذاکره و خرید یک فروند کشتی حمل کالا جهت توسعه ناوگان.", "انجام امور حقوقی برای ثبت شرکت در مناطق آزاد تجاری.", "طراحی ساختار بیمه عمر متصل به شاخص بورس.", "مدیریت و خرید فیزیکی شمش طلا جهت پشتوانه صندوق.", "دیجیتالی کردن اسناد ترخیص کالا برای کاهش زمان ایستایی.", "راه‌اندازی پرتال جذب سرمایه‌های خرد برای پروژه‌های استارتاپی.", "طراحی مدل امتیازدهی به مشتریان جهت اعطای تسهیلات."]
    }
}

# تشخیص نوع صنعت بر اساس نام شرکت
def get_industry_type(name):
    if any(k in name for k in ["فناوری", "نرم‌افزار", "امنیت", "ابری", "هوش مصنوعی", "رایان", "مخابرات", "دیجیتال", "داده"]): return "IT"
    if any(k in name for k in ["فولاد", "آهن", "معدن", "صنعتی", "مس", "ذوب", "فلزات"]): return "صنعتی و معدنی"
    if any(k in name for k in ["دارو", "غذایی", "شیر", "شیمیایی", "کشت", "روغن"]): return "دارویی و غذایی"
    if any(k in name for k in ["ساختمانی", "عمران", "سازه", "مسکن", "سیمان", "راه"]): return "عمران و ساختمانی"
    return "مالی و بازرگانی"

def generate_projects(company_name, count=10):
    industry = get_industry_type(company_name)
    pool = industry_projects[industry]
    
    projects = []
    start_base = datetime(2026, 1, 1)
    
    for i in range(count):
        idx = i % len(pool["names"])
        proj_code = f"PRJ-{random.randint(100, 999)}-{random.randint(10, 99)}"
        
        # تاریخ‌ها
        start_date = start_base + timedelta(days=random.randint(1, 180))
        end_date = start_date + timedelta(days=random.randint(90, 540))
        
        currency = random.choice(["IRR", "USD", "EUR"])
        budget = random.randint(5000, 95000) * (1000000 if currency == "IRR" else 1)

        projects.append({
            "project_code": proj_code,
            "category": pool["categories"][i % len(pool["categories"])],
            "project_name": f"{pool['names'][idx]} ({i+1})",
            "description": pool["descriptions"][idx],
            "project_phase": random.choice(["امکان‌سنجی", "طراحی مفهومی", "اجرا/توسعه", "تست و تحویل", "پشتیبانی"]),
            "phase_description": "بررسی داکیومنت‌ها، تخصیص منابع و پایش مایلستون‌های تعریف شده در این فاز.",
            "status": random.choice(["در حال برنامه‌ریزی", "فعال", "تعلیق موقت", "تکمیل شده"]),
            "priority": random.choice(["کم", "متوسط", "بالا", "بحرانی"]),
            "estimated_budget": budget,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "currency_type": currency
        })
    return projects

# کدهای تولید کارمندان (مشابه قبل برای حفظ یکپارچگی)
first_names = ["امیرحسین", "علیرضا", "محمد", "علی", "حسین", "رضا", "مسعود", "حامد", "سعید", "جواد", "امین", "مهدی", "سینا", "فرزاد", "امید", "مهسا", "سارا", "نیلوفر", "زهرا", "مریم"]
last_names = ["رضایی", "احمدی", "کریمی", "محمدی", "حسینی", "صادقی", "مرادی", "حیدری", "موسوی", "قنبری"]
global_employee_id = 1

def generate_employees(count):
    global global_employee_id
    employees = []
    for _ in range(count):
        fn, ln = random.choice(first_names), random.choice(last_names)
        employees.append({
            "id": global_employee_id,
            "first_name": fn,
            "last_name": ln,
            "email": f"user{global_employee_id}@example.com",
            "password": f"Pass_{random.randint(1000, 9999)}!",
            "national_id": f"00{random.randint(10000000, 99999999)}",
            "phone_number": f"0912{random.randint(1000000, 9999999)}"
        })
        global_employee_id += 1
    return employees

# دیتای اصلی ساختار شرکت‌ها (الحاق ساختار قبلی)
companies_structure = [
    {
        "company_name": "هلدینگ فناوری اطلاعات پارسیان", "registration_number": "45218",
        "subsidiaries": [
            {"company_name": "توسعه نرم‌افزار رایان‌گستر", "registration_number": "51024"},
            {"company_name": "امنیت شبکه دژافزار", "registration_number": "51025"},
            {"company_name": "داده‌پردازی ابری آسمان", "registration_number": "51026"},
            {"company_name": "هوش مصنوعی دانا", "registration_number": "51027"},
            {"company_name": "پشتیبانی فنی رایان‌سرویس", "registration_number": "51028"}
        ]
    },
    {
        "company_name": "گروه صنعتی فولاد البرز", "registration_number": "32154",
        "subsidiaries": [
            {"company_name": "نورد و ذوب آهن شمال", "registration_number": "39401"},
            {"company_name": "صنایع گالوانیزه فجر", "registration_number": "39402"},
            {"company_name": "معدن‌کاوی سنگ‌آهن شرق", "registration_number": "39403"},
            {"company_name": "لجستیک و حمل‌ونقل سنگین البرز", "registration_number": "39404"},
            {"company_name": "توسعه سازه‌های فلزی کاوه", "registration_number": "39405"}
        ]
    },
    {
        "company_name": "شرکت سرمایه‌گذاری دارویی شفا", "registration_number": "78412",
        "subsidiaries": [
            {"company_name": "داروسازی اکسیر سلامت", "registration_number": "82110"},
            {"company_name": "تولید مواد اولیه شیمیایی پارس", "registration_number": "82111"},
            {"company_name": "پخش و توزیع دارویی هجرت", "registration_number": "82112"},
            {"company_name": "گیاهان دارویی سینا", "registration_number": "82113"},
            {"company_name": "تجهیزات پزشکی زیست‌فناور", "registration_number": "82114"}
        ]
    },
    {
        "company_name": "صنایع غذایی بهار کاشان", "registration_number": "12569",
        "subsidiaries": [
            {"company_name": "فرآورده‌های لبنی پاک‌شیر", "registration_number": "18450"},
            {"company_name": "کشت و صنعت بهارستان", "registration_number": "18451"},
            {"company_name": "بسته‌بندی و کارتن‌سازی صدف", "registration_number": "18452"},
            {"company_name": "تولید روغن نباتی آفتاب", "registration_number": "18453"},
            {"company_name": "بازرگانی و صادرات بهار کیش", "registration_number": "18454"}
        ]
    },
    {
        "company_name": "گروه ساختمانی و عمران ارگ", "registration_number": "95142",
        "subsidiaries": [
            {"company_name": "مهندسین مشاور سازه پایدار", "registration_number": "99601"},
            {"company_name": "صنایع سیمان ایلام", "registration_number": "99602"},
            {"company_name": "انبوه سازی مسکن فردا", "registration_number": "99603"},
            {"company_name": "راه‌سازی و زیرساخت آکام", "registration_number": "99604"},
            {"company_name": "تولید بتن آماده آپادانا", "registration_number": "99605"}
        ]
    },
    {
        "company_name": "هلدینگ انرژی و پتروشیمی کارون", "registration_number": "63258",
        "subsidiaries": [
            {"company_name": "پتروشیمی توسعه جنوب", "registration_number": "67100"},
            {"company_name": "پالایش نفت ستاره ساحل", "registration_number": "67101"},
            {"company_name": "تولید روان‌کارهای صنعتی پیشرو", "registration_number": "67102"},
            {"company_name": "انرژی‌های تجدیدپذیر تابش", "registration_number": "67103"},
            {"company_name": "حفر چاه‌های نفتی اروند", "registration_number": "67104"}
        ]
    },
    {
        "company_name": "شرکت بازرگانی و تجارت بین‌الملل آسیا", "registration_number": "54128",
        "subsidiaries": [
            {"company_name": "ترخیص کالا و خدمات گمرکی سریع", "registration_number": "58920"},
            {"company_name": "کشتیرانی و حمل دریایی اقیانوس", "registration_number": "58921"},
            {"company_name": "مدیریت زنجیره تامین کاسپین", "registration_number": "58922"},
            {"company_name": "توسعه تجارت الکترونیک مرزنشین", "registration_number": "58923"},
            {"company_name": "سرمایه‌گذاری ارزی هما", "registration_number": "58924"}
        ]
    },
    {
        "company_name": "گروه مالی و اعتباری تدبیر", "registration_number": "85296",
        "subsidiaries": [
            {"company_name": "کارگزاری بورس تدبیر سهام", "registration_number": "89310"},
            {"company_name": "بیمه کارآفرینان فردا", "registration_number": "89311"},
            {"company_name": "لیزینگ خودرو و تجهیزات مهر", "registration_number": "89312"},
            {"company_name": "صندوق سرمایه‌گذاری مشترک امید", "registration_number": "89313"},
            {"company_name": "مشاوره مالی و ارزیابی ریسک معیار", "registration_number": "89314"}
        ]
    },
    {
        "company_name": "توسعه صنایع معادن مس کرمان", "registration_number": "26354",
        "subsidiaries": [
            {"company_name": "استخراج معادن مس سرچشمه", "registration_number": "29140"},
            {"company_name": "تغلیظ و ذوب فلزات کویر", "registration_number": "29141"},
            {"company_name": "صنایع مفتول و سیم مسی ایران", "registration_number": "29142"},
            {"company_name": "اکتشافات معدنی پایا", "registration_number": "29143"},
            {"company_name": "ماشین‌آلات سنگین معدنی راهبر", "registration_number": "29144"}
        ]
    },
    {
        "company_name": "هلدینگ مخابرات و ارتباطات سیار موج", "registration_number": "14785",
        "subsidiaries": [
            {"company_name": "اپراتور مجازی ارتباطات نوین", "registration_number": "19520"},
            {"company_name": "توسعه فیبر نوری ضیاء", "registration_number": "19521"},
            {"company_name": "تولید دکل و تجهیزات مخابراتی سینال", "registration_number": "19522"},
            {"company_name": "خدمات ارزش افزوده زنگار", "registration_number": "19523"},
            {"company_name": "مرکز داده و دیتاسنتر امین", "registration_number": "19524"}
        ]
    }
]

# تزریق داده‌های پروژه و کارمندان به هلدینگ‌ها و زیرمجموعه‌ها
for company in companies_structure:
    company["employees"] = generate_employees(20)
    company["projects"] = generate_projects(company["company_name"], 10)
    
    for sub in company["subsidiaries"]:
        sub["employees"] = generate_employees(15)
        sub["projects"] = generate_projects(sub["company_name"], 10)

# خروجی به فایل ارجاع داده شده
with open("corporate_data_with_projects.json", "w", encoding="utf-8") as f:
    json.dump(companies_structure, f, ensure_ascii=False, indent=2)

print("فایل نهایی حاوی ۹۵۰ کارمند و ۶۰۰ پروژه هوشمند تخصصی با موفقیت ساخته شد!")