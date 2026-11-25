/* CampusShare — constants + seed data for the demo prototype */
'use strict';

const CATEGORIES = [
  { id: 'books',       name: 'Books & Notes',     emoji: '📚', hue: 28  },
  { id: 'electronics', name: 'Electronics',       emoji: '🔌', hue: 210 },
  { id: 'lab',         name: 'Lab Gear',          emoji: '🥼', hue: 170 },
  { id: 'stationery',  name: 'Stationery & Tools',emoji: '📐', hue: 45  },
  { id: 'sports',      name: 'Sports & Fitness',  emoji: '🏸', hue: 130 },
  { id: 'kitchen',     name: 'Kitchen',           emoji: '☕', hue: 15  },
  { id: 'travel',      name: 'Cycles & Travel',   emoji: '🚲', hue: 190 },
  { id: 'furniture',   name: 'Room & Furniture',  emoji: '🪑', hue: 35  },
  { id: 'clothing',    name: 'Formals & Fest',    emoji: '👔', hue: 260 },
  { id: 'fun',         name: 'Music & Games',     emoji: '🎸', hue: 320 },
  { id: 'other',       name: 'Other',             emoji: '📦', hue: 0   },
];

const TYPES = {
  lend: { label: 'Lend',     verb: 'Borrow', ing: 'borrow', desc: 'Free to borrow, return later' },
  rent: { label: 'Rent',     verb: 'Rent',   ing: 'rent',   desc: 'Charge a small daily fee' },
  sell: { label: 'Sell',     verb: 'Buy',    ing: 'buy',    desc: 'Sell it for good' },
  free: { label: 'Giveaway', verb: 'Claim',  ing: 'claim',  desc: 'Give it away for free' },
};

const PICKUPS = [
  'Hostel lobby / common room',
  'I\'ll come to your room',
  'Central library entrance',
  'Main canteen',
  'Academic block foyer',
  'Main gate',
];

const CONDITIONS = ['Brand new', 'Like new', 'Good', 'Fair'];

const EMOJI_PALETTE = ['📚','📝','📘','🧮','🔌','💻','🎧','📷','📽️','🔋','🥼','🔬','🧪','📐','📏','✏️','🏸','🏏','⚽','🧘','☕','🫖','🍳','🧊','🚲','🧳','☂️','🪑','💡','🛏️','👔','🥻','👟','🎸','🎲','🎮','📦','🧰','🖱️','🤖','👕'];

const AVATAR_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#14b8a6','#ef4444','#84cc16','#f97316'];

