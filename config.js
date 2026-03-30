// ============================================================
// НАСТРОЙКИ БАЛАНСА ИГРЫ
// ============================================================

const CONFIG = {

    // ── Игрок (Баланс) ──────────────────────────────────────
    player: {
        baseDamage: 40,          // урон за удар
        baseAttackSpeed: 1.0,    // атак в секунду
        baseCritChance: 0.05,     // шанс крита (0.1 = 10%)
        baseCritDamage: 1.5,     // множитель крита (1.5 = +50%)
        baseAreaDamageRadius: 0, // базовый радиус урона по площади
        baseAreaDamageMult: 0.1, // базовый множитель урона по площади
        baseCooldownReduction: 0, // уменьшение времени перезарядки навыков
        baseEssenceMult: 1,      // множитель получаемой эссенции
        startLevel: 1,
        // XP формула: baseXP * level ^ exponent
        xp: {
            baseXP: 50,
            exponentCycles: [
                { maxLevel: 100, value: 1.50 },
                { maxLevel: 120, value: 1.6 }, // 50-80
                { maxLevel: 190, value: 1.65 }, // 50-80
                { maxLevel: 250, value: 1.70 }, // 80-100
                { maxLevel: 1000000, value: 1.70 } // 100+
            ],
        },
        damagePerLevel: 5,
        attackSpeedPerLevel: 0.2,
    },

    // ── Враги (Баланс) ──────────────────────────────────────
    enemies: {
        types: [
            { name: 'circle', baseHP: 30, xpMultiplier: 120.0, maxLevel: 45 },
            { name: 'triangle', baseHP: 40, xpMultiplier: 120.0, maxLevel: 65 },
            { name: 'diamond', baseHP: 50, xpMultiplier: 160.0, maxLevel: 100000 },
            { name: 'pentagon', baseHP: 120, xpMultiplier: 250.0, essenceDrop: 1, minLevel: 4 },
            { name: 'hexagon', baseHP: 150, xpMultiplier: 300.0, essenceDrop: 1, minLevel: 4 },
            // Новый тип врага — дропает ⚙️ Детали для апгрейда турелей (с 45 уровня)
            { name: 'gear', baseHP: 200, xpMultiplier: 200.0, essenceDrop: 1, gearDrop: 1, minLevel: 45 },
        ],

        hpExponentCycles: [
            //           { maxLevel: 35, value: 1.14 },
            //          { maxLevel: 45, value: 1.24 },
            { maxLevel: 65, value: 1.14 },
            { maxLevel: 85, value: 1.40 },
            { maxLevel: 105, value: 1.54 },
            { maxLevel: 10000, value: 1.74 },
            { maxLevel: 1000000, value: 10.0 }
        ],
        minDistanceBetweenEnemies: 60,

        // ПАРАМЕТРЫ БОССА
        boss: {
            name: 'boss',
            difficultyInterval: 5, // Базовый интервал для расчета силы (HP)
            interval: 5, // По умолчанию (используется для совместимости)

            // Интервал появления босса
            intervalCycles: [
                { maxLevel: 50, value: 5 },
                { maxLevel: 1000000, value: 10 }
            ],

            baseHP: 2200,

            // Множитель опыта
            xpMultiplier: 6000.0,
            xpMultiplierCycles: [
                { maxLevel: 50, value: 6000.0 },
                { maxLevel: 1000000, value: 14000.0 }
            ],

            // Выпадение эссенции
            essenceDrop: 10,
            essenceDropCycles: [
                { maxLevel: 50, value: 15 },
                { maxLevel: 1000000, value: 30 }
            ],

            timeoutSeconds: 30,
            hpExponentCycles: [
                { maxLevel: 15, value: 1.80 },
                { maxLevel: 35, value: 2.00 },
                { maxLevel: 45, value: 2.20 },
                { maxLevel: 65, value: 2.30 },
                { maxLevel: 85, value: 2.50 },
                { maxLevel: 10000, value: 2.70 },
                { maxLevel: 1000000, value: 5.0 }
            ],
        },
    },

    // ── Локация / Уровень (Дизайн уровней) ──────────────────
    location: {
        startLevel: 1,
        futureMechanicUnlockLevel: 40, // Уровень разблокировки новой механики
        enemyLayout: [
            { typeIndex: 1, xFrac: 0.5, yFrac: 0.25 },
            { typeIndex: 0, xFrac: 0.3, yFrac: 0.55 },
            { typeIndex: 0, xFrac: 0.5, yFrac: 0.55 },
            { typeIndex: 0, xFrac: 0.7, yFrac: 0.55 },
        ],
        playerSpawn: { xFrac: 0.5, yFrac: 0.9 },
        extraEnemiesPerLevel: 1,
        maxExtraEnemies: 20,
        spawnCycles: [
            { growth: 10, plateau: 5 },
            { growth: 5, plateau: 5 },
            { growth: 5, plateau: 10 },
            { growth: 5, plateau: 1000000 },
        ]
    },

    // ── Система прокачки (Структура и Цены) ──────────────────
    upgrades: {
        screen1: {
            label: 'Combat Skills',
            nodes: [
                { id: 'attack', label: 'Attack', type: 'damage', maxLevel: 200, valuePerLevel: 3, costPerLevel: 1, unlockAfterLocation: 0, gridOrder: 0 },
                { id: 'attackSpeed', label: 'Attack Speed', type: 'attackSpeed', maxLevel: 100, valuePerLevel: 0.06, costPerLevel: 1, unlockAfterLocation: 0, gridOrder: 1 },
                { id: 'critChance', label: 'Crit Chance', type: 'critChance', maxLevel: 30, valuePerLevel: 0.01, costPerLevel: 2, unlockAfterLocation: 0, gridOrder: 2 },
                { id: 'critDamage', label: 'Crit Damage', type: 'critDamage', maxLevel: 200, valuePerLevel: 0.10, costPerLevel: 2, unlockAfterLocation: 0, gridOrder: 3 },
                { id: 'essenceBonus', label: 'Essence Bonus', type: 'essenceBonus', maxLevel: 200, valuePerLevel: 0.50, costPerLevel: 1, unlockAfterLocation: 5, gridOrder: 4 },
                { id: 'areaDamage', label: 'Area Damage', type: 'areaDamage', maxLevel: 1, valuePerLevel: 55, costPerLevel: 5, unlockAfterLocation: 20, gridOrder: 5 },
                { id: 'areaRadius', label: 'Area Radius', type: 'areaRadius', maxLevel: 40, valuePerLevel: 2, costPerLevel: 3, unlockAfterLocation: 20, gridOrder: 6 },
                { id: 'areaDamagePlus', label: 'Area Damage Force', type: 'areaDamagePlus', maxLevel: 18, valuePerLevel: 0.05, costPerLevel: 3, unlockAfterLocation: 20, gridOrder: 7 },
            ],
        },
        screen2: {
            label: 'Skills',
            currency: 'essence',
            nodes: [
                { id: 'skillLightning', label: 'Lightning Strike', type: 'skillLightning', maxLevel: 50, valuePerLevel: 65, costPerLevel: 1, costMultiplier: 2.5, gridOrder: 0, requires: null },
                { id: 'skillCDR', label: 'Skill CDR', type: 'skillCDR', maxLevel: 15, valuePerLevel: 0.03, costPerLevel: 3, costMultiplier: 2, gridOrder: 1, requires: null },
                { id: 'skillHaste', label: 'Attack Speedup', type: 'skillHaste', maxLevel: 50, valuePerLevel: 0.6, costPerLevel: 2, costMultiplier: 2.5, gridOrder: 2, requires: null },
                { id: 'skillPower', label: 'Damage Increase', type: 'skillPower', maxLevel: 50, valuePerLevel: 0.15, costPerLevel: 2, costMultiplier: 2, gridOrder: 3, requires: null },
                { id: 'skillGrenade', label: 'Grenade', type: 'skillGrenade', maxLevel: 50, valuePerLevel: 100, costPerLevel: 5, costMultiplier: 2.5, gridOrder: 4, requires: null },
            ]
        },
        screen3: {
            label: 'Prestige',
            currency: 'prestige',
            unlockLevel: 35,
            nodes: [
                { id: 'prestige_damage', label: 'Damage', description: 'Increases total damage by 4%', valuePerLevel: 0.04, unit: '%', baseCost: 1.5, costExponent: 2.5, maxLevel: 100, icon: '⚔️' },
                { id: 'prestige_crit_dmg', label: 'Crit Damage', description: 'Increases crit damage multiplier', valuePerLevel: 0.05, unit: 'x', baseCost: 2, costExponent: 2.5, maxLevel: 100, icon: '💥' },
                { id: 'prestige_crit_chance', label: 'Crit Chance', description: 'Increases crit strike chance', valuePerLevel: 0.02, unit: '%', baseCost: 3, costExponent: 2.5, maxLevel: 25, icon: '🎯' },
                { id: 'prestige_essence', label: 'Essence', description: 'Increases essence gained', valuePerLevel: 0.20, unit: 'x', baseCost: 2, costExponent: 3.0, maxLevel: 100, icon: '★' },
                { id: 'prestige_bonus', label: 'Prestige', description: 'Increases prestige points gained on reset', valuePerLevel: 1.0, unit: 'x', baseCost: 2, costExponent: 3.0, maxLevel: 100, icon: '★' },
            ]
        },
        screen4: { label: 'Turrets', nodes: [] },
        screen5: { label: 'Mastery', nodes: [] },
    },

    // ── Активные навыки (Баланс) ─────────────────────────────
    skills: {
        lightning: { cooldown: 5.0, damageMultiplier: 1 },
        haste: { cooldown: 10.0, duration: 4.0, speedBonusPerLevel: 0.25 },
        power: { cooldown: 10.0, duration: 6.0, damageBonusPerLevel: 0.3 },
        grenade: { cooldown: 8.0, radius: 60, damageMultiplier: 2.0 }
    },
    // ── Коробка с подарком (Gift Box) ─────────────────────
    giftBox: {
        // Последовательность редкости для первых N открытий (сейчас 5)
        fixedSequence: ['common', 'rare', 'epic', 'legendary', 'common'],
        // Явные требования по убийствам для первых 5 коробок из очереди выше
        fixedRequirements: [30, 40, 50, 90, 30],
        // Явный тип награды для первых 5 коробок ('xp' или 'essence')
        fixedRewardTypes: ['xp', 'essence', 'xp', 'essence', 'xp'],

        // Шансы выпадения редкости после завершения последовательности
        rarityWeights: {
            common: 50,
            rare: 25,
            epic: 15,
            legendary: 10
        },

        // Награды и фиксированные требования по убийствам после завершения очереди
        rewards: {
            common: { points: 1, xEss: 10, kills: 150, color: '#ffffffff', label: 'Common', icon: 'image/box1.png' },
            rare: { points: 2, xEss: 15, kills: 225, color: '#1119faff', label: 'Rare', icon: 'image/box2.png' },
            epic: { points: 3, xEss: 20, kills: 300, color: '#fb00ffff', label: 'Epic', icon: 'image/box3.png' },
            legendary: { points: 4, xEss: 40, kills: 450, color: '#ffb300ff', label: 'Legendary', icon: 'image/box4.png' }
        },
    },

    // ── Турели ──────────────────────────────────────────────────
    turrets: {
        // Базовые параметры каждой турели
        baseDamage: 10000,          // урон ракеты
        baseAttackSpeed: 0.35,    // атак в секунду
        baseSplashRadius: 60,    // радиус splash-взрыва (в пикселях canvas)

        // Уровни разблокировки слотов (максимально пройденная локация)
        slotUnlockLevels: [50, 100, 200, 500],

        // Позиции турелей на canvas (относительные координаты 0..1)
        positions: [
            { xFrac: 0.07, yFrac: 0.75 },  // левая крайняя (сдвинута левее)
            { xFrac: 0.24, yFrac: 0.95 },  // левая внутренняя
            { xFrac: 0.78, yFrac: 0.95 },  // правая внутренняя
            { xFrac: 0.93, yFrac: 0.75 },  // правая крайняя (симметрия)
        ],

        // Апгрейды турелей (глобальные, на все турели)
        upgrades: {
            damage: {
                label: '+ 10% damage',
                valuePerLevel: 0.10,      // +10% к урону за уровень
                baseCost: 5,              // стоимость первого уровня (Детали)
                costMultiplier: 1.2,      // множитель цены за каждый уровень
                maxLevel: 100,
            },
            attackSpeed: {
                label: '+ 0.05 attack/sec',
                valuePerLevel: 0.05,      // плоская прибавка выстрелов в секунду за уровень
                baseCost: 6,
                costMultiplier: 1.3,
                maxLevel: 100,
            },
        },

        // Параметры ракеты
        rocket: {
            speed: 200,            // скорость ракеты (px/sec)
            arcHeight: 0.3,       // высота параболы (0..1 от расстояния)
            size: 4,              // размер снаряда
            color: '#FF8C00',     // цвет ракеты
            trailColor: '#FF6600', // цвет следа
        },

        // Визуал взрыва
        explosion: {
            duration: 0.4,        // длительность эффекта (секунды)
            color: '#FF8C00',     // основной цвет
            coreColor: '#FFFFFF', // цвет ядра
        },
    },
};
