/* Программы тренировок. Мезоцикл 6 недель: 5 недель прогрессии + неделя разгрузки.
   Слот = упражнение + подходы + диапазон повторов + запас повторов (RIR) + отдых.
   Прогрессия считается автоматически по истории (lib/programs.ts). */

export type SlotRole = 'main' | 'secondary' | 'iso' | 'core';
export interface Slot {
  ex: string;           // id упражнения из каталога
  sets: number;
  lo: number;           // нижняя граница повторов (или секунд для упражнений на время)
  hi: number;           // верхняя граница
  rir: number;          // запас повторов в последнем подходе
  rest: number;         // отдых, секунды
  role: SlotRole;
  why: string;          // зачем упражнение в этом дне
}
export interface ProgramDay { title: string; focus: string; slots: Slot[] }
export interface Program {
  id: 'fullbody3' | 'upperlower4' | 'ppl';
  name: string;
  short: string;
  type: 'fullbody' | 'split';
  daysPerWeek: string;
  level: string;
  goal: string;
  description: string;
  schedule: string;
  days: ProgramDay[];
}

const s = (ex: string, sets: number, lo: number, hi: number, rir: number, rest: number, role: SlotRole, why: string): Slot => ({ ex, sets, lo, hi, rir, rest, role, why });

export const PROGRAMS: Program[] = [
  {
    id: 'fullbody3',
    name: 'Full Body 3×',
    short: 'Всё тело',
    type: 'fullbody',
    daysPerWeek: '3 дня',
    level: 'новичок → средний',
    goal: 'сила и масса',
    description: 'Всё тело за тренировку, каждая мышца трижды в неделю. Тяжёлая база 3×5 с прибавкой веса каждую сессию, вспомогательные упражнения — двойная прогрессия. Лучший старт и самый быстрый рост силы в первый год.',
    schedule: 'Пн / Ср / Пт, дни A → B → C по кругу',
    days: [
      { title: 'Full Body A', focus: 'присед + жим', slots: [
        s('squat', 3, 5, 5, 2, 180, 'main', 'Главное упражнение для ног: тяжело и технично'),
        s('bench', 3, 5, 5, 2, 180, 'main', 'Сила груди и трицепса'),
        s('barbell_row', 3, 8, 10, 2, 120, 'secondary', 'Тяга уравновешивает жим и строит толщину спины'),
        s('rdl', 2, 8, 10, 2, 120, 'secondary', 'Задняя поверхность бедра и ягодицы'),
        s('lateral_raise', 3, 12, 15, 1, 60, 'iso', 'Ширина плеч'),
        s('plank', 3, 40, 60, 1, 60, 'core', 'Жёсткий корпус для базы'),
      ] },
      { title: 'Full Body B', focus: 'становая + жим стоя', slots: [
        s('deadlift', 2, 5, 5, 2, 210, 'main', 'Сила всей задней цепи'),
        s('ohp', 3, 5, 5, 2, 180, 'main', 'Сила плеч и стабильность корпуса'),
        s('pullups', 3, 6, 10, 1, 120, 'secondary', 'Ширина спины и бицепс'),
        s('lunges', 2, 10, 12, 2, 90, 'secondary', 'Ноги по одной: баланс и ягодицы'),
        s('triceps_pushdown', 2, 12, 15, 1, 60, 'iso', 'Трицепс для жимов'),
        s('calf_raise', 3, 12, 15, 1, 60, 'iso', 'Икры'),
      ] },
      { title: 'Full Body C', focus: 'объём', slots: [
        s('leg_press', 3, 8, 12, 2, 120, 'main', 'Объём на квадрицепс без нагрузки на спину'),
        s('incline_bench', 3, 6, 10, 2, 150, 'secondary', 'Верх груди и передние дельты'),
        s('lat_pulldown', 3, 8, 12, 2, 90, 'secondary', 'Широчайшие'),
        s('hip_thrust', 3, 8, 12, 2, 90, 'secondary', 'Ягодицы — мощность в приседе и тяге'),
        s('bb_curl', 2, 10, 12, 1, 60, 'iso', 'Бицепс'),
        s('leg_raise', 3, 10, 15, 1, 60, 'core', 'Пресс'),
      ] },
    ],
  },
  {
    id: 'upperlower4',
    name: 'Сплит Верх / Низ',
    short: 'Верх/Низ',
    type: 'split',
    daysPerWeek: '4 дня',
    level: 'средний',
    goal: 'масса и сила',
    description: 'Верх и низ тела по очереди, каждая мышца дважды в неделю. Один день силовой (4–6 повторов), второй — объёмный (8–15). Золотой стандарт для набора массы после первых месяцев.',
    schedule: 'Пн Верх A · Вт Низ A · Чт Верх B · Пт Низ B',
    days: [
      { title: 'Верх A · сила', focus: 'жим + тяга', slots: [
        s('bench', 4, 4, 6, 2, 180, 'main', 'Сила груди: главный жим недели'),
        s('barbell_row', 4, 6, 8, 2, 150, 'main', 'Тяжёлая тяга для толщины спины'),
        s('ohp', 3, 6, 8, 2, 120, 'secondary', 'Плечи и устойчивость'),
        s('pullups', 3, 6, 10, 1, 120, 'secondary', 'Ширина спины'),
        s('bb_curl', 2, 8, 12, 1, 75, 'iso', 'Бицепс'),
        s('skull_crusher', 2, 8, 12, 1, 75, 'iso', 'Длинная головка трицепса'),
      ] },
      { title: 'Низ A · сила', focus: 'присед', slots: [
        s('squat', 4, 4, 6, 2, 210, 'main', 'Сила ног: главный присед недели'),
        s('rdl', 3, 6, 8, 2, 150, 'secondary', 'Бицепс бедра в растяжении'),
        s('leg_press', 3, 10, 12, 2, 120, 'secondary', 'Объём на квадрицепс'),
        s('leg_curl', 3, 10, 12, 1, 75, 'iso', 'Бицепс бедра в сокращении'),
        s('calf_raise', 4, 10, 15, 1, 60, 'iso', 'Икры: пауза внизу'),
        s('plank', 3, 45, 60, 1, 60, 'core', 'Корпус'),
      ] },
      { title: 'Верх B · объём', focus: 'гипертрофия', slots: [
        s('incline_bench', 3, 8, 10, 2, 120, 'main', 'Верх груди'),
        s('seated_row', 3, 10, 12, 2, 90, 'secondary', 'Середина спины'),
        s('db_shoulder_press', 3, 10, 12, 2, 90, 'secondary', 'Дельты'),
        s('lat_pulldown', 3, 10, 12, 1, 90, 'secondary', 'Широчайшие'),
        s('lateral_raise', 3, 12, 20, 1, 60, 'iso', 'Ширина плеч'),
        s('face_pull', 3, 12, 15, 1, 60, 'iso', 'Задние дельты и здоровье плеч'),
        s('hammer_curl', 2, 10, 12, 1, 60, 'iso', 'Брахиалис и предплечья'),
        s('triceps_pushdown', 2, 12, 15, 1, 60, 'iso', 'Трицепс'),
      ] },
      { title: 'Низ B · объём', focus: 'тяга + ягодицы', slots: [
        s('deadlift', 3, 3, 5, 2, 210, 'main', 'Сила задней цепи'),
        s('bulgarian', 3, 8, 12, 2, 90, 'secondary', 'Ноги по одной, ягодицы'),
        s('leg_ext', 3, 12, 15, 1, 60, 'iso', 'Квадрицепс'),
        s('leg_curl', 3, 10, 12, 1, 60, 'iso', 'Бицепс бедра'),
        s('hip_thrust', 3, 10, 12, 1, 90, 'secondary', 'Ягодицы'),
        s('calf_raise', 4, 12, 15, 1, 60, 'iso', 'Икры'),
        s('leg_raise', 3, 10, 15, 1, 60, 'core', 'Пресс'),
      ] },
    ],
  },
  {
    id: 'ppl',
    name: 'Сплит Тяни / Толкай / Ноги',
    short: 'Тяни-Толкай',
    type: 'split',
    daysPerWeek: '3 или 6 дней',
    level: 'средний → продвинутый',
    goal: 'масса, рельеф',
    description: 'Жимовые мышцы, тяговые мышцы и ноги — в отдельные дни. 3 дня в неделю — круг один раз, 6 дней — дважды. Максимум объёма на каждую мышцу для тех, кто тренируется давно.',
    schedule: 'Толкай → Тяни → Ноги → (повтор) → отдых',
    days: [
      { title: 'Толкай', focus: 'грудь, плечи, трицепс', slots: [
        s('bench', 4, 5, 8, 2, 180, 'main', 'Сила груди'),
        s('ohp', 3, 6, 10, 2, 120, 'secondary', 'Плечи'),
        s('db_bench', 3, 8, 12, 2, 90, 'secondary', 'Объём груди с большой амплитудой'),
        s('lateral_raise', 4, 12, 20, 1, 60, 'iso', 'Ширина плеч'),
        s('triceps_pushdown', 3, 10, 15, 1, 60, 'iso', 'Трицепс'),
        s('skull_crusher', 2, 10, 12, 1, 60, 'iso', 'Длинная головка трицепса'),
      ] },
      { title: 'Тяни', focus: 'спина, бицепс, задние дельты', slots: [
        s('deadlift', 3, 3, 5, 2, 210, 'main', 'Сила задней цепи'),
        s('pullups', 4, 6, 10, 1, 120, 'secondary', 'Ширина спины'),
        s('barbell_row', 3, 8, 10, 2, 120, 'secondary', 'Толщина спины'),
        s('face_pull', 3, 12, 15, 1, 60, 'iso', 'Задние дельты, осанка'),
        s('bb_curl', 3, 8, 12, 1, 60, 'iso', 'Бицепс'),
        s('hammer_curl', 2, 10, 12, 1, 60, 'iso', 'Предплечья'),
      ] },
      { title: 'Ноги', focus: 'квадрицепс, бицепс бедра, ягодицы', slots: [
        s('squat', 4, 5, 8, 2, 210, 'main', 'Сила ног'),
        s('rdl', 3, 8, 10, 2, 120, 'secondary', 'Задняя поверхность'),
        s('leg_press', 3, 10, 15, 2, 120, 'secondary', 'Объём на квадрицепс'),
        s('leg_curl', 3, 10, 15, 1, 60, 'iso', 'Бицепс бедра'),
        s('leg_ext', 2, 12, 15, 1, 60, 'iso', 'Квадрицепс'),
        s('calf_raise', 4, 10, 15, 1, 60, 'iso', 'Икры'),
        s('ab_wheel', 3, 8, 12, 1, 60, 'core', 'Пресс'),
      ] },
    ],
  },
];

