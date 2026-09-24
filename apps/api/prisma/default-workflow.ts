import type { Condition, QuestionOption, WorkflowQuestion, WorkflowStep } from '@welco/shared';

/** The default discovery journey shipped with Welco (English + Arabic). Fully editable in the Workflow Builder. */

type Opt = [value: string, label: string, ar: string, extra?: Partial<QuestionOption> & { arDesc?: string }];

const opts = (list: Opt[]): QuestionOption[] =>
  list.map(([value, label, ar, extra]) => {
    const { arDesc, ...rest } = extra ?? {};
    return { value, label, ...rest, i18n: { ar: { label: ar, ...(arDesc ? { description: arDesc } : {}) } } };
  });

const when = (question: string, op: Condition['rules'][number]['op'], value?: string | string[]): Condition => ({
  match: 'all',
  rules: [{ question, op, value }],
});

type QInput = Omit<WorkflowQuestion, 'order' | 'enabled' | 'required' | 'i18n'> & {
  required?: boolean;
  ar: { label: string; placeholder?: string; helpText?: string };
};
const q = (input: QInput, order: number): WorkflowQuestion => {
  const { ar, ...rest } = input;
  return { enabled: true, required: false, ...rest, order, i18n: { ar } };
};

type SInput = Omit<WorkflowStep, 'order' | 'enabled' | 'questions' | 'i18n'> & {
  ar: { title: string; description?: string };
  questions: QInput[];
};
const step = (input: SInput, order: number): WorkflowStep => {
  const { ar, questions, ...rest } = input;
  return { enabled: true, ...rest, order, i18n: { ar }, questions: questions.map((x, i) => q(x, i)) };
};

export const PROJECT_TYPES = opts([
  ['ecommerce', 'Ecommerce Store', 'متجر إلكتروني', { icon: 'ShoppingBag', description: 'Sell products online with cart & payments', arDesc: 'بيع المنتجات أونلاين مع سلة ودفع' }],
  ['company_website', 'Company Website', 'موقع شركة', { icon: 'Building2', description: 'Present your company, services and work', arDesc: 'عرّف بشركتك وخدماتك وأعمالك' }],
  ['mobile_app', 'Mobile Application', 'تطبيق جوال', { icon: 'Smartphone', description: 'iOS & Android apps for your customers', arDesc: 'تطبيقات iOS و Android لعملائك' }],
  ['saas', 'SaaS Platform', 'منصة SaaS', { icon: 'Layers', description: 'Subscription software used in the browser', arDesc: 'برنامج باشتراك يعمل من المتصفح' }],
  ['booking', 'Booking System', 'نظام حجوزات', { icon: 'CalendarCheck', description: 'Appointments, reservations & scheduling', arDesc: 'مواعيد وحجوزات وجدولة' }],
  ['real_estate', 'Real Estate Platform', 'منصة عقارية', { icon: 'Home', description: 'Property listings, search & agents', arDesc: 'عرض العقارات والبحث والوسطاء' }],
  ['landing_page', 'Landing Page', 'صفحة هبوط', { icon: 'Rocket', description: 'One focused page for a launch or campaign', arDesc: 'صفحة واحدة لإطلاق منتج أو حملة' }],
  ['custom', 'Custom System', 'نظام مخصص', { icon: 'Code2', description: 'Internal tools, portals, ERPs & more', arDesc: 'أنظمة داخلية وبوابات وأنظمة ERP' }],
  ['other', 'Something else', 'شيء آخر', { icon: 'Sparkles', description: 'Not sure yet? We’ll figure it out together', arDesc: 'لست متأكداً؟ سنكتشف ذلك معاً' }],
]);

const feature = (question: string, types: string[], label: string, ar: string, list: Opt[]): QInput => ({
  key: question,
  type: 'feature_checklist',
  label,
  helpText: 'Select everything you need for launch. You can ask the assistant what each feature means.',
  conditions: types.length === 1 ? when('project_type', 'eq', types[0]) : when('project_type', 'in', types),
  options: opts(list),
  aiHint: 'Suggest a focused first version that matches the business goals.',
  ar: { label: ar, helpText: 'اختر كل ما تحتاجه للإطلاق، ويمكنك سؤال المساعد عن معنى أي ميزة.' },
});

