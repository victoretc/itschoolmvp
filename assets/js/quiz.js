/* ---------------------------------------------------------- course quiz */
(() => {
  const root = document.querySelector('[data-quiz]');
  if (!root) return;

  const dialog = root.querySelector('.quiz__dialog');
  const questions = root.querySelector('[data-quiz-questions]');
  const steps = Array.from(root.querySelectorAll('[data-quiz-step]'));
  const result = root.querySelector('[data-quiz-result]');
  const titleEl = root.querySelector('[data-quiz-title]');
  const leadEl = root.querySelector('[data-quiz-intro]');
  const eyebrowEl = root.querySelector('[data-quiz-eyebrow]');
  const status = root.querySelector('[data-quiz-status]');
  const progress = root.querySelector('[data-quiz-progress]');
  const counter = root.querySelector('[data-quiz-count]');
  const nav = root.querySelector('[data-quiz-nav]');
  const nextButton = root.querySelector('[data-quiz-next]');
  const nextLabel = root.querySelector('[data-quiz-next-label]');
  const backButton = root.querySelector('[data-quiz-back]');
  const leadForm = root.querySelector('[data-quiz-lead-form]');
  const leadError = root.querySelector('[data-quiz-lead-error]');
  const success = root.querySelector('[data-quiz-success]');
  const successText = root.querySelector('[data-quiz-success-text]');
  const submit = root.querySelector('[data-quiz-submit]');
  const restartButton = root.querySelector('[data-quiz-restart]');
  const nameInput = leadForm.elements.name;
  const phoneInput = leadForm.elements.phone;

  const courseAge = root.querySelector('[data-quiz-course-age]');
  const coursePrice = root.querySelector('[data-quiz-course-price]');
  const courseTile = root.querySelector('[data-quiz-course-tile]');
  const courseLink = root.querySelector('[data-quiz-course-link]');
  const courseWhy = root.querySelector('[data-quiz-course-why]');
  const courseAlts = root.querySelector('[data-quiz-course-alts]');
  const fieldCourse = root.querySelector('[data-quiz-field-course]');
  const fieldAnswers = root.querySelector('[data-quiz-field-answers]');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const baseTitle = titleEl.textContent.trim();
  const baseLead = leadEl.textContent.trim();
  const baseEyebrow = eyebrowEl.textContent.trim();

  let courses = [];
  try {
    courses = JSON.parse(root.querySelector('[data-quiz-courses]').textContent);
  } catch (error) {
    courses = [];
  }
  const courseBySlug = new Map(courses.map((course) => [course.slug, course]));

  /* Why this course: one sentence per slug, shown under the title. */
  const REASONS = {
    'robototehnika-lego': 'Начинаем с LEGO: ребята собирают и программируют модели, тренируют логику и мелкую моторику.',
    'kodu-scratch': 'Визуальное программирование без текста кода: ребёнок собирает программу из блоков и делает первую 3D-игру.',
    'robototehnika-arduino': 'Микроконтроллеры и датчики — следующий шаг после LEGO, ближе к настоящей инженерии.',
    'minecraft': 'Программирование внутри знакомой игры: ребёнок автоматизирует рутину и видит результат сразу.',
    'roblox': 'Создание игр на Lua в Roblox Studio: от идеи до публикации собственной игры.',
    'godot': 'Полный цикл разработки игры: сцены, GDScript, анимации и несколько проектов в портфолио.',
    'unity': 'Профессиональный движок и C#: игры, которые можно показать в портфолио и развивать дальше.',
    'python': 'Самый востребованный язык: переменные, циклы, функции и первые проекты на реальных задачах.',
    'razrabotka-saytov': 'HTML, CSS и JavaScript: подросток собирает и публикует собственный сайт.',
    'neyronnye-seti': 'Нейросети, промт-инжиниринг, Figma и Tilda: больше десяти авторских проектов за курс.',
    '3d-modelirovanie-blender': '3D-моделирование в Blender: персонажи и объекты для игр, анимации и печати.',
    'kvadrokoptery': 'Программирование дронов DJI Tello: от Scratch до Python и автономных полётов.',
    'olimpiadnoe-programmirovanie': 'Алгоритмы и задачи олимпиадного уровня: подготовка к соревнованиям и сильное портфолио.',
    'testirovanie-po': 'Профессиональный старт в IT: тестирование, баг-репорты и работа в команде.',
  };

  /* Second-choice candidates per interest; filtered by age below. */
  const ALTERNATIVES = {
    robots: ['robototehnika-arduino', 'kvadrokoptery', 'robototehnika-lego'],
    games: ['roblox', 'godot', 'unity', 'kodu-scratch'],
    code: ['python', 'razrabotka-saytov', 'minecraft', 'kodu-scratch'],
    ai: ['neyronnye-seti', 'minecraft', 'kodu-scratch'],
    creative: ['3d-modelirovanie-blender', 'neyronnye-seti', 'kodu-scratch'],
    unsure: ['robototehnika-lego', 'kodu-scratch', 'minecraft', 'python'],
  };

  const ANSWER_LABELS = {
    interest: {
      robots: 'роботы и техника',
      games: 'создание игр',
      code: 'программирование и сайты',
      ai: 'нейросети и ИИ',
      creative: '3D и дизайн',
      unsure: 'пока не знает',
    },
    experience: {
      new: 'только начинает',
      some: 'LEGO или Scratch',
      confident: 'уже писал код',
    },
    goal: {
      try: 'попробовать',
      projects: 'свои проекты',
      olympiad: 'олимпиады',
      career: 'профессия в IT',
    },
  };

  /* Rule engine: pick the course that fits age, interest, experience, goal. */
  const pickCourse = (age, interest, experience, goal) => {
    const older = age >= 12;

    if (goal === 'olympiad' && older) return 'olimpiadnoe-programmirovanie';
    if (goal === 'career' && age >= 15 && (interest === 'code' || interest === 'unsure')) {
      return 'testirovanie-po';
    }

    switch (interest) {
      case 'robots':
        return age <= 9 ? 'robototehnika-lego' : 'robototehnika-arduino';

      case 'games':
        if (age <= 7) return 'robototehnika-lego';
        if (age <= 9) return 'kodu-scratch';
        if (age === 10 || experience === 'new') return 'roblox';
        if (age === 11) return 'godot';
        return goal === 'career' || experience === 'confident' ? 'unity' : 'godot';

      case 'ai':
        if (age <= 7) return 'robototehnika-lego';
        return age <= 9 ? 'kodu-scratch' : 'neyronnye-seti';

      case 'creative':
        if (age <= 7) return 'robototehnika-lego';
        if (age <= 9) return 'kodu-scratch';
        return age <= 11 ? 'neyronnye-seti' : '3d-modelirovanie-blender';

      case 'code':
        if (age <= 7) return 'robototehnika-lego';
        if (age <= 9) return 'kodu-scratch';
        if (age <= 11) return 'minecraft';
        if (age <= 13) return 'python';
        return 'razrabotka-saytov';

      default:
        if (age <= 7) return 'robototehnika-lego';
        if (age <= 9) return 'kodu-scratch';
        if (age <= 11) return 'minecraft';
        if (age <= 13) return 'python';
        return 'razrabotka-saytov';
    }
  };

  /* -------------------------------------------------------- quiz state */

  let step = 0;
  let isOpen = false;
  let lastFocused = null;
  let closeTimer = 0;
  let submitted = false;
  let currentCourse = null;

  const answers = () => {
    const pick = (name) => {
      const checked = root.querySelector('input[name="' + name + '"]:checked');
      return checked ? checked.value : '';
    };
    return {
      age: Number(pick('age')) || 0,
      interest: pick('interest'),
      experience: pick('experience'),
      goal: pick('goal'),
    };
  };

  const stepOf = (name) => steps.findIndex((el) => el.querySelector('input[name="' + name + '"]'));

  const clearStepError = (index) => {
    const error = steps[index] && steps[index].querySelector('[data-quiz-error]');
    if (error) error.hidden = true;
  };

  const showStep = (index, focus) => {
    step = index;

    steps.forEach((el, i) => {
      el.hidden = i !== index;
      if (i !== index) clearStepError(i);
    });

    progress.dataset.step = String(index + 1);
    counter.hidden = false;
    counter.textContent = 'Шаг ' + (index + 1) + ' из ' + steps.length;
    backButton.hidden = index === 0;
    nextLabel.textContent = index === steps.length - 1 ? 'Показать курс' : 'Далее';

    if (focus) {
      const first = steps[index].querySelector('input[type="radio"]');
      if (first) first.focus({ preventScroll: true });
    }
  };

  const validateStep = (index) => {
    const stepEl = steps[index];
    const checked = stepEl.querySelector('input[type="radio"]:checked');
    const error = stepEl.querySelector('[data-quiz-error]');
    const name = stepEl.querySelector('input[type="radio"]').name;

    if (checked) {
      if (error) error.hidden = true;
      return true;
    }

    if (error) {
      error.textContent = name === 'age' ? 'Выберите возраст ребёнка' : 'Выберите один из вариантов';
      error.hidden = false;
    }
    const first = stepEl.querySelector('input[type="radio"]');
    if (first) first.focus({ preventScroll: false });
    return false;
  };

  /* ----------------------------------------------------------- result */

  const fillAlternatives = (interest, age) => {
    const pool = currentCourse.slug === 'testirovanie-po'
      ? ['python', 'razrabotka-saytov']
      : (ALTERNATIVES[interest] || []);
    // Under-10 courses are the entry point for little kids; do not offer them
    // to teenagers just because their "from" age still fits.
    const floor = age >= 12 ? 10 : 6;
    const picks = pool
      .filter((slug) => slug !== currentCourse.slug)
      .map((slug) => courseBySlug.get(slug))
      .filter((course) => course && Number(course.age) >= floor && Number(course.age) <= age + 1)
      .slice(0, 2);

    courseAlts.replaceChildren();
    if (!picks.length) {
      courseAlts.hidden = true;
      return;
    }

    courseAlts.append(document.createTextNode('Ещё может подойти: '));
    picks.forEach((course, index) => {
      if (index > 0) courseAlts.append(document.createTextNode(' · '));
      const link = document.createElement('a');
      link.href = course.url;
      link.textContent = course.title;
      courseAlts.append(link);
    });
    courseAlts.hidden = false;
  };

  const clearLeadErrors = () => {
    ['name', 'phone'].forEach((name) => setLeadError(name, ''));
    leadError.hidden = true;
  };

  const leadHeading = root.querySelector('.quiz__lead-title');
  const leadIntro = root.querySelector('.quiz__lead-text');

  const showLeadForm = () => {
    leadForm.hidden = false;
    success.hidden = true;
    leadHeading.hidden = false;
    leadIntro.hidden = false;
  };

  const showLeadSuccess = () => {
    leadForm.hidden = true;
    success.hidden = false;
    leadHeading.hidden = true;
    leadIntro.hidden = true;
  };

  const showResult = () => {
    const data = answers();
    const slug = pickCourse(data.age, data.interest, data.experience, data.goal);
    const course = courseBySlug.get(slug) || courses[0];

    if (!course) {
      nextLabel.textContent = 'Показать курс';
      return;
    }

    currentCourse = course;
    const age = Number(course.age);
    courseTile.innerHTML = course.icon || '';
    courseTile.dataset.tone = String(course.tone ?? 0);
    courseAge.textContent = age ? 'с ' + age + ' лет' : '';
    coursePrice.textContent = course.price + ' ' + course.suffix;
    courseLink.textContent = course.title;
    courseLink.href = course.url;
    courseWhy.textContent = REASONS[course.slug] || '';
    fillAlternatives(data.interest, data.age);

    fieldCourse.value = course.title;
    fieldAnswers.value = [
      'Возраст: ' + data.age,
      'Интерес: ' + (ANSWER_LABELS.interest[data.interest] || data.interest),
      'Опыт: ' + (ANSWER_LABELS.experience[data.experience] || data.experience),
      'Цель: ' + (ANSWER_LABELS.goal[data.goal] || data.goal),
    ].join(' · ');

    leadForm.reset();
    phoneInput.value = '';
    clearLeadErrors();
    submit.classList.remove('is-loading');
    submit.disabled = false;
    showLeadForm();
    successText.textContent = 'Спасибо! Свяжемся с вами в рабочее время и запишем на «' + course.title + '».';

    questions.hidden = true;
    nav.hidden = true;
    result.hidden = false;
    status.hidden = false;
    progress.dataset.step = String(steps.length);
    counter.hidden = true;

    titleEl.textContent = 'Подходящий курс';
    leadEl.hidden = true;
    eyebrowEl.textContent = 'Подбор готов';
    eyebrowEl.hidden = false;

    const body = root.querySelector('.quiz__body');
    if (body) body.scrollTop = 0;

    titleEl.tabIndex = -1;
    titleEl.focus({ preventScroll: true });

    if (window.dataLayer) {
      window.dataLayer.push({ event: 'quiz_complete', course: course.slug, age: data.age });
    }
  };

  const restart = () => {
    questions.reset();
    leadForm.reset();
    phoneInput.value = '';
    clearLeadErrors();
    submit.classList.remove('is-loading');
    submit.disabled = false;
    submitted = false;
    currentCourse = null;
    showLeadForm();
    result.hidden = true;
    questions.hidden = false;
    nav.hidden = false;
    status.hidden = false;
    titleEl.textContent = baseTitle;
    leadEl.textContent = baseLead;
    leadEl.hidden = false;
    eyebrowEl.textContent = baseEyebrow;
    eyebrowEl.hidden = false;
    counter.hidden = false;
    showStep(0, true);

    const body = root.querySelector('.quiz__body');
    if (body) body.scrollTop = 0;
  };

  /* --------------------------------------------------------- lead form */

  const setLeadError = (name, message) => {
    const input = leadForm.elements[name];
    const error = leadForm.querySelector('[data-quiz-error-for="' + name + '"]');
    const field = input.closest('.consult__field');

    if (error) {
      error.textContent = message || '';
      error.hidden = !message;
    }
    if (field) field.classList.toggle('has-error', Boolean(message));
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  };

  const formatPhone = (raw) => {
    let digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('80')) digits = '375' + digits.slice(2);
    if (!digits.startsWith('375')) digits = '375' + digits;
    digits = digits.slice(0, 12);

    let value = '+375';
    if (digits.length > 3) value += ' (' + digits.slice(3, 5);
    if (digits.length > 5) value += ') ' + digits.slice(5, 8);
    if (digits.length > 8) value += '-' + digits.slice(8, 10);
    if (digits.length > 10) value += '-' + digits.slice(10, 12);
    return value;
  };

  const validateLead = () => {
    const name = nameInput.value.trim();
    const digits = phoneInput.value.replace(/\D/g, '');
    let firstInvalid = null;

    if (name.length < 2) {
      setLeadError('name', 'Напишите, как к вам обращаться');
      firstInvalid = firstInvalid || nameInput;
    } else {
      setLeadError('name', '');
    }

    if (digits.length !== 12 || !digits.startsWith('375')) {
      setLeadError('phone', 'Введите номер телефона');
      firstInvalid = firstInvalid || phoneInput;
    } else {
      setLeadError('phone', '');
    }

    if (firstInvalid) firstInvalid.focus({ preventScroll: false });
    return !firstInvalid;
  };

  /* -------------------------------------------------------- open/close */

  const background = () =>
    [document.querySelector('.header'), document.getElementById('main'), document.querySelector('.footer')].filter(Boolean);

  const lockScroll = () => {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) document.documentElement.style.paddingRight = gap + 'px';
    document.documentElement.classList.add('has-consult');
  };

  const unlockScroll = () => {
    document.documentElement.classList.remove('has-consult');
    document.documentElement.style.removeProperty('padding-right');
  };

  const open = () => {
    if (isOpen) return;

    window.clearTimeout(closeTimer);
    isOpen = true;
    lastFocused = document.activeElement;

    if (submitted) restart();

    root.hidden = false;
    root.classList.remove('is-closing');
    void root.offsetWidth;

    lockScroll();
    background().forEach((el) => {
      el.inert = true;
      el.setAttribute('aria-hidden', 'true');
    });

    window.requestAnimationFrame(() => root.classList.add('is-open'));
    dialog.focus({ preventScroll: true });

    if (window.dataLayer) window.dataLayer.push({ event: 'quiz_open' });
  };

  const close = () => {
    if (!isOpen) return;

    isOpen = false;
    root.classList.remove('is-open');
    root.classList.add('is-closing');

    const finish = () => {
      root.hidden = true;
      root.classList.remove('is-closing');
      unlockScroll();
      background().forEach((el) => {
        el.inert = false;
        el.removeAttribute('aria-hidden');
      });
      if (lastFocused && lastFocused.isConnected) lastFocused.focus({ preventScroll: true });
    };

    closeTimer = window.setTimeout(finish, reduceMotion.matches ? 120 : 200);
  };

  /* ------------------------------------------------------------ events */

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-quiz-open]');
    if (opener) {
      event.preventDefault();
      open();
      return;
    }

    const closer = event.target.closest('[data-quiz-close]');
    if (closer) {
      if (closer.tagName !== 'A') event.preventDefault();
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.offsetParent !== null);

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  questions.addEventListener('change', (event) => {
    if (event.target.name) clearStepError(stepOf(event.target.name));
  });

  nextButton.addEventListener('click', () => {
    if (!validateStep(step)) return;

    if (step < steps.length - 1) {
      showStep(step + 1, true);
      return;
    }
    showResult();
  });

  backButton.addEventListener('click', () => {
    if (step > 0) showStep(step - 1, true);
  });

  restartButton.addEventListener('click', restart);

  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });

  phoneInput.addEventListener('focus', () => {
    if (!phoneInput.value) phoneInput.value = '+375 ';
  });

  phoneInput.addEventListener('blur', () => {
    if (phoneInput.value.replace(/\D/g, '').length <= 3) phoneInput.value = '';
  });

  nameInput.addEventListener('input', () => {
    if (nameInput.getAttribute('aria-invalid') === 'true') setLeadError('name', '');
  });

  phoneInput.addEventListener('input', () => {
    if (phoneInput.getAttribute('aria-invalid') === 'true') setLeadError('phone', '');
  });

  leadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    leadError.hidden = true;

    if (!validateLead()) return;

    submit.classList.add('is-loading');
    submit.disabled = true;

    const endpoint = leadForm.getAttribute('action');

    try {
      if (endpoint) {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(leadForm),
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Request failed');
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
      }

      submitted = true;
      showLeadSuccess();
      const done = success.querySelector('.consult__done');
      if (done) done.focus({ preventScroll: true });

      if (window.dataLayer) {
        window.dataLayer.push({ event: 'quiz_submit', course: currentCourse ? currentCourse.slug : '' });
      }
    } catch (error) {
      leadError.textContent = 'Не удалось отправить заявку. Позвоните нам: +375 (29) 871-76-12.';
      leadError.hidden = false;
    } finally {
      submit.classList.remove('is-loading');
      submit.disabled = false;
    }
  });

  showStep(0, false);
})();