export const programById = (id?: string) => PROGRAMS.find((p) => p.id === id);

/** Замены для тренировок дома: гантели, турник, свой вес */
export const HOME_SWAP: Record<string, string> = {
  squat: 'bulgarian', front_squat: 'bulgarian', leg_press: 'lunges', leg_ext: 'bulgarian', leg_curl: 'hip_thrust',
  bench: 'pushups', incline_bench: 'db_bench', ohp: 'db_shoulder_press', deadlift: 'rdl',
  barbell_row: 'db_row', tbar_row: 'db_row', seated_row: 'db_row', lat_pulldown: 'pullups',
  triceps_pushdown: 'dips', face_pull: 'rear_delt_fly', cable_cross: 'flyes', bb_curl: 'db_curl',
};

/** Технические подсказки, которые игра показывает в задании */
export const CUES: Record<string, string> = {
  squat: 'Давление всей стопой, колени по линии носков, спина нейтральна, глубина до параллели.',
  bench: 'Лопатки сведены и опущены, ноги в пол, гриф на низ груди, локти под 45–70°.',
  deadlift: 'Гриф над серединой стопы, «натяни» гриф перед отрывом, спина нейтральна.',
  ohp: 'Ягодицы и пресс напряжены, гриф идёт по вертикали, голова «в окно» после прохождения грифа.',
  barbell_row: 'Корпус почти параллелен полу, тяни к низу живота, без рывков корпусом.',
  rdl: 'Таз назад, колени чуть согнуты, гриф скользит по бёдрам, почувствуй растяжение.',
  pullups: 'Начни движение лопатками, тянись грудью к перекладине, полная амплитуда.',
  incline_bench: 'Угол 30°, лопатки сведены, гриф на верх груди.',
  leg_press: 'Поясница прижата, колени не сводить внутрь, без полного выпрямления в верхней точке.',
  hip_thrust: 'Подбородок к груди, рёбра вниз, пауза 1 с наверху с напряжением ягодиц.',
  lateral_raise: 'Локти чуть согнуты, веди в стороны до уровня плеч, без раскачки.',
  calf_raise: 'Пауза 1 с внизу в растяжении, полная амплитуда.',
};
