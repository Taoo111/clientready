import type { AssessmentStatus, Recommendation, TargetLevel } from '@clientready/shared';

/** Recruiter panel and report strings (Polish). */
export const pl = {
  appName: 'ClientReady',

  nav: {
    assessments: 'Oceny',
    newAssessment: 'Nowa ocena',
    logout: 'Wyloguj',
    account: 'Konto',
    forCustomer: 'dla',
  },

  login: {
    title: 'Zaloguj się do panelu',
    subtitle: 'Panel rekrutera ClientReady',
    email: 'E-mail',
    password: 'Hasło',
    submit: 'Zaloguj się',
    invalid: 'Nieprawidłowy e-mail lub hasło.',
    expired: 'Sesja wygasła. Zaloguj się ponownie.',
    unavailable: 'Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.',
    tooMany: 'Zbyt wiele prób logowania. Odczekaj minutę i spróbuj ponownie.',
    connecting: 'Łączenie z serwerem…',
    waking: 'Uruchamiamy serwer…',
    wakingBody:
      'Serwer usypia się po okresie bezczynności i właśnie się budzi - to trwa do ok. minuty. Możesz już wpisać dane logowania.',
    apiDown: 'Serwer nie odpowiada. Spróbuj ponownie za chwilę.',
    retry: 'Spróbuj ponownie',
  },

  wake: {
    title: 'Uruchamiamy serwer…',
    body: 'Serwer usypia się po okresie bezczynności i właśnie się budzi. To trwa do ok. minuty - strona odświeży się sama.',
    waiting: 'Czekam na serwer…',
    downTitle: 'Serwer nie odpowiada',
    downBody: 'Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie za chwilę.',
    retry: 'Spróbuj ponownie',
    errorTitle: 'Coś poszło nie tak',
    errorBody:
      'Nie udało się wczytać danych. Serwer mógł się właśnie uruchamiać - spróbuj ponownie.',
  },

  status: {
    CREATED: 'Oczekuje na kandydata',
    IN_PROGRESS: 'W trakcie rozmowy',
    COMPLETED: 'Ocena w toku',
    EVALUATED: 'Oceniono',
    FAILED: 'Błąd oceny',
  } satisfies Record<AssessmentStatus, string>,

  recommendation: {
    READY: 'Gotowy',
    READY_WITH_CONCERNS: 'Gotowy z zastrzeżeniami',
    NOT_READY: 'Niegotowy',
  } satisfies Record<Recommendation, string>,
  insufficientShort: 'Za mało danych',

  /** Polish names of the default rubric criteria (templates are in English). */
  criteria: {
    understanding_questions: 'Rozumienie pytań',
    vocabulary_precision: 'Precyzja słownictwa technicznego i domenowego',
    clarifying_questions: 'Zadawanie pytań doprecyzowujących',
    handling_pressure: 'Radzenie sobie z presją i sprzeciwem',
    fluency_coherence: 'Płynność i spójność wypowiedzi',
  } as Record<string, string>,
  dataDeleted: 'Dane usunięte',

  list: {
    title: 'Oceny kandydatów',
    subtitle: 'Rozmowy głosowe z klientem AI i raporty gotowości do pracy z klientem.',
    searchPlaceholder: 'Szukaj po imieniu lub nazwisku…',
    allStatuses: 'Każdy status',
    allRoles: 'Każda rola',
    columns: {
      candidate: 'Kandydat',
      role: 'Rola',
      level: 'Poziom',
      status: 'Status',
      recommendation: 'Rekomendacja',
      decision: 'Decyzja',
      date: 'Utworzono',
    },
    emptyTitle: 'Nie masz jeszcze żadnych ocen',
    emptyBody: 'Utwórz pierwszą ocenę, wyślij kandydatowi link, a po rozmowie zobaczysz tu raport.',
    noResultsTitle: 'Brak wyników',
    noResultsBody: 'Żadna ocena nie pasuje do wyszukiwania lub filtrów.',
    clearFilters: 'Wyczyść filtry',
    count: (n: number) =>
      `${n} ${n === 1 ? 'ocena' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'oceny' : 'ocen'}`,
    loadError: 'Nie udało się pobrać listy ocen.',
    toReview: 'Do przejrzenia',
    differsFromAi: '≠ AI',
    differsFromAiTitle: 'Decyzja inna niż rekomendacja AI',
  },

  create: {
    title: 'Nowa ocena',
    subtitle: 'Kandydat dostanie link do ok. 12-minutowej rozmowy po angielsku z klientem AI.',
    candidateName: 'Imię i nazwisko kandydata',
    candidateNamePlaceholder: 'np. Anna Nowak',
    candidateEmail: 'E-mail kandydata',
    optional: 'opcjonalnie',
    candidateEmailHint: 'Tylko do Twojej informacji - nic nie wysyłamy automatycznie.',
    role: 'Rola',
    rolePlaceholder: 'Wybierz rolę',
    level: 'Poziom docelowy',
    levelHint: 'Poziom, którego wymaga projekt. Rekomendacja jest liczona względem niego.',
    levels: {
      B1: 'B1 - komunikatywny',
      B2: 'B2 - swobodny (typowy dla pracy z klientem)',
      C1: 'C1 - zaawansowany',
    } satisfies Record<TargetLevel, string>,
    submit: 'Utwórz i pokaż link',
    cancel: 'Anuluj',
    errors: {
      candidateName: 'Podaj imię i nazwisko kandydata.',
      candidateEmail: 'Nieprawidłowy adres e-mail.',
      roleTemplateId: 'Wybierz rolę.',
      targetLevel: 'Wybierz poziom.',
      generic: 'Nie udało się utworzyć oceny. Spróbuj ponownie.',
    },
  },

  invite: {
    createdTitle: 'Ocena utworzona',
    createdBody:
      'Wyślij kandydatowi link. Link jest jednorazowy - rozmowę można przeprowadzić raz.',
    title: 'Link dla kandydata',
    body: 'Link działa, dopóki kandydat nie zakończy rozmowy. Nieużyty link wygasa po 14 dniach.',
    copyLink: 'Kopiuj link',
    copied: 'Skopiowano do schowka',
    copyFailed: 'Nie udało się skopiować - zaznacz i skopiuj ręcznie.',
    messageTitle: 'Gotowa wiadomość do kandydata',
    copyMessage: 'Kopiuj wiadomość',
    polish: 'Po polsku',
    english: 'Po angielsku',
    messagePl: (name: string, role: string, link: string, company?: string) =>
      `Cześć ${name},\n\nw ramach rekrutacji na stanowisko ${role}${company ? ` w ${company}` : ''} zapraszamy Cię na krótką rozmowę po angielsku (ok. 12 minut). Porozmawiasz z asystentem AI, który odgrywa rolę klienta - zapyta o Twoje doświadczenie i omówi z Tobą typową sytuację projektową. Rozmowa jest nagrywana, a jej wynik przegląda rekruter.\n\nWystarczy przeglądarka (najlepiej Chrome lub Edge na komputerze), mikrofon i ciche miejsce - najlepiej ze słuchawkami. Link możesz użyć raz:\n${link}\n\nPowodzenia!`,
    messageEn: (name: string, role: string, link: string, company?: string) =>
      `Hi ${name},\n\nAs part of the recruitment process for the ${role} role${company ? ` at ${company}` : ''}, we'd like to invite you to a short conversation in English (about 12 minutes). You'll talk to an AI assistant playing a client - it will ask about your experience and discuss a typical project situation with you. The conversation is recorded and reviewed by a recruiter.\n\nAll you need is a browser (ideally Chrome or Edge on a computer), a microphone and a quiet place - headphones help. The link can be used once:\n${link}\n\nGood luck!`,
  },

  report: {
    back: 'Wszystkie oceny',
    title: 'Raport',
    role: 'Rola',
    targetLevel: 'Poziom docelowy',
    conversationDate: 'Rozmowa',
    duration: 'Długość',
    created: 'Utworzono',
    waiting: {
      CREATED: 'Kandydat jeszcze nie rozpoczął rozmowy.',
      IN_PROGRESS: 'Kandydat jest w trakcie rozmowy albo rozmowa została przerwana.',
      COMPLETED:
        'Rozmowa zakończona - ocena jest przygotowywana. Raport pojawi się tu automatycznie.',
    },
    failed: 'Automatyczna ocena nie powiodła się',
    insufficientTitle: 'Za mało danych do oceny',
    humanDecision:
      'Rekomendacja AI na podstawie transkrypcji. Decyzję podejmuje rekruter - sprawdź cytaty, transkrypcję i nagranie.',
    recommendationLabel: 'Rekomendacja AI',
    keyEvidence: {
      weakest: 'Najsłabszy punkt',
      strongest: 'Najmocniejszy punkt',
    },
    modelDisagrees: (label: string) =>
      `Model oceniający sugerował „${label}”. Rekomendacja wynika ze stałej reguły względem poziomu docelowego.`,
    decision: {
      title: 'Twoja decyzja',
      question: (label: string) => `Czy zgadzasz się z rekomendacją AI: „${label}”?`,
      agree: 'Zgadzam się',
      disagree: 'Nie zgadzam się',
      ownVerdict: 'Twoja ocena',
      comment: 'Uzasadnienie',
      commentHint: 'Krótko: co przesądziło? Pomaga kalibrować ocenę AI.',
      commentRequired: 'Opisz w kilku słowach, dlaczego oceniasz inaczej niż AI (min. 10 znaków).',
      save: 'Zapisz decyzję',
      cancel: 'Anuluj',
      change: 'Zmień decyzję',
      saved: 'Decyzja zapisana',
      failed: 'Nie udało się zapisać decyzji',
      agrees: 'Zgodna z rekomendacją AI',
      differs: 'Inna niż rekomendacja AI',
      by: (who: string, date: string) => `${who}, ${date}`,
      outdated:
        'Twoja poprzednia decyzja dotyczyła wcześniejszego raportu (ocena została powtórzona). Zapisz decyzję dla aktualnego raportu.',
    },
    cefrTitle: 'Szacowany poziom CEFR',
    speaking: 'Mówienie',
    listening: 'Rozumienie',
    vsTarget: (target: string) => `cel: ${target}`,
    cefrDelta: (diff: number) =>
      diff === 0
        ? 'na poziomie celu'
        : diff > 0
          ? 'powyżej celu'
          : `${-diff} ${diff === -1 ? 'poziom' : 'poziomy'} poniżej celu`,
    languageTitle: 'Kandydat używał innego języka',
    criteriaTitle: 'Kryteria',
    evidenceShow: (n: number) => `Pokaż cytaty (${n})`,
    evidenceHide: 'Ukryj cytaty',
    noEvidence: 'Brak zweryfikowanych cytatów - traktuj ten wynik ostrożnie.',
    rejectedQuotes: (n: number) =>
      `${n} ${n === 1 ? 'cytat odrzucony' : 'cytaty odrzucone'} - nie znaleziono ich w transkrypcji.`,
    goToTurn: 'W transkrypcji',
    recordingTitle: 'Nagranie',
    noRecording: 'Brak nagrania.',
    recordingPart: (n: number) => `Część ${n}`,
    transcriptTitle: 'Transkrypcja',
    noTranscript: 'Brak transkrypcji.',
    speakerAi: 'Klient (AI)',
    speakerCandidate: 'Kandydat',
    metaTitle: 'Szczegóły oceny',
    meta: {
      model: 'Model',
      promptVersion: 'Wersja promptu',
      evaluatedAt: 'Data oceny',
      conversationLength: 'Długość rozmowy',
      candidateSpeech: 'Czas wypowiedzi kandydata',
      candidateTurns: 'Wypowiedzi kandydata',
    },
    actions: {
      rerun: 'Oceń ponownie',
      rerunning: 'Oceniam…',
      rerunDone: 'Dodano nowy raport',
      rerunFailed: 'Ponowna ocena nie powiodła się',
      print: 'Drukuj / PDF',
      delete: 'Usuń dane kandydata',
      deleteTitle: 'Usunąć dane kandydata?',
      deleteBody:
        'Transkrypcja, nagranie i wszystkie raporty zostaną trwale usunięte, a imię i nazwisko zanonimizowane. Link kandydata przestanie działać. Tej operacji nie można cofnąć.',
      deleteConfirm: 'Usuń trwale',
      deleting: 'Usuwam…',
      deleted: 'Dane kandydata zostały usunięte',
      deleteFailed: 'Nie udało się usunąć danych',
      cancel: 'Anuluj',
    },
    deletedNotice: (date: string) =>
      `Dane kandydata usunięto ${date} (transkrypcja, nagranie, raporty).`,
    notFound: 'Nie znaleziono tej oceny.',
    loadError: 'Nie udało się pobrać raportu.',
    printedAt: (date: string) => `Wygenerowano ${date} · ClientReady`,
    minutes: (ms: number) => `${(ms / 60_000).toFixed(1).replace('.', ',')} min`,
  },
} as const;
