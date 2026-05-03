// 성/몬스터/투사체 생성 및 동작
window.Game = window.Game || {};

// ---------- 성 ----------
Game.createCastle = function(x, y) {
  const c = Game.Config.CASTLE;
  return {
    x, y, r: c.r,
    hp: c.hp, maxHp: c.hp,
    atk: c.atk,
    range: c.range,
    cd: c.cd,
    cdLeft: 0,
    // 업그레이드 누적 속성
    level: 1,
    cdMul: 1.0,
    multiShot: 1,
    dmgMul: 1.0,
    thornsRatio: 0.0,
    regen: 0.0,
  };
};

// ---------- 몬스터 ----------
Game.spawnMonster = function(state) {
  const W = state.W, H = state.H;
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * W; y = -20; }
  else if (side === 1) { x = W + 20; y = Math.random() * H; }
  else if (side === 2) { x = Math.random() * W; y = H + 20; }
  else { x = -20; y = Math.random() * H; }

  const cfg = Game.Config.MONSTER;
  const tier = Game.getDifficulty(state.elapsed);
  const hp = cfg.baseHp * tier.hpScale;
  state.monsters.push({
    x, y,
    r: cfg.r,
    hp, maxHp: hp,
    speed: cfg.speed,
    atk: cfg.atk,
  });
};

// 몬스터 이동 + 성 충돌 처리
Game.updateMonsters = function(state, dt) {
  const castle = state.castle;
  for (const m of state.monsters) {
    const dx = castle.x - m.x;
    const dy = castle.y - m.y;
    const len = Math.hypot(dx, dy) || 1;
    m.x += (dx / len) * m.speed * dt;
    m.y += (dy / len) * m.speed * dt;

    if (len < castle.r + m.r) {
      const dmg = m.atk;
      castle.hp -= dmg;
      if (castle.thornsRatio > 0) {
        const reflect = dmg * castle.thornsRatio;
        m.hp -= reflect;
        if (m.hp <= 0) state.score += Game.Config.KILL_SCORE;
      }
      m.hp = 0;
      if (castle.hp <= 0) {
        castle.hp = 0;
        return true; // game over
      }
    }
  }
  return false;
};

// ---------- 투사체 ----------
Game.findNearestMonsters = function(state, count) {
  const castle = state.castle;
  const inRange = [];
  for (const m of state.monsters) {
    const d = Math.hypot(m.x - castle.x, m.y - castle.y);
    if (d <= castle.range) inRange.push({ m, d });
  }
  inRange.sort((a, b) => a.d - b.d);
  return inRange.slice(0, count).map(o => o.m);
};

Game.fireAt = function(state, target) {
  const castle = state.castle;
  const dx = target.x - castle.x;
  const dy = target.y - castle.y;
  const len = Math.hypot(dx, dy) || 1;
  const cfg = Game.Config.PROJECTILE;
  const dmgPenalty = castle.multiShot > 1 ? Game.Config.MULTISHOT_DMG_PENALTY : 1.0;
  state.projectiles.push({
    x: castle.x,
    y: castle.y,
    vx: (dx / len) * cfg.speed,
    vy: (dy / len) * cfg.speed,
    r: cfg.r,
    atk: castle.atk * castle.dmgMul * dmgPenalty,
    target,
    life: cfg.life,
  });
};

Game.attemptFire = function(state) {
  const castle = state.castle;
  const targets = Game.findNearestMonsters(state, castle.multiShot);
  if (targets.length === 0) return false;
  for (let i = 0; i < castle.multiShot; i++) {
    const t = targets[i] || targets[targets.length - 1];
    Game.fireAt(state, t);
  }
  return true;
};

Game.updateProjectiles = function(state, dt) {
  for (const p of state.projectiles) {
    if (p.target && p.target.hp > 0) {
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const speed = Math.hypot(p.vx, p.vy);
      p.vx = (dx / len) * speed;
      p.vy = (dy / len) * speed;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    for (const m of state.monsters) {
      if (m.hp <= 0) continue;
      if (Math.hypot(p.x - m.x, p.y - m.y) < p.r + m.r) {
        if (p.aoe && p.aoe > 0) {
          // 광역: 명중 위치 기준 반경 내 모든 적
          for (const other of state.monsters) {
            if (other.hp <= 0) continue;
            if (Math.hypot(p.x - other.x, p.y - other.y) <= p.aoe) {
              other.hp -= p.atk;
              if (other.hp <= 0) state.score += Game.Config.KILL_SCORE;
            }
          }
        } else {
          m.hp -= p.atk;
          if (m.hp <= 0) state.score += Game.Config.KILL_SCORE;
        }
        p.life = 0;
        break;
      }
    }
  }
};

// ---------- 렌더 ----------
Game.draw = function(state, ctx) {
  const W = state.W, H = state.H, castle = state.castle;
  ctx.clearRect(0, 0, W, H);

  // 사거리
  ctx.beginPath();
  ctx.arc(castle.x, castle.y, castle.range, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 성
  ctx.fillStyle = '#4a90e2';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(castle.x, castle.y, castle.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(castle.x - 10, castle.y);
  ctx.lineTo(castle.x + 10, castle.y);
  ctx.moveTo(castle.x, castle.y - 10);
  ctx.lineTo(castle.x, castle.y + 10);
  ctx.stroke();

  // 영웅 (사거리 + 본체)
  if (state.heroes) {
    for (const h of state.heroes) {
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.range, 0, Math.PI * 2);
      ctx.strokeStyle = h.color + '20'; // 옅은 색
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = h.color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 레벨 텍스트
      ctx.fillStyle = '#000';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.level, h.x, h.y);
    }
  }

  // 몬스터
  for (const m of state.monsters) {
    ctx.fillStyle = '#ff5470';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
    const ratio = m.hp / m.maxHp;
    ctx.fillStyle = '#000';
    ctx.fillRect(m.x - 14, m.y - m.r - 8, 28, 4);
    ctx.fillStyle = '#7be88a';
    ctx.fillRect(m.x - 14, m.y - m.r - 8, 28 * ratio, 4);
  }

  // 투사체 (성=노랑, 영웅=색상별)
  for (const p of state.projectiles) {
    ctx.fillStyle = p.color || '#ffd166';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
};
