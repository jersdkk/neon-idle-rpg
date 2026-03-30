// ============================================================
//  Система Престижа
// ============================================================
(() => {
    'use strict';

    // (PRESTIGE_SKILLS теперь берутся из CONFIG.upgrades.screen3.nodes)
    const PRESTIGE_SKILLS = CONFIG.upgrades.screen3.nodes;

    // ── Состояние ─────────────────────────────────────────────
    const state = {
        prestigePoints: 0,      // накопленные очки престижа
        skillLevels: {},        // { prestige_damage: 3, ... }
        hasPrestiged: false,    // был ли хотя бы один сброс через престиж
    };

    // ── DOM ───────────────────────────────────────────────────
    let container = null;       // контейнер вкладки 3
    const tooltip = document.getElementById('upgrade-tooltip');

    // ── Расчёт очков за следующий сброс ──────────────────────
    function calcPrestigeReward() {
        const locLvl = (window.Game && window.Game.getLocationLevel) ? window.Game.getLocationLevel() : 1;
        const bonusMultiplier = getPrestigeBonusMultiplier();
        const base = Math.floor(Math.pow(locLvl, 2));
        return Math.max(1, Math.floor(base * bonusMultiplier));
    }

    // Мультипликатор от навыка Амбиция
    function getPrestigeBonusMultiplier() {
        const lvl = state.skillLevels['prestige_bonus'] || 0;
        const skill = PRESTIGE_SKILLS.find(s => s.id === 'prestige_bonus');
        return 1 + lvl * (skill ? skill.valuePerLevel : 0);
    }

    // ── Расчёт цены навыка ────────────────────────────────────
    function getSkillCost(skill) {
        const bought = state.skillLevels[skill.id] || 0;
        const n = skill.costExponent || 3;
        // Новая формула: (baseCost * уровень_навыка) ^ n
        // уровень_навыка — это тот, который мы покупаем (bought + 1)
        return Math.ceil(Math.pow(skill.baseCost * (bought + 1), n));
    }

    // ── Состояние навыка ─────────────────────────────────────
    function getSkillState(skill) {
        const bought = state.skillLevels[skill.id] || 0;
        if (bought >= skill.maxLevel) return 'maxed';
        if (state.prestigePoints >= getSkillCost(skill)) return 'available';
        return 'locked';
    }

    // ── Покупка навыка ────────────────────────────────────────
    function buySkill(skill) {
        if (window.SoundManager) window.SoundManager.playClick();
        const st = getSkillState(skill);
        if (st !== 'available') return;

        const cost = getSkillCost(skill);
        state.prestigePoints -= cost;
        state.skillLevels[skill.id] = (state.skillLevels[skill.id] || 0) + 1;

        // Трекинг покупки навыка престижа
        if (typeof window.gtag_game_event === 'function') {
            window.gtag_game_event('prestige_upgrade_purchased', {
                upgrade_id: skill.id,
                level: state.skillLevels[skill.id],
                cost: cost
            });
        }

        // Применяем эффект к игроку
        applyPrestigeSkills();
        render();
        renderPrestigePointsDisplay();
    }

    // Применяем все навыки престижа разом (вызывается при старте и после покупки)
    function applyPrestigeSkills() {
        if (window.Game && window.Game.updateUI) {
            window.Game.updateUI();
        }
        if (window.Game && window.Game.save) window.Game.save();
    }

    // ── Выполнение престижа ───────────────────────────────────
    function doPrestige() {
        if (window.SoundManager) window.SoundManager.playClick();
        if (!window.Game) return;

        const reward = calcPrestigeReward();
        const locLvl = window.Game.getLocationLevel();
        const newLvl = Math.max(1, Math.floor(locLvl * 0.5));

        // Отмечаем, что игрок уже сбрасывал прогресс
        state.hasPrestiged = true;

        // Начисляем очки
        state.prestigePoints += reward;

        // Трекинг престижа
        if (typeof window.gtag_game_event === 'function') {
            window.gtag_game_event('prestige_performed', {
                level_before: locLvl,
                reward: reward
            });
        }

        // Сброс прогресса локации до 50%
        window.Game.initLevelExternal(newLvl);

        render();
        renderPrestigePointsDisplay();
        if (window.Game && window.Game.save) window.Game.save();
    }

    // ── Рендер счётчика очков ─────────────────────────────────
    function renderPrestigePointsDisplay() {
        const el = document.getElementById('prestige-points-value');
        if (el) el.textContent = formatNum(state.prestigePoints);

        const rewardEl = document.getElementById('prestige-reward-preview');
        if (rewardEl) rewardEl.textContent = `+${formatNum(calcPrestigeReward())}`;
    }

    function formatNum(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toLocaleString();
    }

    // ── Рендер карточек навыков ───────────────────────────────
    function render() {
        const grid = document.getElementById('prestige-skills-grid');
        if (!grid) return;

        const locLvl = (window.Game && window.Game.getLocationLevel) ? window.Game.getLocationLevel() : 1;
        const mLevel = (window.Game && window.Game.getMaxReachedLevel) ? window.Game.getMaxReachedLevel() : 1;
        const pUnlockLvl = (CONFIG.upgrades && CONFIG.upgrades.screen3 && CONFIG.upgrades.screen3.unlockLevel) ? CONFIG.upgrades.screen3.unlockLevel : 35;
        const unlocked = mLevel >= pUnlockLvl || state.prestigePoints > 0 || Object.values(state.skillLevels).some(lvl => lvl > 0);

        // Скрываем/показываем шапку и нижнюю панель
        const header = document.getElementById('prestige-header');
        const bottomRow = document.getElementById('prestige-bottom-row');

        if (!unlocked) {
            grid.style.height = '100%';
            grid.innerHTML = `
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #445; font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: bold;">
                    Unlocks after location 35
                </div>
            `;
            if (header) header.style.display = 'none';
            if (bottomRow) bottomRow.style.display = 'none';
            return;
        }

        grid.style.height = ''; // Сбрасываем высоту при разблокировке
        if (header) header.style.display = 'flex';
        if (bottomRow) bottomRow.style.display = 'flex';

        grid.innerHTML = '';
        renderPrestigePointsDisplay();

        PRESTIGE_SKILLS.forEach(skill => {
            const st = getSkillState(skill);
            const lvl = state.skillLevels[skill.id] || 0;
            const cost = getSkillCost(skill);
            const isMax = lvl >= skill.maxLevel;
            const isInactive = (st !== 'available' && st !== 'maxed');

            const card = document.createElement('div');
            card.className = `prestige-node ${st === 'maxed' ? 'maxed' : ''} ${isInactive ? 'no-points' : ''}`;

            // Базовый стиль карточки (аналог макета)
            card.style.cssText = `
                flex: 1;
                min-width: 0;
                height: 12vh; /* Управляем высотой напрямую через % от экрана */
                max-height: 110px; /* Ограничение сверху для больших экранов */
                background: #004578;
                border: clamp(1px, 0.3vh, 2px) solid #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                padding: clamp(2px, 1.5cqi, 8px) 0 0 0;
                cursor: ${st === 'available' ? 'pointer' : 'default'};
                position: relative;
                overflow: hidden;
                transition: all 0.2s;
                container-type: inline-size; /* Включаем контейнерные единицы для текста */
                box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
            `;

            // Расчет текущего бонуса
            let bonusVal;
            if (skill.id === 'prestige_damage' || skill.id === 'prestige_crit_chance') {
                bonusVal = `+${(lvl * skill.valuePerLevel * 100).toFixed(0)}%`;
            } else if (skill.id === 'prestige_crit_dmg') {
                const addCritMult = lvl * skill.valuePerLevel;
                bonusVal = `+x${addCritMult.toFixed(2)}`;
            } else if (skill.id === 'prestige_essence' || skill.id === 'prestige_bonus') {
                const mult = skill.id === 'prestige_essence' ? Math.pow(1 + skill.valuePerLevel, lvl) : (1 + lvl * skill.valuePerLevel);
                const percentBonus = (mult - 1) * 100;
                bonusVal = `+${percentBonus.toFixed(0)}%`;
            } else {
                bonusVal = `+${(lvl * skill.valuePerLevel).toFixed(1)}${skill.unit || ''}`;
            }

            const iconColor = skill.id === 'prestige_essence' ? '#BF00FF' : '#fbff00';

            card.innerHTML = `
                <!-- Иконка сверху -->
                <div style="font-size: clamp(10px, 30cqi, 22px); color: ${iconColor}; margin: clamp(2px, 2cqi, 8px) 0 clamp(1px, 1cqi, 4px) 0; line-height: 1; display: flex; align-items: center; justify-content: center;">
                    ${skill.icon.endsWith('.png') ? `<img src="${skill.icon}" style="width: 1em; height: 1em; display: block; object-fit: contain;">` : skill.icon}
                </div>
                
                <!-- Центр: Название и Бонус -->
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; min-width: 0; padding: 0 clamp(1px, 1cqi, 4px); text-align: center; overflow: hidden;">
                    <div style="color: #fff; font-family: 'Orbitron', sans-serif; font-weight: 800; text-transform: uppercase; 
                         font-size: clamp(6px, 12cqi, 9px); line-height: 1.1; width: 100%; word-break: break-word; 
                         display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: clamp(1px, 1cqi, 4px);">
                        ${skill.label}
                    </div>
                    <div style="color: #00FF6A; font-family: 'Orbitron', sans-serif; font-size: clamp(8px, 15cqi, 11px); font-weight: 900; line-height: 1;">
                        ${bonusVal}
                    </div>
                </div>

                <!-- Низ: Полоска цены ровно 24% высоты -->
                <div style="width: 100%; height: 24%; flex-shrink: 0; background: #003393; border-top: clamp(1px, 0.3vh, 2px) solid #0099ff; 
                     display: flex; align-items: center; justify-content: center; gap: clamp(1px, 1cqi, 4px); padding: 0 clamp(1px, 1cqi, 4px); box-sizing: border-box;">
                    ${!isMax ? `
                        <span style="color: #fff; font-size: clamp(8px, 12cqi, 11px); line-height: 1;">★</span>
                        <span style="color: #fbff00; font-family: 'Orbitron', sans-serif; font-weight: 900; 
                             font-size: clamp(7px, 18cqi, 12px); line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${formatNum(cost)}
                        </span>
                    ` : `
                        <span style="color: #24dbe9; font-family: 'Orbitron', sans-serif; font-size: clamp(7px, 15cqi, 10px); font-weight: 900;">MAX</span>
                    `}
                </div>
            `;

            if (isInactive) {
                card.style.opacity = '0.5';
                card.style.filter = 'grayscale(0.5)';
            }

            if (st === 'available') {
                card.addEventListener('click', () => {
                    buySkill(skill);
                });
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-2px)';
                    card.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.4)';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.transform = '';
                    card.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.2)';
                });
            }

            // Тултипы (отключено)
            // card.addEventListener('mouseenter', (e) => showPrestigeTooltip(e, skill, st));
            // card.addEventListener('mousemove', (e) => movePrestigeTooltip(e));
            // card.addEventListener('mouseleave', hidePrestigeTooltip);

            grid.appendChild(card);
        });
    }

    // ── Тултипы престижа ───────────────────────────────────
    function showPrestigeTooltip(e, skill, st) {
        if (!tooltip) return;
        const lvl = state.skillLevels[skill.id] || 0;
        const cost = getSkillCost(skill);
        const isMax = lvl >= skill.maxLevel;

        const bonus = (lvl * skill.valuePerLevel);
        let bonusStr;
        if (skill.id === 'prestige_crit_chance' || skill.id === 'prestige_damage') {
            bonusStr = `+${(bonus * 100).toFixed(0)}%`;
        } else if (skill.id === 'prestige_essence') {
            const mult = Math.pow(1 + skill.valuePerLevel, lvl);
            const percentBonus = (mult - 1) * 100;
            bonusStr = `+${percentBonus.toFixed(0)}%`;
        } else {
            bonusStr = `+${bonus % 1 === 0 ? bonus : bonus.toFixed(2)}${skill.unit}`;
        }

        const labels = {
            maxed: '<span style="color:#00F0FF">Maxed</span>',
            available: '<span style="color:#00FF6A">Available</span>',
            locked: '<span style="color:#FF073A">Not enough prestige points</span>'
        };

        let h = `<b>${skill.label}</b><br>`;
        h += `<span style="color: #ccc; font-size: 10px;">${skill.description}</span><br>`;
        h += `Current: <span style="color: ${skill.color}">${bonusStr}</span><br>`;

        if (!isMax) {
            const nextLvl = lvl + 1;
            const nextBonus = (nextLvl * skill.valuePerLevel);
            let nextBonusStr;
            if (skill.id === 'prestige_crit_chance' || skill.id === 'prestige_damage') {
                nextBonusStr = `+${(nextBonus * 100).toFixed(0)}%`;
            } else if (skill.id === 'prestige_essence') {
                const mult = Math.pow(1 + skill.valuePerLevel, nextLvl);
                const percentBonus = (mult - 1) * 100;
                nextBonusStr = `+${percentBonus.toFixed(0)}%`;
            } else {
                nextBonusStr = `+${nextBonus % 1 === 0 ? nextBonus : nextBonus.toFixed(2)}${skill.unit}`;
            }

            h += `Next: <span style="color: #00FF6A">${nextBonusStr}</span><br>`;
            h += `Cost: <span style="color: #FFE400">★ ${cost}</span><br>`;
        }
        h += `Level: ${lvl}/${skill.maxLevel}<br>`;
        h += labels[st] || '';

        tooltip.innerHTML = h;
        tooltip.style.display = 'block';
        movePrestigeTooltip(e);
    }

    function movePrestigeTooltip(e) {
        if (!tooltip) return;
        tooltip.style.left = (e.clientX + 10) + 'px';
        tooltip.style.top = (e.clientY + 10) + 'px';
    }

    function hidePrestigeTooltip() {
        if (!tooltip) return;
        tooltip.style.display = 'none';
    }

    // ── Инициализация DOM вкладки ─────────────────────────────
    function initTab() {
        const upgradeArea = document.getElementById('upgrade-tree-area');
        const svg = document.getElementById('upgrade-svg');
        if (!upgradeArea || !svg) return;

        container = document.createElement('div');
        container.id = 'prestige-tab-content';
        container.style.cssText = `
            display: none;
            flex-direction: column;
            align-items: center;
            gap: clamp(4px, 1.5vh, 4px);
            padding: clamp(6px, 2vh, 16px) clamp(8px, 2vw, 10px);
            height: 100%;
            box-sizing: border-box;
            overflow-y: auto;
        `;

        // ── Очки престижа (шапка) ──
        const header = document.createElement('div');
        header.id = 'prestige-header';
        header.style.cssText = `
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 4px;
            width: 100%;
            padding: 2px 0 3px 0;
        `;
        const headerValue = document.createElement('div');
        headerValue.id = 'prestige-points-value-container';
        headerValue.style.cssText = `font-family: 'Orbitron', sans-serif; font-size: clamp(12px, 3.5vh, 18px); font-weight: 900; color: #FFE400; text-shadow: 0 0 10px #FFE40044; display: flex; align-items: center; gap: clamp(2px, 1vw, 4px);`;
        headerValue.innerHTML = `<span style="font-size: 0.8em; margin-top: -1px; opacity: 0.9;">★</span> <span id="prestige-points-value">0</span>`;

        header.appendChild(headerValue);
        container.appendChild(header);

        // ── Сетка навыков (Row - 5 in a row) ──
        const grid = document.createElement('div');
        grid.id = 'prestige-skills-grid';
        grid.className = 'upgrades-grid';
        grid.style.cssText = `
            display: flex;
            flex-direction: row;
            gap: clamp(2px, 0.5vw, 6px);
            width: 100%;
            padding: clamp(2px, 0.5vh, 6px) 0;
            justify-content: space-between;
        `;
        container.appendChild(grid);

        // ── Нижняя строка: кнопка + панель ──
        const bottomRow = document.createElement('div');
        bottomRow.id = 'prestige-bottom-row';
        bottomRow.style.cssText = `
            display: flex;
            flex-direction: row;
            align-items: stretch;
            gap: clamp(4px, 1vw, 10px);
            width: 100%;
            margin-top: auto;
            padding-top: clamp(2px, 1vh, 8px);
        `;

        // Кнопка Престиж (Макет)
        const btnPrestige = document.createElement('button');
        btnPrestige.id = 'btn-prestige';
        btnPrestige.style.cssText = `
            font-family: 'Orbitron', sans-serif;
            font-size: clamp(7px, 1.3vh, 10px);
            font-weight: 900;
            text-transform: uppercase;
            padding: 0 8px;
            border: clamp(1px, 0.4vh, 2px) solid #fff;
            border-radius: 8px;
            background: #111;
            color: #fff;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
            min-height: clamp(28px, 5vh, 42px);
            flex: 0 0 clamp(70px, 25%, 110px);
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
        `;
        btnPrestige.innerHTML = `<span style="font-size: clamp(8px, 1.8vh, 13px);">★</span> PRESTIGE`;
        btnPrestige.addEventListener('click', () => {
            const confirmOvl = document.getElementById('prestige-confirm-overlay');
            if (confirmOvl) {
                confirmOvl.classList.add('visible');
                const btnConfirm = document.getElementById('btn-prestige-confirm');
                const btnCancel = document.getElementById('btn-prestige-cancel');
                const btnClose = document.getElementById('btn-close-prestige-modal');
                const closeConfirm = () => confirmOvl.classList.remove('visible');
                if (btnConfirm) btnConfirm.onclick = () => { closeConfirm(); doPrestige(); };
                if (btnCancel) btnCancel.onclick = closeConfirm;
                if (btnClose) btnClose.onclick = closeConfirm;
                confirmOvl.onclick = (e) => { if (e.target === confirmOvl) closeConfirm(); };
            }
        });
        btnPrestige.addEventListener('mouseenter', () => {
            btnPrestige.style.background = '#222';
            btnPrestige.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.3)';
            btnPrestige.style.transform = 'scale(1.03)';
        });
        btnPrestige.addEventListener('mouseleave', () => {
            btnPrestige.style.background = '#111';
            btnPrestige.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.15)';
            btnPrestige.style.transform = '';
        });
        bottomRow.appendChild(btnPrestige);

        // Блок с описанием (Макет)
        const infoBlock = document.createElement('div');
        infoBlock.style.cssText = `
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 1px;
            border: 1.5px solid #333;
            border-radius: 8px;
            padding: 4px 10px;
            background: #000;
            flex: 1;
            min-width: 0;
            overflow: hidden;
        `;
        const infoLine1 = document.createElement('div');
        infoLine1.style.cssText = `font-family: 'Orbitron', sans-serif; font-size: clamp(5px, 0.8vh, 8px); color: #777; text-transform: uppercase; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
        infoLine1.textContent = 'Resets progress back by 50%';
        const infoLine2 = document.createElement('div');
        infoLine2.id = 'prestige-reward-preview-container';
        infoLine2.style.cssText = `font-family: 'Orbitron', sans-serif; font-size: clamp(8px, 1.5vh, 12px); font-weight: 900; color: #fff; display: flex; align-items: baseline; gap: 3px; overflow: hidden;`;
        infoLine2.innerHTML = `<span id="prestige-reward-preview" style="color: #00FF6A;">+0</span> <span style="font-size: clamp(6px, 1vh, 9px); white-space: nowrap;">prestige points</span>`;

        infoBlock.appendChild(infoLine1);
        infoBlock.appendChild(infoLine2);
        bottomRow.appendChild(infoBlock);

        container.appendChild(bottomRow);

        // Вставляем контейнер рядом с svg (в тот же родитель)
        upgradeArea.appendChild(container);
    }

    // ── Переключение видимости вкладки ────────────────────────
    function showTab(show) {
        const svgEl = document.getElementById('upgrade-svg');
        if (!container) return;
        if (show) {
            container.style.display = 'flex';
            if (svgEl) svgEl.style.display = 'none';
            render();
        } else {
            container.style.display = 'none';
            if (svgEl) svgEl.style.display = '';
        }
    }

    // ── Перехват переключения вкладок ─────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        initTab();
        render();

        // Слушаем клики по табам
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabIdx = parseInt(btn.dataset.tab);
                showTab(tabIdx === 3);
            });
        });
    });

    // ── Глобальный API ────────────────────────────────────────
    window.PrestigeManager = {
        // Применить бонусы к только что созданному игроку
        applyToPlayer: applyPrestigeSkills,
        // Обновить превью (вызывается при смене уровня)
        refresh: renderPrestigePointsDisplay,
        // Геттер множителя (для game.js)
        getDamageMultiplier: () => 1 + (state.skillLevels['prestige_damage'] || 0) * PRESTIGE_SKILLS[0].valuePerLevel,
        getCritDmgBonus: () => (state.skillLevels['prestige_crit_dmg'] || 0) * PRESTIGE_SKILLS[1].valuePerLevel,
        getCritChanceBonus: () => (state.skillLevels['prestige_crit_chance'] || 0) * PRESTIGE_SKILLS[2].valuePerLevel,
        getEssenceMultiplier: () => Math.pow(1 + PRESTIGE_SKILLS[3].valuePerLevel, state.skillLevels['prestige_essence'] || 0),
        // Проверка: есть ли хоть какой-то прогресс престижа
        hasPrestige: () => state.prestigePoints > 0 || Object.values(state.skillLevels).some(lvl => lvl > 0),
        // Проверка: был ли хотя бы один сброс через престиж
        hasPrestiged: () => state.hasPrestiged,
        // Проверка: можно ли что-то купить сейчас
        canAffordAny: () => PRESTIGE_SKILLS.some(skill => getSkillState(skill) === 'available'),
        // Управление видимостью вкладки
        showTab: showTab,
        // Начислить очки престижа (для дебага)
        addPrestigePoints: (amount) => {
            state.prestigePoints += amount;
            renderPrestigePointsDisplay();
            render();
            if (window.Game && window.Game.save) window.Game.save();
        },
        // Сохранение и загрузка
        save: () => ({ ...state }),
        load: (data) => {
            if (data) {
                Object.assign(state, data);
                renderPrestigePointsDisplay();
                render();
            }
        }
    };
})();
