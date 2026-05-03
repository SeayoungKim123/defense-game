// 영웅 정의 + 생성 / 강화 / 공격
window.Game = window.Game || {};

Game.HERO_DEFS = {
  archer: {
    type: 'archer',
    name: '궁수',
    icon: '🏹',
    color: '#7be88a',
    atk: 6,
    cd: 0.5,
    range: 180,
    aoe: 0,
    projectileSpeed: 500,
  },
  mage: {
    type: 'mage',
    name: '마법사',
    icon: '🔮',
    color: '#c264ff',
    atk: 15,
    cd: 1.5,
    range: 200,
    aoe: 50,
    projectileSpeed: 350,
  },
  warrior: {
    type: 'warrior',
    name: '전사',
    icon: '⚔️',
    color: '#ff9933',
    atk: 25,
    cd: 1.0,
    range: 70,
    aoe: 0,
    projectileSpeed: 600,
  },
};

// 영웅 슬롯별 상대 위치 (성 기준)
Game.HERO_SLOTS = [
  { dx: 0,    dy: -60 },   // 12시
  { dx: 52,   dy: 30 },    // 4시 방향
  { dx: -52,  dy: 30 },    // 8시 방향
];

Game.findHero = function(state, type) {
  return state.heroes.find(h => h.type === type);
};

Game.spawnHero = function(state, type) {
  const def = Game.HERO_DEFS[type];
  const slot = Game.HERO_SLOTS[state.heroes.length] || Game.HERO_SLOTS[0];
  state.heroes.push({
    type: def.type,
    name: def.name,
    icon: def.icon,
    color: def.color,
    x: state.castle.x + slot.dx,
    y: state.castle.y + slot.dy,
    r: 12,
    baseAtk: def.atk,
    baseCd: def.cd,
    atkMul: 1.0,
    cdMul: 1.0,
    range: def.range,
    aoe: def.aoe,
    projectileSpeed: def.projectileSpeed,
    cdLeft: 0,
    level: 1,
  });
};

Game.upgradeHero = function(hero) {
  hero.atkMul *= 1.3;
  hero.cdMul *= 0.9;
  hero.level += 1;
};

Game.heroEffectiveAtk = function(hero) {
  return hero.baseAtk * hero.atkMul;
};
Game.heroEffectiveCd = function(hero) {
  return hero.baseCd * hero.cdMul;
};
Game.heroDps = function(hero) {
  return Game.heroEffectiveAtk(hero) / Game.heroEffectiveCd(hero);
};

// ---------- 영웅 공격 ----------
Game.findNearestForHero = function(state, hero) {
  let best = null, bestD = hero.range;
  for (const m of state.monsters) {
    const d = Math.hypot(m.x - hero.x, m.y - hero.y);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best;
};

Game.fireFromHero = function(state, hero, target) {
  const dx = target.x - hero.x;
  const dy = target.y - hero.y;
  const len = Math.hypot(dx, dy) || 1;
  state.projectiles.push({
    x: hero.x,
    y: hero.y,
    vx: (dx / len) * hero.projectileSpeed,
    vy: (dy / len) * hero.projectileSpeed,
    r: 5,
    atk: Game.heroEffectiveAtk(hero),
    target,
    life: 2.0,
    color: hero.color,
    aoe: hero.aoe,
  });
};

Game.updateHeroes = function(state, dt) {
  for (const h of state.heroes) {
    h.cdLeft -= dt;
    if (h.cdLeft > 0) continue;
    const target = Game.findNearestForHero(state, h);
    if (target) {
      Game.fireFromHero(state, h, target);
      h.cdLeft = Game.heroEffectiveCd(h);
    }
  }
};
