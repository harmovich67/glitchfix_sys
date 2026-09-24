import { allQuestions, formatAnswer, isEmptyValue, type AnswerMap, type WireframeBlock, type WireframeScreen, type WireframeSpec, type WorkflowDefinition } from '@welco/shared';

/**
 * Offline (no API key) wireframe: a sensible set of screens for the kind of product the client chose, with the
 * features they ticked dropped into the home screen. The AI version replaces it with something specific to the brief.
 */
export function mockWireframe(input: { title: string; projectType: string | null; def: WorkflowDefinition; answers: AnswerMap; locale: string }): WireframeSpec {
  const ar = input.locale === 'ar';
  const L = (en: string, a: string) => (ar ? a : en);
  const brand = input.title;

  const features = allQuestions(input.def)
    .filter((q) => q.type === 'feature_checklist' && !isEmptyValue(input.answers[q.key]))
    .flatMap((q) => formatAnswer(q, input.answers[q.key], input.locale))
    .slice(0, 8);

  const nav = (items: string[]): WireframeBlock => ({ type: 'navbar', title: brand, items });
  const foot = (): WireframeBlock => ({ type: 'footer', title: brand, items: [L('About', 'من نحن'), L('Contact', 'تواصل معنا'), L('Privacy', 'الخصوصية'), L('Terms', 'الشروط')] });
  const featureBlock = (): WireframeBlock[] =>
    features.length ? [{ type: 'features', title: L('What you asked for', 'ما طلبتموه'), items: features }] : [];

  const menuOf = (screens: WireframeScreen[]) => screens.map((s) => s.name).slice(0, 5);
  const build = (make: (nav: WireframeBlock) => WireframeScreen[], names: string[]): WireframeScreen[] => make(nav(names));

  const t = input.projectType ?? 'custom';
  let screens: WireframeScreen[];

  if (t === 'ecommerce') {
    const names = [L('Shop', 'المتجر'), L('Categories', 'الأقسام'), L('Offers', 'العروض'), L('Cart', 'السلة')];
    screens = build(
      (n) => [
        { name: L('Home', 'الرئيسية'), purpose: L('Show the brand and lead people to products.', 'عرض العلامة وإرشاد الزائر نحو المنتجات.'), blocks: [n, { type: 'hero', title: L('Your headline for the store', 'عنوان المتجر الرئيسي'), text: L('One sentence on why customers should buy from you.', 'جملة واحدة عن سبب الشراء منكم.'), items: [L('Shop now', 'تسوّق الآن')] }, { type: 'cards', title: L('Shop by category', 'تسوّق حسب القسم'), items: [L('Category 1', 'قسم 1'), L('Category 2', 'قسم 2'), L('Category 3', 'قسم 3'), L('Category 4', 'قسم 4')] }, { type: 'cards', title: L('Featured products', 'منتجات مميزة'), items: [L('Product', 'منتج'), L('Product', 'منتج'), L('Product', 'منتج'), L('Product', 'منتج')] }, ...featureBlock(), { type: 'testimonials', title: L('What customers say', 'آراء العملاء') }, foot()] },
        { name: L('Product list', 'قائمة المنتجات'), purpose: L('Browse, filter and sort products.', 'تصفّح المنتجات وتصفيتها وترتيبها.'), blocks: [n, { type: 'list', title: L('Filters', 'التصفية'), items: [L('Price', 'السعر'), L('Category', 'القسم'), L('Rating', 'التقييم'), L('Availability', 'التوفر')] }, { type: 'cards', title: L('Products', 'المنتجات'), items: Array.from({ length: 6 }, () => L('Product', 'منتج')) }, foot()] },
        { name: L('Product page', 'صفحة المنتج'), purpose: L('Give enough detail to decide and add to cart.', 'تفاصيل كافية للقرار والإضافة إلى السلة.'), blocks: [n, { type: 'gallery', title: L('Product photos', 'صور المنتج') }, { type: 'text', title: L('Product name', 'اسم المنتج'), text: L('Price, short description, size or variant options.', 'السعر ووصف مختصر وخيارات المقاس أو النوع.') }, { type: 'cta', title: L('Add to cart', 'أضف إلى السلة') }, { type: 'testimonials', title: L('Reviews', 'التقييمات') }, foot()] },
        { name: L('Cart & checkout', 'السلة والدفع'), purpose: L('Review the order and pay.', 'مراجعة الطلب والدفع.'), blocks: [n, { type: 'table', title: L('Your cart', 'سلتك'), items: [L('Product', 'المنتج'), L('Qty', 'الكمية'), L('Price', 'السعر')] }, { type: 'form', title: L('Delivery & payment', 'التوصيل والدفع'), items: [L('Full name', 'الاسم الكامل'), L('Address', 'العنوان'), L('Phone', 'الهاتف'), L('Payment method', 'طريقة الدفع')] }, { type: 'cta', title: L('Place order', 'إتمام الطلب') }] },
      ],
      names,
    );
  } else if (t === 'mobile_app') {
    screens = [
      { name: L('Welcome', 'الترحيب'), purpose: L('Explain the app and sign the user in.', 'تعريف بالتطبيق وتسجيل الدخول.'), blocks: [{ type: 'hero', title: brand, text: L('A short promise of what the app does for you.', 'وعد مختصر بما يقدمه التطبيق.'), items: [L('Get started', 'ابدأ الآن')] }, { type: 'form', title: L('Sign in', 'تسجيل الدخول'), items: [L('Email or phone', 'البريد أو الهاتف'), L('Password', 'كلمة المرور')] }] },
      { name: L('Home', 'الرئيسية'), purpose: L('The main thing the user does every day.', 'أهم ما يفعله المستخدم يومياً.'), blocks: [{ type: 'navbar', title: brand, items: [L('Home', 'الرئيسية'), L('Search', 'بحث'), L('Activity', 'النشاط'), L('Profile', 'حسابي')] }, { type: 'stats', title: L('At a glance', 'نظرة سريعة'), items: [L('Metric', 'مؤشر'), L('Metric', 'مؤشر'), L('Metric', 'مؤشر')] }, ...(features.length ? [{ type: 'features' as const, title: L('Key features', 'الميزات الرئيسية'), items: features }] : [{ type: 'list' as const, title: L('Recent items', 'أحدث العناصر'), items: [L('Item', 'عنصر'), L('Item', 'عنصر'), L('Item', 'عنصر')] }])] },
      { name: L('Details', 'التفاصيل'), purpose: L('See one item in full and act on it.', 'عرض عنصر كاملاً واتخاذ إجراء.'), blocks: [{ type: 'gallery', title: L('Media', 'الوسائط') }, { type: 'text', title: L('Title', 'العنوان'), text: L('Description and important details.', 'الوصف وأهم التفاصيل.') }, { type: 'cta', title: L('Primary action', 'الإجراء الرئيسي') }] },
      { name: L('Profile', 'الحساب'), purpose: L('Account, settings and help.', 'الحساب والإعدادات والمساعدة.'), blocks: [{ type: 'list', title: L('Account', 'الحساب'), items: [L('Personal info', 'البيانات الشخصية'), L('Notifications', 'الإشعارات'), L('Language', 'اللغة'), L('Help', 'المساعدة'), L('Log out', 'تسجيل الخروج')] }] },
    ];
  } else if (t === 'saas') {
    const names = [L('Product', 'المنتج'), L('Pricing', 'الأسعار'), L('Sign in', 'دخول')];
    screens = build(
      (n) => [
        { name: L('Landing page', 'صفحة التعريف'), purpose: L('Explain the product and start a free trial.', 'شرح المنتج وبدء تجربة مجانية.'), blocks: [n, { type: 'hero', title: L('The one-line value of your product', 'القيمة الرئيسية لمنتجكم'), items: [L('Start free trial', 'ابدأ التجربة المجانية')] }, ...(featureBlock().length ? featureBlock() : [{ type: 'features' as const, title: L('Features', 'الميزات'), items: [L('Feature', 'ميزة'), L('Feature', 'ميزة'), L('Feature', 'ميزة')] }]), { type: 'testimonials', title: L('Trusted by teams', 'يثق بنا الفرق') }, foot()] },
        { name: L('Pricing', 'الأسعار'), purpose: L('Let visitors compare plans.', 'مقارنة الباقات.'), blocks: [n, { type: 'pricing', title: L('Choose a plan', 'اختر باقتك'), items: [L('Starter', 'الأساسية'), L('Growth', 'النمو'), L('Enterprise', 'المؤسسات')] }, foot()] },
        { name: L('Dashboard', 'لوحة التحكم'), purpose: L('What a signed-in user sees first.', 'ما يراه المستخدم بعد الدخول.'), blocks: [{ type: 'navbar', title: brand, items: [L('Overview', 'نظرة عامة'), L('Reports', 'التقارير'), L('Team', 'الفريق'), L('Settings', 'الإعدادات')] }, { type: 'stats', title: L('Overview', 'نظرة عامة'), items: [L('Metric', 'مؤشر'), L('Metric', 'مؤشر'), L('Metric', 'مؤشر'), L('Metric', 'مؤشر')] }, { type: 'table', title: L('Recent activity', 'أحدث النشاط'), items: [L('Name', 'الاسم'), L('Status', 'الحالة'), L('Date', 'التاريخ')] }] },
      ],
      names,
    );
  } else if (t === 'booking') {
    const names = [L('Services', 'الخدمات'), L('Book', 'احجز'), L('My bookings', 'حجوزاتي')];
    screens = build(
      (n) => [
        { name: L('Home', 'الرئيسية'), purpose: L('Show services and invite people to book.', 'عرض الخدمات ودعوة الزائر للحجز.'), blocks: [n, { type: 'hero', title: L('Book in a minute', 'احجز في دقيقة'), items: [L('Book now', 'احجز الآن')] }, { type: 'cards', title: L('Our services', 'خدماتنا'), items: [L('Service', 'خدمة'), L('Service', 'خدمة'), L('Service', 'خدمة')] }, ...featureBlock(), foot()] },
        { name: L('Choose time', 'اختيار الموعد'), purpose: L('Pick a service, a day and a time.', 'اختيار الخدمة واليوم والوقت.'), blocks: [n, { type: 'list', title: L('Service', 'الخدمة'), items: [L('Service 1', 'الخدمة 1'), L('Service 2', 'الخدمة 2'), L('Service 3', 'الخدمة 3')] }, { type: 'table', title: L('Available times', 'المواعيد المتاحة'), items: [L('Day', 'اليوم'), L('Time', 'الوقت'), L('Staff', 'الموظف')] }, { type: 'cta', title: L('Continue', 'متابعة') }] },
        { name: L('Confirm', 'التأكيد'), purpose: L('Collect details and confirm the booking.', 'جمع البيانات وتأكيد الحجز.'), blocks: [n, { type: 'form', title: L('Your details', 'بياناتك'), items: [L('Full name', 'الاسم الكامل'), L('Phone', 'الهاتف'), L('Notes', 'ملاحظات')] }, { type: 'cta', title: L('Confirm booking', 'تأكيد الحجز') }] },
      ],
      names,
    );
  } else if (t === 'real_estate') {
    const names = [L('Buy', 'شراء'), L('Rent', 'إيجار'), L('Agents', 'الوسطاء')];
    screens = build(
      (n) => [
        { name: L('Home', 'الرئيسية'), purpose: L('Search first, browse second.', 'البحث أولاً ثم التصفح.'), blocks: [n, { type: 'hero', title: L('Find your next property', 'اعثر على عقارك القادم'), items: [L('Location', 'الموقع'), L('Type', 'النوع'), L('Price', 'السعر'), L('Search', 'بحث')] }, { type: 'cards', title: L('Featured properties', 'عقارات مميزة'), items: Array.from({ length: 4 }, () => L('Property', 'عقار')) }, ...featureBlock(), foot()] },
        { name: L('Results', 'النتائج'), purpose: L('Filter and compare properties.', 'تصفية العقارات ومقارنتها.'), blocks: [n, { type: 'list', title: L('Filters', 'التصفية'), items: [L('Price', 'السعر'), L('Bedrooms', 'الغرف'), L('Area', 'المساحة'), L('Location', 'الموقع')] }, { type: 'cards', title: L('Properties', 'العقارات'), items: Array.from({ length: 6 }, () => L('Property', 'عقار')) }, foot()] },
        { name: L('Property page', 'صفحة العقار'), purpose: L('Photos, details and a way to contact the agent.', 'الصور والتفاصيل وطريقة التواصل مع الوسيط.'), blocks: [n, { type: 'gallery', title: L('Photos', 'الصور') }, { type: 'text', title: L('Details', 'التفاصيل'), text: L('Price, area, rooms and description.', 'السعر والمساحة والغرف والوصف.') }, { type: 'form', title: L('Contact the agent', 'تواصل مع الوسيط'), items: [L('Name', 'الاسم'), L('Phone', 'الهاتف'), L('Message', 'الرسالة')] }, foot()] },
      ],
      names,
    );
  } else if (t === 'landing_page') {
    screens = [
      { name: L('Landing page', 'صفحة الهبوط'), purpose: L('One page, one goal: get the visitor to act.', 'صفحة واحدة بهدف واحد: أن يتخذ الزائر إجراءً.'), blocks: [{ type: 'navbar', title: brand, items: [L('Benefits', 'المزايا'), L('Proof', 'الإثباتات'), L('Contact', 'تواصل')] }, { type: 'hero', title: L('Your headline', 'العنوان الرئيسي'), text: L('One sentence on the promise.', 'جملة واحدة عن الوعد.'), items: [L('Get started', 'ابدأ الآن')] }, ...(featureBlock().length ? featureBlock() : [{ type: 'features' as const, title: L('Benefits', 'المزايا'), items: [L('Benefit', 'ميزة'), L('Benefit', 'ميزة'), L('Benefit', 'ميزة')] }]), { type: 'testimonials', title: L('Social proof', 'آراء العملاء') }, { type: 'form', title: L('Get in touch', 'تواصل معنا'), items: [L('Name', 'الاسم'), L('Email', 'البريد'), L('Message', 'الرسالة')] }, foot()] },
    ];
  } else if (t === 'company_website') {
    const names = [L('About', 'من نحن'), L('Services', 'الخدمات'), L('Our work', 'أعمالنا'), L('Contact', 'تواصل')];
    screens = build(
      (n) => [
        { name: L('Home', 'الرئيسية'), purpose: L('Say who you are and what you do.', 'من نحن وماذا نقدّم.'), blocks: [n, { type: 'hero', title: L('Your company in one line', 'شركتكم في جملة'), items: [L('Contact us', 'تواصل معنا')] }, { type: 'cards', title: L('Our services', 'خدماتنا'), items: [L('Service', 'خدمة'), L('Service', 'خدمة'), L('Service', 'خدمة')] }, ...featureBlock(), { type: 'gallery', title: L('Selected work', 'من أعمالنا') }, { type: 'testimonials', title: L('Clients', 'العملاء') }, foot()] },
        { name: L('About', 'من نحن'), purpose: L('Build trust: story, team, values.', 'بناء الثقة: القصة والفريق والقيم.'), blocks: [n, { type: 'text', title: L('Our story', 'قصتنا'), text: L('A short paragraph about the company.', 'فقرة قصيرة عن الشركة.') }, { type: 'cards', title: L('Team', 'الفريق'), items: [L('Person', 'عضو'), L('Person', 'عضو'), L('Person', 'عضو')] }, foot()] },
        { name: L('Contact', 'تواصل'), purpose: L('Make it easy to reach you.', 'تسهيل التواصل معكم.'), blocks: [n, { type: 'form', title: L('Send us a message', 'أرسل لنا رسالة'), items: [L('Name', 'الاسم'), L('Email', 'البريد'), L('Message', 'الرسالة')] }, { type: 'text', title: L('Find us', 'موقعنا'), text: L('Address, phone and working hours.', 'العنوان والهاتف وساعات العمل.') }, foot()] },
      ],
      names,
    );
  } else {
    screens = [
      { name: L('Dashboard', 'لوحة التحكم'), purpose: L('The overview each user lands on.', 'النظرة العامة عند الدخول.'), blocks: [{ type: 'navbar', title: brand, items: menuOf([{ name: L('Overview', 'نظرة عامة'), blocks: [] }, { name: L('Records', 'السجلات'), blocks: [] }, { name: L('Reports', 'التقارير'), blocks: [] }, { name: L('Settings', 'الإعدادات'), blocks: [] }]) }, { type: 'stats', title: L('Overview', 'نظرة عامة'), items: [L('Metric', 'مؤشر'), L('Metric', 'مؤشر'), L('Metric', 'مؤشر')] }, ...featureBlock(), { type: 'table', title: L('Latest records', 'أحدث السجلات'), items: [L('Name', 'الاسم'), L('Status', 'الحالة'), L('Date', 'التاريخ')] }] },
      { name: L('Record details', 'تفاصيل السجل'), purpose: L('View and edit a single record.', 'عرض سجل وتعديله.'), blocks: [{ type: 'form', title: L('Details', 'التفاصيل'), items: [L('Name', 'الاسم'), L('Status', 'الحالة'), L('Owner', 'المسؤول'), L('Notes', 'ملاحظات')] }, { type: 'cta', title: L('Save', 'حفظ') }] },
    ];
  }

  return {
    title: brand,
    summary: L(
      'A rough first layout to agree the main screens and what goes on each one. Colours, images and final wording come later.',
      'تصوّر أولي مبسّط للاتفاق على الشاشات الرئيسية ومحتوى كل منها. الألوان والصور والصياغة النهائية تأتي لاحقاً.',
    ),
    screens,
  };
}
