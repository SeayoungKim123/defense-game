// 게임 루프, 초기화, 입력 처리
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // 전역 게임 상태
  const state = {
    W: 0, H: 0,
    castle: null,
    heroes: [],
    monsters: [],
    projectiles: [],
    score: 0,
    elapsed: 0,
    spawnTimer: 0,
    gameOver: false,
    paused: false,
    nextThreshold: Game.Config.FIRST_THRESHOLD,
    currentChoices: [],
  };

  function resize() {
    state.W = canvas.width = window.innerWidth;
    state.H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function init() {
    state.castle = Game.createCastle(state.W / 2, state.H / 2);
    state.heroes = [];
    state.monsters = [];
    state.projectiles = [];
    state.score = 0;
    state.elapsed = 0;
    state.spawnTimer = 0;
    state.gameOver = false;
    state.paused = false;
    state.nextThreshold = Game.Config.FIRST_THRESHOLD;
    state.currentChoices = [];
    Game.UI.hideGameOver();
    Game.UI.hideCards();
    Game.UI.updateHUD(state);
  }

  function update(dt) {
    if (state.gameOver || state.paused) return;
    state.elapsed += dt;

    const castle = state.castle;

    // 재생
    if (castle.regen > 0 && castle.hp < castle.maxHp) {
      castle.hp = Math.min(castle.maxHp, castle.hp + castle.regen * dt);
    }

    // 스폰
    state.spawnTimer += dt;
    const tier = Game.getDifficulty(state.elapsed);
    if (state.spawnTimer >= tier.spawn) {
      state.spawnTimer = 0;
      Game.spawnMonster(state);
    }

    // 성 공격
    castle.cdLeft -= dt;
    if (castle.cdLeft <= 0) {
      if (Game.attemptFire(state)) {
        castle.cdLeft = castle.cd * castle.cdMul;
      }
    }

    // 영웅 공격
    Game.updateHeroes(state, dt);

    // 몬스터 / 투사체
    const dead = Game.updateMonsters(state, dt);
    if (dead) {
      endGame();
      return;
    }
    Game.updateProjectiles(state, dt);

    // 정리
    state.monsters = state.monsters.filter(m => m.hp > 0);
    state.projectiles = state.projectiles.filter(p => p.life > 0
      && p.x >= -50 && p.x <= state.W + 50
      && p.y >= -50 && p.y <= state.H + 50);

    // 레벨업 체크
    if (state.score >= state.nextThreshold) {
      triggerLevelUp();
    }

    Game.UI.updateHUD(state);
  }

  function triggerLevelUp() {
    state.paused = true;
    state.currentChoices = Game.pickCards(3, state);
    Game.UI.showCards(state.currentChoices, selectCard);
  }

  function selectCard(i) {
    if (!state.paused || !state.currentChoices[i]) return;
    const card = state.currentChoices[i];
    card.apply(state);
    state.castle.level += 1;
    state.nextThreshold = state.nextThreshold + 50 * state.castle.level;
    state.currentChoices = [];
    Game.UI.hideCards();
    state.paused = false;
    Game.UI.updateHUD(state);
  }

  function endGame() {
    state.gameOver = true;
    Game.UI.showGameOver(state);
  }

  // 키보드 입력
  window.addEventListener('keydown', e => {
    if (!state.paused) return;
    if (e.key === '1') selectCard(0);
    else if (e.key === '2') selectCard(1);
    else if (e.key === '3') selectCard(2);
  });

  // 재시작 버튼
  document.getElementById('restart').addEventListener('click', init);

  // 루프
  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05) * Game.Config.SPEED;
    last = now;
    update(dt);
    Game.draw(state, ctx);
    requestAnimationFrame(loop);
  }

  // 시작
  Game.UI.init();
  init();
  requestAnimationFrame(loop);
})();
