(() => {
  const languages = [
    { id: "az", code: "AZ", flag: "🇦🇿", label: "Azərbaycan dili", direction: "ltr" },
    { id: "en", code: "EN", flag: "🇬🇧", label: "English", direction: "ltr" },
    { id: "tr", code: "TR", flag: "🇹🇷", label: "Türkçe", direction: "ltr" },
    { id: "ru", code: "RU", flag: "🇷🇺", label: "Русский", direction: "ltr" },
    { id: "ka", code: "KA", flag: "🇬🇪", label: "ქართული", direction: "ltr" },
    { id: "fa", code: "FA", flag: "🇮🇷", label: "فارسی", direction: "rtl" },
  ];

  // Values are ordered as Azerbaijani, English, Turkish, Russian, Georgian, Persian.
  const rows = {
    "_pageTitle": ["AzTexnoQaz MMC | Qaz avadanlığı, sayğaclar və sənaye həlləri", "AzTexnoQaz LLC | Gas Equipment, Meters and Industrial Solutions", "AzTexnoQaz LLC | Gaz Ekipmanları, Sayaçlar ve Endüstriyel Çözümler", "AzTexnoQaz LLC | Газовое оборудование, счетчики и промышленные решения", "AzTexnoQaz LLC | გაზის მოწყობილობები, მრიცხველები და სამრეწველო გადაწყვეტილებები", "AzTexnoQaz LLC | تجهیزات گاز، کنتورها و راهکارهای صنعتی"],
    "_pageDescription": ["AzTexnoQaz MMC Azərbaycanda qaz sayğacları, tənzimləyicilər, klapanlar, həcm korrektorları, təzyiq şlanqları, HVAC avadanlığı və sənaye qaz şkafları təchiz edir.", "AzTexnoQaz LLC supplies gas meters, regulators, valves, volume converters, pressure hoses, HVAC equipment and industrial gas cabinets in Azerbaijan.", "AzTexnoQaz LLC, Azerbaycan'da gaz sayaçları, regülatörler, vanalar, hacim dönüştürücüler, basınç hortumları, HVAC ekipmanları ve endüstriyel gaz kabinleri tedarik eder.", "AzTexnoQaz LLC поставляет в Азербайджане газовые счетчики, регуляторы, клапаны, корректоры объема, напорные шланги, HVAC-оборудование и промышленные газовые шкафы.", "AzTexnoQaz LLC აზერბაიჯანში აწვდის გაზის მრიცხველებს, რეგულატორებს, სარქველებს, მოცულობის კონვერტორებს, წნევის შლანგებს, HVAC მოწყობილობებსა და სამრეწველო გაზის კარადებს.", "AzTexnoQaz LLC در آذربایجان کنتور گاز، رگلاتور، شیر، مبدل حجم، شیلنگ فشار، تجهیزات HVAC و کابینت‌های صنعتی گاز عرضه می‌کند."],
    "Language": ["Dil", "Language", "Dil", "Язык", "ენა", "زبان"],
    "Skip to products": ["Məhsullara keç", "Skip to products", "Ürünlere geç", "Перейти к продукции", "პროდუქციაზე გადასვლა", "رفتن به محصولات"],
    "Quick contact": ["Sürətli əlaqə", "Quick contact", "Hızlı iletişim", "Быстрая связь", "სწრაფი კავშირი", "تماس سریع"],
    "Main navigation": ["Əsas naviqasiya", "Main navigation", "Ana menü", "Основная навигация", "მთავარი ნავიგაცია", "منوی اصلی"],
    "AzTexnoQaz home": ["AzTexnoQaz ana səhifə", "AzTexnoQaz home", "AzTexnoQaz ana sayfa", "Главная AzTexnoQaz", "AzTexnoQaz მთავარი გვერდი", "صفحه اصلی AzTexnoQaz"],
    "Menu": ["Menyu", "Menu", "Menü", "Меню", "მენიუ", "منو"],
    "Products": ["Məhsullar", "Products", "Ürünler", "Продукция", "პროდუქცია", "محصولات"],
    "Services": ["Xidmətlər", "Services", "Hizmetler", "Услуги", "სერვისები", "خدمات"],
    "About": ["Haqqımızda", "About", "Hakkımızda", "О компании", "ჩვენ შესახებ", "درباره ما"],
    "How to buy": ["Necə almaq olar", "How to buy", "Nasıl satın alınır", "Как купить", "როგორ შევიძინოთ", "نحوه خرید"],
    "Contact": ["Əlaqə", "Contact", "İletişim", "Контакты", "კონტაქტი", "تماس"],
    "Editor login": ["Redaktor girişi", "Editor login", "Editör girişi", "Вход для редактора", "რედაქტორის შესვლა", "ورود ویرایشگر"],
    "Request quote": ["Qiymət təklifi al", "Request quote", "Teklif iste", "Запросить предложение", "ფასის მოთხოვნა", "درخواست قیمت"],
    "Editing as": ["Redaktə edən", "Editing as", "Düzenleyen", "Редактор", "რედაქტორი", "ویرایش به‌عنوان"],
    "Add product": ["Məhsul əlavə et", "Add product", "Ürün ekle", "Добавить товар", "პროდუქტის დამატება", "افزودن محصول"],
    "Manage users": ["İstifadəçiləri idarə et", "Manage users", "Kullanıcıları yönet", "Управление пользователями", "მომხმარებლების მართვა", "مدیریت کاربران"],
    "Sign out": ["Çıxış", "Sign out", "Çıkış yap", "Выйти", "გასვლა", "خروج"],
    "Official gas equipment supply and support": ["Rəsmi qaz avadanlığı təchizatı və dəstəyi", "Official gas equipment supply and support", "Resmi gaz ekipmanı tedariği ve desteği", "Официальные поставки и поддержка газового оборудования", "გაზის მოწყობილობების ოფიციალური მიწოდება და მხარდაჭერა", "تأمین و پشتیبانی رسمی تجهیزات گاز"],
    "Professional gas, water and industrial equipment solutions from trusted brands including Honeywell, Elster, Plum GAS, FANGAZ, FMG, ESKA, MADAS, QW/CSSC, Daikin, Airfel, CEM, BAYLAN and BROEN.": ["Honeywell, Elster, Plum GAS, FANGAZ, FMG, ESKA, MADAS, QW/CSSC, Daikin, Airfel, CEM, BAYLAN və BROEN daxil olmaqla etibarlı brendlərdən peşəkar qaz, su və sənaye avadanlığı həlləri.", "Professional gas, water and industrial equipment solutions from trusted brands including Honeywell, Elster, Plum GAS, FANGAZ, FMG, ESKA, MADAS, QW/CSSC, Daikin, Airfel, CEM, BAYLAN and BROEN.", "Honeywell, Elster, Plum GAS, FANGAZ, FMG, ESKA, MADAS, QW/CSSC, Daikin, Airfel, CEM, BAYLAN ve BROEN dahil güvenilir markalardan profesyonel gaz, su ve endüstriyel ekipman çözümleri.", "Профессиональные решения для газа, воды и промышленности от надежных брендов, включая Honeywell, Elster, Plum GAS, FANGAZ, FMG, ESKA, MADAS, QW/CSSC, Daikin, Airfel, CEM, BAYLAN и BROEN.", "გაზის, წყლისა და სამრეწველო მოწყობილობების პროფესიონალური გადაწყვეტილებები სანდო ბრენდებისგან, მათ შორის Honeywell, Elster, Plum GAS, FANGAZ, FMG, ESKA, MADAS, QW/CSSC, Daikin, Airfel, CEM, BAYLAN და BROEN.", "راهکارهای حرفه‌ای تجهیزات گاز، آب و صنعت از برندهای معتبر از جمله Honeywell، Elster، Plum GAS، FANGAZ، FMG، ESKA، MADAS، QW/CSSC، Daikin، Airfel، CEM، BAYLAN و BROEN."],
    "View products": ["Məhsullara bax", "View products", "Ürünleri görüntüle", "Смотреть продукцию", "პროდუქციის ნახვა", "مشاهده محصولات"],
    "WhatsApp sales": ["WhatsApp satış", "WhatsApp sales", "WhatsApp satış", "Продажи в WhatsApp", "WhatsApp გაყიდვები", "فروش در واتساپ"],
    "Company highlights": ["Şirkət göstəriciləri", "Company highlights", "Şirket bilgileri", "Ключевые показатели", "კომპანიის მაჩვენებლები", "نکات برجسته شرکت"],
    "Operating since": ["Fəaliyyətə başlayıb", "Operating since", "Faaliyet başlangıcı", "Работаем с", "საქმიანობს", "آغاز فعالیت"],
    "Product lines": ["Məhsul xətti", "Product lines", "Ürün grubu", "Линеек продукции", "პროდუქტის ხაზი", "گروه محصول"],
    "Sales lines": ["Satış xətti", "Sales lines", "Satış hattı", "Линии продаж", "გაყიდვების ხაზი", "خط فروش"],
    "Company advantages": ["Şirkətin üstünlükləri", "Company advantages", "Şirket avantajları", "Преимущества компании", "კომპანიის უპირატესობები", "مزایای شرکت"],
    "High quality": ["Yüksək keyfiyyət", "High quality", "Yüksek kalite", "Высокое качество", "მაღალი ხარისხი", "کیفیت بالا"],
    "Selected equipment for gas and industrial projects.": ["Qaz və sənaye layihələri üçün seçilmiş avadanlıq.", "Selected equipment for gas and industrial projects.", "Gaz ve endüstriyel projeler için seçilmiş ekipmanlar.", "Отобранное оборудование для газовых и промышленных проектов.", "შერჩეული მოწყობილობები გაზისა და სამრეწველო პროექტებისთვის.", "تجهیزات منتخب برای پروژه‌های گاز و صنعت."],
    "Reliable technology": ["Etibarlı texnologiya", "Reliable technology", "Güvenilir teknoloji", "Надежные технологии", "სანდო ტექნოლოგია", "فناوری قابل اعتماد"],
    "Metering, regulating and control products from known brands.": ["Tanınmış brendlərdən ölçmə, tənzimləmə və idarəetmə məhsulları.", "Metering, regulating and control products from known brands.", "Tanınmış markalardan ölçüm, regülasyon ve kontrol ürünleri.", "Продукция известных брендов для учета, регулирования и управления.", "ცნობილი ბრენდების აღრიცხვის, რეგულირებისა და მართვის პროდუქტები.", "محصولات اندازه‌گیری، تنظیم و کنترل از برندهای شناخته‌شده."],
    "Professional support": ["Peşəkar dəstək", "Professional support", "Profesyonel destek", "Профессиональная поддержка", "პროფესიონალური მხარდაჭერა", "پشتیبانی حرفه‌ای"],
    "Product selection, quotation and technical guidance.": ["Məhsul seçimi, qiymət təklifi və texniki məsləhət.", "Product selection, quotation and technical guidance.", "Ürün seçimi, fiyat teklifi ve teknik danışmanlık.", "Подбор продукции, расчет предложения и техническая консультация.", "პროდუქტის შერჩევა, ფასის შეთავაზება და ტექნიკური კონსულტაცია.", "انتخاب محصول، ارائه قیمت و راهنمایی فنی."],
    "Long-term partner": ["Uzunmüddətli tərəfdaş", "Long-term partner", "Uzun vadeli iş ortağı", "Долгосрочный партнер", "გრძელვადიანი პარტნიორი", "شریک بلندمدت"],
    "Supply support for companies, facilities and contractors.": ["Şirkətlər, obyektlər və podratçılar üçün təchizat dəstəyi.", "Supply support for companies, facilities and contractors.", "Şirketler, tesisler ve yükleniciler için tedarik desteği.", "Поддержка поставок для компаний, объектов и подрядчиков.", "მომარაგების მხარდაჭერა კომპანიების, ობიექტებისა და კონტრაქტორებისთვის.", "پشتیبانی تأمین برای شرکت‌ها، تأسیسات و پیمانکاران."],
    "Partner brands": ["Tərəfdaş brendlər", "Partner brands", "İş ortağı markalar", "Бренды-партнеры", "პარტნიორი ბრენდები", "برندهای همکار"],
    "Brands represented in the catalog": ["Kataloqda təqdim olunan brendlər", "Brands represented in the catalog", "Katalogdaki markalar", "Бренды в каталоге", "კატალოგში წარმოდგენილი ბრენდები", "برندهای موجود در کاتالوگ"],
    "Product catalog": ["Məhsul kataloqu", "Product catalog", "Ürün kataloğu", "Каталог продукции", "პროდუქციის კატალოგი", "کاتالوگ محصولات"],
    "Choose the product line you need": ["Ehtiyacınız olan məhsul xəttini seçin", "Choose the product line you need", "İhtiyacınız olan ürün grubunu seçin", "Выберите нужную линейку продукции", "აირჩიეთ სასურველი პროდუქტის ხაზი", "گروه محصول مورد نیاز را انتخاب کنید"],
    "Browse the supplied AzTexnoQaz product images, open details, then request a quote with the product name already prepared.": ["AzTexnoQaz məhsullarının şəkillərinə baxın, detalları açın və məhsul adı hazır şəkildə qiymət təklifi istəyin.", "Browse the supplied AzTexnoQaz product images, open details, then request a quote with the product name already prepared.", "AzTexnoQaz ürün görsellerini inceleyin, ayrıntıları açın ve ürün adı hazır şekilde teklif isteyin.", "Просмотрите изображения продукции AzTexnoQaz, откройте подробности и запросите предложение с уже указанным названием товара.", "დაათვალიერეთ AzTexnoQaz-ის პროდუქციის ფოტოები, გახსენით დეტალები და მოითხოვეთ ფასი უკვე მითითებული პროდუქტით.", "تصاویر محصولات AzTexnoQaz را ببینید، جزئیات را باز کنید و با نام محصول آماده درخواست قیمت بدهید."],
    "Product filters": ["Məhsul filtrləri", "Product filters", "Ürün filtreleri", "Фильтры продукции", "პროდუქციის ფილტრები", "فیلترهای محصول"],
    "Search products or brands": ["Məhsul və ya brend axtarın", "Search products or brands", "Ürün veya marka ara", "Поиск продукции или бренда", "მოძებნეთ პროდუქტი ან ბრენდი", "جستجوی محصول یا برند"],
    "Filter products by category": ["Məhsulları kateqoriyaya görə filtrlə", "Filter products by category", "Ürünleri kategoriye göre filtrele", "Фильтр по категории", "პროდუქციის გაფილტვრა კატეგორიით", "فیلتر محصولات بر اساس دسته"],
    "All": ["Hamısı", "All", "Tümü", "Все", "ყველა", "همه"],
    "Metering": ["Ölçmə", "Metering", "Ölçüm", "Учет", "აღრიცხვა", "اندازه‌گیری"],
    "Regulators": ["Tənzimləyicilər", "Regulators", "Regülatörler", "Регуляторы", "რეგულატორები", "رگلاتورها"],
    "Conversion": ["Korreksiya", "Conversion", "Dönüştürme", "Корректоры", "კონვერტაცია", "تبدیل حجم"],
    "Valves": ["Klapanlar", "Valves", "Vanalar", "Клапаны", "სარქველები", "شیرآلات"],
    "Accessories": ["Aksesuarlar", "Accessories", "Aksesuarlar", "Комплектующие", "აქსესუარები", "لوازم جانبی"],
    "Cabinets": ["Şkaflar", "Cabinets", "Kabinler", "Шкафы", "კარადები", "کابینت‌ها"],
    "Prices are confirmed by quote after model and specification check.": ["Qiymətlər model və texniki göstəricilər yoxlanıldıqdan sonra təkliflə təsdiqlənir.", "Prices are confirmed by quote after model and specification check.", "Fiyatlar model ve teknik özellik kontrolünden sonra teklifle kesinleşir.", "Цены подтверждаются предложением после проверки модели и характеристик.", "ფასი დასტურდება მოდელისა და მახასიათებლების შემოწმების შემდეგ.", "قیمت پس از بررسی مدل و مشخصات در پیش‌فاکتور تأیید می‌شود."],
    "Equipment supply with project-level support": ["Layihə səviyyəli dəstəklə avadanlıq təchizatı", "Equipment supply with project-level support", "Proje düzeyinde destekle ekipman tedariği", "Поставка оборудования с проектной поддержкой", "მოწყობილობების მიწოდება საპროექტო მხარდაჭერით", "تأمین تجهیزات همراه با پشتیبانی پروژه"],
    "AzTexnoQaz supports contractors, facilities and industrial buyers with product matching, technical selection, quotation, delivery coordination and after-sale communication.": ["AzTexnoQaz podratçılara, obyektlərə və sənaye alıcılarına məhsul uyğunlaşdırılması, texniki seçim, qiymət təklifi, çatdırılmanın koordinasiyası və satış sonrası əlaqə üzrə dəstək verir.", "AzTexnoQaz supports contractors, facilities and industrial buyers with product matching, technical selection, quotation, delivery coordination and after-sale communication.", "AzTexnoQaz; yüklenicilere, tesislere ve endüstriyel alıcılara ürün eşleştirme, teknik seçim, teklif, teslimat koordinasyonu ve satış sonrası iletişim desteği verir.", "AzTexnoQaz помогает подрядчикам, объектам и промышленным покупателям с подбором продукции, техническим выбором, расчетом предложения, координацией доставки и послепродажной связью.", "AzTexnoQaz კონტრაქტორებს, ობიექტებსა და სამრეწველო მყიდველებს ეხმარება პროდუქტის შერჩევაში, ტექნიკურ კონსულტაციაში, ფასის შეთავაზებაში, მიწოდებასა და გაყიდვის შემდგომ კომუნიკაციაში.", "AzTexnoQaz به پیمانکاران، تأسیسات و خریداران صنعتی در تطبیق محصول، انتخاب فنی، ارائه قیمت، هماهنگی تحویل و ارتباط پس از فروش کمک می‌کند."],
    "Product selection and quotation": ["Məhsul seçimi və qiymət təklifi", "Product selection and quotation", "Ürün seçimi ve fiyat teklifi", "Подбор продукции и расчет предложения", "პროდუქტის შერჩევა და ფასის შეთავაზება", "انتخاب محصول و ارائه قیمت"],
    "Gas metering and regulating equipment": ["Qaz ölçmə və tənzimləmə avadanlığı", "Gas metering and regulating equipment", "Gaz ölçüm ve regülasyon ekipmanları", "Оборудование для учета и регулирования газа", "გაზის აღრიცხვისა და რეგულირების მოწყობილობები", "تجهیزات اندازه‌گیری و تنظیم گاز"],
    "Spare parts and replacement accessories": ["Ehtiyat hissələri və əvəzedici aksesuarlar", "Spare parts and replacement accessories", "Yedek parçalar ve değişim aksesuarları", "Запасные части и комплектующие", "სათადარიგო ნაწილები და აქსესუარები", "قطعات یدکی و لوازم جایگزین"],
    "Delivery coordination after confirmation": ["Təsdiqdən sonra çatdırılmanın koordinasiyası", "Delivery coordination after confirmation", "Onay sonrası teslimat koordinasyonu", "Координация доставки после подтверждения", "დადასტურების შემდეგ მიწოდების კოორდინაცია", "هماهنگی تحویل پس از تأیید"],
    "Gas cabinet and station assembly options": ["Qaz şkafı və stansiya yığımı seçimləri", "Gas cabinet and station assembly options", "Gaz kabini ve istasyon montaj seçenekleri", "Варианты сборки газовых шкафов и станций", "გაზის კარადისა და სადგურის აწყობის ვარიანტები", "گزینه‌های مونتاژ کابینت و ایستگاه گاز"],
    "About AzTexnoQaz": ["AzTexnoQaz haqqında", "About AzTexnoQaz", "AzTexnoQaz hakkında", "Об AzTexnoQaz", "AzTexnoQaz-ის შესახებ", "درباره AzTexnoQaz"],
    "Reliable gas equipment partner since 2016": ["2016-cı ildən etibarlı qaz avadanlığı tərəfdaşı", "Reliable gas equipment partner since 2016", "2016'dan beri güvenilir gaz ekipmanı ortağı", "Надежный партнер по газовому оборудованию с 2016 года", "გაზის მოწყობილობების სანდო პარტნიორი 2016 წლიდან", "شریک قابل اعتماد تجهیزات گاز از سال ۲۰۱۶"],
    "AzTexnoQaz LLC works in the gas equipment field with a product portfolio covering measurement, pressure regulation, valves, heaters, water meters, automation devices, spare parts and complete cabinet solutions.": ["AzTexnoQaz MMC qaz avadanlığı sahəsində fəaliyyət göstərir və ölçmə, təzyiq tənzimləmə, klapanlar, qızdırıcılar, su sayğacları, avtomatlaşdırma cihazları, ehtiyat hissələri və tam şkaf həllərini əhatə edən məhsul portfelinə malikdir.", "AzTexnoQaz LLC works in the gas equipment field with a product portfolio covering measurement, pressure regulation, valves, heaters, water meters, automation devices, spare parts and complete cabinet solutions.", "AzTexnoQaz LLC; ölçüm, basınç regülasyonu, vanalar, ısıtıcılar, su sayaçları, otomasyon cihazları, yedek parçalar ve komple kabin çözümlerini kapsayan ürün portföyüyle gaz ekipmanları alanında faaliyet gösterir.", "AzTexnoQaz LLC работает в сфере газового оборудования и предлагает решения для учета, регулирования давления, клапанов, нагревателей, водомеров, автоматики, запасных частей и комплектных шкафов.", "AzTexnoQaz LLC მუშაობს გაზის მოწყობილობების სფეროში და გთავაზობთ აღრიცხვის, წნევის რეგულირების, სარქველების, გამათბობლების, წყლის მრიცხველების, ავტომატიკის, სათადარიგო ნაწილებისა და სრული კარადების გადაწყვეტილებებს.", "AzTexnoQaz LLC در حوزه تجهیزات گاز فعالیت دارد و مجموعه محصولات آن شامل اندازه‌گیری، تنظیم فشار، شیرآلات، گرم‌کن‌ها، کنتور آب، تجهیزات اتوماسیون، قطعات یدکی و راهکارهای کامل کابینت است."],
    "Recognized product brands and practical technical guidance.": ["Tanınmış məhsul brendləri və praktik texniki məsləhət.", "Recognized product brands and practical technical guidance.", "Tanınmış ürün markaları ve pratik teknik danışmanlık.", "Известные бренды и практические технические консультации.", "ცნობილი ბრენდები და პრაქტიკული ტექნიკური კონსულტაცია.", "برندهای معتبر و راهنمایی فنی کاربردی."],
    "Fast response through phone, email and WhatsApp.": ["Telefon, e-poçt və WhatsApp vasitəsilə sürətli cavab.", "Fast response through phone, email and WhatsApp.", "Telefon, e-posta ve WhatsApp üzerinden hızlı yanıt.", "Быстрый ответ по телефону, электронной почте и WhatsApp.", "სწრაფი პასუხი ტელეფონით, ელფოსტითა და WhatsApp-ით.", "پاسخ سریع از طریق تلفن، ایمیل و واتساپ."],
    "Suitable for commercial, utility and industrial buyers.": ["Kommersiya, kommunal və sənaye alıcıları üçün uyğundur.", "Suitable for commercial, utility and industrial buyers.", "Ticari, altyapı ve endüstriyel alıcılar için uygundur.", "Подходит для коммерческих, коммунальных и промышленных покупателей.", "შესაფერისია კომერციული, კომუნალური და სამრეწველო მყიდველებისთვის.", "مناسب برای خریداران تجاری، خدمات شهری و صنعتی."],
    "Send the product name and get a confirmed quote": ["Məhsulun adını göndərin və təsdiqlənmiş qiymət təklifi alın", "Send the product name and get a confirmed quote", "Ürün adını gönderin ve kesin teklif alın", "Отправьте название товара и получите подтвержденное предложение", "გამოგზავნეთ პროდუქტის სახელი და მიიღეთ დადასტურებული ფასი", "نام محصول را ارسال کنید و قیمت تأییدشده بگیرید"],
    "Select a product, share your required quantity or project details, and the AzTexnoQaz team will confirm availability, compatible specifications and pricing.": ["Məhsulu seçin, lazım olan miqdarı və ya layihə detallarını paylaşın; AzTexnoQaz komandası mövcudluğu, uyğun texniki göstəriciləri və qiyməti təsdiqləyəcək.", "Select a product, share your required quantity or project details, and the AzTexnoQaz team will confirm availability, compatible specifications and pricing.", "Bir ürün seçin, gerekli miktarı veya proje ayrıntılarını paylaşın; AzTexnoQaz ekibi stok, uyumlu teknik özellikler ve fiyatı teyit etsin.", "Выберите товар, сообщите количество или детали проекта, и команда AzTexnoQaz подтвердит наличие, подходящие характеристики и цену.", "აირჩიეთ პროდუქტი, მოგვაწოდეთ რაოდენობა ან პროექტის დეტალები და AzTexnoQaz-ის გუნდი დაადასტურებს ხელმისაწვდომობას, შესაბამის მახასიათებლებსა და ფასს.", "محصول را انتخاب کنید، تعداد یا جزئیات پروژه را بفرستید تا تیم AzTexnoQaz موجودی، مشخصات سازگار و قیمت را تأیید کند."],
    "Choose product": ["Məhsulu seçin", "Choose product", "Ürün seçin", "Выберите товар", "აირჩიეთ პროდუქტი", "انتخاب محصول"],
    "Pick the product line from the catalog or send your own technical requirement.": ["Kataloqdan məhsul xəttini seçin və ya texniki tələbinizi göndərin.", "Pick the product line from the catalog or send your own technical requirement.", "Katalogdan ürün grubunu seçin veya teknik gereksiniminizi gönderin.", "Выберите линейку в каталоге или отправьте свои технические требования.", "აირჩიეთ პროდუქტის ხაზი კატალოგიდან ან გამოგზავნეთ ტექნიკური მოთხოვნა.", "گروه محصول را از کاتالوگ انتخاب کنید یا نیاز فنی خود را بفرستید."],
    "Contact by form, WhatsApp, phone or email with quantity and project details.": ["Miqdar və layihə detalları ilə forma, WhatsApp, telefon və ya e-poçt vasitəsilə əlaqə saxlayın.", "Contact by form, WhatsApp, phone or email with quantity and project details.", "Miktar ve proje ayrıntılarıyla form, WhatsApp, telefon veya e-posta üzerinden iletişime geçin.", "Свяжитесь через форму, WhatsApp, телефон или почту, указав количество и детали проекта.", "დაგვიკავშირდით ფორმით, WhatsApp-ით, ტელეფონით ან ელფოსტით და მიუთითეთ რაოდენობა და პროექტის დეტალები.", "با ذکر تعداد و جزئیات پروژه از طریق فرم، واتساپ، تلفن یا ایمیل تماس بگیرید."],
    "Confirm delivery": ["Çatdırılmanı təsdiqləyin", "Confirm delivery", "Teslimatı onaylayın", "Подтвердите поставку", "დაადასტურეთ მიწოდება", "تأیید تحویل"],
    "The team confirms model, price, timeline and support details before supply.": ["Komanda təchizatdan əvvəl modeli, qiyməti, müddəti və dəstək detallarını təsdiqləyir.", "The team confirms model, price, timeline and support details before supply.", "Ekip, tedarik öncesinde model, fiyat, süre ve destek ayrıntılarını teyit eder.", "Перед поставкой команда подтверждает модель, цену, сроки и условия поддержки.", "მიწოდებამდე გუნდი ადასტურებს მოდელს, ფასს, ვადასა და მხარდაჭერის დეტალებს.", "تیم پیش از تأمین، مدل، قیمت، زمان‌بندی و جزئیات پشتیبانی را تأیید می‌کند."],
    "Quick quote request": ["Sürətli qiymət sorğusu", "Quick quote request", "Hızlı teklif talebi", "Быстрый запрос предложения", "ფასის სწრაფი მოთხოვნა", "درخواست سریع قیمت"],
    "Product": ["Məhsul", "Product", "Ürün", "Товар", "პროდუქტი", "محصول"],
    "Your name": ["Adınız", "Your name", "Adınız", "Ваше имя", "თქვენი სახელი", "نام شما"],
    "Name or company": ["Ad və ya şirkət", "Name or company", "Ad veya şirket", "Имя или компания", "სახელი ან კომპანია", "نام یا شرکت"],
    "Phone or email": ["Telefon və ya e-poçt", "Phone or email", "Telefon veya e-posta", "Телефон или почта", "ტელეფონი ან ელფოსტა", "تلفن یا ایمیل"],
    "Details": ["Ətraflı məlumat", "Details", "Ayrıntılar", "Подробности", "დეტალები", "جزئیات"],
    "Quantity, size, model, pressure, delivery city or project notes": ["Miqdar, ölçü, model, təzyiq, çatdırılma şəhəri və ya layihə qeydləri", "Quantity, size, model, pressure, delivery city or project notes", "Miktar, ölçü, model, basınç, teslimat şehri veya proje notları", "Количество, размер, модель, давление, город доставки или примечания по проекту", "რაოდენობა, ზომა, მოდელი, წნევა, მიწოდების ქალაქი ან პროექტის შენიშვნები", "تعداد، اندازه، مدل، فشار، شهر تحویل یا توضیحات پروژه"],
    "Prepare email quote": ["E-poçt sorğusu hazırla", "Prepare email quote", "E-posta teklifini hazırla", "Подготовить запрос по почте", "ელფოსტის მოთხოვნის მომზადება", "آماده‌سازی درخواست ایمیلی"],
    "Message on WhatsApp": ["WhatsApp-da yazın", "Message on WhatsApp", "WhatsApp'tan yazın", "Написать в WhatsApp", "მოგვწერეთ WhatsApp-ზე", "پیام در واتساپ"],
    "Talk to AzTexnoQaz sales": ["AzTexnoQaz satış komandası ilə danışın", "Talk to AzTexnoQaz sales", "AzTexnoQaz satış ekibiyle görüşün", "Свяжитесь с отделом продаж AzTexnoQaz", "დაუკავშირდით AzTexnoQaz-ის გაყიდვებს", "با فروش AzTexnoQaz صحبت کنید"],
    "Send the product name, photo, quantity and specifications. The team will respond with the next step for purchase.": ["Məhsulun adını, şəklini, miqdarını və texniki göstəricilərini göndərin. Komanda alışın növbəti addımı ilə bağlı cavab verəcək.", "Send the product name, photo, quantity and specifications. The team will respond with the next step for purchase.", "Ürün adı, fotoğraf, miktar ve teknik özellikleri gönderin. Ekip satın alma sürecinin sonraki adımıyla yanıt verecektir.", "Отправьте название, фото, количество и характеристики товара. Команда сообщит следующий шаг для покупки.", "გამოგზავნეთ პროდუქტის სახელი, ფოტო, რაოდენობა და მახასიათებლები. გუნდი შეგატყობინებთ შეძენის შემდეგ ნაბიჯს.", "نام محصول، عکس، تعداد و مشخصات را ارسال کنید. تیم مرحله بعدی خرید را اعلام می‌کند."],
    "Contact methods": ["Əlaqə vasitələri", "Contact methods", "İletişim yöntemleri", "Способы связи", "საკონტაქტო გზები", "راه‌های تماس"],
    "Email": ["E-poçt", "Email", "E-posta", "Электронная почта", "ელფოსტა", "ایمیل"],
    "Sales line": ["Satış xətti", "Sales line", "Satış hattı", "Отдел продаж", "გაყიდვების ხაზი", "خط فروش"],
    "Support line": ["Dəstək xətti", "Support line", "Destek hattı", "Линия поддержки", "მხარდაჭერის ხაზი", "خط پشتیبانی"],
    "Gas equipment, meters, regulators, valves, HVAC and industrial supply solutions.": ["Qaz avadanlığı, sayğaclar, tənzimləyicilər, klapanlar, HVAC və sənaye təchizatı həlləri.", "Gas equipment, meters, regulators, valves, HVAC and industrial supply solutions.", "Gaz ekipmanları, sayaçlar, regülatörler, vanalar, HVAC ve endüstriyel tedarik çözümleri.", "Газовое оборудование, счетчики, регуляторы, клапаны, HVAC и промышленные решения.", "გაზის მოწყობილობები, მრიცხველები, რეგულატორები, სარქველები, HVAC და სამრეწველო მომარაგება.", "تجهیزات گاز، کنتورها، رگلاتورها، شیرآلات، HVAC و راهکارهای تأمین صنعتی."],
    "Sticky contact actions": ["Sabit əlaqə düymələri", "Sticky contact actions", "Sabit iletişim düğmeleri", "Панель быстрых действий", "სწრაფი კავშირის ღილაკები", "دکمه‌های تماس ثابت"],
    "Call": ["Zəng et", "Call", "Ara", "Позвонить", "დარეკვა", "تماس"],
    "Quote": ["Qiymət", "Quote", "Teklif", "Предложение", "ფასი", "قیمت"],
    "Close product details": ["Məhsul detallarını bağla", "Close product details", "Ürün ayrıntılarını kapat", "Закрыть подробности", "პროდუქტის დეტალების დახურვა", "بستن جزئیات محصول"],
    "Request this product": ["Bu məhsul üçün təklif al", "Request this product", "Bu ürün için teklif iste", "Запросить этот товар", "ამ პროდუქტის ფასის მოთხოვნა", "درخواست قیمت این محصول"],
    "Private access": ["Şəxsi giriş", "Private access", "Özel erişim", "Закрытый доступ", "პირადი წვდომა", "دسترسی خصوصی"],
    "Close editor login": ["Redaktor girişini bağla", "Close editor login", "Editör girişini kapat", "Закрыть окно входа", "რედაქტორის შესვლის დახურვა", "بستن ورود ویرایشگر"],
    "Password": ["Şifrə", "Password", "Şifre", "Пароль", "პაროლი", "رمز عبور"],
    "Enter your password": ["Şifrənizi daxil edin", "Enter your password", "Şifrenizi girin", "Введите пароль", "შეიყვანეთ პაროლი", "رمز عبور را وارد کنید"],
    "Your name on this device": ["Bu cihazdakı adınız", "Your name on this device", "Bu cihazdaki adınız", "Ваше имя на этом устройстве", "თქვენი სახელი ამ მოწყობილობაზე", "نام شما در این دستگاه"],
    "User": ["İstifadəçi", "User", "Kullanıcı", "Пользователь", "მომხმარებელი", "کاربر"],
    "Cancel": ["Ləğv et", "Cancel", "İptal", "Отмена", "გაუქმება", "لغو"],
    "Sign in": ["Daxil ol", "Sign in", "Giriş yap", "Войти", "შესვლა", "ورود"],
    "Catalog editor": ["Kataloq redaktoru", "Catalog editor", "Katalog editörü", "Редактор каталога", "კატალოგის რედაქტორი", "ویرایشگر کاتالوگ"],
    "Add new product": ["Yeni məhsul əlavə et", "Add new product", "Yeni ürün ekle", "Добавить новый товар", "ახალი პროდუქტის დამატება", "افزودن محصول جدید"],
    "Close product editor": ["Məhsul redaktorunu bağla", "Close product editor", "Ürün editörünü kapat", "Закрыть редактор товара", "პროდუქტის რედაქტორის დახურვა", "بستن ویرایشگر محصول"],
    "Add product photo": ["Məhsul şəkli əlavə et", "Add product photo", "Ürün fotoğrafı ekle", "Добавить фото товара", "პროდუქტის ფოტოს დამატება", "افزودن عکس محصول"],
    "JPG, PNG or WebP, optimized automatically": ["JPG, PNG və ya WebP, avtomatik optimallaşdırılır", "JPG, PNG or WebP, optimized automatically", "JPG, PNG veya WebP, otomatik optimize edilir", "JPG, PNG или WebP, автоматическая оптимизация", "JPG, PNG ან WebP, ავტომატური ოპტიმიზაცია", "JPG، PNG یا WebP، بهینه‌سازی خودکار"],
    "Product name": ["Məhsulun adı", "Product name", "Ürün adı", "Название товара", "პროდუქტის სახელი", "نام محصول"],
    "Brand": ["Brend", "Brand", "Marka", "Бренд", "ბრენდი", "برند"],
    "Category": ["Kateqoriya", "Category", "Kategori", "Категория", "კატეგორია", "دسته‌بندی"],
    "Description": ["Təsvir", "Description", "Açıklama", "Описание", "აღწერა", "توضیحات"],
    "Specifications": ["Texniki göstəricilər", "Specifications", "Teknik özellikler", "Характеристики", "მახასიათებლები", "مشخصات"],
    "One specification per line": ["Hər sətirdə bir göstərici", "One specification per line", "Her satıra bir özellik", "Одна характеристика в строке", "თითო მახასიათებელი თითო ხაზზე", "هر مشخصه در یک خط"],
    "Tags": ["Etiketlər", "Tags", "Etiketler", "Метки", "ტეგები", "برچسب‌ها"],
    "Gas, Meter, Industrial": ["Qaz, Sayğac, Sənaye", "Gas, Meter, Industrial", "Gaz, Sayaç, Endüstriyel", "Газ, Счетчик, Промышленность", "გაზი, მრიცხველი, სამრეწველო", "گاز، کنتور، صنعتی"],
    "Publish product": ["Məhsulu yayımla", "Publish product", "Ürünü yayınla", "Опубликовать товар", "პროდუქტის გამოქვეყნება", "انتشار محصول"],
    "Administrator accounts": ["Administrator hesabları", "Administrator accounts", "Yönetici hesapları", "Учетные записи администраторов", "ადმინისტრატორის ანგარიშები", "حساب‌های مدیر"],
    "Close editor access": ["Giriş idarəetməsini bağla", "Close editor access", "Editör erişimini kapat", "Закрыть управление доступом", "წვდომის მართვის დახურვა", "بستن مدیریت دسترسی"],
    "Name": ["Ad", "Name", "Ad", "Имя", "სახელი", "نام"],
    "Editor name": ["Redaktorun adı", "Editor name", "Editör adı", "Имя редактора", "რედაქტორის სახელი", "نام ویرایشگر"],
    "Minimum 8 characters": ["Minimum 8 simvol", "Minimum 8 characters", "En az 8 karakter", "Минимум 8 символов", "მინიმუმ 8 სიმბოლო", "حداقل ۸ نویسه"],
    "Add user": ["İstifadəçi əlavə et", "Add user", "Kullanıcı ekle", "Добавить пользователя", "მომხმარებლის დამატება", "افزودن کاربر"],
    "Delete product?": ["Məhsul silinsin?", "Delete product?", "Ürün silinsin mi?", "Удалить товар?", "წავშალოთ პროდუქტი?", "محصول حذف شود؟"],
    "Delete": ["Sil", "Delete", "Sil", "Удалить", "წაშლა", "حذف"],
    "Select a product": ["Məhsul seçin", "Select a product", "Bir ürün seçin", "Выберите товар", "აირჩიეთ პროდუქტი", "یک محصول انتخاب کنید"],
    "{count} product": ["{count} məhsul", "{count} product", "{count} ürün", "{count} товар", "{count} პროდუქტი", "{count} محصول"],
    "{count} products": ["{count} məhsul", "{count} products", "{count} ürün", "{count} товаров", "{count} პროდუქტი", "{count} محصول"],
    "Edit product": ["Məhsulu redaktə et", "Edit product", "Ürünü düzenle", "Редактировать товар", "პროდუქტის რედაქტირება", "ویرایش محصول"],
    "Delete product": ["Məhsulu sil", "Delete product", "Ürünü sil", "Удалить товар", "პროდუქტის წაშლა", "حذف محصول"],
    "Edit {name}": ["{name} məhsulunu redaktə et", "Edit {name}", "{name} ürününü düzenle", "Редактировать {name}", "{name}-ის რედაქტირება", "ویرایش {name}"],
    "Delete {name}": ["{name} məhsulunu sil", "Delete {name}", "{name} ürününü sil", "Удалить {name}", "{name}-ის წაშლა", "حذف {name}"],
    "View details": ["Detallara bax", "View details", "Ayrıntıları görüntüle", "Смотреть подробности", "დეტალების ნახვა", "مشاهده جزئیات"],
    "View details for {name}": ["{name} detallarına bax", "View details for {name}", "{name} ayrıntılarını görüntüle", "Подробнее о {name}", "{name}-ის დეტალების ნახვა", "مشاهده جزئیات {name}"],
    "I am interested in {name}. Please send price, availability and technical options.": ["{name} məhsulu ilə maraqlanıram. Zəhmət olmasa qiyməti, mövcudluğu və texniki seçimləri göndərin.", "I am interested in {name}. Please send price, availability and technical options.", "{name} ürünüyle ilgileniyorum. Lütfen fiyat, stok ve teknik seçenekleri gönderin.", "Меня интересует {name}. Пожалуйста, сообщите цену, наличие и технические варианты.", "მაინტერესებს {name}. გთხოვთ გამომიგზავნოთ ფასი, ხელმისაწვდომობა და ტექნიკური ვარიანტები.", "به {name} علاقه‌مندم. لطفاً قیمت، موجودی و گزینه‌های فنی را ارسال کنید."],
    "Hello AzTexnoQaz, I want to request a quote for {name}.": ["Salam AzTexnoQaz, {name} üçün qiymət təklifi almaq istəyirəm.", "Hello AzTexnoQaz, I want to request a quote for {name}.", "Merhaba AzTexnoQaz, {name} için fiyat teklifi almak istiyorum.", "Здравствуйте, AzTexnoQaz! Я хочу запросить предложение на {name}.", "გამარჯობა AzTexnoQaz, მსურს {name}-ის ფასის მოთხოვნა.", "سلام AzTexnoQaz، برای {name} درخواست قیمت دارم."],
    "General product request": ["Ümumi məhsul sorğusu", "General product request", "Genel ürün talebi", "Общий запрос продукции", "ზოგადი მოთხოვნა", "درخواست عمومی محصول"],
    "Quote request: {product}": ["Qiymət sorğusu: {product}", "Quote request: {product}", "Teklif talebi: {product}", "Запрос предложения: {product}", "ფასის მოთხოვნა: {product}", "درخواست قیمت: {product}"],
    "Hello AzTexnoQaz,": ["Salam AzTexnoQaz,", "Hello AzTexnoQaz,", "Merhaba AzTexnoQaz,", "Здравствуйте, AzTexnoQaz!", "გამარჯობა AzTexnoQaz,", "سلام AzTexnoQaz،"],
    "I would like to request a quote.": ["Qiymət təklifi almaq istəyirəm.", "I would like to request a quote.", "Fiyat teklifi almak istiyorum.", "Я хотел(а) бы запросить предложение.", "მსურს ფასის მოთხოვნა.", "مایلم درخواست قیمت بدهم."],
    "Product: {product}": ["Məhsul: {product}", "Product: {product}", "Ürün: {product}", "Товар: {product}", "პროდუქტი: {product}", "محصول: {product}"],
    "Name/company: {name}": ["Ad/şirkət: {name}", "Name/company: {name}", "Ad/şirket: {name}", "Имя/компания: {name}", "სახელი/კომპანია: {name}", "نام/شرکت: {name}"],
    "Phone/email: {contact}": ["Telefon/e-poçt: {contact}", "Phone/email: {contact}", "Telefon/e-posta: {contact}", "Телефон/почта: {contact}", "ტელეფონი/ელფოსტა: {contact}", "تلفن/ایمیل: {contact}"],
    "Please send price, availability and suitable technical options.": ["Zəhmət olmasa qiyməti, mövcudluğu və uyğun texniki seçimləri göndərin.", "Please send price, availability and suitable technical options.", "Lütfen fiyat, stok ve uygun teknik seçenekleri gönderin.", "Пожалуйста, сообщите цену, наличие и подходящие технические варианты.", "გთხოვთ გამომიგზავნოთ ფასი, ხელმისაწვდომობა და შესაბამისი ტექნიკური ვარიანტები.", "لطفاً قیمت، موجودی و گزینه‌های فنی مناسب را ارسال کنید."],
    "The request could not be completed.": ["Sorğu tamamlanmadı.", "The request could not be completed.", "İstek tamamlanamadı.", "Не удалось выполнить запрос.", "მოთხოვნა ვერ შესრულდა.", "درخواست انجام نشد."],
    "The product catalog could not be loaded.": ["Məhsul kataloqu yüklənmədi.", "The product catalog could not be loaded.", "Ürün kataloğu yüklenemedi.", "Не удалось загрузить каталог.", "პროდუქციის კატალოგი ვერ ჩაიტვირთა.", "کاتالوگ محصولات بارگیری نشد."],
    "Catalog unavailable": ["Kataloq əlçatan deyil", "Catalog unavailable", "Katalog kullanılamıyor", "Каталог недоступен", "კატალოგი მიუწვდომელია", "کاتالوگ در دسترس نیست"],
    "Editor mode is active on this device.": ["Bu cihazda redaktor rejimi aktivdir.", "Editor mode is active on this device.", "Bu cihazda editör modu etkin.", "Режим редактора активен на этом устройстве.", "ამ მოწყობილობაზე რედაქტორის რეჟიმი აქტიურია.", "حالت ویرایشگر در این دستگاه فعال است."],
    "Signed out from this device.": ["Bu cihazdan çıxış edildi.", "Signed out from this device.", "Bu cihazdan çıkış yapıldı.", "Выполнен выход на этом устройстве.", "ამ მოწყობილობიდან გასვლა შესრულდა.", "از این دستگاه خارج شدید."],
    "Choose a product photo smaller than 8 MB.": ["8 MB-dan kiçik məhsul şəkli seçin.", "Choose a product photo smaller than 8 MB.", "8 MB'den küçük bir ürün fotoğrafı seçin.", "Выберите фото товара размером менее 8 МБ.", "აირჩიეთ 8 მბ-ზე მცირე პროდუქტის ფოტო.", "عکس محصولی کوچک‌تر از ۸ مگابایت انتخاب کنید."],
    "This photo could not be optimized. Choose a smaller image.": ["Bu şəkil optimallaşdırılmadı. Daha kiçik şəkil seçin.", "This photo could not be optimized. Choose a smaller image.", "Bu fotoğraf optimize edilemedi. Daha küçük bir görsel seçin.", "Не удалось оптимизировать фото. Выберите изображение меньшего размера.", "ფოტოს ოპტიმიზაცია ვერ მოხერხდა. აირჩიეთ უფრო მცირე სურათი.", "این عکس بهینه نشد. تصویر کوچک‌تری انتخاب کنید."],
    "Publish changes": ["Dəyişiklikləri yayımla", "Publish changes", "Değişiklikleri yayınla", "Опубликовать изменения", "ცვლილებების გამოქვეყნება", "انتشار تغییرات"],
    "Optimizing product photo...": ["Məhsul şəkli optimallaşdırılır...", "Optimizing product photo...", "Ürün fotoğrafı optimize ediliyor...", "Оптимизация фото товара...", "პროდუქტის ფოტოს ოპტიმიზაცია...", "در حال بهینه‌سازی عکس محصول..."],
    "Product changes are live.": ["Məhsul dəyişiklikləri yayımlandı.", "Product changes are live.", "Ürün değişiklikleri yayınlandı.", "Изменения товара опубликованы.", "პროდუქტის ცვლილებები გამოქვეყნდა.", "تغییرات محصول منتشر شد."],
    "New product is live.": ["Yeni məhsul yayımlandı.", "New product is live.", "Yeni ürün yayınlandı.", "Новый товар опубликован.", "ახალი პროდუქტი გამოქვეყნდა.", "محصول جدید منتشر شد."],
    "“{name}” will be removed from the public catalog.": ["“{name}” açıq kataloqdan silinəcək.", "“{name}” will be removed from the public catalog.", "“{name}” herkese açık katalogdan kaldırılacak.", "«{name}» будет удален из публичного каталога.", "„{name}“ წაიშლება საჯარო კატალოგიდან.", "«{name}» از کاتالوگ عمومی حذف می‌شود."],
    "Product deleted.": ["Məhsul silindi.", "Product deleted.", "Ürün silindi.", "Товар удален.", "პროდუქტი წაიშალა.", "محصول حذف شد."],
    "Active {date}": ["Aktivlik: {date}", "Active {date}", "Etkin: {date}", "Активность: {date}", "აქტიური: {date}", "فعال: {date}"],
    "No approved device sessions": ["Təsdiqlənmiş cihaz sessiyası yoxdur", "No approved device sessions", "Onaylı cihaz oturumu yok", "Нет одобренных сеансов устройств", "დადასტურებული მოწყობილობის სესია არ არის", "نشست تأییدشده‌ای وجود ندارد"],
    "Current": ["Cari hesab", "Current", "Mevcut", "Текущая", "მიმდინარე", "فعلی"],
    "Remove {email}": ["{email} hesabını sil", "Remove {email}", "{email} hesabını kaldır", "Удалить {email}", "{email}-ის წაშლა", "حذف {email}"],
    "Remove user": ["İstifadəçini sil", "Remove user", "Kullanıcıyı kaldır", "Удалить пользователя", "მომხმარებლის წაშლა", "حذف کاربر"],
    "Full administrator access": ["Tam administrator girişi", "Full administrator access", "Tam yönetici erişimi", "Полный доступ администратора", "ადმინისტრატორის სრული წვდომა", "دسترسی کامل مدیر"],
    "Administrator account added.": ["Administrator hesabı əlavə edildi.", "Administrator account added.", "Yönetici hesabı eklendi.", "Учетная запись администратора добавлена.", "ადმინისტრატორის ანგარიში დაემატა.", "حساب مدیر افزوده شد."],
    "Administrator account removed.": ["Administrator hesabı silindi.", "Administrator account removed.", "Yönetici hesabı kaldırıldı.", "Учетная запись администратора удалена.", "ადმინისტრატორის ანგარიში წაიშალა.", "حساب مدیر حذف شد."],
  };

  const languageIndex = new Map(languages.map((language, index) => [language.id, index]));
  const validLanguages = new Set(languageIndex.keys());
  const storageKey = "aztexnogaz_language";
  const textRecords = [];
  const attributeRecords = [];
  let currentLanguage = "az";

  try {
    const savedLanguage = window.localStorage.getItem(storageKey);
    if (validLanguages.has(savedLanguage)) currentLanguage = savedLanguage;
  } catch {
    currentLanguage = "az";
  }

  function normalize(value) {
    return String(value).replace(/\s+/g, " ").trim();
  }

  function translate(key, variables = {}) {
    const values = rows[key];
    const index = languageIndex.get(currentLanguage) ?? 1;
    const template = values?.[index] || values?.[1] || key;
    return template.replace(/\{(\w+)\}/g, (match, name) => String(variables[name] ?? match));
  }

  function collectStaticContent() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parentTag = node.parentElement?.tagName;
      const key = normalize(node.data);
      if (parentTag !== "SCRIPT" && parentTag !== "STYLE" && rows[key]) {
        const leading = node.data.match(/^\s*/)?.[0] || "";
        const trailing = node.data.match(/\s*$/)?.[0] || "";
        textRecords.push({ node, key, leading, trailing });
      }
      node = walker.nextNode();
    }

    document.querySelectorAll("[placeholder], [aria-label], [title]").forEach((element) => {
      ["placeholder", "aria-label", "title"].forEach((attribute) => {
        const key = normalize(element.getAttribute(attribute) || "");
        if (rows[key]) attributeRecords.push({ element, attribute, key });
      });
    });
  }

  function setMenuOpen(open) {
    const button = document.querySelector("#language-button");
    const menu = document.querySelector("#language-menu");
    if (!button || !menu) return;
    button.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    document.querySelector("#language-picker")?.classList.toggle("open", open);
  }

  function applyLanguage(languageId, { persist = true, announce = true } = {}) {
    if (!validLanguages.has(languageId)) languageId = "az";
    currentLanguage = languageId;
    const language = languages.find((item) => item.id === languageId);

    document.documentElement.lang = language.id;
    document.documentElement.dir = language.direction;
    document.documentElement.dataset.language = language.id;
    document.title = translate("_pageTitle");
    document.querySelector('meta[name="description"]')?.setAttribute("content", translate("_pageDescription"));

    textRecords.forEach(({ node, key, leading, trailing }) => {
      node.data = `${leading}${translate(key)}${trailing}`;
    });
    attributeRecords.forEach(({ element, attribute, key }) => {
      element.setAttribute(attribute, translate(key));
    });

    const flag = document.querySelector("#language-current-flag");
    const code = document.querySelector("#language-current-code");
    if (flag) flag.textContent = language.flag;
    if (code) code.textContent = language.code;
    document.querySelectorAll("[data-language]").forEach((option) => {
      const selected = option.dataset.language === language.id;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-checked", String(selected));
    });

    if (persist) {
      try {
        window.localStorage.setItem(storageKey, language.id);
      } catch {
        // The language still applies when storage is unavailable.
      }
    }
    setMenuOpen(false);
    if (announce) window.dispatchEvent(new CustomEvent("aztexnogaz:languagechange", { detail: { language: language.id } }));
  }

  function bindLanguageMenu() {
    const picker = document.querySelector("#language-picker");
    const button = document.querySelector("#language-button");
    if (!picker || !button) return;

    button.addEventListener("click", () => {
      setMenuOpen(button.getAttribute("aria-expanded") !== "true");
    });
    picker.querySelectorAll("[data-language]").forEach((option) => {
      option.addEventListener("click", () => applyLanguage(option.dataset.language));
    });
    document.addEventListener("click", (event) => {
      if (!picker.contains(event.target)) setMenuOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    });
  }

  collectStaticContent();
  bindLanguageMenu();

  window.AzTexnoI18n = {
    applyLanguage,
    get language() {
      return currentLanguage;
    },
    languages,
    t: translate,
  };

  applyLanguage(currentLanguage, { persist: false, announce: false });
})();
