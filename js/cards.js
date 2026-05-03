// 업그레이드 카드 풀 및 추첨
window.Game = window.Game || {};

// 모든 apply는 state를 받는다 (영웅 카드는 state.heroes 접근 필요).
Game.CARD_POOL = [
  // ===== Common (6종) =====
  {
    id: 'atk', name: '공격력 강화', icon: '🗡', rarity: 'common',
    desc: '성 공격력 +5',
    apply: s => { s.castle.atk += 5; }
  },
  {
    id: 'range', name: '사거리 확장', icon: '🏹', rarity: 'common',
    desc: '성 사거리 +30',
    apply: s => { s.castle.range += 30; }
  },
  {
    id: 'aspd', name: '공격 속도', icon: '⚡', rarity: 'common',
    desc: '공격 쿨다운 -15%',
    apply: s => { s.castle.cdMul *= 0.85; }
  },
  {
    id: 'maxhp', name: '최대 체력', icon: '❤️', rarity: 'common',
    desc: '최대 HP +30, 체력 완전 회복',
    apply: s => { s.castle.maxHp += 30; s.castle.hp = s.castle.maxHp; }
  },
  {
    id: 'heal', name: '응급 치료', icon: '💚', rarity: 'common',
    desc: '현재 HP +40 (최대치 한도)',
    apply: s => { s.castle.hp = Math.min(s.castle.maxHp, s.castle.hp + 40); }
  },
  {
    id: 'regen', name: '자동 재생', icon: '🌱', rarity: 'common',
    desc: '초당 HP +1',
    apply: s => { s.castle.regen += 1; }
  },

  // ===== Rare (3종) =====
  {
    id: 'multi', name: '다중 발사', icon: '🎯', rarity: 'rare',
    desc: '동시 발사 +1 (단, 데미지 ×0.6 적용)',
    apply: s => { s.castle.multiShot += 1; }
  },
  {
    id: 'dmg', name: '강화 탄환', icon: '💥', rarity: 'rare',
    desc: '투사체 데미지 +30%',
    apply: s => { s.castle.dmgMul *= 1.3; }
  },
  {
    id: 'thorns', name: '가시 방어', icon: '🛡', rarity: 'rare',
    desc: '몬스터 접촉 시 데미지 100% 반사 (누적 시 +50%p)',
    apply: s => { s.castle.thornsRatio = s.castle.thornsRatio === 0 ? 1.0 : s.castle.thornsRatio + 0.5; }
  },

  // ===== 영웅 (3종, Rare, 동적) =====
  ...['archer', 'mage', 'warrior'].map(type => ({
    id: 'hero_' + type,
    rarity: 'rare',
    heroType: type,
    resolve: state => {
      const def = Game.HERO_DEFS[type];
      const owned = Game.findHero(state, type);
      if (!owned) {
        return {
          name: `${def.icon} ${def.name} 소환`,
          icon: def.icon,
          desc: `${def.name}을 성 주변에 배치 (DPS ${(def.atk / def.cd).toFixed(1)}, 사거리 ${def.range})`,
        };
      }
      return {
        name: `${def.icon} ${def.name} 강화`,
        icon: def.icon,
        desc: `Lv.${owned.level} → Lv.${owned.level + 1} (공격력 +30%, 공속 +11%)`,
      };
    },
    apply: state => {
      const owned = Game.findHero(state, type);
      if (!owned) Game.spawnHero(state, type);
      else Game.upgradeHero(owned);
    },
  })),
];

// 동적 카드(resolve 보유)는 현재 state에 맞춰 표시 정보를 주입
Game.resolveCard = function(card, state) {
  if (!card.resolve) return card;
  const dyn = card.resolve(state);
  return Object.assign({}, card, dyn);
};

// 등급 가중치 적용해 카드 n장(중복 없이) 추출
Game.pickCards = function(n, state) {
  const pool = [...Game.CARD_POOL];
  const picked = [];
  while (picked.length < n && pool.length > 0) {
    const isRare = Math.random() < Game.Config.RARE_RATE;
    const filtered = pool.filter(c => (isRare ? c.rarity === 'rare' : c.rarity === 'common'));
    const candidates = filtered.length > 0 ? filtered : pool;
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    picked.push(Game.resolveCard(choice, state));
    pool.splice(pool.indexOf(choice), 1);
  }
  return picked;
};
