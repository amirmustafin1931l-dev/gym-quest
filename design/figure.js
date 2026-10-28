/* Параметрический качок v3 (комикс GTA V).
   drawFigure(b, opts) -> SVG string.  b: масса 0..1
   opts: view 'front'|'back'; style 'comic'|'soft'|'poly'; stage 1..5; gear 'street'|'pro'|'gang';
         look { skin, hair:'short'|'bald'|'afro'|'mohawk'|'long', beard:'none'|'stubble'|'full', hairColor };
         muscles { today:[], lagging:[], load:{} }; w,h; headOnly; shadow */
(function () {
  const SKINS = { light: ['#f1c9a5', '#d39a6c', '#f8dcc2'], tan: ['#d9a066', '#b6773f', '#eab77d'], brown: ['#a86b3c', '#7e4a22', '#c48a58'], dark: ['#6b4226', '#49291a', '#8a5a3a'] };
  const OUT = '#1b1410';
  const uid = () => 'g' + Math.random().toString(36).slice(2, 8);
  const stageOf = (b) => b < 0.2 ? 1 : b < 0.42 ? 2 : b < 0.65 ? 3 : b < 0.88 ? 4 : 5;

  // экипировка по наборам и стадиям
  const GEAR = {
    street: [
      { top: 'tank', topC: '#f1efe8', shorts: '#2b3a67' },
      { top: 'tank', topC: '#f1efe8', shorts: '#2b3a67', head: 'headband', wrist: 'red' },
      { top: 'tank', topC: '#15151a', shorts: '#1d1d22', head: 'cap', wrist: 'red', belt: 'black' },
      { top: 'tank', topC: '#15151a', shorts: '#1d1d22', head: 'cap', glasses: true, chain: 'gold', gloves: true, belt: 'black' },
      { top: 'stringer', topC: '#15151a', shorts: '#1d1d22', head: 'cap', glasses: true, chain: 'gold', gloves: true, belt: 'gold', tattoo: 'both' },
    ],
    pro: [
      { top: 'tshirt', topC: '#7d8089', shorts: '#222' },
      { top: 'tank', topC: '#f1efe8', shorts: '#222' },
      { top: 'stringer', topC: '#d12f2f', shorts: '#222', belt: 'black' },
      { top: 'stringer', topC: '#15151a', shorts: '#222', belt: 'black', wrist: 'white', knee: true },
      { top: 'none', shorts: '#111', belt: 'champion', wrist: 'white', knee: true, head: 'headband', chalk: true },
    ],
    gang: [
      { top: 'hoodie', topC: '#2f6b3a', shorts: '#3a3a3a' },
      { top: 'tank', topC: '#f1efe8', shorts: '#3a3a3a', head: 'bandana', bandC: '#2f8f3f' },
      { top: 'tank', topC: '#15151a', shorts: '#2f6b3a', head: 'bandana', bandC: '#2f8f3f', chain: 'silver' },
      { top: 'tank', topC: '#15151a', shorts: '#2f6b3a', head: 'bandana', bandC: '#2f8f3f', chain: 'gold', glasses: true, tattoo: 'left' },
      { top: 'stringer', topC: '#2f6b3a', shorts: '#111', head: 'bandana', bandC: '#111', chain: 'double', glasses: true, tattoo: 'both', grillz: true },
    ],
  };

  function drawFigure(b, o = {}) {
    const view = o.view || 'front', style = o.style || 'comic', stage = o.stage ?? stageOf(b);
    const gear = { ...(GEAR[o.gear || 'street'] || GEAR.street)[Math.max(0, Math.min(4, stage - 1))], ...(o.gearOverride || {}) };
    const look = { skin: 'tan', hair: 'short', beard: 'none', hairColor: '#2a1a10', ...(o.look || {}) };
    const [SKIN, SKIN_D, SKIN_L] = SKINS[look.skin] || SKINS.tan;
    const comic = style === 'comic', poly = style === 'poly', soft = style === 'soft';
    const M = o.muscles || { today: [], lagging: [], load: {} };
    const id = uid(), ow = comic ? 3.2 : 0, join = poly ? 'miter' : 'round';

    // ---- размеры: сильный контраст между стадиями ----
    const S = 54 + 66 * b, D = 14 + 26 * b, W = 42 + 8 * b, C = S - 6, NK = 9 + 18 * b;
    const UA = 13 + 32 * b, FA = 10 + 17 * b, TH = 23 + 38 * b, SH = 15 + 17 * b, trapH = 1 + 32 * b;
    const latF = view === 'back' ? 4 + 22 * b : 0;
    const HR = 26 + 2 * b, headY = 58 + 6 * Math.max(0, 1 - b * 3);   // новичок чуть сутулится
    const topC = gear.topC || '#f1efe8', topD = shade(topC), shortsC = gear.shorts || '#2b3a67', shortsD = shade(shortsC);

    const vb = o.headOnly ? '60 0 180 150' : '0 0 300 520';
    let s = `<svg viewBox="${vb}" width="${o.w || 300}" height="${o.h || (o.headOnly ? 250 : 520)}" xmlns="http://www.w3.org/2000/svg">`;
    const grad = (n, c1, c2) => `<linearGradient id="${id}${n}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset="${soft ? 0.3 : 0.58}" stop-color="${c1}"/><stop offset="${soft ? 1 : 0.58}" stop-color="${c2}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
    const rgrad = (n, c1, c2) => `<radialGradient id="${id}${n}" cx="0.38" cy="0.35" r="0.72"><stop offset="0" stop-color="${c1}"/><stop offset="${soft ? 0.45 : 0.62}" stop-color="${c1}"/><stop offset="${soft ? 1 : 0.62}" stop-color="${c2}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
    s += `<defs>${grad('sk', SKIN, SKIN_D)}${rgrad('skr', SKIN_L, SKIN_D)}${rgrad('skr2', SKIN, SKIN_D)}${grad('tp', topC, topD)}${grad('sh', shortsC, shortsD)}</defs>`;
    const FSK = `url(#${id}sk)`, FSKR = `url(#${id}skr)`, FSKR2 = `url(#${id}skr2)`, FTP = `url(#${id}tp)`, FSH = `url(#${id}sh)`;
    const st = (fill) => `fill="${fill}" stroke="${comic ? OUT : 'none'}" stroke-width="${ow}" stroke-linejoin="${join}"`;

    const limb = (x1, y1, w1, x2, y2, w2, fill) => {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      const p = [[x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x2 + nx * w2 / 2, y2 + ny * w2 / 2], [x2 - nx * w2 / 2, y2 - ny * w2 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2]];
      let d = `M${p[0]} L${p[1]} ` + (poly ? `L${p[2]} ` : `A${w2 / 2} ${w2 / 2} 0 0 0 ${p[2]} `) + `L${p[3]} ` + (poly ? 'Z' : `A${w1 / 2} ${w1 / 2} 0 0 0 ${p[0]} Z`);
      return `<path d="${d}" ${st(fill)}/>`;
    };
    const ell = (cx, cy, rx, ry, fill, extra = '') => poly ? `<polygon points="${hexPts(cx, cy, rx, ry)}" ${st(fill)} ${extra}/>` : `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${st(fill)} ${extra}/>`;
    const path = (d, fill, extra = '') => `<path d="${d}" ${st(fill)} ${extra}/>`;
    const musc = (mid, shape) => {
      const today = M.today?.includes(mid), lag = M.lagging?.includes(mid), load = M.load?.[mid] ?? 0;
      if (!today && !lag && !load) return '';
      const col = today ? '#39e07a' : lag ? '#ff9f1c' : '#4fb3ff', op = today ? 0.62 : lag ? 0.55 : 0.18 + 0.4 * load;
      const attrs = `fill="${col}" opacity="${op}" stroke="${today ? '#1f8f4b' : lag ? '#b86a00' : 'none'}" stroke-width="${today || lag ? 2 : 0}" stroke-dasharray="${lag ? '5 3' : ''}"`;
      return shape.replace(/<(ellipse|path)/, `<$1 ${attrs}`);
    };

    if (o.shadow !== false && !o.headOnly) s += `<ellipse cx="150" cy="506" rx="${56 + 44 * b}" ry="10" fill="rgba(0,0,0,.4)"/>`;
    let over = '';

    // ===== ноги =====
    for (const k of [-1, 1]) {
      const hx = 150 + k * (24 + 7 * b), kx = 150 + k * (28 + 7 * b), ax = 150 + k * (28 + 3 * b);
      s += limb(hx, 292, TH, kx, 402, TH * 0.72, FSK);
      s += limb(kx, 400, SH, ax, 494, SH * 0.62, FSK);
      s += ell(kx + k * 3, 438, SH * 0.5, 26, FSKR2);
      s += ell(hx + k * 2, 346, TH * 0.42, 44, FSKR2);
      if (gear.knee) s += `<rect x="${kx - SH * 0.6 - 3}" y="388" width="${SH * 1.2 + 6}" height="26" rx="5" ${st('#1a1a1a')}/>`;
      s += `<path d="M${ax - 20 - 7 * b} 486 h${40 + 14 * b} a8 8 0 0 1 8 8 v8 h-${56 + 14 * b} v-8 a8 8 0 0 1 8 -8 z" ${st('#1b1b1b')}/><path d="M${ax - 16 - 7 * b} 494 h${34 + 14 * b}" stroke="#fff" stroke-width="2" opacity=".5"/>`;
      over += musc('calves', `<ellipse cx="${kx + k * 3}" cy="438" rx="${SH * 0.5}" ry="26"/>`);
      over += musc(view === 'front' ? 'quads' : 'hamstrings', `<ellipse cx="${hx + k * 2}" cy="346" rx="${TH * 0.42}" ry="44"/>`);
    }
    // ===== шорты =====
    s += path(`M${150 - W - 10} 256 L${150 + W + 10} 256 L${150 + W + 24 + 9 * b} 334 L${150 + 8} 334 L150 304 L${150 - 8} 334 L${150 - W - 24 - 9 * b} 334 Z`, FSH);
    if (view === 'back') for (const k of [-1, 1]) { s += `<ellipse cx="${150 + k * (W * 0.55)}" cy="290" rx="${W * 0.5 + 5 * b}" ry="${20 + 8 * b}" fill="rgba(0,0,0,.18)"/>`; over += musc('glutes', `<ellipse cx="${150 + k * (W * 0.55)}" cy="290" rx="${W * 0.5 + 5 * b}" ry="${20 + 8 * b}"/>`); }

    // ===== торс =====
    const torso = view === 'front'
      ? `M${150 - C} 106 L${150 + C} 106 L${150 + W + 8} 262 L${150 - W - 8} 262 Z`
      : `M${150 - C} 106 L${150 + C} 106 Q${150 + C + latF} 150 ${150 + W + 8} 262 L${150 - W - 8} 262 Q${150 - C - latF} 150 ${150 - C} 106 Z`;
    s += path(torso, FSK);
    // грудь / пресс (кожа)
    const pecs = () => { for (const k of [-1, 1]) s += `<ellipse cx="${150 + k * (20 + 12 * b)}" cy="${150 + 6 * b}" rx="${20 + 19 * b}" ry="${14 + 13 * b}" fill="rgba(0,0,0,${gear.top === 'none' ? 0.14 : topC === '#f1efe8' ? 0.09 : 0.22})"/>`; };
    const abs = () => { if (b > 0.3) for (let i = 0; i < 3; i++) s += `<rect x="${150 - 18 - 8 * b}" y="${184 + i * 24}" width="${36 + 16 * b}" height="18" rx="6" fill="rgba(0,0,0,${0.05 + 0.2 * (b - 0.3)})"/>`; };
    const top = gear.top || 'tank';
    if (view === 'front') {
      if (top === 'none') { pecs(); abs(); }
      else {
        const neckline = top === 'stringer' ? 170 + 14 * b : top === 'tshirt' || top === 'hoodie' ? 126 : 146 + 10 * b;
        const strapW = top === 'stringer' ? 8 : top === 'tank' ? 18 : 0;
        if (top === 'tshirt' || top === 'hoodie') s += path(`M${150 - C} 106 L${150 - NK - 6} 106 Q150 ${neckline} ${150 + NK + 6} 106 L${150 + C} 106 L${150 + W + 8} 262 L${150 - W - 8} 262 Z`, FTP);
        else s += path(`M${150 - C + 8} 106 L${150 - C + 8 + strapW} 106 Q150 ${neckline} ${150 + C - 8 - strapW} 106 L${150 + C - 8} 106 L${150 + W + 8} 262 L${150 - W - 8} 262 Z`, FTP);
        if (top === 'hoodie') { s += `<path d="M${150 - 26} 190 h52 v34 h-52 z" fill="rgba(0,0,0,.25)"/><path d="M${150 - 8} 110 v36 M${150 + 8} 110 v36" stroke="#eee" stroke-width="3"/>`; }
        pecs(); if (top === 'stringer') abs();
        if (top !== 'tshirt' && top !== 'hoodie') for (const k of [-1, 1]) s += `<path d="M${150 + k * (C - 8 - strapW / 2)} 108 L${150 + k * (S - 14)} 102" stroke="${topC}" stroke-width="${Math.max(5, strapW * 0.55)}" stroke-linecap="round" fill="none"/>`;
      }
      for (const k of [-1, 1]) { over += musc('chest', `<ellipse cx="${150 + k * (20 + 12 * b)}" cy="${150 + 6 * b}" rx="${20 + 19 * b}" ry="${14 + 13 * b}"/>`); over += musc('obliques', `<ellipse cx="${150 + k * (W - 6)}" cy="214" rx="8" ry="30"/>`); }
      over += musc('abs', `<path d="M${150 - 22 - 6 * b} 180 h${44 + 12 * b} v72 h-${44 + 12 * b} z"/>`);
    } else {
      if (top === 'tshirt' || top === 'hoodie') s += path(`M${150 - C} 106 L${150 + C} 106 Q${150 + C + latF} 150 ${150 + W + 8} 262 L${150 - W - 8} 262 Q${150 - C - latF} 150 ${150 - C} 106 Z`, FTP);
      else if (top !== 'none') { const sw = top === 'stringer' ? 10 : 22; s += path(`M${150 - C + 10} 106 L${150 - C + 10 + sw} 106 L${150 - 14} ${160 + 14 * b} L${150 + 14} ${160 + 14 * b} L${150 + C - 10 - sw} 106 L${150 + C - 10} 106 L${150 + W + 8} 262 L${150 - W - 8} 262 Z`, FTP); }
      if (top === 'hoodie') s += path(`M${150 - HR - 8} 40 Q150 ${0} ${150 + HR + 8} 40 L${150 + HR + 14} 110 L${150 - HR - 14} 110 Z`, FTP);
      s += `<path d="M150 112 L150 250" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`;
      for (const k of [-1, 1]) over += musc('lats', `<path d="M${150 + k * 20} 124 L${150 + k * (C + latF - 4)} 150 L${150 + k * (W + 2)} 236 L${150 + k * 14} 210 Z"/>`);
      over += musc('lower_back', `<path d="M${150 - 22} 206 h44 v48 h-44 z"/>`);
    }
    // пояс
    if (gear.belt) {
      const champ = gear.belt === 'champion';
      s += `<rect x="${150 - W - 12}" y="${champ ? 248 : 252}" width="${(W + 12) * 2}" height="${champ ? 26 : 18}" ${st(champ ? '#3b2a12' : '#2a2522')}/>`;
      if (view === 'front') s += champ ? `<ellipse cx="150" cy="261" rx="26" ry="15" ${st('#f3c846')}/><circle cx="150" cy="261" r="6" fill="#b8860b"/>` : `<rect x="${150 - 12}" y="250" width="24" height="22" rx="3" ${st(gear.belt === 'gold' ? '#f3c846' : '#8d8d8d')}/>`;
    }
    // ===== шея и трапеции =====
    s += `<rect x="${150 - NK}" y="${headY + 18}" width="${NK * 2}" height="${112 - headY - 18}" fill="${FSK}"/>` + (comic ? `<path d="M${150 - NK} ${headY + 20} V112 M${150 + NK} ${headY + 20} V112" stroke="${OUT}" stroke-width="${ow}"/>` : '');
    s += path(`M${150 - NK - 2} ${104 - trapH * 0.5} Q150 ${88 - trapH} ${150 + NK + 2} ${104 - trapH * 0.5} L${150 + S - 10} 108 L${150 - S + 10} 108 Z`, FSK);
    if (view === 'back') over += musc('upper_back', `<path d="M${150 - NK - 2} ${104 - trapH * 0.5} Q150 ${88 - trapH} ${150 + NK + 2} ${104 - trapH * 0.5} L${150 + S - 14} 110 L${150 + 24} 160 L${150 - 24} 160 L${150 - S + 14} 110 Z"/>`);
    // цепи
    if (gear.chain && view === 'front') {
      const gold = gear.chain !== 'silver', c = gold ? '#f3c846' : '#c9ced6';
      s += `<path d="M${150 - NK - 6} 100 Q150 ${146 + 8 * b} ${150 + NK + 6} 100" stroke="${c}" stroke-width="${3 + 3 * b}" fill="none" stroke-dasharray="4 2"/>`;
      if (gear.chain === 'double') s += `<path d="M${150 - NK - 8} 98 Q150 ${166 + 8 * b} ${150 + NK + 8} 98" stroke="${c}" stroke-width="${3 + 3 * b}" fill="none" stroke-dasharray="4 2"/>`;
      s += `<circle cx="150" cy="${142 + 6 * b}" r="${6 + 2 * b}" ${st(c)}/>`;
    }

    // ===== руки =====
    for (const k of [-1, 1]) {
      const sx = 150 + k * S, ex = 150 + k * (S + 12 + 10 * b), wx = 150 + k * (S + 24 + 10 * b);
      s += limb(sx, 122, UA, ex, 224, UA * 0.8, FSK);
      s += ell((sx + ex) / 2 + k * UA * 0.1, 170, UA * 0.5, 22 + 11 * b, FSKR2);
      over += musc(view === 'front' ? 'biceps' : 'triceps', `<ellipse cx="${(sx + ex) / 2 + k * UA * 0.1}" cy="170" rx="${UA * 0.5}" ry="${22 + 11 * b}"/>`);
      if (gear.tattoo === 'both' || (gear.tattoo === 'left' && k === -1)) s += `<g stroke="#24364f" stroke-width="2" fill="none" opacity=".85"><path d="M${sx - 7} 146 l7 -12 l7 12 l-7 12 z"/><path d="M${sx - 10} 166 q10 10 20 0 M${sx - 8} 184 q8 8 16 0"/><circle cx="${sx}" cy="200" r="5"/></g>`;
      s += limb(ex, 222, FA, wx, 318, FA * 0.7, FSK);
      s += ell((ex + wx) / 2 + k * 2, 258, FA * 0.5, 28, FSKR2, 'opacity=".8"');
      over += musc('forearms', `<ellipse cx="${(ex + wx) / 2 + k * 2}" cy="262" rx="${FA * 0.55}" ry="36"/>`);
      if (gear.wrist) s += `<rect x="${wx - FA * 0.45 - 2}" y="302" width="${FA * 0.9 + 4}" height="${gear.wrist === 'white' ? 18 : 12}" rx="2" ${st(gear.wrist === 'white' ? '#f1efe8' : '#d12f2f')}/>`;
      s += ell(wx + k * 2, 330, 11 + 4 * b, 12 + 4 * b, gear.gloves ? '#222' : gear.chalk ? '#eee' : FSKR2);
      s += ell(sx, 118, D, D, FSKR);
      if (top === 'tshirt' || top === 'hoodie') s += path(`M${sx - k * D} 104 L${sx + k * (D + 2)} 108 L${sx + k * (D + 6)} 160 L${sx - k * (D - 2)} 160 Z`, FTP);
      over += musc(view === 'front' ? 'front_delts' : 'rear_delts', `<ellipse cx="${sx - k * D * 0.25}" cy="122" rx="${D * 0.7}" ry="${D * 0.75}"/>`);
      over += musc('side_delts', `<ellipse cx="${sx + k * D * 0.45}" cy="116" rx="${D * 0.55}" ry="${D * 0.8}"/>`);
    }

    // ===== голова =====
    const hc = look.hairColor;
    if (look.hair === 'afro') s += ell(150, headY - 8, HR + 14, HR + 12, hc);
    if (look.hair === 'long') s += path(`M${150 - HR - 6} ${headY - 10} Q150 ${headY - 48} ${150 + HR + 6} ${headY - 10} L${150 + HR + 10} ${headY + 60} L${150 - HR - 10} ${headY + 60} Z`, hc);
    s += ell(150, headY, HR, 30, FSKR);
    if (view === 'front') {
      if (look.hair === 'short') s += path(`M${150 - HR + 3} ${headY - 8} Q150 ${headY - 46} ${150 + HR - 3} ${headY - 8} L${150 + HR - 5} ${headY - 16} Q150 ${headY - 32} ${150 - HR + 5} ${headY - 16} Z`, hc);
      if (look.hair === 'mohawk') s += path(`M${150 - 7} ${headY - 26} L${150 - 9} ${headY - 52} L150 ${headY - 60} L${150 + 9} ${headY - 52} L${150 + 7} ${headY - 26} Z`, hc);
      if (look.hair === 'long') s += path(`M${150 - HR + 2} ${headY - 10} Q150 ${headY - 44} ${150 + HR - 2} ${headY - 10} L${150 + HR - 6} ${headY - 20} Q150 ${headY - 30} ${150 - HR + 6} ${headY - 20} Z`, hc);
      if (look.hair === 'bald') s += `<ellipse cx="${150 - 8}" cy="${headY - 20}" rx="7" ry="3" fill="rgba(255,255,255,.25)"/>`;
      if (look.beard === 'stubble') s += `<path d="M${150 - HR + 3} ${headY + 4} Q150 ${headY + 40} ${150 + HR - 3} ${headY + 4} L${150 + HR - 6} ${headY + 20} Q150 ${headY + 36} ${150 - HR + 6} ${headY + 20} Z" fill="${hc}" opacity=".35"/>`;
      if (look.beard === 'full') s += path(`M${150 - HR + 2} ${headY + 6} Q150 ${headY + 44} ${150 + HR - 2} ${headY + 6} L${150 + HR - 8} ${headY + 10} Q150 ${headY + 30} ${150 - HR + 8} ${headY + 10} Z`, hc);
      // головной убор
      if (gear.head === 'headband') s += `<rect x="${150 - HR}" y="${headY - 22}" width="${HR * 2}" height="9" ${st('#d12f2f')}/>`;
      if (gear.head === 'bandana') s += path(`M${150 - HR - 1} ${headY - 26} Q150 ${headY - 50} ${150 + HR + 1} ${headY - 26} L${150 + HR + 1} ${headY - 14} L${150 - HR - 1} ${headY - 14} Z`, gear.bandC || '#2f8f3f') + `<path d="M${150 - HR + 6} ${headY - 20} h${HR * 2 - 12}" stroke="rgba(255,255,255,.35)" stroke-width="2" stroke-dasharray="3 3"/>`;
      if (gear.head === 'cap') s += path(`M${150 - HR - 2} ${headY - 18} Q150 ${headY - 56} ${150 + HR + 2} ${headY - 18} Z`, '#15151a') + `<rect x="${150 + HR - 6}" y="${headY - 22}" width="18" height="8" rx="3" ${st('#15151a')}/>`;
      // лицо
      if (gear.glasses) s += `<rect x="${150 - 25}" y="${headY - 7}" width="21" height="12" rx="4" ${st('#111')}/><rect x="${150 + 4}" y="${headY - 7}" width="21" height="12" rx="4" ${st('#111')}/><path d="M${150 - 4} ${headY - 2} h8" stroke="#111" stroke-width="2"/>`;
      else { s += `<circle cx="140" cy="${headY - 1}" r="2.6" fill="#222"/><circle cx="160" cy="${headY - 1}" r="2.6" fill="#222"/><path d="M134 ${headY - 8 - 2 * b} l10 ${2 + 2 * b} M166 ${headY - 8 - 2 * b} l-10 ${2 + 2 * b}" stroke="${hc}" stroke-width="2.4" stroke-linecap="round"/>`; }
      s += gear.grillz ? `<path d="M142 ${headY + 15} Q150 ${headY + 20} 158 ${headY + 15}" stroke="#f3c846" stroke-width="4" fill="none"/>` : `<path d="M${142 - 2 * b} ${headY + 15} Q150 ${headY + 19 + 5 * b} ${158 + 2 * b} ${headY + 15}" stroke="#7a4a2a" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
      if (b > 0.6) s += `<path d="M${150 - HR + 4} ${headY + 4} Q${150 - HR + 10} ${headY + 18} 150 ${headY + 22} Q${150 + HR - 10} ${headY + 18} ${150 + HR - 4} ${headY + 4}" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="3"/>`;
    } else {
      if (look.hair !== 'bald' && look.hair !== 'afro' && look.hair !== 'long') s += path(`M${150 - HR + 2} ${headY + 4} Q${150 - HR} ${headY - 36} 150 ${headY - 40} Q${150 + HR} ${headY - 36} ${150 + HR - 2} ${headY + 4} Q150 ${headY + 14} ${150 - HR + 2} ${headY + 4} Z`, hc);
      if (look.hair === 'mohawk') s += path(`M${150 - 7} ${headY - 30} L${150 - 9} ${headY - 52} L150 ${headY - 60} L${150 + 9} ${headY - 52} L${150 + 7} ${headY - 30} Z`, hc);
      if (gear.head === 'headband' || gear.head === 'bandana') { const c = gear.head === 'bandana' ? (gear.bandC || '#2f8f3f') : '#d12f2f'; s += `<rect x="${150 - HR}" y="${headY - 22}" width="${HR * 2}" height="9" ${st(c)}/><path d="M${150 + HR - 4} ${headY - 18} l10 8 M${150 + HR - 4} ${headY - 16} l8 12" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`; }
      if (gear.head === 'cap') s += path(`M${150 - HR - 2} ${headY - 18} Q150 ${headY - 56} ${150 + HR + 2} ${headY - 18} Z`, '#15151a') + `<path d="M${150 - 14} ${headY - 18} h28 l-4 -8 h-20 z" ${st('#15151a')}/><path d="M${150 - 12} ${headY - 22} q12 -6 24 0" stroke="${SKIN}" stroke-width="3" fill="none"/>`;
    }
    s += `<g>${over}</g></svg>`;
    return s;
  }

  function shade(hex) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const f = (v) => Math.max(0, Math.round(v * 0.62)); return `#${((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0')}`; }
  function hexPts(cx, cy, rx, ry) { const n = 7, out = []; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; out.push(`${(cx + rx * Math.cos(a)).toFixed(1)},${(cy + ry * Math.sin(a)).toFixed(1)}`); } return out.join(' '); }

  window.drawFigure = drawFigure; window.stageOf = stageOf; window.GEAR = GEAR; window.SKINS = SKINS;
})();
