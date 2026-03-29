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
        if (el) el.textContent = state.prestigePoints;

        // Обновляем превью награды и кнопку
        const rewardEl = document.getElementById('prestige-reward-preview');
        if (rewardEl) rewardEl.textContent = `+ ${calcPrestigeReward()} prestige points`;
    }

    // ── Рендер карточек навыков ───────────────────────────────
    function render() {
        const grid = document.getElementById('prestige-skills-grid');
        if (!grid) return;

        const locLvl = (window.Game && window.Game.getLocationLevel) ? window.Game.getLocationLevel() : 1;
        const pUnlockLvl = (CONFIG.upgrades && CONFIG.upgrades.screen3 && CONFIG.upgrades.screen3.unlockLevel) ? CONFIG.upgrades.screen3.unlockLevel : 35;
        const unlocked = locLvl > pUnlockLvl || state.prestigePoints > 0 || Object.values(state.skillLevels).some(lvl => lvl > 0);

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

            // Состояние (неактивно, если не доступно и не куплено)
            const isInactive = (st !== 'available' && st !== 'maxed');

            // Получаем настройки стиля из общего конфига (config.js)
            const nodeStyle = VISUALS.upgrades[st] || VISUALS.upgrades.locked;
            const bgColor = nodeStyle.bg;
            const frameColor = nodeStyle.border;
            // glow — всегда HEX, используем для box-shadow (border может быть rgba)
            const glowColor = nodeStyle.glow !== 'none' ? nodeStyle.glow : 'rgba(255,255,255,0.3)';

            const finalBorder = isInactive
                ? `1px solid ${frameColor}`
                : `${VISUALS.upgrades.thicknessCSS}px solid ${frameColor}`;

            const glowOpacityHex = Math.round(VISUALS.upgrades.glowOpacity * 255).toString(16).padStart(2, '0');
            const finalShadow = isInactive
                ? 'none'
                : `0 0 ${VISUALS.upgrades.glowBlur * 1.5}px ${glowColor}${glowOpacityHex}, inset 0 0 2px ${glowColor}44`;

            const textColor = st === 'maxed' ? '#00F0FF'
                : st === 'available' ? '#00FF6A'
                    : '#d3d3d3ff'; // Белый цвет вместо серого для уровней

            const card = document.createElement('div');
            card.className = 'prestige-skill-card';
            card.style.cssText = `
                border: ${finalBorder};
                background: ${bgColor};
                box-shadow: ${finalShadow};
                border-radius: 6px;
                padding: 8px 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                cursor: ${st === 'available' ? 'pointer' : 'default'};
                flex: 1;
                min-width: 0;
                transition: all 0.2s;
                position: relative;
            `;

            // Иконка
            if (skill.icon.endsWith('.png')) {
                const iconImg = document.createElement('img');
                iconImg.src = skill.icon;
                iconImg.style.cssText = `width: 20px; height: 20px; object-fit: contain;`;
                card.appendChild(iconImg);
            } else {
                const icon = document.createElement('div');
                icon.style.cssText = `font-size: 20px; line-height: 1; color: ${skill.color || 'white'};`; 
                icon.textContent = skill.icon;
                card.appendChild(icon);
            }

            // Название
            const name = document.createElement('div');
            name.style.cssText = `font-family: 'Orbitron', sans-serif; font-size: 7px; font-weight: 700; color: ${skill.color}; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;`;
            name.textContent = skill.label;
            card.appendChild(name);

            // Цвет текста: MAX — цвет обводки из конфига, остальные уровни — из textColor
            const levelTextColor = isMax ? VISUALS.upgrades.maxed.glow : textColor;

            // Уровень
            const levelEl = document.createElement('div');
            levelEl.style.cssText = `font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 900; color: ${levelTextColor};`;
            levelEl.textContent = isMax ? 'MAX' : `${lvl}/${skill.maxLevel}`;
            card.appendChild(levelEl);

            // Стоимость (если не max)
            if (!isMax) {
                const costEl = document.createElement('div');
                costEl.style.cssText = `font-family: 'Orbitron', sans-serif; font-size: 7px; color: #FFE400; background: #1a1400; border: 1px solid #FFE40066; border-radius: 4px; padding: 2px 4px;`;
                costEl.textContent = `★ ${cost}`;
                card.appendChild(costEl);
            }

            // Кнопка покупки
            if (st === 'available') {
                card.addEventListener('click', () => {
                    buySkill(skill);
                    if (window.SoundManager) window.SoundManager.playClick();
                });
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'scale(1.05)';
                    card.style.boxShadow = `0 0 20px ${borderColor}88`;
                });
                card.addEventListener('mouseleave', () => {
                    card.style.transform = '';
                    card.style.boxShadow = `0 0 10px ${borderColor}44`;
                });
            }

            // Тултипы
            card.addEventListener('mouseenter', (e) => showPrestigeTooltip(e, skill, st));
            card.addEventListener('mousemove', (e) => movePrestigeTooltip(e));
            card.addEventListener('mouseleave', hidePrestigeTooltip);

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
            bonusStr = `x${mult.toFixed(2)}`;
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
                nextBonusStr = `x${mult.toFixed(2)}`;
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
            gap: 12px;
            padding: 10px 12px;
            height: 100%;
            box-sizing: border-box;
            overflow-y: auto;
        `;

        // ── Очки престижа (шапка) ──
        const header = document.createElement('div');
        header.id = 'prestige-header';
        header.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        `;
        const headerLabel = document.createElement('div');
        headerLabel.style.cssText = `font-family: 'Orbitron', sans-serif; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #FFE400; opacity: 0.7;`;
        headerLabel.textContent = 'Prestige Points';
        const headerValue = document.createElement('div');
        headerValue.id = 'prestige-points-value';
        headerValue.style.cssText = `font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 900; color: #FFE400; text-shadow: 0 0 20px #FFE40088, 0 0 40px #FFE40044;`;
        headerValue.textContent = '0';
        header.appendChild(headerLabel);
        header.appendChild(headerValue);
        container.appendChild(header);

        // ── Сетка навыков ──
        const grid = document.createElement('div');
        grid.id = 'prestige-skills-grid';
        grid.style.cssText = `
            display: flex;
            flex-direction: row;
            gap: 6px;
            width: 100%;
            align-items: stretch;
        `;
        container.appendChild(grid);

        // ── Нижняя строка: кнопка + превью ──
        const bottomRow = document.createElement('div');
        bottomRow.id = 'prestige-bottom-row';
        bottomRow.style.cssText = `
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 12px;
            width: 100%;
            margin-top: auto;
        `;

        // Кнопка Престиж
        const btnPrestige = document.createElement('button');
        btnPrestige.id = 'btn-prestige';
        btnPrestige.style.cssText = `
            font-family: 'Orbitron', sans-serif;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 2px;
            text-transform: uppercase;
            padding: 12px 18px;
            border: 2px solid #FFE400;
            border-radius: 10px;
            background: linear-gradient(135deg, #1a1200, #2a2000);
            color: #FFE400;
            cursor: pointer;
            box-shadow: 0 0 15px #FFE40066;
            transition: all 0.2s;
            white-space: nowrap;
            flex-shrink: 0;
        `;
        btnPrestige.textContent = '⭐ PRESTIGE';
        btnPrestige.addEventListener('click', () => {
            const confirmOvl = document.getElementById('prestige-confirm-overlay');
            if (confirmOvl) {
                confirmOvl.classList.add('visible');
                
                // Разовая привязка событий при открытии (или лучше вынести в initTab)
                const btnConfirm = document.getElementById('btn-prestige-confirm');
                const btnCancel = document.getElementById('btn-prestige-cancel');
                const btnClose = document.getElementById('btn-close-prestige-modal');
                
                const closeConfirm = () => {
                    confirmOvl.classList.remove('visible');
                };
                
                // Очистка старых слушателей через замену узлов или просто проверку
                // Для простоты в этом проекте часто делаем click напрямую
                if (btnConfirm) btnConfirm.onclick = () => {
                    closeConfirm();
                    doPrestige();
                };
                if (btnCancel) btnCancel.onclick = closeConfirm;
                if (btnClose) btnClose.onclick = closeConfirm;
                
                // Закрытие по фону
                confirmOvl.onclick = (e) => {
                    if (e.target === confirmOvl) closeConfirm();
                };
            }
        });
        btnPrestige.addEventListener('mouseenter', () => {
            btnPrestige.style.background = 'linear-gradient(135deg, #2a2000, #3a3000)';
            btnPrestige.style.boxShadow = '0 0 30px #FFE400aa';
            btnPrestige.style.transform = 'scale(1.05)';
        });
        btnPrestige.addEventListener('mouseleave', () => {
            btnPrestige.style.background = 'linear-gradient(135deg, #1a1200, #2a2000)';
            btnPrestige.style.boxShadow = '0 0 15px #FFE40066';
            btnPrestige.style.transform = '';
        });
        bottomRow.appendChild(btnPrestige);

        // Блок с описанием
        const infoBlock = document.createElement('div');
        infoBlock.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
            border: 1px solid #FFE40033;
            border-radius: 8px;
            padding: 8px 12px;
            background: #0d0c00;
            flex: 1;
        `;
        const infoLine1 = document.createElement('div');
        infoLine1.style.cssText = `font-family: 'Orbitron', sans-serif; font-size: 7px; color: #888; text-transform: uppercase; letter-spacing: 1px;`;
        infoLine1.textContent = 'Resets progress back by 50%';
        const infoLine2 = document.createElement('div');
        infoLine2.id = 'prestige-reward-preview';
        infoLine2.style.cssText = `font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: 900; color: #FFE400; text-shadow: 0 0 10px #FFE40066;`;
        infoLine2.textContent = '+ 0 prestige points';
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
