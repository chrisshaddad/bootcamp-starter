import type { PortalDict } from '@/components/portal/portal-dict';

/**
 * Local, dormant fallback for the `portal` i18n namespace (TP2).
 *
 * The canonical copy is authored in the TP2 scratchpad and merged into
 * `en.json` / `ar.json` by the orchestrator. This slice must NOT touch those
 * catalogs, so — until the merge lands — reading `dict.portal` would be
 * `undefined` and crash the whole portal. This mirror keeps the shell alive
 * and is ignored the moment `dict.portal` exists (see `getPortalDict`). Kept
 * in-scope under `components/portal/**`; safe to delete once the keys ship.
 */
export const PORTAL_FALLBACK: Record<'en' | 'ar', PortalDict> = {
  en: {
    brandSubtitle: 'Resident portal',
    nav: {
      home: 'Home',
      availableUnits: 'Available units',
      support: 'Support',
      profile: 'Profile',
    },
    userMenu: {
      signedInAs: 'Signed in as',
      profile: 'Profile',
      signOut: 'Sign out',
      openMenu: 'Open account menu',
    },
    home: {
      welcome: 'Welcome home',
      subtitle: 'Your home, at a glance',
      leaseTitle: 'Your current lease',
      unit: 'Unit',
      building: 'Building',
      status: 'Status',
      term: 'Lease term',
      rent: 'Monthly rent',
      to: 'to',
      noLease:
        "You don't have an active lease yet. Your property manager will link one to your account.",
      notLinkedTitle: "Your account isn't linked yet",
      notLinkedDesc:
        "We couldn't find a lease connected to your account. Your property manager will link your unit shortly — check back soon.",
      loadError:
        "We couldn't load your home details. Please refresh and try again.",
      viewSupport: 'Need something? Contact support',
      historyTitle: 'Your apartments',
      current: 'Current',
      deposit: 'Deposit',
      emptyHistory:
        'No lease history yet. Once your property manager links a lease, it will appear here.',
    },
    leaseStatus: {
      draft: 'Draft',
      active: 'Active',
      expired: 'Expired',
      terminated: 'Terminated',
    },
    availableUnits: {
      title: 'Available units',
      subtitle: 'Vacant homes in your community.',
      empty: 'There are no available units right now. Please check back later.',
      loadError:
        "We couldn't load available units. Please refresh and try again.",
      floor: 'Floor',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      area: 'Area',
      sqftUnit: 'sqft',
    },
    support: {
      title: 'Support / Requests',
      subtitle: 'Raise a maintenance request for your apartment and track it.',
      new: 'New request',
      noLease:
        'You need an active lease before you can open a maintenance request.',
      empty: 'You have no requests yet.',
      emptyActive: 'You have no requests yet. Open one whenever you need help.',
      created: 'Request submitted.',
      createError: 'Something went wrong. Please try again.',
      unit: 'Unit',
      status: {
        open: 'Open',
        in_progress: 'In progress',
        resolved: 'Resolved',
        closed: 'Closed',
      },
      priority: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        urgent: 'Urgent',
      },
      form: {
        title: 'New maintenance request',
        titleLabel: 'Title',
        titlePlaceholder: 'e.g. Leaking kitchen tap',
        titleRequired: 'Please add a short title.',
        priorityLabel: 'Priority',
        descriptionLabel: 'Description',
        descriptionPlaceholder: 'Describe the issue in a little more detail…',
        cancel: 'Cancel',
        submit: 'Submit request',
        submitting: 'Submitting…',
      },
    },
    profile: {
      changePassword: 'Change password',
      changePasswordHint:
        'Update the password you use to sign in to the portal.',
    },
    comingSoon: {
      badge: 'Coming soon',
      availableUnitsTitle: 'Available units',
      availableUnitsDesc:
        "Browse open units in your community. This is on its way — you'll be able to explore available homes here soon.",
      supportTitle: 'Support & requests',
      supportDesc:
        'Raise maintenance requests and track their progress. This space is being prepared for you.',
      profileTitle: 'Your profile',
      profileDesc:
        'View and manage your contact details and account. Coming soon.',
    },
  },
  ar: {
    brandSubtitle: 'بوابة الساكن',
    nav: {
      home: 'الرئيسية',
      availableUnits: 'الوحدات المتاحة',
      support: 'الدعم',
      profile: 'الملف الشخصي',
    },
    userMenu: {
      signedInAs: 'مسجّل الدخول باسم',
      profile: 'الملف الشخصي',
      signOut: 'تسجيل الخروج',
      openMenu: 'فتح قائمة الحساب',
    },
    home: {
      welcome: 'أهلاً بعودتك',
      subtitle: 'منزلك في لمحة',
      leaseTitle: 'عقد إيجارك الحالي',
      unit: 'الوحدة',
      building: 'المبنى',
      status: 'الحالة',
      term: 'مدة العقد',
      rent: 'الإيجار الشهري',
      to: 'إلى',
      noLease:
        'لا يوجد لديك عقد إيجار نشط بعد. سيقوم مدير العقار بربط عقدك بحسابك قريباً.',
      notLinkedTitle: 'لم يتم ربط حسابك بعد',
      notLinkedDesc:
        'لم نتمكّن من العثور على عقد إيجار مرتبط بحسابك. سيقوم مدير العقار بربط وحدتك قريباً — يرجى المراجعة لاحقاً.',
      loadError: 'تعذّر تحميل تفاصيل منزلك. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
      viewSupport: 'تحتاج شيئاً؟ تواصل مع الدعم',
      historyTitle: 'وحداتك السكنية',
      current: 'الحالي',
      deposit: 'التأمين',
      emptyHistory:
        'لا يوجد سجل عقود بعد. سيظهر هنا فور قيام مدير العقار بربط عقدك.',
    },
    leaseStatus: {
      draft: 'مسودة',
      active: 'نشط',
      expired: 'منتهٍ',
      terminated: 'مُنهى',
    },
    availableUnits: {
      title: 'الوحدات المتاحة',
      subtitle: 'الوحدات الشاغرة في مجتمعك.',
      empty: 'لا توجد وحدات متاحة حالياً. يرجى المراجعة لاحقاً.',
      loadError: 'تعذّر تحميل الوحدات المتاحة. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
      floor: 'الطابق',
      bedrooms: 'غرف النوم',
      bathrooms: 'الحمّامات',
      area: 'المساحة',
      sqftUnit: 'قدم²',
    },
    support: {
      title: 'الدعم / الطلبات',
      subtitle: 'قدّم طلب صيانة لوحدتك وتابع حالته.',
      new: 'طلب جديد',
      noLease: 'تحتاج إلى عقد إيجار نشط قبل أن تتمكّن من فتح طلب صيانة.',
      empty: 'لا توجد لديك طلبات بعد.',
      emptyActive: 'لا توجد لديك طلبات بعد. افتح طلباً عندما تحتاج إلى المساعدة.',
      created: 'تم إرسال الطلب.',
      createError: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
      unit: 'الوحدة',
      status: {
        open: 'مفتوح',
        in_progress: 'قيد التنفيذ',
        resolved: 'تم الحل',
        closed: 'مغلق',
      },
      priority: {
        low: 'منخفضة',
        medium: 'متوسطة',
        high: 'عالية',
        urgent: 'عاجلة',
      },
      form: {
        title: 'طلب صيانة جديد',
        titleLabel: 'العنوان',
        titlePlaceholder: 'مثال: تسريب في صنبور المطبخ',
        titleRequired: 'يرجى إضافة عنوان مختصر.',
        priorityLabel: 'الأولوية',
        descriptionLabel: 'الوصف',
        descriptionPlaceholder: 'صف المشكلة بمزيد من التفصيل…',
        cancel: 'إلغاء',
        submit: 'إرسال الطلب',
        submitting: 'جارٍ الإرسال…',
      },
    },
    profile: {
      changePassword: 'تغيير كلمة المرور',
      changePasswordHint: 'حدّث كلمة المرور التي تستخدمها لتسجيل الدخول إلى البوابة.',
    },
    comingSoon: {
      badge: 'قريباً',
      availableUnitsTitle: 'الوحدات المتاحة',
      availableUnitsDesc:
        'تصفّح الوحدات المتاحة في مجتمعك. هذه الميزة في طريقها إليك — ستتمكّن قريباً من استكشاف المنازل المتاحة هنا.',
      supportTitle: 'الدعم والطلبات',
      supportDesc: 'قدّم طلبات الصيانة وتابع تقدّمها. نُجهّز هذه المساحة من أجلك.',
      profileTitle: 'ملفك الشخصي',
      profileDesc: 'اعرض وأدر بيانات التواصل وحسابك. قريباً.',
    },
  },
};