function seed() {
  const now = Date.now();
  const H = 3600e3;
  const ago = (h) => now - h * H;

  const hostels = [
    { id: 'h1', name: 'Aravali Hall',      short: 'Aravali',  kind: 'Boys',     emoji: '🏔️', color: '#6366f1', blocks: 'Blocks A–D', capacity: 420, about: 'The oldest hall on campus, right next to the sports complex.' },
    { id: 'h2', name: 'Nilgiri Hall',      short: 'Nilgiri',  kind: 'Boys',     emoji: '🌲', color: '#10b981', blocks: 'Blocks N1–N3', capacity: 360, about: 'Quiet hall near the library. Famous for its night canteen.' },
    { id: 'h3', name: 'Kaveri Hall',       short: 'Kaveri',   kind: 'Girls',    emoji: '🌊', color: '#0ea5e9', blocks: 'Blocks K1–K2', capacity: 300, about: 'Lakeside hall with the best common room on campus.' },
    { id: 'h4', name: 'Ganga Hall',        short: 'Ganga',    kind: 'Girls',    emoji: '🪷', color: '#ec4899', blocks: 'Blocks G1–G3', capacity: 340, about: 'Newest girls’ hall, close to the academic blocks.' },
    { id: 'h5', name: 'Shivalik Hall',     short: 'Shivalik', kind: 'Boys',     emoji: '⛰️', color: '#f59e0b', blocks: 'Blocks S1–S4', capacity: 480, about: 'The biggest hall — home to most final-years.' },
    { id: 'h6', name: 'Satpura Residency', short: 'Satpura',  kind: 'Co-ed PG', emoji: '🏙️', color: '#8b5cf6', blocks: 'Towers 1–2', capacity: 220, about: 'Postgraduate residency with studio rooms.' },
  ];

  const U = (id, name, hostelId, room, dept, year, bio, joinedDaysAgo, color) => ({
    id, name, email: name.split(' ')[0].toLowerCase() + '@campus.edu', password: 'demo123',
    hostelId, room, dept, year, bio, joinedAt: ago(joinedDaysAgo * 24), color, saved: [],
  });

  const users = [
    U('u1', 'Aarav Sharma',  'h1', 'A-214', 'Computer Science', '3rd year', 'Coder by night, badminton by evening. Happy to lend anything I own.', 400, '#6366f1'),
    U('u2', 'Priya Nair',    'h3', 'K-108', 'Electronics',      '2nd year', 'ECE • robotics club • always carrying an extension board.', 300, '#0ea5e9'),
    U('u3', 'Rohan Verma',   'h1', 'B-031', 'Mechanical',       '4th year', 'Final year. Clearing out my room slowly — ask me for anything.', 900, '#10b981'),
    U('u4', 'Sneha Reddy',   'h4', 'G-305', 'Biotechnology',    '1st year', 'Fresher! Still figuring out where everything is 🙂', 90, '#ec4899'),
    U('u5', 'Kabir Singh',   'h2', 'N-122', 'Civil',            '2nd year', 'Cyclist. Cricket on weekends.', 320, '#f59e0b'),
    U('u6', 'Ananya Iyer',   'h3', 'K-220', 'Physics',          '3rd year', 'Physics nerd. Selling my old JEE books.', 600, '#8b5cf6'),
    U('u7', 'Vikram Rao',    'h5', 'S-410', 'Electrical',       '4th year', 'Electronics lab TA. I have most tools you’ll need.', 1000, '#14b8a6'),
    U('u8', 'Meera Joshi',   'h6', 'T1-12', 'MBA',              '1st year', 'Board games, chai, and case competitions.', 120, '#ef4444'),
    U('u9', 'Arjun Das',     'h2', 'N-301', 'Chemical',         '3rd year', 'Minimalist. If I’m not using it, you can.', 500, '#84cc16'),
    U('u10','Fatima Khan',   'h4', 'G-118', 'Architecture',     '2nd year', 'Architecture student — drafting tools & costumes for fests.', 280, '#f97316'),
  ];
  users[0].saved = ['i3', 'i11', 'i26'];

  const hostelOf = (uid) => users.find((u) => u.id === uid).hostelId;
  const I = (id, ownerId, title, category, type, price, condition, desc, hoursAgo, extra = {}) => ({
    id, ownerId, hostelId: hostelOf(ownerId), title, category, type, price: price || 0, condition, desc,
    createdAt: ago(hoursAgo), status: 'available', maxDays: type === 'lend' || type === 'rent' ? 7 : null,
    deposit: 0, emoji: null, image: null, views: Math.floor(10 + Math.random() * 120), ...extra,
  });

  const items = [
    I('i1',  'u3', 'Casio fx-991EX Scientific Calculator', 'electronics', 'lend', 0, 'Like new', 'Classwiz model, all exam-approved. I have two of these, so two people can borrow at once. Please return before your next exam ends 😄', 5, { emoji: '🧮', maxDays: 5, quantity: 2 }),
    I('i2',  'u2', 'Engineering Drawing Kit (mini-drafter + set squares)', 'stationery', 'rent', 15, 'Good', 'Complete ED kit: mini drafter, set squares, protractor, compass and clips. Perfect for first-year ED labs.', 9, { emoji: '📐', maxDays: 14 }),
    I('i3',  'u5', 'Hero Sprint 21-gear Cycle', 'travel', 'rent', 40, 'Good', 'Smooth gears, new brake pads, lock + key included. Great for getting to the far academic blocks.', 20, { emoji: '🚲', deposit: 500 }),
    I('i4',  'u4', 'Lab Coat (Medium)', 'lab', 'lend', 0, 'Like new', 'Washed and ironed. Medium size, fits 5’4"–5’9".', 30, { emoji: '🥼', maxDays: 10 }),
    I('i5',  'u6', 'HC Verma Concepts of Physics Vol 1 & 2', 'books', 'sell', 350, 'Good', 'Both volumes, a few pencil marks in chapters 4–7. Selling together only.', 2, { emoji: '📚' }),
    I('i6',  'u7', 'Arduino Uno Starter Kit', 'electronics', 'rent', 30, 'Good', 'Uno R3, breadboard, jumper wires, sensors (ultrasonic, DHT11, IR), servo + LCD. Ideal for mini projects.', 14, { emoji: '🤖', deposit: 300, maxDays: 10 }),
    I('i7',  'u1', 'Yonex Badminton Racquet + 6 Shuttles', 'sports', 'lend', 0, 'Good', 'Yonex Nanoray. Restrung last month. Shuttles are feather ones, please don’t smash them on concrete!', 60, { emoji: '🏸', maxDays: 3 }),
    I('i8',  'u8', 'Electric Kettle 1.5L', 'kitchen', 'sell', 400, 'Like new', 'Prestige kettle, used for 3 months. Auto shut-off works perfectly.', 26, { emoji: '🫖' }),
    I('i9',  'u9', 'LED Study Lamp (USB rechargeable)', 'furniture', 'free', 0, 'Good', 'Touch dimmer, 3 brightness levels. Battery lasts ~3 hrs. Free to whoever needs it.', 4, { emoji: '💡' }),
    I('i10', 'u10','Navy Formal Blazer (Unisex, size 40)', 'clothing', 'rent', 50, 'Like new', 'Dry-cleaned. Perfect for placement interviews, farewells and presentations.', 48, { emoji: '👔', deposit: 300 }),
    I('i11', 'u3', 'Yamaha F310 Acoustic Guitar', 'fun', 'rent', 50, 'Good', 'Comes with a gig bag, capo and spare strings. Slight scratch on the back.', 70, { emoji: '🎸', deposit: 1000 }),
    I('i12', 'u1', 'DSA Handwritten Notes (Sem 3, full syllabus)', 'books', 'free', 0, 'Good', 'Complete notes for Data Structures — trees, graphs, DP. Topper-approved 😉 Scanned copy also available.', 36, { emoji: '📝' }),
    I('i13', 'u2', '4-Socket Extension Board (5m)', 'electronics', 'lend', 0, 'Good', 'Surge protected. 5m cable reaches from the wall to any bed.', 12, { emoji: '🔌' }),
    I('i14', 'u5', 'Cricket Kit (bat, pads, gloves, helmet)', 'sports', 'lend', 0, 'Fair', 'Full kit for inter-hostel matches. Bat is SS English willow.', 100, { emoji: '🏏', maxDays: 2 }),
    I('i15', 'u6', 'Mini Fridge 50L', 'kitchen', 'sell', 3500, 'Good', 'Godrej 50L. Works great, graduating soon so selling. You pick it up from K-220.', 18, { emoji: '🧊' }),
    I('i16', 'u4', 'Large Trolley Suitcase', 'travel', 'lend', 0, 'Like new', 'Large 75cm 4-wheel suitcase with TSA lock. For going home during breaks.', 55, { emoji: '🧳', maxDays: 14 }),
    I('i17', 'u7', 'Digital Multimeter', 'lab', 'lend', 0, 'Good', 'Auto-ranging, continuity buzzer, comes with probes. Battery replaced recently.', 8, { emoji: '🔋' }),
    I('i18', 'u9', 'Foldable Study Chair', 'furniture', 'sell', 300, 'Good', 'Sturdy cushioned folding chair. Saves a lot of room space.', 80, { emoji: '🪑' }),
    I('i19', 'u10','Silk Saree for Fest Night', 'clothing', 'rent', 100, 'Like new', 'Maroon & gold silk saree with stitched blouse (M). Worn once for cultural night.', 22, { emoji: '🥻', deposit: 500, maxDays: 3 }),
    I('i20', 'u8', 'Board Games: Catan + Uno + Codenames', 'fun', 'lend', 0, 'Good', 'All pieces present (counted!). Great for hostel game nights.', 40, { emoji: '🎲', maxDays: 4 }),
    I('i21', 'u1', 'Logitech M331 Wireless Mouse', 'electronics', 'sell', 450, 'Like new', 'Silent clicks — great for late-night coding in the library. Battery included.', 15, { emoji: '🖱️' }),
    I('i22', 'u3', 'Induction Cooktop', 'kitchen', 'rent', 20, 'Good', 'Philips 2100W with a free saucepan. Maggi at 2 AM, sorted.', 33, { emoji: '🍳' }),
    I('i23', 'u6', 'Yoga Mat (6mm)', 'sports', 'free', 0, 'Good', 'Purple 6mm anti-slip mat. Bought a new one, this one needs a home.', 6, { emoji: '🧘' }),
    I('i24', 'u2', 'GATE ECE Previous Year Papers (Made Easy)', 'books', 'sell', 250, 'Good', '20 years of solved papers, 2024 edition. A few solutions highlighted.', 50, { emoji: '📘' }),
    I('i25', 'u5', 'Big Golf Umbrella', 'other', 'lend', 0, 'Good', 'Huge umbrella — fits two people. Monsoon saviour.', 3, { emoji: '☂️', maxDays: 3 }),
    I('i26', 'u7', 'Mini Portable Projector', 'electronics', 'rent', 80, 'Good', 'HDMI + USB. Perfect for hostel movie nights or practising presentations.', 28, { emoji: '📽️', deposit: 1000, maxDays: 3 }),
    I('i27', 'u10','A1 Drawing Board + T-square', 'stationery', 'lend', 0, 'Good', 'A1 board with T-square and clips. Used for arch studio.', 90, { emoji: '📏', maxDays: 14 }),
    I('i28', 'u10','Canon 1500D DSLR + 18-55mm lens', 'electronics', 'rent', 250, 'Like new', 'Includes bag, 32GB card and spare battery. For fests, projects and photo walks.', 11, { emoji: '📷', deposit: 3000, maxDays: 4 }),
    I('i29', 'u8', 'Philips Dry Iron', 'other', 'lend', 0, 'Good', 'Light and heats up fast. Return within a day please!', 7, { emoji: '👕', maxDays: 1 }),
    I('i30', 'u9', 'Noise-cancelling Headphones', 'electronics', 'rent', 35, 'Good', 'Sony over-ears. Saved my sanity during exam week in a loud wing.', 16, { emoji: '🎧', deposit: 800, maxDays: 5 }),
    I('i31', 'u7', 'Casio fx-991ES Plus Calculator', 'electronics', 'lend', 0, 'Good', 'Older model but works perfectly. Same calculator many of you need for exams — just a different owner.', 30, { emoji: '🧮', maxDays: 3 }),
  ];

  const W = (id, userId, title, category, mode, budget, neededIn, desc, hoursAgo, offers = []) => ({
    id, userId, hostelId: hostelOf(userId), title, category, mode, budget, neededBy: isoDay(neededIn), desc,
    createdAt: ago(hoursAgo), status: 'open', offers,
  });

  const wanted = [
    W('w1', 'u4', 'Scientific calculator for tomorrow’s exam', 'electronics', 'borrow', null, 1, 'Mine stopped working 😭 Need one for the Maths-I exam tomorrow 9 AM. Will return by 1 PM!', 3,
      [{ id: 'o1', userId: 'u3', text: 'I have a Casio fx-991EX — request it from my listing!', itemId: 'i1', at: ago(2) }]),
    W('w2', 'u5', 'Blazer for farewell party', 'clothing', 'rent', 150, 4, 'Size 38–40, dark colour preferred. Need it for Saturday evening only.', 10),
    W('w3', 'u6', 'Spare HDMI cable', 'electronics', 'borrow', null, 0, 'Need an HDMI cable for a presentation in the seminar hall today at 4 PM.', 1),
    W('w4', 'u1', 'Kreyszig — Advanced Engineering Mathematics', 'books', 'buy', 300, 6, 'Any edition from 9th onwards is fine. Can pick up from any hostel.', 20,
      [{ id: 'o2', userId: 'u9', text: 'I have the 10th edition in decent condition. ₹250 works?', itemId: null, at: ago(6) }]),
    W('w5', 'u9', 'Badminton racquet for the weekend', 'sports', 'borrow', null, 2, 'Inter-wing tournament on Sunday. Need a racquet for 2 days.', 8),
    W('w6', 'u8', 'Mattress topper for 2 weeks', 'furniture', 'rent', 200, 5, 'Hostel mattress is killing my back. Need a topper until mine gets delivered.', 30),
    W('w7', 'u7', 'Soldering iron + stand', 'lab', 'borrow', null, 1, 'Project demo prep. Mine’s tip burnt out. Will return with a fresh tip 🙏', 5),
    W('w8', 'u2', 'Large suitcase for going home', 'travel', 'borrow', null, 3, 'Going home for the break, need a big suitcase for 10 days.', 14),
  ];
  wanted[2].status = 'fulfilled';

  const req = (id, itemId, requesterId, status, extra) => {
    const it = items.find((i) => i.id === itemId);
    return {
      id, itemId, requesterId, ownerId: it.ownerId, type: it.type, status, pickup: PICKUPS[0], message: '',
      messages: [], createdAt: ago(extra.h || 5), updatedAt: ago((extra.h || 5) - 1),
      history: [{ status: 'pending', at: ago(extra.h || 5) }], ...extra,
    };
  };

  const requests = [
    req('r1', 'i7', 'u5', 'active', { h: 50, from: isoDay(-2), to: isoDay(1), pickup: PICKUPS[1],
      message: 'Hey Aarav! Can I borrow your racquet for the inter-hostel practice?',
      history: [{ status: 'pending', at: ago(50) }, { status: 'accepted', at: ago(49) }, { status: 'active', at: ago(46) }] }),
    req('r2', 'i12', 'u2', 'pending', { h: 2, pickup: PICKUPS[2],
      message: 'Hi! Could I get your DSA notes? My sem-3 exams start next week 🙏' }),
    req('r3', 'i21', 'u6', 'pending', { h: 6, offer: 400, pickup: PICKUPS[3],
      message: 'Would you do ₹400 for the mouse? Can pick up anytime today.' }),
    req('r4', 'i3', 'u1', 'accepted', { h: 18, from: isoDay(1), to: isoDay(3), total: 120, pickup: PICKUPS[5],
      message: 'Need the cycle for 3 days to get to the new lab complex.',
      history: [{ status: 'pending', at: ago(18) }, { status: 'accepted', at: ago(12) }] }),
    req('r5', 'i11', 'u1', 'pending', { h: 4, from: isoDay(2), to: isoDay(4), total: 150, pickup: PICKUPS[1],
      message: 'Hey Rohan, want to practise for the open mic. Can I rent it for 3 days?' }),
    req('r6', 'i1', 'u1', 'completed', { h: 300, from: isoDay(-14), to: isoDay(-12), pickup: PICKUPS[1],
      message: 'Need the calculator for my DSP quiz!', reviewedByRequester: true,
      history: [{ status: 'pending', at: ago(300) }, { status: 'accepted', at: ago(298) }, { status: 'active', at: ago(290) }, { status: 'completed', at: ago(250) }] }),
    req('r7', 'i26', 'u1', 'declined', { h: 70, from: isoDay(-1), to: isoDay(0), total: 160, pickup: PICKUPS[0],
      message: 'Movie night in our wing!',
      history: [{ status: 'pending', at: ago(70) }, { status: 'declined', at: ago(66) }] }),
    req('r8', 'i28', 'u9', 'active', { h: 40, from: isoDay(-1), to: isoDay(2), total: 1000, pickup: PICKUPS[0],
      message: 'For the photography club walk.',
      history: [{ status: 'pending', at: ago(40) }, { status: 'accepted', at: ago(38) }, { status: 'active', at: ago(24) }] }),
    // overlaps Aarav's accepted booking (r4) — shows the double-booking guard when viewing as Kabir
    req('r9', 'i3', 'u9', 'pending', { h: 3, from: isoDay(2), to: isoDay(4), total: 120, pickup: PICKUPS[0],
      message: 'Hi Kabir, could I rent the cycle for a trip to the old campus?' }),
    req('r10', 'i3', 'u4', 'pending', { h: 1, from: isoDay(5), to: isoDay(6), total: 80, pickup: PICKUPS[5],
      message: 'Need it for the weekend cycling club ride!' }),
  ];
  const msg = (from, text, h) => ({ from, text, at: ago(h) });
  requests[0].messages = [msg('u5', requests[0].message, 50), msg('u1', 'Sure! Come by A-214 after 6.', 49), msg('u5', 'Got it, thanks a ton! Will return Thursday.', 46)];
  requests[1].messages = [msg('u2', requests[1].message, 2)];
  requests[2].messages = [msg('u6', requests[2].message, 6)];
  requests[3].messages = [msg('u1', requests[3].message, 18), msg('u5', 'Done! Meet me at the main gate at 8 AM, I’ll hand over the lock key too.', 12), msg('u1', 'Perfect, see you then 👍', 11)];
  requests[4].messages = [msg('u1', requests[4].message, 4)];
  requests[5].messages = [msg('u1', requests[5].message, 300), msg('u3', 'Sure, it’s yours till Friday.', 298)];
  requests[6].messages = [msg('u1', requests[6].message, 70), msg('u7', 'Sorry, already promised it to my wing for that night!', 66)];
  requests[7].messages = [msg('u9', requests[7].message, 40)];
  requests[8].messages = [msg('u9', requests[8].message, 3)];
  requests[9].messages = [msg('u4', requests[9].message, 1)];
  items.find((i) => i.id === 'i7').status = 'onloan';
  items.find((i) => i.id === 'i28').status = 'onloan';

  const R = (fromId, toId, stars, text, h) => ({ id: 'rv' + Math.random().toString(36).slice(2, 8), fromId, toId, stars, text, at: ago(h) });
  const reviews = [
    R('u1', 'u3', 5, 'Super chill, calculator was in perfect condition.', 250),
    R('u3', 'u1', 5, 'Returned on time, very polite. Would lend again!', 249),
    R('u5', 'u1', 5, 'Racquet was great. Thanks Aarav!', 400),
    R('u2', 'u7', 5, 'Vikram even explained how to use the kit.', 500),
    R('u9', 'u5', 4, 'Cycle was good, chain a bit loose.', 600),
    R('u4', 'u6', 5, 'Lovely person, gave me the books at a discount.', 200),
    R('u8', 'u10', 5, 'Blazer looked brand new!', 120),
    R('u6', 'u2', 5, 'Quick replies, smooth handover.', 300),
    R('u1', 'u5', 4, 'Good cycle, on-time handover.', 700),
    R('u10', 'u8', 5, 'Games night was a hit 🎲', 150),
    R('u7', 'u9', 4, 'Took good care of the projector.', 350),
  ];

  const N = (userId, text, link, h, read = false) => ({ id: 'n' + Math.random().toString(36).slice(2, 9), userId, text, link, at: ago(h), read });
  const notifications = [
    N('u1', '<b>Priya Nair</b> wants to claim your <b>DSA Handwritten Notes</b>', '/request/r2', 2),
    N('u1', '<b>Ananya Iyer</b> offered ₹400 for your <b>Logitech M331 Wireless Mouse</b>', '/request/r3', 6),
    N('u1', '<b>Arjun Das</b> offered to help with your wanted post <b>Kreyszig — Advanced Engineering Mathematics</b>', '/wanted/w4', 6),
    N('u1', '<b>Kabir Singh</b> accepted your request for <b>Hero Sprint 21-gear Cycle</b>', '/request/r4', 12, true),
    N('u1', '<b>Vikram Rao</b> declined your request for <b>Mini Portable Projector</b>', '/request/r7', 66, true),
  ];

  return { version: 3, session: null, hostels, users, items, wanted, requests, reviews, notifications };
}
