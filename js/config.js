// 게임 전역 상수 및 밸런스 값
window.Game = window.Game || {};

Game.Config = {
  // 게임 속도 배율
  SPEED: 2.5,

  // 성 초기값
  CASTLE: {
    r: 28,
    hp: 100,
    atk: 10,
    range: 200,
    cd: 1.0,
  },

  // 몬스터 기본값
  MONSTER: {
    r: 14,
    baseHp: 20,
    speed: 50,
    atk: 10,
  },

  // 처치 점수
  KILL_SCORE: 10,

  // 투사체
  PROJECTILE: {
    speed: 400,
    r: 5,
    life: 2.0,
  },

  // 다중 발사 시 데미지 페널티
  MULTISHOT_DMG_PENALTY: 0.6,

  // 첫 번째 레벨업 임계값
  FIRST_THRESHOLD: 50,

  // 카드 등급 가중치 (rare 확률)
  RARE_RATE: 0.30,

  // 시간 기반 난이도 곡선
  // [경과시간(초), 스폰간격(초), HP배율]
  DIFFICULTY: [
    { until: 30,  spawn: 3.0, hpScale: 0.7 },  // 초반 (5킬 쉽게)
    { until: 60,  spawn: 2.5, hpScale: 0.9 },  // 완만한 상승
    { until: 120, spawn: 1.8, hpScale: 1.2 },
    { until: Infinity, spawn: 1.2, hpScale: 1.5 },
  ],
};

Game.getDifficulty = function(elapsed) {
  for (const tier of Game.Config.DIFFICULTY) {
    if (elapsed < tier.until) return tier;
  }
  return Game.Config.DIFFICULTY[Game.Config.DIFFICULTY.length - 1];
};
