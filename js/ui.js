// HUD / 오버레이 / 카드 UI DOM 조작
window.Game = window.Game || {};

Game.UI = {
  // 초기화 시 1회 DOM 캐시
  init() {
    this.hpFill = document.getElementById('hp-fill');
    this.hpText = document.getElementById('hp-text');
    this.scoreEl = document.getElementById('score');
    this.timeEl = document.getElementById('time');
    this.levelBadge = document.getElementById('level-badge');
    this.nextThEl = document.getElementById('next-th');
    this.overlay = document.getElementById('overlay');
    this.finalLevel = document.getElementById('final-level');
    this.finalScore = document.getElementById('final-score');
    this.finalTime = document.getElementById('final-time');
    this.cardOverlay = document.getElementById('card-overlay');
    this.cardsEl = document.getElementById('cards');
    // 성 상태 패널
    this.stAtk = document.getElementById('st-atk');
    this.stAspd = document.getElementById('st-aspd');
    this.stRange = document.getElementById('st-range');
    this.stMulti = document.getElementById('st-multi');
    this.stDmgMul = document.getElementById('st-dmgmul');
    this.stRegen = document.getElementById('st-regen');
    this.stThorns = document.getElementById('st-thorns');
    this.stDps = document.getElementById('st-dps');
    this.heroesSection = document.getElementById('heroes-section');
    this.heroesList = document.getElementById('heroes-list');
  },

  updateHUD(state) {
    const c = state.castle;
    this.hpFill.style.width = (c.hp / c.maxHp * 100) + '%';
    this.hpText.textContent = `${Math.ceil(c.hp)} / ${c.maxHp}`;
    this.scoreEl.textContent = state.score;
    this.timeEl.textContent = Math.floor(state.elapsed);
    this.levelBadge.textContent = `Lv. ${c.level}`;
    this.nextThEl.textContent = state.nextThreshold;
    this.updateStatus(c);
    this.updateHeroes(state.heroes || []);
  },

  updateStatus(c) {
    const penalty = c.multiShot > 1 ? Game.Config.MULTISHOT_DMG_PENALTY : 1.0;
    const effDmg = c.atk * c.dmgMul * penalty;
    const cdReal = c.cd * c.cdMul;
    const aspd = 1 / cdReal;
    const dps = effDmg * aspd * c.multiShot;

    this.stAtk.textContent = effDmg.toFixed(1);
    this.stAspd.textContent = aspd.toFixed(2) + '/s';
    this.stRange.textContent = Math.round(c.range);
    this.stMulti.textContent = c.multiShot;
    this.stDmgMul.textContent = '×' + c.dmgMul.toFixed(2);
    this.stRegen.textContent = c.regen.toFixed(1) + '/s';
    this.stThorns.textContent = Math.round(c.thornsRatio * 100) + '%';
    this.stDps.textContent = dps.toFixed(1);
  },

  updateHeroes(heroes) {
    if (heroes.length === 0) {
      this.heroesSection.style.display = 'none';
      return;
    }
    this.heroesSection.style.display = 'block';
    this.heroesList.innerHTML = heroes.map(h => {
      const dps = Game.heroDps(h).toFixed(1);
      return `<div class="status-row">
        <span style="color:${h.color}">${h.icon} ${h.name} Lv.${h.level}</span>
        <span>${dps}</span>
      </div>`;
    }).join('');
  },

  showGameOver(state) {
    this.finalLevel.textContent = state.castle.level;
    this.finalScore.textContent = state.score;
    this.finalTime.textContent = Math.floor(state.elapsed);
    this.overlay.classList.add('show');
  },

  hideGameOver() {
    this.overlay.classList.remove('show');
  },

  showCards(cards, onSelect) {
    this.cardsEl.innerHTML = '';
    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'card' + (card.rarity === 'rare' ? ' rare' : '');
      el.innerHTML = `
        <div class="card-icon">${card.icon}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-desc">${card.desc}</div>
        <div class="card-rarity">${card.rarity === 'rare' ? 'RARE' : 'COMMON'}</div>
        <div class="card-key">[${i + 1}]</div>
      `;
      el.addEventListener('click', () => onSelect(i));
      this.cardsEl.appendChild(el);
    });
    this.cardOverlay.classList.add('show');
  },

  hideCards() {
    this.cardOverlay.classList.remove('show');
  },
};