const STEPS: SInput[] = [
  {
    key: 'project_type',
    title: 'What do you want to build?',
    description: 'Pick the option closest to your idea — you can refine everything later.',
    icon: 'Rocket',
    ar: { title: 'ماذا تريد أن تبني؟', description: 'اختر الأقرب لفكرتك — يمكنك تعديل كل شيء لاحقاً.' },
    questions: [
      { key: 'project_type', type: 'visual_choice', label: 'Project type', required: true, validation: { max: 1 }, options: PROJECT_TYPES, ar: { label: 'نوع المشروع' } },
      {
        key: 'project_name',
        type: 'text',
        label: 'Give your project a name',
        placeholder: 'e.g. Aurora Perfumes Online Store',
        required: true,
        validation: { min: 3, max: 120 },
        ar: { label: 'اختر اسماً لمشروعك', placeholder: 'مثال: متجر أورورا للعطور' },
      },
      {
        key: 'project_goal',
        type: 'textarea',
        label: 'What should this project achieve?',
        placeholder: 'e.g. Start selling our perfumes online across the GCC and reach 500 orders per month.',
        aiHint: 'A clear business goal with a measurable outcome.',
        ar: { label: 'ما الهدف من هذا المشروع؟', placeholder: 'مثال: البدء ببيع عطورنا أونلاين في الخليج والوصول إلى ٥٠٠ طلب شهرياً.' },
      },
    ],
  },
  {
    key: 'business',
    title: 'Tell us about your business',
    description: 'This helps the team understand your market and your customers.',
    icon: 'Briefcase',
    ar: { title: 'حدثنا عن نشاطك التجاري', description: 'يساعد ذلك الفريق على فهم سوقك وعملائك.' },
    questions: [
      { key: 'company_name', type: 'text', label: 'Company name', required: true, placeholder: 'Your company or brand', ar: { label: 'اسم الشركة', placeholder: 'اسم شركتك أو علامتك' } },
      {
        key: 'industry',
        type: 'select',
        label: 'Industry',
        required: true,
        options: opts([
          ['retail', 'Retail & fashion', 'التجزئة والأزياء'],
          ['beauty', 'Beauty & cosmetics', 'التجميل ومستحضرات العناية'],
          ['food', 'Food & hospitality', 'الأغذية والضيافة'],
          ['health', 'Health & clinics', 'الصحة والعيادات'],
          ['education', 'Education', 'التعليم'],
          ['real_estate', 'Real estate', 'العقارات'],
          ['finance', 'Finance & fintech', 'المالية والتقنية المالية'],
          ['technology', 'Technology', 'التقنية'],
          ['travel', 'Travel & tourism', 'السفر والسياحة'],
          ['services', 'Professional services', 'الخدمات المهنية'],
          ['nonprofit', 'Non-profit', 'غير ربحي'],
          ['other', 'Other', 'أخرى'],
        ]),
        ar: { label: 'المجال' },
      },
      {
        key: 'business_description',
        type: 'textarea',
        label: 'Describe your business',
        placeholder: 'What do you sell or offer, and what makes you different?',
        required: true,
        validation: { min: 20 },
        aiHint: 'What the business offers, its unique value, and its current stage.',
        ar: { label: 'صف نشاطك التجاري', placeholder: 'ماذا تبيع أو تقدم؟ وما الذي يميزك؟' },
      },
      {
        key: 'target_customers',
        type: 'textarea',
        label: 'Who are your target customers?',
        placeholder: 'e.g. Women 25–45 in Saudi Arabia who buy premium gifts',
        required: true,
        aiHint: 'Demographics, location and needs of the ideal customer.',
        ar: { label: 'من هم عملاؤك المستهدفون؟', placeholder: 'مثال: نساء بين ٢٥–٤٥ في السعودية يشترين الهدايا الفاخرة' },
      },
      { key: 'country', type: 'country', label: 'Main country of operation', required: true, ar: { label: 'الدولة الرئيسية' } },
      {
        key: 'languages',
        type: 'multi_choice',
        label: 'Which languages should it support?',
        required: true,
        validation: { min: 1 },
        options: opts([
          ['ar', 'Arabic', 'العربية'],
          ['en', 'English', 'الإنجليزية'],
          ['fr', 'French', 'الفرنسية'],
          ['es', 'Spanish', 'الإسبانية'],
          ['tr', 'Turkish', 'التركية'],
          ['ur', 'Urdu', 'الأردية'],
        ]),
        ar: { label: 'ما اللغات المطلوبة؟' },
      },
    ],
  },
  {
    key: 'brand',
    title: 'Your brand identity',
    description: 'Share what you already have — or tell us you need a new identity.',
    icon: 'Palette',
    ar: { title: 'هويتك البصرية', description: 'شاركنا ما لديك — أو أخبرنا أنك تحتاج هوية جديدة.' },
    questions: [
      {
        key: 'brand_status',
        type: 'single_choice',
        label: 'Do you have a brand identity?',
        required: true,
        options: opts([
          ['full', 'Yes, a complete identity', 'نعم، هوية كاملة', { description: 'Logo, colours, fonts and guidelines', arDesc: 'شعار وألوان وخطوط ودليل استخدام' }],
          ['partial', 'I have a logo', 'لدي شعار فقط', { description: 'But no full brand guidelines', arDesc: 'لكن بدون دليل هوية كامل' }],
          ['none', 'I need a new identity', 'أحتاج هوية جديدة', { description: 'We can design it for you', arDesc: 'يمكننا تصميمها لك' }],
        ]),
        ar: { label: 'هل لديك هوية بصرية؟' },
      },
      { key: 'logo', type: 'file', label: 'Upload your logo', validation: { accept: 'image', maxFiles: 3 }, conditions: when('brand_status', 'in', ['full', 'partial']), ar: { label: 'ارفع شعارك' } },
      { key: 'brand_colors', type: 'color', label: 'Brand or favourite colours', helpText: 'Pick up to 5 colours.', validation: { max: 5 }, ar: { label: 'ألوان علامتك أو الألوان المفضلة', helpText: 'اختر حتى ٥ ألوان.' } },
      {
        key: 'font_style',
        type: 'visual_choice',
        label: 'Typography feel',
        validation: { max: 1 },
        options: opts([
          ['sans', 'Clean Sans', 'خط عصري بسيط', { preview: 'font:sans' }],
          ['serif', 'Elegant Serif', 'خط كلاسيكي أنيق', { preview: 'font:serif' }],
          ['display', 'Bold Display', 'خط عريض لافت', { preview: 'font:display' }],
          ['rounded', 'Friendly Rounded', 'خط دائري ودود', { preview: 'font:rounded' }],
          ['mono', 'Technical Mono', 'خط تقني', { preview: 'font:mono' }],
        ]),
        ar: { label: 'طابع الخطوط' },
      },
      { key: 'brand_guidelines', type: 'file', label: 'Brand guidelines (PDF)', validation: { accept: 'document', maxFiles: 3 }, conditions: when('brand_status', 'eq', 'full'), ar: { label: 'دليل الهوية (PDF)' } },
      { key: 'existing_website', type: 'url', label: 'Existing website', placeholder: 'https://', ar: { label: 'الموقع الحالي' } },
      { key: 'social_links', type: 'url_list', label: 'Social media links', placeholder: 'https://instagram.com/yourbrand', ar: { label: 'روابط التواصل الاجتماعي' } },
    ],
  },
  {
    key: 'design',
    title: 'Design direction',
    description: 'Choose the look and feel that fits your brand. Pick up to two.',
    icon: 'Wand2',
    ar: { title: 'الاتجاه التصميمي', description: 'اختر الطابع الذي يناسب علامتك، حتى خيارين.' },
    questions: [
      {
        key: 'design_style',
        type: 'visual_choice',
        label: 'Visual style',
        required: true,
        validation: { min: 1, max: 2 },
        options: opts([
          ['modern', 'Modern', 'عصري', { preview: 'style:modern', description: 'Bold type, gradients, generous space', arDesc: 'خطوط جريئة وتدرجات ومساحات واسعة' }],
          ['luxury', 'Luxury', 'فاخر', { preview: 'style:luxury', description: 'Refined serif, gold accents, calm', arDesc: 'خطوط راقية ولمسات ذهبية' }],
          ['minimal', 'Minimal', 'بسيط', { preview: 'style:minimal', description: 'Only what matters, lots of white', arDesc: 'الأساسيات فقط مع مساحات بيضاء' }],
          ['dark', 'Dark', 'داكن', { preview: 'style:dark', description: 'Deep backgrounds, glowing accents', arDesc: 'خلفيات داكنة ولمسات مضيئة' }],
          ['corporate', 'Corporate', 'مؤسسي', { preview: 'style:corporate', description: 'Trustworthy, structured, clear', arDesc: 'موثوق ومنظم وواضح' }],
          ['creative', 'Creative', 'إبداعي', { preview: 'style:creative', description: 'Playful shapes and vivid colour', arDesc: 'أشكال مرحة وألوان حيوية' }],
        ]),
        ar: { label: 'الطابع البصري' },
      },
      {
        key: 'color_mode',
        type: 'single_choice',
        label: 'Light or dark interface?',
        options: opts([
          ['light', 'Light', 'فاتح'],
          ['dark', 'Dark', 'داكن'],
          ['both', 'Both, with a switch', 'الاثنان مع زر تبديل'],
        ]),
        ar: { label: 'واجهة فاتحة أم داكنة؟' },
      },
      { key: 'inspiration', type: 'url_list', label: 'Websites or apps you love', placeholder: 'https://', helpText: 'Tell us what you like about each one in the notes step.', ar: { label: 'مواقع أو تطبيقات تعجبك', helpText: 'أخبرنا بما يعجبك في كل منها في خطوة الملاحظات.' } },
    ],
  },
  {
    key: 'store_setup',
    title: 'Store setup',
    description: 'A few details about how you sell.',
    icon: 'Store',
    conditions: when('project_type', 'eq', 'ecommerce'),
    ar: { title: 'إعداد المتجر', description: 'بعض التفاصيل عن طريقة البيع.' },
    questions: [
      {
        key: 'product_count',
        type: 'single_choice',
        label: 'How many products will you sell?',
        required: true,
        options: opts([
          ['under_50', 'Under 50', 'أقل من ٥٠'],
          ['50_500', '50 – 500', '٥٠ – ٥٠٠'],
          ['500_5000', '500 – 5,000', '٥٠٠ – ٥٬٠٠٠'],
          ['over_5000', 'More than 5,000', 'أكثر من ٥٬٠٠٠'],
        ]),
        ar: { label: 'كم عدد المنتجات تقريباً؟' },
      },
      {
        key: 'payment_methods',
        type: 'multi_choice',
        label: 'Payment methods',
        required: true,
        validation: { min: 1 },
        options: opts([
          ['cards', 'Credit / debit cards', 'البطاقات الائتمانية'],
          ['apple_pay', 'Apple Pay', 'Apple Pay'],
          ['mada', 'mada', 'مدى'],
          ['stc_pay', 'STC Pay', 'STC Pay'],
          ['paypal', 'PayPal', 'PayPal'],
          ['bnpl', 'Buy now, pay later', 'اشترِ الآن وادفع لاحقاً'],
          ['cod', 'Cash on delivery', 'الدفع عند الاستلام'],
          ['bank_transfer', 'Bank transfer', 'تحويل بنكي'],
        ]),
        ar: { label: 'طرق الدفع' },
      },
      {
        key: 'shipping_methods',
        type: 'multi_choice',
        label: 'How will orders reach customers?',
        options: opts([
          ['local_courier', 'Local courier', 'شركة شحن محلية'],
          ['international', 'International shipping', 'شحن دولي'],
          ['pickup', 'Store pickup', 'الاستلام من المتجر'],
          ['digital', 'Digital delivery', 'تسليم رقمي'],
        ]),
        ar: { label: 'كيف ستصل الطلبات للعملاء؟' },
      },
    ],
  },
  {
    key: 'website_content',
    title: 'Website content',
    description: 'Help us plan the pages and content.',
    icon: 'LayoutGrid',
    conditions: when('project_type', 'in', ['company_website', 'landing_page']),
    ar: { title: 'محتوى الموقع', description: 'ساعدنا في تخطيط الصفحات والمحتوى.' },
    questions: [
      {
        key: 'pages_count',
        type: 'single_choice',
        label: 'How many pages do you expect?',
        required: true,
        options: opts([
          ['one', 'A single page', 'صفحة واحدة'],
          ['2_5', '2 – 5 pages', '٢ – ٥ صفحات'],
          ['6_10', '6 – 10 pages', '٦ – ١٠ صفحات'],
          ['10_plus', 'More than 10', 'أكثر من ١٠'],
        ]),
        ar: { label: 'كم صفحة تتوقع؟' },
      },
      {
        key: 'content_ready',
        type: 'single_choice',
        label: 'Is your content (texts & images) ready?',
        options: opts([
          ['ready', 'Yes, it’s ready', 'نعم، جاهز'],
          ['partial', 'Partly', 'جزئياً'],
          ['need_help', 'I need copywriting help', 'أحتاج مساعدة في كتابة المحتوى'],
        ]),
        ar: { label: 'هل المحتوى (النصوص والصور) جاهز؟' },
      },
      { key: 'services_list', type: 'textarea', label: 'List your main services', conditions: when('project_type', 'eq', 'company_website'), placeholder: 'One per line', ar: { label: 'اذكر خدماتك الرئيسية', placeholder: 'خدمة في كل سطر' } },
    ],
  },
  {
    key: 'app_details',
    title: 'App details',
    description: 'Where your app will live and how people will use it.',
    icon: 'Smartphone',
    conditions: when('project_type', 'eq', 'mobile_app'),
    ar: { title: 'تفاصيل التطبيق', description: 'أين سيعمل تطبيقك وكيف سيستخدمه الناس.' },
    questions: [
      {
        key: 'platforms',
        type: 'multi_choice',
        label: 'Platforms',
        required: true,
        validation: { min: 1 },
        options: opts([
          ['ios', 'iPhone (iOS)', 'آيفون (iOS)'],
          ['android', 'Android', 'أندرويد'],
          ['tablet', 'Tablets', 'الأجهزة اللوحية'],
          ['web_admin', 'Web admin dashboard', 'لوحة تحكم ويب'],
        ]),
        ar: { label: 'المنصات' },
      },
      {
        key: 'app_accounts',
        type: 'single_choice',
        label: 'Do users need an account?',
        options: opts([
          ['required', 'Yes, login required', 'نعم، تسجيل الدخول إلزامي'],
          ['optional', 'Optional', 'اختياري'],
          ['none', 'No accounts', 'بدون حسابات'],
        ]),
        ar: { label: 'هل يحتاج المستخدم حساباً؟' },
      },
    ],
  },
  {
    key: 'platform_details',
    title: 'Platform details',
    description: 'Tell us who uses the system and how.',
    icon: 'Layers',
    conditions: when('project_type', 'in', ['saas', 'booking', 'real_estate', 'custom', 'other']),
    ar: { title: 'تفاصيل المنصة', description: 'أخبرنا من سيستخدم النظام وكيف.' },
    questions: [
      {
        key: 'user_roles',
        type: 'textarea',
        label: 'Who will use the platform?',
        placeholder: 'e.g. Customers book, staff manage their calendar, admins see reports',
        required: true,
        aiHint: 'The user types and what each one needs to do.',
        ar: { label: 'من سيستخدم المنصة؟', placeholder: 'مثال: العملاء يحجزون، الموظفون يديرون جداولهم، والإدارة تتابع التقارير' },
      },
      {
        key: 'billing_model',
        type: 'single_choice',
        label: 'How will you charge customers?',
        conditions: when('project_type', 'eq', 'saas'),
        options: opts([
          ['subscription', 'Monthly / yearly subscription', 'اشتراك شهري / سنوي'],
          ['freemium', 'Free plan + paid upgrades', 'خطة مجانية مع ترقيات مدفوعة'],
          ['usage', 'Pay per use', 'الدفع حسب الاستخدام'],
          ['one_time', 'One-time purchase', 'شراء لمرة واحدة'],
        ]),
        ar: { label: 'كيف ستحصّل الرسوم من العملاء؟' },
      },
      {
        key: 'booking_type',
        type: 'single_choice',
        label: 'What will people book?',
        conditions: when('project_type', 'eq', 'booking'),
        options: opts([
          ['appointments', 'Appointments (clinics, salons…)', 'مواعيد (عيادات، صالونات…)'],
          ['classes', 'Classes & events', 'دورات وفعاليات'],
          ['rentals', 'Rentals (cars, equipment…)', 'تأجير (سيارات، معدات…)'],
          ['tables', 'Tables & venues', 'طاولات وقاعات'],
        ]),
        ar: { label: 'ماذا سيحجز العملاء؟' },
      },
      {
        key: 'property_types',
        type: 'multi_choice',
        label: 'Property types',
        conditions: when('project_type', 'eq', 'real_estate'),
        options: opts([
          ['apartments', 'Apartments', 'شقق'],
          ['villas', 'Villas', 'فلل'],
          ['offices', 'Offices & commercial', 'مكاتب وتجاري'],
          ['land', 'Land', 'أراضٍ'],
          ['short_stays', 'Short stays', 'إقامات قصيرة'],
        ]),
        ar: { label: 'أنواع العقارات' },
      },
      {
        key: 'custom_description',
        type: 'textarea',
        label: 'Describe the system you have in mind',
        required: true,
        conditions: when('project_type', 'in', ['custom', 'other']),
        aiHint: 'Main processes, users and the problem it solves.',
        ar: { label: 'صف النظام الذي تفكر فيه' },
      },
    ],
  },
  {
    key: 'features',
    title: 'Features you need',
    description: 'Pick everything you need at launch. Not sure? Ask the assistant.',
    icon: 'ListChecks',
    ar: { title: 'الميزات المطلوبة', description: 'اختر ما تحتاجه عند الإطلاق. لست متأكداً؟ اسأل المساعد.' },
    questions: [
      feature('features_ecommerce', ['ecommerce'], 'Store features', 'ميزات المتجر', [
        ['products', 'Product catalogue', 'كتالوج المنتجات', { icon: 'Package', description: 'Photos, variants, prices', arDesc: 'صور وخيارات وأسعار' }],
        ['categories', 'Categories & filters', 'التصنيفات والفلاتر', { icon: 'LayoutGrid', description: 'Help shoppers find things', arDesc: 'تساعد المتسوق في الوصول' }],
        ['payments', 'Online payments', 'الدفع الإلكتروني', { icon: 'CreditCard', description: 'Secure checkout', arDesc: 'إتمام شراء آمن' }],
        ['shipping', 'Shipping & delivery', 'الشحن والتوصيل', { icon: 'Truck', description: 'Rates, zones, tracking', arDesc: 'أسعار ومناطق وتتبع' }],
        ['accounts', 'Customer accounts', 'حسابات العملاء', { icon: 'UserRound', description: 'Order history & addresses', arDesc: 'سجل الطلبات والعناوين' }],
        ['reviews', 'Reviews & ratings', 'التقييمات والمراجعات', { icon: 'Star', description: 'Social proof', arDesc: 'ثقة اجتماعية' }],
        ['coupons', 'Coupons & discounts', 'الكوبونات والخصومات', { icon: 'TicketPercent', description: 'Promotions', arDesc: 'العروض الترويجية' }],
        ['wishlist', 'Wishlist', 'قائمة الأمنيات', { icon: 'Heart' }],
        ['inventory', 'Inventory management', 'إدارة المخزون', { icon: 'Boxes', description: 'Stock levels & alerts', arDesc: 'الكميات والتنبيهات' }],
        ['multi_currency', 'Multi-currency', 'تعدد العملات', { icon: 'Coins' }],
        ['loyalty', 'Loyalty points', 'نقاط الولاء', { icon: 'Gift' }],
        ['abandoned_cart', 'Abandoned cart recovery', 'استرجاع السلات المتروكة', { icon: 'ShoppingCart' }],
      ]),
      feature('features_company', ['company_website'], 'Website sections', 'أقسام الموقع', [
        ['about', 'About us', 'من نحن', { icon: 'Info' }],
        ['services', 'Services', 'الخدمات', { icon: 'Briefcase' }],
        ['portfolio', 'Portfolio / projects', 'معرض الأعمال', { icon: 'Images' }],
        ['blog', 'Blog / news', 'المدونة / الأخبار', { icon: 'Newspaper' }],
        ['contact', 'Contact form & map', 'نموذج تواصل وخريطة', { icon: 'Mail' }],
        ['careers', 'Careers', 'الوظائف', { icon: 'BadgeCheck' }],
        ['testimonials', 'Testimonials', 'آراء العملاء', { icon: 'Quote' }],
        ['team', 'Team', 'فريق العمل', { icon: 'Users' }],
        ['faq', 'FAQ', 'الأسئلة الشائعة', { icon: 'HelpCircle' }],
        ['newsletter', 'Newsletter signup', 'الاشتراك في النشرة', { icon: 'Send' }],
      ]),
      feature('features_landing', ['landing_page'], 'Landing page blocks', 'أقسام صفحة الهبوط', [
        ['hero', 'Hero with call-to-action', 'واجهة رئيسية مع زر إجراء', { icon: 'Sparkles' }],
        ['lead_form', 'Lead capture form', 'نموذج جمع العملاء', { icon: 'ClipboardList' }],
        ['pricing', 'Pricing table', 'جدول الأسعار', { icon: 'Tags' }],
        ['testimonials', 'Testimonials', 'آراء العملاء', { icon: 'Quote' }],
        ['faq', 'FAQ', 'الأسئلة الشائعة', { icon: 'HelpCircle' }],
        ['video', 'Product video', 'فيديو تعريفي', { icon: 'PlayCircle' }],
        ['countdown', 'Launch countdown', 'عداد تنازلي للإطلاق', { icon: 'Timer' }],
        ['analytics', 'Conversion tracking', 'تتبع التحويلات', { icon: 'LineChart' }],
      ]),
      feature('features_app', ['mobile_app'], 'App features', 'ميزات التطبيق', [
        ['auth', 'Sign up & login', 'التسجيل والدخول', { icon: 'KeyRound' }],
        ['push', 'Push notifications', 'الإشعارات الفورية', { icon: 'BellRing' }],
        ['payments', 'In-app payments', 'الدفع داخل التطبيق', { icon: 'CreditCard' }],
        ['maps', 'Maps & location', 'الخرائط والموقع', { icon: 'MapPin' }],
        ['chat', 'Chat / messaging', 'المحادثات', { icon: 'MessagesSquare' }],
        ['offline', 'Works offline', 'يعمل بدون إنترنت', { icon: 'WifiOff' }],
        ['social_login', 'Social login', 'الدخول عبر الشبكات الاجتماعية', { icon: 'Share2' }],
        ['analytics', 'Usage analytics', 'تحليلات الاستخدام', { icon: 'LineChart' }],
      ]),
      feature('features_saas', ['saas'], 'Platform features', 'ميزات المنصة', [
        ['subscriptions', 'Subscriptions & billing', 'الاشتراكات والفوترة', { icon: 'Repeat' }],
        ['teams', 'Teams & invitations', 'الفرق والدعوات', { icon: 'Users' }],
        ['dashboard', 'Customer dashboard', 'لوحة تحكم العميل', { icon: 'LayoutDashboard' }],
        ['roles', 'Roles & permissions', 'الأدوار والصلاحيات', { icon: 'ShieldCheck' }],
        ['onboarding', 'Onboarding flow', 'تجربة الإعداد الأولي', { icon: 'Route' }],
        ['notifications', 'Email & in-app notifications', 'إشعارات البريد والتطبيق', { icon: 'Bell' }],
        ['analytics', 'Reports & analytics', 'التقارير والتحليلات', { icon: 'BarChart3' }],
        ['api', 'Public API', 'واجهة برمجية عامة', { icon: 'Plug' }],
        ['audit', 'Activity log', 'سجل النشاط', { icon: 'History' }],
      ]),
      feature('features_booking', ['booking'], 'Booking features', 'ميزات الحجز', [
        ['calendar', 'Live availability calendar', 'تقويم التوفر المباشر', { icon: 'CalendarDays' }],
        ['services_catalog', 'Services & pricing', 'الخدمات والأسعار', { icon: 'ListChecks' }],
        ['online_payment', 'Pay or deposit online', 'الدفع أو العربون أونلاين', { icon: 'CreditCard' }],
        ['reminders', 'SMS / email reminders', 'تذكيرات بالرسائل والبريد', { icon: 'BellRing' }],
        ['staff', 'Staff schedules', 'جداول الموظفين', { icon: 'Users' }],
        ['cancellations', 'Rescheduling & cancellations', 'إعادة الجدولة والإلغاء', { icon: 'CalendarX' }],
        ['reviews', 'Reviews', 'التقييمات', { icon: 'Star' }],
      ]),
      feature('features_real_estate', ['real_estate'], 'Real estate features', 'ميزات المنصة العقارية', [
        ['listings', 'Property listings', 'عرض العقارات', { icon: 'Building' }],
        ['filters', 'Advanced search & filters', 'البحث والفلاتر المتقدمة', { icon: 'SlidersHorizontal' }],
        ['map_search', 'Map search', 'البحث على الخريطة', { icon: 'Map' }],
        ['agents', 'Agent profiles', 'ملفات الوسطاء', { icon: 'UserRound' }],
        ['inquiries', 'Inquiries & viewings', 'الاستفسارات وطلبات المعاينة', { icon: 'MessageSquare' }],
        ['virtual_tours', 'Virtual tours', 'جولات افتراضية', { icon: 'View' }],
        ['favorites', 'Saved properties', 'العقارات المحفوظة', { icon: 'Heart' }],
        ['compare', 'Compare properties', 'مقارنة العقارات', { icon: 'Columns3' }],
      ]),
      feature('features_custom', ['custom', 'other'], 'System capabilities', 'قدرات النظام', [
        ['auth', 'User accounts & login', 'حسابات المستخدمين', { icon: 'KeyRound' }],
        ['dashboard', 'Dashboards', 'لوحات المعلومات', { icon: 'LayoutDashboard' }],
        ['roles', 'Roles & permissions', 'الأدوار والصلاحيات', { icon: 'ShieldCheck' }],
        ['workflow', 'Approvals & workflows', 'الموافقات وسير العمل', { icon: 'GitBranch' }],
        ['reports', 'Reports & exports', 'التقارير والتصدير', { icon: 'FileBarChart' }],
        ['notifications', 'Notifications', 'الإشعارات', { icon: 'Bell' }],
        ['file_management', 'Documents & files', 'المستندات والملفات', { icon: 'FolderOpen' }],
        ['integrations', 'Integrations with other systems', 'التكامل مع الأنظمة الأخرى', { icon: 'Plug' }],
      ]),
      {
        key: 'integrations',
        type: 'multi_choice',
        label: 'Integrations',
        helpText: 'Tools the project should connect to.',
        options: opts([
          ['google_analytics', 'Google Analytics', 'Google Analytics'],
          ['whatsapp', 'WhatsApp', 'واتساب'],
          ['crm', 'CRM (HubSpot, Zoho…)', 'نظام إدارة العملاء CRM'],
          ['email_marketing', 'Email marketing', 'التسويق بالبريد'],
          ['accounting', 'Accounting', 'المحاسبة'],
          ['erp', 'ERP', 'نظام ERP'],
          ['maps', 'Google Maps', 'خرائط جوجل'],
        ]),
        ar: { label: 'التكاملات', helpText: 'الأدوات التي يجب ربط المشروع بها.' },
      },
    ],
  },
  {
    key: 'timeline_budget',
    title: 'Timeline & budget',
    description: 'Ranges are fine — this helps us propose the right scope.',
    icon: 'Wallet',
    ar: { title: 'الجدول الزمني والميزانية', description: 'النطاق التقريبي يكفي — يساعدنا في اقتراح النطاق المناسب.' },
    questions: [
      {
        key: 'budget',
        type: 'single_choice',
        label: 'Estimated budget (USD)',
        required: true,
        options: opts([
          ['under_5k', 'Under $5k', 'أقل من ٥ آلاف $'],
          ['5k_15k', '$5k – $15k', '٥ – ١٥ ألف $'],
          ['15k_50k', '$15k – $50k', '١٥ – ٥٠ ألف $'],
          ['50k_plus', '$50k+', 'أكثر من ٥٠ ألف $'],
          ['not_sure', 'Not sure yet', 'غير متأكد بعد'],
        ]),
        ar: { label: 'الميزانية التقديرية (دولار)' },
      },
      {
        key: 'timeline',
        type: 'single_choice',
        label: 'When do you want to launch?',
        required: true,
        options: opts([
          ['asap', 'As soon as possible', 'في أسرع وقت'],
          ['1_3', 'In 1–3 months', 'خلال ١–٣ أشهر'],
          ['3_6', 'In 3–6 months', 'خلال ٣–٦ أشهر'],
          ['flexible', 'I’m flexible', 'مرن'],
        ]),
        ar: { label: 'متى تريد الإطلاق؟' },
      },
    ],
  },
  {
    key: 'additional',
    title: 'Anything else?',
    description: 'Notes, files, references and competitors — everything helps.',
    icon: 'Paperclip',
    ar: { title: 'هل هناك شيء آخر؟', description: 'ملاحظات وملفات ومراجع ومنافسون — كل شيء يساعد.' },
    questions: [
      { key: 'notes', type: 'textarea', label: 'Notes for the team', placeholder: 'Anything we should know?', ar: { label: 'ملاحظات للفريق', placeholder: 'أي شيء يجب أن نعرفه؟' } },
      { key: 'attachments', type: 'file', label: 'Documents & briefs', validation: { accept: 'any', maxFiles: 10 }, ar: { label: 'المستندات والملفات' } },
      { key: 'screenshots', type: 'file', label: 'Screenshots or sketches', validation: { accept: 'image', maxFiles: 10 }, ar: { label: 'لقطات شاشة أو رسومات' } },
      { key: 'references', type: 'url_list', label: 'Reference links', placeholder: 'https://', ar: { label: 'روابط مرجعية' } },
      { key: 'competitors', type: 'url_list', label: 'Competitor websites', placeholder: 'https://', ar: { label: 'مواقع المنافسين' } },
    ],
  },
];

export const DEFAULT_STEPS: WorkflowStep[] = STEPS.map((s, i) => step(s, i));
