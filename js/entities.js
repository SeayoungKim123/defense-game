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
// 성 실루엣 (좌·우 망루 + 중앙 성벽 + 흉벽 + 정문 + 깃발)
Game.drawCastle = function(ctx, cx, cy, r) {
  const stone   = '#6b6256';
  const stoneHi = '#857a6a';
  const stoneSh = '#3a342a';
  const flagRed = '#a8324a';
  const flagShd = '#5a1828';
  const gold    = '#d4af37';

  // 바닥 그림자
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.92, r * 0.95, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = stoneSh;
  ctx.lineWidth = 1;

  // 망루 한 좌(또는 우) 한 쌍 그리기
  const towerW = r * 0.42;
  const towerH = r * 1.55;
  const towerTopY = cy - r * 0.78;
  const merlonH = r * 0.20;

  const drawTower = (left) => {
    // 본체
    ctx.fillStyle = stone;
    ctx.fillRect(left, towerTopY, towerW, towerH);
    // 좌측 하이라이트 띠
    ctx.fillStyle = stoneHi;
    ctx.fillRect(left, towerTopY, towerW * 0.32, towerH);
    ctx.strokeRect(left + 0.5, towerTopY + 0.5, towerW - 1, towerH - 1);
    // 흉벽 3개
    ctx.fillStyle = stone;
    const mW = towerW / 5;
    for (let i = 0; i < 3; i++) {
      const mx = left + mW * (i * 2 + 0.3);
      ctx.fillRect(mx, towerTopY - merlonH, mW, merlonH);
      ctx.strokeRect(mx + 0.5, towerTopY - merlonH + 0.5, mW - 1, merlonH - 1);
    }
    // 작은 창문 (어두운 점)
    ctx.fillStyle = stoneSh;
    ctx.fillRect(left + towerW * 0.4, towerTopY + towerH * 0.45, towerW * 0.22, towerH * 0.14);
  };

  drawTower(cx - r * 0.92);
  drawTower(cx + r * 0.92 - towerW);

  // 중앙 성벽 (망루보다 짧음)
  const wallX = cx - r * 0.55;
  const wallW = r * 1.10;
  const wallY = cy - r * 0.42;
  const wallH = r * 1.30;
  ctx.fillStyle = stone;
  ctx.fillRect(wallX, wallY, wallW, wallH);
  ctx.fillStyle = stoneHi;
  ctx.fillRect(wallX, wallY, wallW * 0.28, wallH);
  ctx.strokeRect(wallX + 0.5, wallY + 0.5, wallW - 1, wallH - 1);
  // 중앙 흉벽 4개
  const wMW = wallW / 7;
  ctx.fillStyle = stone;
  for (let i = 0; i < 4; i++) {
    const mx = wallX + wMW * (i * 2 + 0.5);
    ctx.fillRect(mx, wallY - merlonH, wMW, merlonH);
    ctx.strokeRect(mx + 0.5, wallY - merlonH + 0.5, wMW - 1, merlonH - 1);
  }

  // 정문 (아치)
  const gateW = r * 0.46;
  const gateH = r * 0.62;
  const gateX = cx - gateW / 2;
  const gateBaseY = cy + r * 0.85;
  const gateArcCY = gateBaseY - gateH + gateW / 2;
  ctx.fillStyle = '#0e0a06';
  ctx.beginPath();
  ctx.moveTo(gateX, gateBaseY);
  ctx.lineTo(gateX, gateArcCY);
  ctx.arc(cx, gateArcCY, gateW / 2, Math.PI, 0, false);
  ctx.lineTo(gateX + gateW, gateBaseY);
  ctx.closePath();
  ctx.fill();
  // 정문 가운데 세로 빔 (양문 분리감)
  ctx.strokeStyle = '#3a2614';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, gateArcCY);
  ctx.lineTo(cx, gateBaseY);
  ctx.stroke();

  // 깃대 + 깃발 (중앙 흉벽 위로)
  const flagBaseY = wallY - merlonH;
  const poleH = r * 0.60;
  const poleTopY = flagBaseY - poleH;
  ctx.strokeStyle = '#2a1f14';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, flagBaseY);
  ctx.lineTo(cx, poleTopY);
  ctx.stroke();
  // 깃발 (오른쪽으로 휘날리는 삼각형)
  ctx.fillStyle = flagRed;
  ctx.beginPath();
  ctx.moveTo(cx + 0.5, poleTopY + 1);
  ctx.lineTo(cx + r * 0.42, poleTopY + r * 0.13);
  ctx.lineTo(cx + 0.5, poleTopY + r * 0.26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = flagShd;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // 깃봉 (금색 점)
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(cx, poleTopY - 0.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
};

Game.draw = function(state, ctx) {
  const W = state.W, H = state.H, castle = state.castle;
  ctx.clearRect(0, 0, W, H);

  // 사거리
  ctx.beginPath();
  ctx.arc(castle.x, castle.y, castle.range, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 성 (중세 성 실루엣)
  Game.drawCastle(ctx, castle.x, castle.y, castle.r);

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
