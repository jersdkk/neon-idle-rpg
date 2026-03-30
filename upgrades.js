// ============================================================
//  Система прокачки — дерево апгрейдов
// ============================================================
(() => {
    'use strict';

    // ── Состояние прокачки ──────────────────────────────────
    const state = {
        points: 0,           // свободные очки прокачки (обычные)
        essence: 0,          // эссенция для навыков
        currentLevels: {},   // сколько уровней куплено для каждого узла
        activeTab: 1,        // активный экран (1–5)
    };

    // Вспомогательная функция для сокращения больших чисел
    function formatNum(num) {
        const n = Number(num);
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
        return Math.round(n).toString();
    }

    // ── DOM-элементы ────────────────────────────────────────
    const svg = document.getElementById('upgrade-svg');
    const tooltip = document.getElementById('upgrade-tooltip');
    const pointsEl = document.getElementById('upgrade-points');
    const essenceEl = document.getElementById('essence-points');
    const essenceLabel = document.getElementById('essence-points-label');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const treeArea = document.getElementById('upgrade-tree-area');

    // ── Логика скролла мышкой (Drag-to-scroll) ──────────────
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;

    if (treeArea) {
        treeArea.addEventListener('mousedown', (e) => {
            // Игнорируем клики правой кнопкой мыши
            if (e.button !== 0) return;

            isDragging = true;
            treeArea.classList.add('grabbing');
            startX = e.pageX - treeArea.offsetLeft;
            startY = e.pageY - treeArea.offsetTop;
            scrollLeft = treeArea.scrollLeft;
            scrollTop = treeArea.scrollTop;
        });

        treeArea.addEventListener('mouseleave', () => {
            isDragging = false;
            treeArea.classList.remove('grabbing');
        });

        treeArea.addEventListener('mouseup', () => {
            isDragging = false;
            treeArea.classList.remove('grabbing');
        });

        treeArea.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - treeArea.offsetLeft;
            const y = e.pageY - treeArea.offsetTop;
            const walkX = (x - startX);
            const walkY = (y - startY);
            treeArea.scrollLeft = scrollLeft - walkX;
            treeArea.scrollTop = scrollTop - walkY;
        });
    }

    // ── Конфиг сетки узлов (Теперь динамический) ────────────
    let COL_W, ROW_H, PAD_X, NODE_R;
    function updateLayoutConstants() {
        const baseH = window.innerHeight;
        COL_W = baseH * 0.09;   // 90px при 1000px
        ROW_H = baseH * 0.074;  // 72px при 1000px (было 80px)
        PAD_X = baseH * 0.05;   // 50px при 1000px
        NODE_R = baseH * 0.022; // 22px при 1000px
    }
    updateLayoutConstants();

    // ── Цвета состояний ─────────────────────────────────────
    // (Объект COLORS удален, теперь используем VISUALS.upgrades напрямую)

    const TYPE_ICONS = {
        damage: 'image/attack.png',
        attackSpeed: 'image/attack speed.png',
        critChance: 'image/crit chanse.png',
        critDamage: 'image/crit damag.png',
        skillLightning: '⚡',
        skillHaste: 'image/attack speed.png',
        skillPower: 'image/attack.png',
        skillGrenade: '💣',
        skillCDR: '⏳',
        areaDamage: 'image/splash damage.png',
        areaDamagePlus: 'image/splash +damage.png',
        areaRadius: 'image/splash damage.png',
        essenceBonus: '✧',
    };

    // ─────────────────────────────────────────────────────────
    //  Логика состояний
    // ─────────────────────────────────────────────────────────
    // Проверка, разблокирован ли узел (можно ли в него вкладывать очки)
    function isUnlocked(node) {
        // Проверка по новой системе блокировки локаций (Вкладка 1)
        if (node.unlockAfterLocation !== undefined) {
            if (window.Game && window.Game.getMaxReachedLevel) {
                const mLevel = window.Game.getMaxReachedLevel();
                if (mLevel <= node.unlockAfterLocation) {
                    return 'locked_location_' + node.unlockAfterLocation;
                }
            }
            return 'unlocked';
        }

        if (!node.requires) {
            // Корень всегда разблокирован. Но применим проверку уровней и для корня, если нужно (например, Молния)
            if (window.Game && window.Game.getMaxReachedLevel) {
                const mLevel = window.Game.getMaxReachedLevel();
                if (node.id === 'skillHaste' && mLevel <= 10) return 'locked_level_10';
                if (node.id === 'skillPower' && mLevel <= 15) return 'locked_level_15';
                if (node.id === 'skillGrenade' && mLevel <= 25) return 'locked_level_25';
            }
            return 'unlocked';
        }

        const screenNodes = CONFIG.upgrades[`screen${state.activeTab}`].nodes;
        const reqs = Array.isArray(node.requires) ? node.requires : [node.requires];

        for (const reqId of reqs) {
            const parent = screenNodes.find(n => n.id === reqId);
            if (!parent) return 'locked';

            // Чтобы разблокировать узел, нужно чтобы каждый из родителей был прокачан на МАКСИМУМ
            const parentLvl = state.currentLevels[parent.id] || 0;
            if (parentLvl < parent.maxLevel) return 'locked';
        }

        // Проверка уровней для навыков (по макс. уровню, чтобы не пропадали при престиже)
        if (window.Game && window.Game.getMaxReachedLevel) {
            const mLevel = window.Game.getMaxReachedLevel();
            if (node.id === 'skillHaste' && mLevel <= 10) return 'locked_level_10';
            if (node.id === 'skillPower' && mLevel <= 15) return 'locked_level_15';
            if (node.id === 'skillGrenade' && mLevel <= 25) return 'locked_level_25';
        }

        return 'unlocked';
    }

    function getUpgradeCost(node) {
        const bought = state.currentLevels[node.id] || 0;
        if (node.costMultiplier && node.costMultiplier > 1) {
            return Math.floor(node.costPerLevel * Math.pow(node.costMultiplier, bought));
        }
        return node.costPerLevel;
    }

    // Применить все купленные улучшения к объекту игрока
    function applyAllUpgrades(p) {
        if (!p) return;

        // Сбрасываем к базовым значениям из конфига перед применением, 
        // чтобы не суммировать бесконечно
        p.damage = CONFIG.player.baseDamage;
        p.attackSpeed = CONFIG.player.baseAttackSpeed;
        p.critChance = CONFIG.player.baseCritChance || 0;
        p.critDamage = CONFIG.player.baseCritDamage || 1.5;
        p.areaDamageRadius = CONFIG.player.baseAreaDamageRadius || 0;
        p.areaDamageMult = CONFIG.player.baseAreaDamageMult || 0.5;
        p.areaRadius = CONFIG.player.baseAreaRadius || 0; // Добавлено: базовый радиус
        p.cooldownReduction = CONFIG.player.baseCooldownReduction || 0;
        p.essenceMult = CONFIG.player.baseEssenceMult || 1;
        p.skills = { lightning: 0, haste: 0, power: 0, grenade: 0 };

        // Перебираем все вкладки и узлы
        for (let i = 1; i <= 5; i++) {
            const screen = CONFIG.upgrades[`screen${i}`];
            if (!screen || !screen.nodes) continue;

            screen.nodes.forEach(node => {
                const lvl = state.currentLevels[node.id] || 0;
                if (lvl <= 0) return;

                const totalValue = node.valuePerLevel * lvl;

                switch (node.type) {
                    case 'damage': p.damage += totalValue; break;
                    case 'attackSpeed': p.attackSpeed += totalValue; break;
                    case 'critChance': p.critChance += totalValue; break;
                    case 'critDamage': p.critDamage += totalValue; break;
                    case 'skillLightning': p.skills.lightning = lvl; break;
                    case 'skillHaste': p.skills.haste = lvl; break;
                    case 'skillPower': p.skills.power = lvl; break;
                    case 'skillGrenade': p.skills.grenade = lvl; break;
                    case 'skillCDR': p.cooldownReduction += totalValue; break;
                    case 'essenceBonus': p.essenceMult += totalValue; break;
                    case 'areaDamage': p.areaDamageRadius += totalValue; break;
                    case 'areaDamagePlus': p.areaDamageMult += totalValue; break;
                    case 'areaRadius': p.areaDamageRadius += totalValue; break;
                }
            });
        }
    }

    function getNodeState(node) {
        const bought = state.currentLevels[node.id] || 0;
        const maxed = bought >= node.maxLevel;
        if (maxed) return 'maxed';

        const unlockStatus = isUnlocked(node);
        if (unlockStatus !== 'unlocked') {
            return unlockStatus; // вернет false (старый вариант) или 'locked_level_X'
        }

        const screenCfg = CONFIG.upgrades[`screen${state.activeTab}`];
        const isEssence = screenCfg.currency === 'essence';
        const currency = isEssence ? state.essence : state.points;
        const currentCost = getUpgradeCost(node);

        if (currency < currentCost) return 'noPoints';
        return 'available';
    }

    // ─────────────────────────────────────────────────────────
    //  Покупка уровня
    // ─────────────────────────────────────────────────────────
    function buyUpgrade(node) {
        const nState = getNodeState(node);
        if (nState !== 'available') return;

        const screenCfg = CONFIG.upgrades[`screen${state.activeTab}`];
        const isEssence = screenCfg.currency === 'essence';
        const currentCost = getUpgradeCost(node); // Используем helper

        if (isEssence) {
            state.essence -= currentCost;
        } else {
            state.points -= currentCost;
        }

        state.currentLevels[node.id] = (state.currentLevels[node.id] || 0) + 1;

        console.log(`Upgrading: ${node.id} (${node.type}), Costs: ${currentCost}`);

        // Трекинг покупки улучшения
        if (typeof window.gtag_game_event === 'function') {
            window.gtag_game_event('upgrade_purchased', {
                upgrade_id: node.id,
                level: state.currentLevels[node.id],
                cost: currentCost,
                currency: isEssence ? 'essence' : 'points'
            });
        }

        // Применяем эффект к игроку через Game API из game.js
        if (window.Game && window.Game.getPlayer) {
            const p = window.Game.getPlayer();
            if (p) {
                const oldDmg = p.damage;
                const oldAspd = p.attackSpeed;

                switch (node.type) {
                    case 'damage': p.damage += node.valuePerLevel; break;
                    case 'attackSpeed': p.attackSpeed += node.valuePerLevel; break;
                    case 'critChance': p.critChance = (p.critChance || 0) + node.valuePerLevel; break;
                    case 'critDamage': p.critDamage = (p.critDamage || 1.0) + node.valuePerLevel; break;
                    case 'skillLightning': p.skills.lightning = (p.skills.lightning || 0) + 1; window.Game.updateSkillUI(); break;
                    case 'skillHaste': p.skills.haste = (p.skills.haste || 0) + 1; window.Game.updateSkillUI(); break;
                    case 'skillPower': p.skills.power = (p.skills.power || 0) + 1; window.Game.updateSkillUI(); break;
                    case 'skillGrenade': p.skills.grenade = (p.skills.grenade || 0) + 1; window.Game.updateSkillUI(); break;
                    case 'skillCDR': p.cooldownReduction = (p.cooldownReduction || 0) + node.valuePerLevel; break;
                    case 'essenceBonus': p.essenceMult = (p.essenceMult || 1) + node.valuePerLevel; break;
                    case 'areaDamage':
                        p.areaDamageRadius = (p.areaDamageRadius || 0) + node.valuePerLevel;
                        break;
                    case 'areaDamagePlus':
                        p.areaDamageMult = (p.areaDamageMult || 0.5) + node.valuePerLevel;
                        break;
                    case 'areaRadius':
                        p.areaDamageRadius = (p.areaDamageRadius || 0) + node.valuePerLevel;
                        break;
                }

                console.log(`UPGRADE: ${node.id} -> Crit: ${(p.critChance * 100).toFixed(0)}%, Mult: x${p.critDamage.toFixed(1)}`);
                window.Game.updateUI();
            } else {
                console.error("Player object is null!");
            }
        } else {
            console.error("Game API not available!");
        }

        renderTree(state.activeTab);
        updatePointsDisplay();
        checkNotifications(); // Обновляем уведомление после покупки
        if (window.SoundManager) window.SoundManager.playClick();
        if (window.Game && window.Game.save) window.Game.save();
    }

    // Проверка, можно ли купить что-то в Навыках (вкладка 2)
    function checkNotifications() {
        // Проверяем все 5 вкладок
        for (let tabIndex = 1; tabIndex <= 5; tabIndex++) {
            const tabBtn = document.getElementById(`tab-${tabIndex}`);
            if (!tabBtn || tabBtn.style.display === 'none') continue;

            let canBuyAny = false;

            if (tabIndex === 3) {
                // Вкладка престижа
                if (window.PrestigeManager && window.PrestigeManager.canAffordAny) {
                    canBuyAny = window.PrestigeManager.canAffordAny();
                }
            } else if (tabIndex === 4) {
                // Вкладка турелей
                if (window.TurretManager && window.TurretManager.canAffordAny) {
                    canBuyAny = window.TurretManager.canAffordAny();
                }
            } else {
                // Обычные вкладки улучшений и навыков
                const screenCfg = CONFIG.upgrades[`screen${tabIndex}`];
                if (screenCfg && screenCfg.nodes && screenCfg.nodes.length > 0) {
                    const savedTab = state.activeTab;
                    state.activeTab = tabIndex; // Переключаем для корректной работы getNodeState (валюта, требования)
                    for (const node of screenCfg.nodes) {
                        if (getNodeState(node) === 'available') {
                            canBuyAny = true;
                            break;
                        }
                    }
                    state.activeTab = savedTab;
                }
            }

            // Показываем кружок, если есть на что потратить валюту
            // Согласно запросу: не убираем его, даже если вкладка активна
            tabBtn.classList.toggle('has-notification', canBuyAny);
        }
    }

    function updatePointsDisplay() {
        if (pointsEl) {
            pointsEl.textContent = state.points;
        }
        if (essenceEl && essenceLabel) {
            essenceEl.textContent = state.essence;
            // Показываем плашку эссенции, если она уже начала копиться
            if (state.essence > 0 || (window.Game && window.Game.getMaxReachedLevel() > 5)) {
                essenceLabel.style.display = 'flex';
            }
        }
        checkNotifications(); // Проверяем уведомления при каждом обновлении валюты
    }

    function addUpgradePoint() {
        state.points += 1;
        updatePointsDisplay();
        renderTree(state.activeTab);
    }

    function addEssence(amount) {
        state.essence += amount;
        updatePointsDisplay();
        renderTree(state.activeTab);
    }

    // ─────────────────────────────────────────────────────────
    //  Отрисовка в Сетке (HTML Вкладка 1)
    // ─────────────────────────────────────────────────────────
    function renderGrid(tabIndex) {
        const container = document.getElementById('upgrades-grid-container');
        if (!container) return;

        const screen = CONFIG.upgrades[`screen${tabIndex}`];
        if (!screen || !screen.nodes) return;

        // Сортируем узлы по gridOrder
        const nodes = [...screen.nodes].sort((a, b) => (a.gridOrder || 0) - (b.gridOrder || 0));

        container.innerHTML = '';

        nodes.forEach(node => {
            // Фикс: Скрываем кнопки ТОЛЬКО во второй вкладке (скиллы), если требования не выполнены.
            // В первой вкладке (Combat) показываем заблокированные кнопки с текстом.
            const unlockStatus = isUnlocked(node);
            if (tabIndex === 2 && unlockStatus !== 'unlocked') return;

            const btn = document.createElement('button');
            
            // Фикс: передаем текущий tabIndex для правильного определения валюты в getNodeState
            const savedActive = state.activeTab;
            state.activeTab = tabIndex;
            const nState = getNodeState(node);
            state.activeTab = savedActive;

            // Если это вторая вкладка (скиллы), добавляем спец. класс
            if (tabIndex === 2) {
                btn.className = 'upgrade-card skill-card';
            } else {
                btn.className = 'upgrade-card';
            }

            if (nState.startsWith('locked_location_')) {
                btn.classList.add('locked');
                const lockLvl = nState.replace('locked_location_', '');
                btn.innerHTML = `
                    <div class="upgrade-card-locked-text">
                        Unlocks after <span class="lock-lvl">${lockLvl}</span> location
                    </div>
                `;
            } else if (nState.startsWith('locked_level_')) {
                btn.classList.add('locked');
                const lockLvl = nState.replace('locked_level_', '');
                btn.innerHTML = `
                    <div class="upgrade-card-locked-text">
                        Unlocks at <span class="lock-lvl">${lockLvl}</span> location
                    </div>
                `;
            } else if (nState === 'locked') {
                btn.classList.add('locked');
                btn.innerHTML = `
                    <div class="upgrade-card-locked-text">Locked</div>
                `;
            } else {
                if (nState === 'maxed') btn.classList.add('maxed');
                else if (nState === 'noPoints') btn.classList.add('no-points');
                else btn.classList.add('available');

                const currCost = getUpgradeCost(node);
                const currVal = state.currentLevels[node.id] || 0;

                // Для вкладки 2 используем новый макет
                if (tabIndex === 2) {
                    let description = "";
                    let bonusText = "";
                    const icon = TYPE_ICONS[node.type] || '✨';

                    if (node.type === 'skillLightning') {
                        bonusText = `<span class="skill-bonus-value">+${node.valuePerLevel * currVal}%</span> skill damage`;
                    } else if (node.type === 'skillHaste') {
                        bonusText = `<span class="skill-bonus-value">+${Math.round(node.valuePerLevel * currVal * 100)}%</span> attack speed`;
                    } else if (node.type === 'skillPower') {
                        bonusText = `<span class="skill-bonus-value">+${Math.round(node.valuePerLevel * currVal * 100)}%</span> total damage`;
                    } else if (node.type === 'skillGrenade') {
                        bonusText = `<span class="skill-bonus-value">+${node.valuePerLevel * currVal}%</span> grenade damage`;
                    } else if (node.type === 'skillCDR') {
                        bonusText = `<span class="skill-bonus-value">+${Math.round(node.valuePerLevel * currVal * 100)}%</span> cooldown reduc.`;
                    }

                    let costContent = `
                        <span class="chip-icon" style="color: #B026FF;">✧</span>
                        <span class="cost-val">${formatNum(currCost)}</span>
                    `;
                    if (nState === 'maxed') costContent = `MAX LVL`;

                    btn.innerHTML = `
                        <div class="skill-card-top">
                            <div class="skill-card-title-row">
                                <span class="skill-name">${node.label}</span>
                                <span class="skill-lvl">lvl ${currVal}</span>
                            </div>
                            <div class="skill-card-icon">
                                ${icon.endsWith('.png') ? `<img src="${icon}" style="width:100%; height:100%; object-fit:contain;">` : `<span>${icon}</span>`}
                            </div>
                        </div>
                        <div class="skill-card-bottom">
                            <div class="skill-desc">${description}</div>
                            <div class="skill-bonus">${bonusText}</div>
                            <div class="skill-cost-box">${costContent}</div>
                        </div>
                    `;
                } else {
                    // Старый макет для первой вкладки
                    let displayValue = '';
                    if (node.type === 'essenceBonus') {
                        const mult = 1 + currVal * node.valuePerLevel;
                        displayValue = `x${mult.toFixed(1)}`;
                    } else if (node.type === 'areaDamage') {
                        displayValue = '💥';
                    } else if (node.type === 'areaRadius') {
                        const hasAreaDamage = state.currentLevels['areaDamage'] ? 55 : 0;
                        const baseRad = (CONFIG.player.baseAreaDamageRadius || 0) + hasAreaDamage;
                        displayValue = `${baseRad + currVal * node.valuePerLevel}`;
                    } else if (node.type === 'areaDamagePlus') {
                        const baseMult = CONFIG.player.baseAreaDamageMult || 0.1;
                        displayValue = `${Math.round((baseMult + currVal * node.valuePerLevel) * 100)}%`;
                    } else if (node.type === 'attackSpeed') {
                        displayValue = `${(CONFIG.player.baseAttackSpeed + currVal * node.valuePerLevel).toFixed(2)}/s`;
                    } else if (node.type === 'critChance') {
                        displayValue = `${Math.round((CONFIG.player.baseCritChance + currVal * node.valuePerLevel) * 100)}%`;
                    } else if (node.type === 'critDamage') {
                        displayValue = `x${(CONFIG.player.baseCritDamage + currVal * node.valuePerLevel).toFixed(2)}`;
                    } else {
                        displayValue = Math.round(CONFIG.player.baseDamage + currVal * node.valuePerLevel);
                    }

                    let costContent = `
                        <span class="chip-icon" style="color: #FFE400;">⟡</span>
                        <span class="cost-val">${formatNum(currCost)}</span>
                    `;
                    if (nState === 'maxed') costContent = `MAX LVL`;

                    btn.innerHTML = `
                        <div class="upgrade-card-label">
                            <span>${node.label}</span>
                        </div>
                        <div class="upgrade-card-info">
                            <div class="upgrade-card-value">${displayValue}</div>
                            <div class="upgrade-card-cost">${costContent}</div>
                        </div>
                    `;
                }

                if (nState !== 'maxed') {
                    btn.addEventListener('click', () => buyUpgrade(node));
                }
            }
            container.appendChild(btn);
        });
    }

    // ─────────────────────────────────────────────────────────
    //  Отрисовка в SVG (Вкладки 2, 3 и т.д.)
    // ─────────────────────────────────────────────────────────
    function renderTree(tabIndex, forceCenter = false) {
        // Убираем сообщение о блокировке/coming-soon при каждом переключении
        const activeLockMsg = document.getElementById('tree-lock-tab-msg');
        if (activeLockMsg) activeLockMsg.style.display = 'none';

        const mLevel = window.Game ? window.Game.getMaxReachedLevel() : 1;

        if (tabIndex === 1 || tabIndex === 2) {
            // Проверка блокировки для второй вкладки (скиллы)
            if (tabIndex === 2 && mLevel <= 5) {
                document.getElementById('upgrades-grid-container').style.display = 'none';
                document.getElementById('upgrade-tree-area').style.display = 'block'; // Нужно чтобы показать lockMsg
                const msg = getLockMessage(tabIndex);
                showLockScreen(msg);
                return;
            }

            document.getElementById('upgrade-tree-area').style.display = 'none';
            const gridCont = document.getElementById('upgrades-grid-container');
            if (gridCont) {
                gridCont.style.display = ''; // Показываем CSS grid
                renderGrid(tabIndex);
            }
            return;
        } else {
            const gridCont = document.getElementById('upgrades-grid-container');
            if (gridCont) gridCont.style.display = 'none';

            // Если вкладки управляются другими модулями (3 - Престиж, 4 - Турели)
            // мы не должны переопределять их display и рендерить SVG.
            if (tabIndex === 3 || tabIndex === 4) {
                return;
            }

            document.getElementById('upgrade-tree-area').style.display = 'flex';
        }

        if (!svg) return;

        const key = `screen${tabIndex}`;
        const screen = CONFIG.upgrades[key];

        svg.innerHTML = ''; // Очищаем всё перед отрисовкой

        // Настройки фильтров опущены для краткости, они остаются...
        // ... (defs и фильтры) ...

        if (!screen || !screen.nodes || screen.nodes.length === 0 ||
            (tabIndex === 3 && mLevel < 35) ||
            (tabIndex === 5 && mLevel < 100)) {

            const msg = getLockMessage(tabIndex);
            showLockScreen(msg);
            return;
        }

        // Вспомогательные функции для вывода блокировки
        function getLockMessage(idx) {
            if (idx === 2) return 'Unlocks after location 5';
            if (idx === 3) return 'Unlocks after location 35';
            if (idx === 5) return 'Coming Soon';
            return '';
        }

        function showLockScreen(text) {
            let lm = document.getElementById('tree-lock-tab-msg');
            if (!lm) {
                lm = document.createElement('div');
                lm.id = 'tree-lock-tab-msg';
                lm.style.position = 'absolute';
                lm.style.top = '0'; lm.style.left = '0';
                lm.style.width = '100%'; lm.style.height = '100%';
                lm.style.display = 'flex'; lm.style.alignItems = 'center';
                lm.style.justifyContent = 'center'; lm.style.color = '#445';
                lm.style.fontSize = '16px'; lm.style.fontWeight = 'bold';
                const area = document.getElementById('upgrade-tree-area');
                if (area) area.appendChild(lm);
            }
            lm.textContent = text;
            lm.style.display = 'flex';
            if (svg) svg.style.display = 'none';
        }

        if (!screen || !screen.nodes || screen.nodes.length === 0 ||
            (tabIndex === 3 && mLevel < 35) ||
            (tabIndex === 5 && mLevel < 100)) {
            const msg = getLockMessage(tabIndex);
            showLockScreen(msg);
            return;
        }

        // Убираем сообщение о блокировке, если оно было
        const lockMsg = document.getElementById('tree-lock-tab-msg');
        if (lockMsg) lockMsg.style.display = 'none';
        if (lockMsg) lockMsg.style.display = 'none';

        svg.style.display = 'block';

        const nodeMap = {};
        screen.nodes.forEach(n => nodeMap[n.id] = n);

        // Определяем видимость узлов: разблокированные + их прямые потомки
        const unlockedMap = {};
        screen.nodes.forEach(n => unlockedMap[n.id] = (isUnlocked(n) === 'unlocked'));

        const scale = (tabIndex === 2) ? 1.5 : 1;
        const sNODE_R = NODE_R * scale;
        const sCOL_W = COL_W * scale;
        const sROW_H = ROW_H * scale;

        const visibleNodes = screen.nodes.filter(n => {
            if (!n.requires) return unlockedMap[n.id];
            const reqs = Array.isArray(n.requires) ? n.requires : [n.requires];
            return reqs.every(reqId => unlockedMap[reqId]);
        });

        const visibleIds = new Set(visibleNodes.map(n => n.id));

        // Вычисляем границы дерева для центрирования
        let minCol = Infinity, maxCol = -Infinity;
        let minRow = Infinity, maxRow = -Infinity;
        visibleNodes.forEach(n => {
            minCol = Math.min(minCol, n.col); maxCol = Math.max(maxCol, n.col);
            minRow = Math.min(minRow, n.row); maxRow = Math.max(maxRow, n.row);
        });

        const treeW = (maxCol - minCol) * sCOL_W;
        const treeH = (maxRow - minRow) * sROW_H;

        const parentW = svg.parentElement ? svg.parentElement.clientWidth : 480;
        const parentH = svg.parentElement ? svg.parentElement.clientHeight : 280;

        // Добавляем отступы, чтобы крайние узлы не обрезались (40 пикселей)
        const pad = 40 * scale;
        const reqW = treeW + pad * 2;
        const reqH = treeH + pad * 2;

        const areaW = Math.max(parentW, reqW);
        const areaH = Math.max(parentH, reqH);

        // Устанавливаем размеры SVG-элемента для возможности скролла
        svg.style.width = areaW + 'px';
        svg.style.height = areaH + 'px';

        const offsetX = (areaW - treeW) / 2 - minCol * sCOL_W;
        const offsetY = (areaH - treeH) / 2 - minRow * sROW_H;

        function getPos(n) {
            return {
                x: offsetX + n.col * sCOL_W,
                y: offsetY + n.row * sROW_H
            };
        }

        // Рёбра (линии) — рисуем только между видимыми узлами
        visibleNodes.forEach(n => {
            if (!n.requires) return;
            const reqs = Array.isArray(n.requires) ? n.requires : [n.requires];
            reqs.forEach(reqId => {
                if (!visibleIds.has(reqId)) return;
                const p = getPos(nodeMap[reqId]);
                const c = getPos(n);
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', p.x); line.setAttribute('y1', p.y);
                line.setAttribute('x2', c.x); line.setAttribute('y2', c.y);
                line.setAttribute('stroke', (state.currentLevels[reqId] || 0) >= nodeMap[reqId].maxLevel ? '#00F0FF44' : '#FF073A22');
                line.setAttribute('stroke-width', '2');
                svg.appendChild(line);
            });
        });

        // Узлы — только видимые
        visibleNodes.forEach(n => {
            const pos = getPos(n);
            const nState = getNodeState(n);
            const style = VISUALS.upgrades[nState] || VISUALS.upgrades.locked;
            const styleColors = {
                fill: style.bg,
                stroke: style.border,
                glow: nState === 'maxed' ? 'blue' : (nState === 'available' ? 'green' : 'none')
            };
            const bought = state.currentLevels[n.id] || 0;

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('transform', `translate(${pos.x},${pos.y})`);
            g.style.cursor = nState === 'available' ? 'pointer' : 'default';

            // Цвета и форма для конкретных узлов (например, areaDmg1)
            const isAreaDmg = n.id === 'areaDmg1';
            const nodeStroke = isAreaDmg ? '#FFE400' : style.stroke;
            const nodeGlow = isAreaDmg ? '#FFE40066' : style.glow;

            // Форма (пятиугольник для сплеша, прямоугольник для остальных)
            const shape = document.createElementNS('http://www.w3.org/2000/svg', isAreaDmg ? 'polygon' : 'rect');
            if (isAreaDmg) {
                const r = sNODE_R;
                shape.setAttribute('points', `0,${-r} ${r * 0.95},${-r * 0.31} ${r * 0.59},${r * 0.81} ${-r * 0.59},${r * 0.81} ${-r * 0.95},${-r * 0.31}`);
            } else {
                shape.setAttribute('x', -sNODE_R); shape.setAttribute('y', -sNODE_R);
                shape.setAttribute('width', sNODE_R * 2); shape.setAttribute('height', sNODE_R * 2);
                shape.setAttribute('rx', 6 * scale);
            }
            shape.setAttribute('fill', styleColors.fill);
            shape.setAttribute('stroke', styleColors.stroke);
            shape.setAttribute('stroke-width', VISUALS.upgrades.thickness * scale);
            // Применяем фильтр свечения в зависимости от состояния
            if (nState === 'maxed') shape.setAttribute('filter', 'url(#blue-glow-filter)');
            else if (nState === 'available') shape.setAttribute('filter', 'url(#green-glow-filter)');
            else if (nState !== 'locked') shape.setAttribute('filter', 'url(#white-glow-filter)');
            g.appendChild(shape);

            // Иконка
            const iconData = TYPE_ICONS[n.type] || '?';
            const iconSize = (tabIndex === 2 ? 10.5 : 14) * scale;

            if (typeof iconData === 'string' && iconData.endsWith('.png')) {
                // Если иконка — это путь к картинке
                const iconImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                const imgSize = iconSize * 1.1;
                iconImg.setAttribute('href', iconData);
                iconImg.setAttribute('x', -imgSize / 2);
                // Отступ сверху такой же как у текста снизу: 22(радиус) - 13(y текста) = 9. 
                // Значит верхняя граница иконки должна быть на -22 + 9 = -13
                iconImg.setAttribute('y', -13 * scale);
                iconImg.setAttribute('width', imgSize);
                iconImg.setAttribute('height', imgSize);
                g.appendChild(iconImg);
            } else {
                // Если иконка — это текст (emoji)
                const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                icon.setAttribute('y', -3 * scale); icon.setAttribute('text-anchor', 'middle');
                // Цвет: фиолетовый для эссенции, белый для остальных (кроме сплеша)
                const iconColor = n.type === 'essenceBonus' ? '#B026FF' : (isAreaDmg ? nodeStroke : '#dcdcdcff');
                icon.setAttribute('fill', iconColor);
                icon.setAttribute('font-size', iconSize);
                icon.textContent = iconData;
                g.appendChild(icon);
            }

            // Текст уровня (MAX подсвечиваем цветом обводки)
            const lvl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            lvl.setAttribute('y', 13 * scale); lvl.setAttribute('text-anchor', 'middle');
            const isMaxed = bought >= n.maxLevel;
            lvl.setAttribute('fill', isMaxed ? VISUALS.upgrades.maxed.glow : '#d3d3d3ff');
            lvl.setAttribute('font-size', 9.5 * scale); lvl.setAttribute('font-weight', 'bold');
            lvl.textContent = isMaxed ? 'MAX' : `${bought}/${n.maxLevel}`;
            g.appendChild(lvl);

            // Стоимость (показываем для всех, кто не достиг максимума, включая заблокированные)
            if (nState !== 'maxed') {
                const cCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                cCircle.setAttribute('cx', 16 * scale); cCircle.setAttribute('cy', -16 * scale); cCircle.setAttribute('r', 8 * scale);
                cCircle.setAttribute('fill', '#050510'); cCircle.setAttribute('stroke', '#FFE400');
                g.appendChild(cCircle);
                const cText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                cText.setAttribute('x', 16 * scale); cText.setAttribute('y', -16 * scale);
                cText.setAttribute('text-anchor', 'middle'); cText.setAttribute('dominant-baseline', 'middle');
                cText.setAttribute('fill', '#FFE400'); cText.setAttribute('font-size', 8 * scale);
                cText.textContent = formatNum(getUpgradeCost(n));
                g.appendChild(cText);
            }

            // Хитзона
            const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            hit.setAttribute('x', -sNODE_R); hit.setAttribute('y', -sNODE_R);
            hit.setAttribute('width', sNODE_R * 2); hit.setAttribute('height', sNODE_R * 2);
            hit.setAttribute('fill', 'transparent');
            hit.addEventListener('click', () => buyUpgrade(n));
            hit.addEventListener('mouseenter', (e) => showTooltip(e, n, nState));
            hit.addEventListener('mousemove', (e) => moveTooltip(e));
            hit.addEventListener('mouseleave', hideTooltip);
            g.appendChild(hit);

            svg.appendChild(g);
        });

        if (forceCenter && treeArea) {
            treeArea.scrollLeft = (areaW - parentW) / 2;
            treeArea.scrollTop = (areaH - parentH) / 2;
        }
    }

    // ── Тултипы ─────────────────────────────────────────────
    function showTooltip(e, n, nState) {
        const bought = state.currentLevels[n.id] || 0;
        const isMax = bought >= n.maxLevel;
        const isEssence = CONFIG.upgrades[`screen${state.activeTab}`] && CONFIG.upgrades[`screen${state.activeTab}`].currency === 'essence';
        const typeDescriptions = {
            damage: 'Increases damage.',
            attackSpeed: 'Increases attack speed.',
            critChance: 'Improves critical hit chance.',
            critDamage: 'Increases critical hit damage.',
            skillLightning: 'Unlocks the Lightning strike skill.',
            skillHaste: 'Allows temporary attack speed boost.',
            skillPower: 'Allows temporary damage boost.',
            skillGrenade: 'Unlocks Grenade throw with area damage.',
            skillCDR: 'Reduces active skills cooldown.',
            essenceBonus: 'Increases Essence gain.',
            areaDamage: 'Adds area damage.',
            areaDamagePlus: 'Increases area damage.',
            areaRadius: 'Increases area damage radius.',
        };

        let h = `<b>${n.label}</b><br>`;
        h += `<span style="color: #aaa; font-size: 11px;">${typeDescriptions[n.type] || ''}</span><br>`;

        if (!isMax) {
            let val = n.valuePerLevel;
            let valStr = "";
            switch (n.type) {
                case 'damage': valStr = `+ ${val} damage`; break;
                case 'attackSpeed': valStr = `+ ${Math.round(val * 100)}% attack speed`; break;
                case 'critChance': valStr = `+ ${Math.round(val * 100)}% crit chance`; break;
                case 'critDamage': valStr = `+ ${val.toFixed(1)}x crit multiplier`; break;
                case 'essenceBonus': valStr = `+ ${Math.round(val * 100)}% essence`; break;
                case 'skillCDR': valStr = `- ${Math.round(val * 100)}% skill cooldown`; break;
                case 'areaDamage': valStr = `+ ${val} splash radius`; break;
                case 'areaDamagePlus': valStr = `+ ${Math.round(val * 100)}% area damage`; break;
                case 'skillHaste': valStr = `+ ${Math.round(val * 100)}% to attack speed`; break;
                case 'areaRadius': valStr = `+ ${val} to splash radius`; break;
                case 'skillPower': valStr = `+ ${Math.round(val * 100)}% to damage`; break;
                case 'skillLightning':
                case 'skillGrenade':
                    const skillCfg = (n.type === 'skillLightning') ? CONFIG.skills.lightning : CONFIG.skills.grenade;
                    valStr = `+ ${Math.round(skillCfg.damageMultiplier * 100)}% to skill damage`;
                    break;
                default: valStr = `+ ${val}`;
            }
            h += `<span style="color: #FFE400; font-size: 11px; font-weight: bold;">${valStr}</span><br>`;
        }

        const labels = {
            maxed: '<span style="color:#00F0FF">Maxed</span>',
            available: '<span style="color:#00FF6A">Available</span>',
            locked: '<span style="color:#FF073A">Locked</span>',
            locked_level_10: '<span style="color:#FF073A">Clear Level 10</span>',
            locked_level_15: '<span style="color:#FF073A">Clear Level 15</span>',
            locked_level_25: '<span style="color:#FF073A">Clear Level 25</span>',
            noPoints: '<span style="color:#888">Not enough currency</span>'
        };
        h += labels[nState] || labels['locked'];
        tooltip.innerHTML = h;
        tooltip.style.display = 'block';
        moveTooltip(e);
    }
    const moveTooltip = (e) => { tooltip.style.left = (e.clientX + 10) + 'px'; tooltip.style.top = (e.clientY + 10) + 'px'; };
    const hideTooltip = () => { tooltip.style.display = 'none'; };

    // ── Табы ────────────────────────────────────────────────
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabIdx = parseInt(btn.dataset.tab);
            state.activeTab = tabIdx;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Синхронизируем отображение Престижа (вкладка 3) и Турелей (вкладка 4)
            // Используем rAF, чтобы сначала обновились классы активных вкладок
            requestAnimationFrame(() => {
                if (window.PrestigeManager && window.PrestigeManager.showTab) {
                    window.PrestigeManager.showTab(tabIdx === 3);
                }
                // Синхронизируем вкладку Турелей
                if (window.TurretManager && window.TurretManager.showTab) {
                    window.TurretManager.showTab(tabIdx === 4);
                }

                // Рендерим дерево навыков (для вкладок 1 и 2)
                renderTree(state.activeTab, true);
                updatePointsDisplay();
            });

            // Обновляем уведомления для всех вкладок
            checkNotifications();

            if (window.SoundManager) window.SoundManager.init(), window.SoundManager.playClick();
        });
    });

    // ── Глобальный API ──────────────────────────────────────
    window.UpgradeManager = {
        addPoint: addUpgradePoint,
        addEssence: addEssence,
        refresh: () => { renderTree(state.activeTab); updatePointsDisplay(); },
        getLevels: () => state.currentLevels,
        applyToPlayer: applyAllUpgrades,
        refreshNotifications: checkNotifications, // Экспортируем для других модулей
        switchTab: (n) => {
            if (!tabBtns) return;
            const btn = Array.from(tabBtns).find(b => parseInt(b.dataset.tab) === n);
            if (btn) {
                // Прямой вызов клика переключит вкладку
                btn.click();
            }
        },
        maxAllSkills: () => {
            const screen = CONFIG.upgrades.screen2;
            if (screen && screen.nodes) {
                screen.nodes.forEach(node => {
                    state.currentLevels[node.id] = node.maxLevel;
                });
                if (window.Game && window.Game.getPlayer) {
                    applyAllUpgrades(window.Game.getPlayer());
                    window.Game.updateUI();
                    window.Game.updateSkillUI();
                }
                renderTree(state.activeTab);
                updatePointsDisplay();
            }
        },
        // Сохранение и загрузка
        save: () => ({
            points: state.points,
            essence: state.essence,
            currentLevels: state.currentLevels,
            activeTab: state.activeTab
        }),
        load: (data) => {
            if (data) {
                // Очищаем старые уровни, чтобы загрузить новые
                state.currentLevels = {};
                Object.assign(state, data);
                if (state.activeTab === undefined) state.activeTab = 1;

                // СРАЗУ применяем к игроку, если он уже существует в игре
                if (window.Game && window.Game.getPlayer) {
                    const p = window.Game.getPlayer();
                    if (p) applyAllUpgrades(p);
                }

                // Синхронизируем UI вкладок
                if (tabBtns) {
                    tabBtns.forEach(btn => {
                        const t = parseInt(btn.dataset.tab);
                        btn.classList.toggle('active', t === state.activeTab);
                    });
                }

                // Синхронизируем отображение (Престиж vs Обычное дерево)
                if (window.PrestigeManager && window.PrestigeManager.showTab) {
                    window.PrestigeManager.showTab(state.activeTab === 3);
                }
                if (window.TurretManager && window.TurretManager.showTab) {
                    window.TurretManager.showTab(state.activeTab === 4);
                }

                // Рендерим дерево с центрированием
                setTimeout(() => {
                    renderTree(state.activeTab, true);
                    updatePointsDisplay();
                }, 10);
            }
        }
    };

    // ── Инициализация ──
    updateLayoutConstants();
    renderTree(1);
    updatePointsDisplay();

    // Добавляем слушатель ресайза для динамического обновления сетки
    window.addEventListener('resize', () => {
        updateLayoutConstants();
        renderTree(state.activeTab);
    });
})();
