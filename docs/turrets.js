// ============================================================
//  Модуль турелей — стрельба ракетами по врагам
// ============================================================
(() => {
    'use strict';

    // ── Специфичные цвета для каждой турели ──────────────────
    const TURRET_COLORS = [
        { base: '#00d2ff', barrel: '#ff00d2', aura: 'rgba(0, 210, 255, ' }, // Сине-розовая
        { base: '#00ffaa', barrel: '#ffff00', aura: 'rgba(0, 255, 170, ' }, // Зелено-желтая
        { base: '#b026ff', barrel: '#00d2ff', aura: 'rgba(176, 38, 255, ' }, // Фиолетово-синяя
        { base: '#ff4500', barrel: '#ffae00', aura: 'rgba(255, 69, 0, '   }  // Оранжево-желтая
    ];

    // ── Состояние модуля ─────────────────────────────────────
    const turretState = {
        gears: 0,                    // Валюта ⚙ «Детали»
        upgradeLevels: { damage: 0, attackSpeed: 0 }, // Уровни апгрейдов
        shownTurretsInfo: false,     // Показано ли окно описания
        attackTimers: [0, 0, 0, 0],  // Независимые таймеры для каждой турели
        targetAngles: [-Math.PI / 2, -Math.PI / 2, -Math.PI / 2, -Math.PI / 2], // Текущие углы
        targets: [null, null, null, null],  // Текущие цели
        unlockedEventsSent: [false, false, false, false], // Трекинг отправленных ивентов разблокировки
    };

    // Ракеты в полёте
    let rockets = [];

    // Взрывы
    let explosions = [];

    // ── DOM-элементы ─────────────────────────────────────────
    const gearPointsEl = document.getElementById('gear-points');
    const gearLabel = document.getElementById('gear-points-label');
    const turretTabContent = document.getElementById('turret-tab-content');
    const turretSlots = document.getElementById('turret-slots');
    const turretUpgrades = document.getElementById('turret-upgrades');
    const upgradeTreeArea = document.getElementById('upgrade-tree-area');
    const turretsUnlockOvl = document.getElementById('turrets-unlock-overlay');
    const btnCloseTurretsUnlock = document.getElementById('btn-close-turrets-unlock');
    const tab4 = document.getElementById('tab-4');
    const tooltip = document.getElementById('upgrade-tooltip');

    // ── Вспомогательные функции ──────────────────────────────
    // Количество разлоченных слотов
    function getUnlockedSlotCount() {
        const maxLevel = window.Game ? window.Game.getMaxReachedLevel() : 0;
        const levels = CONFIG.turrets.slotUnlockLevels;
        let count = 0;
        for (let i = 0; i < levels.length; i++) {
            if (maxLevel > levels[i]) count++;
        }
        return count;
    }

    // Текущий урон турели (с учётом апгрейдов)
    function getTurretDamage() {
        const base = CONFIG.turrets.baseDamage;
        const level = turretState.upgradeLevels.damage || 0;
        return Math.round(base * Math.pow(1 + CONFIG.turrets.upgrades.damage.valuePerLevel, level));
    }

    // Текущая скорость атаки турели (с учётом апгрейдов)
    function getTurretAttackSpeed() {
        const base = CONFIG.turrets.baseAttackSpeed;
        const level = turretState.upgradeLevels.attackSpeed || 0;
        return base + (level * CONFIG.turrets.upgrades.attackSpeed.valuePerLevel);
    }

    // Стоимость апгрейда
    function getUpgradeCost(upgradeKey) {
        const upg = CONFIG.turrets.upgrades[upgradeKey];
        const level = turretState.upgradeLevels[upgradeKey] || 0;
        return Math.floor(upg.baseCost * Math.pow(upg.costMultiplier, level));
    }

    // Общий ДПС всех турелей (для UI)
    function getTurretDPS() {
        const count = getUnlockedSlotCount();
        if (count <= 0) return 0;
        const dmg = getTurretDamage();
        const aspd = getTurretAttackSpeed();
        return count * dmg * aspd;
    }

    // ── Обновление UI вкладки 4 ─────────────────────────────
    function refreshTurretTab() {
        if (!turretTabContent) return;

        const mLevel = window.Game ? window.Game.getMaxReachedLevel() : 0;
        const lockedLevel = CONFIG.turrets.slotUnlockLevels[0]; // 50
        
        // Если турели еще не открыты, показываем только текст (строго после прохождения 50)
        if (mLevel <= lockedLevel) {
            if (turretSlots) turretSlots.style.display = 'none';
            if (turretUpgrades) turretUpgrades.style.display = 'none';
            
            let lockMsg = document.getElementById('turret-lock-tab-msg');
            if (!lockMsg) {
                lockMsg = document.createElement('div');
                lockMsg.id = 'turret-lock-tab-msg';
                lockMsg.style.width = '100%';
                lockMsg.style.height = '100%';
                lockMsg.style.display = 'flex';
                lockMsg.style.alignItems = 'center';
                lockMsg.style.justifyContent = 'center';
                lockMsg.style.color = '#445';
                lockMsg.style.fontSize = '16px';
                lockMsg.style.fontWeight = 'bold';
                lockMsg.textContent = 'Unlocks after location 50';
                turretTabContent.appendChild(lockMsg);
            } else {
                lockMsg.style.display = 'flex';
            }
            return;
        }

        // Если открыты, скрываем текст и показываем контент
        const lockMsg = document.getElementById('turret-lock-tab-msg');
        if (lockMsg) lockMsg.style.display = 'none';

        if (turretSlots) turretSlots.style.display = 'flex';
        if (turretUpgrades) turretUpgrades.style.display = 'flex';

        const maxLevel = mLevel;
        const unlockLevels = CONFIG.turrets.slotUnlockLevels;

        // Обновляем слоты
        const slots = turretTabContent.querySelectorAll('.turret-slot');
        slots.forEach((slot, i) => {
            const isUnlocked = maxLevel >= unlockLevels[i];
            slot.classList.toggle('locked', !isUnlocked);
            slot.classList.toggle('unlocked', isUnlocked);

            if (isUnlocked) {
                // Извлекаем цвета из массива (если слотов больше 4, берем по кругу)
                const c = TURRET_COLORS[i % TURRET_COLORS.length];
                // Показываем SVG турели, аналогичный рендеру в игре
                slot.innerHTML = `
                    <svg width="60%" height="60%" viewBox="-16 -16 54 32" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-45deg); overflow:visible;">
                        <polygon points="-12.5,0 0,-12.5 12.5,0 0,12.5" fill="rgba(0,0,0,0.7)" stroke="${c.base}" stroke-width="2" style="filter: drop-shadow(0px 0px 4px ${c.base});" />
                        <polygon points="0,0 16,-6 32,0 16,6" fill="rgba(0,0,0,0.7)" stroke="${c.barrel}" stroke-width="2" style="filter: drop-shadow(0px 0px 4px ${c.barrel});" />
                    </svg>
                `;
            } else {
                slot.innerHTML = `<span class="turret-lock-text">loc ${unlockLevels[i]}</span>`;
            }
        });

        // Обновляем кнопки апгрейдов
        const upgBtns = turretTabContent.querySelectorAll('.turret-upgrade-card');
        upgBtns.forEach(btn => {
            const key = btn.dataset.upgrade;
            const upg = CONFIG.turrets.upgrades[key];
            const level = turretState.upgradeLevels[key] || 0;
            const isMaxed = level >= upg.maxLevel;
            const cost = getUpgradeCost(key);
            const canAfford = turretState.gears >= cost;

            btn.classList.toggle('maxed', isMaxed);
            btn.classList.toggle('no-points', !isMaxed && !canAfford);

            // Обновляем текст стоимости
            const costEl = btn.querySelector('.cost-val');
            if (costEl) {
                const formattedCost = (window.Game && window.Game.formatNumber) ? window.Game.formatNumber(cost) : cost.toLocaleString();
                costEl.textContent = isMaxed ? 'MAX LVL' : formattedCost;
            }

            // Обновляем текст эффекта
            const labelEl = btn.querySelector('.upgrade-card-label span');
            if (labelEl) {
                const baseName = key === 'damage' ? 'Turret Damage' : 'Turret Attack Speed';
                labelEl.textContent = baseName;
            }

            // Обновляем значение 
            const valEl = btn.querySelector('.upgrade-card-value');
            if (valEl) {
                if (key === 'damage') {
                    valEl.textContent = `+ ${(level * upg.valuePerLevel * 100).toFixed(0)}%`;
                } else {
                    valEl.textContent = `+ ${(level * upg.valuePerLevel).toFixed(2)}/s`;
                }
            }
        });

        // Обновляем валюту
        updateGearDisplay();
    }

    function updateGearDisplay() {
        if (gearPointsEl) gearPointsEl.textContent = turretState.gears;
        if (gearLabel) {
            const maxLevel = window.Game ? window.Game.getMaxReachedLevel() : 0;
            if (turretState.gears > 0 || maxLevel >= 45) {
                gearLabel.style.display = 'flex';
            }
        }
    }

    // ── Покупка апгрейда ────────────────────────────────────
    function buyTurretUpgrade(upgradeKey) {
        const upg = CONFIG.turrets.upgrades[upgradeKey];
        const level = turretState.upgradeLevels[upgradeKey] || 0;
        if (level >= upg.maxLevel) return;

        const cost = getUpgradeCost(upgradeKey);
        if (turretState.gears < cost) return;

        turretState.gears -= cost;
        turretState.upgradeLevels[upgradeKey] = level + 1;
        
        // Аналитика: апгрейд турели
        if (typeof window.gtag_game_event === 'function') {
            window.gtag_game_event('turret_upgrade', {
                upgrade_id: upgradeKey,
                new_level: level + 1,
                cost: cost
            });
        }

        if (window.SoundManager) window.SoundManager.playClick();
        refreshTurretTab();
        
        // Обновляем уведомления на вкладках через UpgradeManager
        if (window.UpgradeManager && window.UpgradeManager.refreshNotifications) {
            window.UpgradeManager.refreshNotifications();
        }

        if (window.Game && window.Game.updateUI) window.Game.updateUI();
        if (window.Game && window.Game.save) window.Game.save();
    }

    // ── Тултипы для слотов ──────────────────────────────────
    function setupSlotTooltips() {
        if (!turretTabContent) return;
        const slots = turretTabContent.querySelectorAll('.turret-slot');
        slots.forEach((slot, i) => {
            slot.addEventListener('mouseenter', (e) => {
                const unlockLevels = CONFIG.turrets.slotUnlockLevels;
                const maxLevel = window.Game ? window.Game.getMaxReachedLevel() : 0;
                if (maxLevel >= unlockLevels[i]) {
                    tooltip.innerHTML = `<b>Turret ${i + 1}</b><br><span style="color:#aaa">Active</span>`;
                } else {
                    tooltip.innerHTML = `unlocks after level ${unlockLevels[i]}`;
                }
                tooltip.style.display = 'block';
            });
            slot.addEventListener('mousemove', (e) => {
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY + 10) + 'px';
            });
            slot.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
    }

    // ── Обработчики кнопок апгрейдов ────────────────────────
    function setupUpgradeButtons() {
        if (!turretTabContent) return;
        const upgBtns = turretTabContent.querySelectorAll('.turret-upgrade-card');
        upgBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                buyTurretUpgrade(btn.dataset.upgrade);
            });
        });
    }

    // ── Оверлей разблокировки ────────────────────────────────
    if (btnCloseTurretsUnlock) {
        btnCloseTurretsUnlock.addEventListener('click', () => {
            turretsUnlockOvl.classList.remove('visible');
            turretsUnlockOvl.style.display = 'none';
            turretState.shownTurretsInfo = true;
            if (tab4) tab4.style.display = 'inline-block';
            // Переключаемся на вкладку 4
            if (window.UpgradeManager && window.UpgradeManager.switchTab) {
                window.UpgradeManager.switchTab(4);
            }
            if (window.Game && window.Game.save) window.Game.save();
        });
    }

    function checkTurretUnlock() {
        const maxLevel = window.Game ? window.Game.getMaxReachedLevel() : 0;
        const firstSlotLevel = CONFIG.turrets.slotUnlockLevels[0];

        // Показываем вкладку 4, если разблокирована хотя бы одна турель
        if (maxLevel >= firstSlotLevel) {
            if (tab4) tab4.style.display = 'inline-block';
        }

        // Показываем оверлей описания при первом разблокировании
        if (maxLevel >= firstSlotLevel && !turretState.shownTurretsInfo && turretsUnlockOvl) {
            turretsUnlockOvl.classList.add('visible');
            turretsUnlockOvl.style.display = 'flex';
        }

        // Аналитика: разблокировка каждой конкретной турели (1-4)
        const levels = CONFIG.turrets.slotUnlockLevels;
        for (let i = 0; i < levels.length; i++) {
            if (maxLevel >= levels[i] && !turretState.unlockedEventsSent[i]) {
                turretState.unlockedEventsSent[i] = true;
                if (typeof window.gtag_game_event === 'function') {
                    window.gtag_game_event('turret_unlocked', {
                        turret_id: i + 1, // Номер турели от 1 до 4
                        unlock_level: levels[i]
                    });
                }
            }
        }
    }

    // Проверка, можно ли купить хоть что-то (для красной точки уведомлений)
    function canAffordAny() {
        const maxLevel = window.Game ? window.Game.getMaxReachedLevel() : 0;
        if (maxLevel < CONFIG.turrets.slotUnlockLevels[0]) return false;

        const keys = Object.keys(CONFIG.turrets.upgrades);
        for (const key of keys) {
            const upg = CONFIG.turrets.upgrades[key];
            const level = turretState.upgradeLevels[key] || 0;
            if (level < upg.maxLevel) {
                if (turretState.gears >= getUpgradeCost(key)) return true;
            }
        }
        return false;
    }

    // ── Добавление валюты (вызывается при убийстве gear-врага) ──
    function addGears(amount) {
        turretState.gears += amount;
        updateGearDisplay();
        refreshTurretTab(); // Сразу обновляем вкладку, чтобы кнопки активировались
        
        // Обновляем уведомления на вкладках через UpgradeManager
        if (window.UpgradeManager && window.UpgradeManager.refreshNotifications) {
            window.UpgradeManager.refreshNotifications();
        }
    }

    // ── GAME LOOP: обновление турелей ───────────────────────
    function updateTurrets(dt, enemies, arenaSize) {
        const unlockedCount = getUnlockedSlotCount();
        if (unlockedCount <= 0) return;

        const positions = CONFIG.turrets.positions;
        const attackSpeed = getTurretAttackSpeed();
        const interval = 1 / attackSpeed;

        for (let i = 0; i < unlockedCount; i++) {
            // Обновляем таймер атаки
            turretState.attackTimers[i] += dt;

            // Выбираем случайную живую цель
            const aliveEnemies = enemies.filter(e => e.alive);
            if (aliveEnemies.length === 0) continue;

            // Если цели нет или она мертва — выбираем новую
            if (!turretState.targets[i] || !turretState.targets[i].alive) {
                turretState.targets[i] = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            }

            const target = turretState.targets[i];
            const tx = positions[i].xFrac * arenaSize;
            const ty = positions[i].yFrac * arenaSize;

            // Плавный поворот к цели
            const targetAngle = Math.atan2(target.y - ty, target.x - tx);
            let diff = targetAngle - turretState.targetAngles[i];
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            turretState.targetAngles[i] += diff * 0.15;

            // Стреляем, если прошло достаточно времени
            if (turretState.attackTimers[i] >= interval) {
                turretState.attackTimers[i] -= interval;

                // Меняем цель при каждом выстреле (случайная)
                turretState.targets[i] = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
                const fireTarget = turretState.targets[i];

                // Создаём ракету
                const rocketCfg = CONFIG.turrets.rocket;

                // Ракета должна вылетать с конца ствола
                const scale = arenaSize / 400;
                const turretSize = 35 * scale;
                const tipX = turretSize * 0.8; // Длина от центра до кончика ромба ствола

                const currentAngle = turretState.targetAngles[i];
                const startX = tx + Math.cos(currentAngle) * tipX;
                const startY = ty + Math.sin(currentAngle) * tipX;

                const endX = fireTarget.x;
                const endY = fireTarget.y;
                const distance = Math.hypot(endX - startX, endY - startY);
                const flightTime = distance / rocketCfg.speed;

                rockets.push({
                    sx: startX, sy: startY,                 // Начальная позиция
                    ex: endX, ey: endY,                     // Конечная позиция
                    t: 0,                                    // Текущее время полёта (0..1)
                    duration: flightTime,                    // Длительность полёта
                    arcH: distance * rocketCfg.arcHeight,   // Высота параболы
                    damage: getTurretDamage(),
                    splashRadius: CONFIG.turrets.baseSplashRadius,
                    turretIndex: i,                          // Индекс турели (для вспышки)
                    trail: [],                               // Хвост ракеты
                });
            }
        }

        // Обновляем ракеты
        for (let i = rockets.length - 1; i >= 0; i--) {
            const r = rockets[i];
            r.t += dt / r.duration;

            // Сохраняем текущую позицию для хвоста
            const pos = getRocketPos(r);
            r.trail.push({ x: pos.x, y: pos.y, life: 0.3 });
            if (r.trail.length > 12) r.trail.shift();

            // Обновляем хвост
            for (let j = r.trail.length - 1; j >= 0; j--) {
                r.trail[j].life -= dt;
                if (r.trail[j].life <= 0) r.trail.splice(j, 1);
            }

            if (r.t >= 1) {
                // Ракета попала — создаём взрыв
                spawnExplosion(r.ex, r.ey, r.damage, r.splashRadius, enemies, arenaSize);
                rockets.splice(i, 1);
            }
        }

        // Обновляем взрывы
        for (let i = explosions.length - 1; i >= 0; i--) {
            explosions[i].life -= dt;
            if (explosions[i].life <= 0) explosions.splice(i, 1);
        }
    }

    // Позиция ракеты по параболе (t = 0..1)
    function getRocketPos(r) {
        const x = r.sx + (r.ex - r.sx) * r.t;
        const y = r.sy + (r.ey - r.sy) * r.t;
        // Парабола: максимум на t=0.5
        const arc = -4 * r.arcH * r.t * (r.t - 1);
        return { x, y: y - arc };
    }

    // Создание взрыва и нанесение splash-урона
    function spawnExplosion(x, y, damage, radius, enemies, arenaSize) {
        const scale = arenaSize / 400;
        const scaledRadius = radius * scale;

        // Наносим урон всем врагам в радиусе
        enemies.forEach(e => {
            if (!e.alive) return;
            const dist = Math.hypot(e.x - x, e.y - y);
            if (dist <= scaledRadius) {
                // Урон уменьшается к краю радиуса
                const falloff = 1 - (dist / scaledRadius) * 0.5;
                const finalDmg = Math.round(damage * falloff);
                e.hp -= finalDmg;
                e.hitFlash = 1;

                if (e.hp <= 0 && window.Game && window.Game.onEnemyKilled) {
                    window.Game.onEnemyKilled(e);
                }

                // Всплывающий урон
                if (window.Game && window.Game.spawnDamageNumber) {
                    window.Game.spawnDamageNumber(e.x, e.y - e.size, finalDmg, false, '#FF8C00', true);
                }
            }
        });

        // Визуальный эффект взрыва
        const cfg = CONFIG.turrets.explosion;

        // Генерируем искры
        const particles = [];
        for (let i = 0; i < 12; i++) {
            particles.push({
                angle: Math.random() * Math.PI * 2,
                speed: (Math.random() * 80 + 40) * scale,
                life: Math.random() * 0.3 + 0.1
            });
        }

        explosions.push({
            x, y,
            radius: scaledRadius,
            life: cfg.duration,
            maxLife: cfg.duration,
            color: '#FF4500', // Насыщенный огненный оранжево-красный
            coreColor: '#FFFACD', // Яркое беловато-желтое ядро
            particles: particles,
        });
    }

    // ── РЕНДЕР: отрисовка турелей, ракет и взрывов ──────────
    function renderTurrets(ctx, arenaSize) {
        const unlockedCount = getUnlockedSlotCount();
        if (unlockedCount <= 0) return;

        const scale = arenaSize / 400;
        const positions = CONFIG.turrets.positions;
        const baseSize = 25 * scale;
        const barrelSize = 40 * scale;

        // Отрисовка каждой разлоченной турели
        for (let i = 0; i < unlockedCount; i++) {
            const tx = positions[i].xFrac * arenaSize;
            const ty = positions[i].yFrac * arenaSize;
            const angle = turretState.targetAngles[i];
            const c = TURRET_COLORS[i % TURRET_COLORS.length]; // Цвета для текущей турели

            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(angle);

            // Отрисовка основания (ромб)
            ctx.shadowBlur = 15 * scale;
            ctx.shadowColor = c.base;
            ctx.strokeStyle = c.base;
            ctx.lineWidth = 2 * scale;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            
            ctx.beginPath();
            ctx.moveTo(-baseSize/2, 0);
            ctx.lineTo(0, -baseSize/2);
            ctx.lineTo(baseSize/2, 0);
            ctx.lineTo(0, baseSize/2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Отрисовка ствола (вытянутый ромб)
            ctx.shadowColor = c.barrel;
            ctx.strokeStyle = c.barrel;
            const bWidth = barrelSize;
            const bHeight = 12 * scale;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(bWidth * 0.4, -bHeight / 2);
            ctx.lineTo(bWidth * 0.8, 0);
            ctx.lineTo(bWidth * 0.4, bHeight / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Вспышка при выстреле
            if (turretState.attackTimers[i] < 0.48) {
                const flash = 1 - turretState.attackTimers[i] / 0.48;
                const flashSize = 22 * scale * flash;
                const tipX = bWidth * 0.8; // Кончик ствола

                ctx.globalCompositeOperation = 'lighter';
                const grad = ctx.createRadialGradient(tipX, 0, 0, tipX, 0, flashSize);
                grad.addColorStop(0, `rgba(255, 255, 255, ${1.0 * flash})`);
                grad.addColorStop(0.3, c.aura + `${0.8 * flash})`); // Уникальный ореол 
                grad.addColorStop(0.6, c.aura + `${0.4 * flash})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(tipX, 0, flashSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }

            ctx.restore();
        }

        // Отрисовка ракет
        const rocketCfg = CONFIG.turrets.rocket;
        for (const r of rockets) {
            const pos = getRocketPos(r);

            // Хвост ракеты
            for (const t of r.trail) {
                const alpha = t.life / 0.3;
                ctx.save();
                ctx.globalAlpha = alpha * 0.6;
                ctx.fillStyle = rocketCfg.trailColor;
                ctx.shadowColor = rocketCfg.trailColor;
                ctx.shadowBlur = 6 * scale;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 2 * scale * alpha, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Тело ракеты
            ctx.save();
            ctx.fillStyle = rocketCfg.color;
            ctx.shadowColor = rocketCfg.color;
            ctx.shadowBlur = 10 * scale;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, rocketCfg.size * scale, 0, Math.PI * 2);
            ctx.fill();

            // Белое ядро
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, rocketCfg.size * scale * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Отрисовка взрывов
        for (const ex of explosions) {
            const lifePct = ex.life / ex.maxLife; // От 1 (только создался) до 0 (в конце)
            const expandPct = 1 - Math.pow(lifePct, 3); // Резкий скачок размера
            const currentRadius = ex.radius * expandPct;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // Огненное облако (задний план)
            ctx.globalAlpha = lifePct * 0.7;
            const outerGrad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, currentRadius);
            outerGrad.addColorStop(0, ex.color); // Огненно-оранжевый
            outerGrad.addColorStop(0.5, '#FF0000'); // Красный спектр
            outerGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.arc(ex.x, ex.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // Яркий раскаленный центр
            ctx.globalAlpha = lifePct * 0.9;
            const coreGrad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, currentRadius * 0.5);
            coreGrad.addColorStop(0, ex.coreColor);
            coreGrad.addColorStop(0.4, '#FFD700'); // Золотистый
            coreGrad.addColorStop(1, 'rgba(255, 150, 0, 0)');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(ex.x, ex.y, currentRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Искры / Частицы огня
            for (let i = 0; i < ex.particles.length; i++) {
                const p = ex.particles[i];
                // Жизнь частицы отсчитывается пропорционально времени взрыва
                const pTime = 1 - lifePct; // от 0 до 1
                if (pTime > p.life) continue; // Частица потухла

                const distance = p.speed * pTime;
                const px = ex.x + Math.cos(p.angle) * distance;
                const py = ex.y + Math.sin(p.angle) * distance;

                const pAlpha = 1 - (pTime / p.life);

                ctx.globalAlpha = pAlpha * lifePct;
                ctx.fillStyle = '#FFE4B5';
                ctx.shadowBlur = 4 * scale;
                ctx.shadowColor = '#FF4500';
                ctx.beginPath();
                ctx.arc(px, py, 1.5 * scale, 0, Math.PI * 2);
                ctx.fill();
            }

            // Кольцо ударной волны
            ctx.globalAlpha = lifePct * 0.5;
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#FF6347'; // Tomato
            ctx.lineWidth = 1 * scale + (2 * scale * lifePct);
            ctx.beginPath();
            ctx.arc(ex.x, ex.y, currentRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
        }
    }

    // ── Save / Load ─────────────────────────────────────────
    function save() {
        return {
            gears: turretState.gears,
            upgradeLevels: { ...turretState.upgradeLevels },
            shownTurretsInfo: turretState.shownTurretsInfo,
            unlockedEventsSent: [...turretState.unlockedEventsSent],
        };
    }

    function load(data) {
        if (!data) return;
        if (data.gears !== undefined) turretState.gears = data.gears;
        if (data.upgradeLevels) Object.assign(turretState.upgradeLevels, data.upgradeLevels);
        if (data.shownTurretsInfo !== undefined) turretState.shownTurretsInfo = data.shownTurretsInfo;
        if (data.unlockedEventsSent) turretState.unlockedEventsSent = [...data.unlockedEventsSent];

        updateGearDisplay();
        refreshTurretTab();
    }

    // ── Инициализация ───────────────────────────────────────
    setupSlotTooltips();
    setupUpgradeButtons();

    // ── Глобальный API ──────────────────────────────────────
    window.TurretManager = {
        update: updateTurrets,
        render: renderTurrets,
        addGears,
        getGears: () => turretState.gears,
        refresh: refreshTurretTab,
        checkUnlock: checkTurretUnlock,
        canAffordAny, // Для системы уведомлений
        save,
        load,
        getTurretDPS,
        // Для переключения вкладки
        showTab: (show) => {
            if (turretTabContent) turretTabContent.style.display = show ? 'flex' : 'none';
            if (upgradeTreeArea) upgradeTreeArea.style.display = show ? 'none' : 'block';
            if (show) refreshTurretTab();
        },
        clearRockets: () => { rockets = []; explosions = []; },
    };

})();
