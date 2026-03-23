// ============================================================
// НАСТРОЙКИ БАЛАНСА ИГРЫ
// ============================================================

const CONFIG = {

    // ── Игрок (Баланс) ──────────────────────────────────────
    player: {
        baseDamage: 15,          // урон за удар
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
            { name: 'circle', baseHP: 30, xpMultiplier: 120.0 },
            { name: 'triangle', baseHP: 40, xpMultiplier: 120.0 },
            { name: 'diamond', baseHP: 45, xpMultiplier: 160.0 },
            { name: 'pentagon', baseHP: 160, xpMultiplier: 250.0, essenceDrop: 1 },
            { name: 'hexagon', baseHP: 190, xpMultiplier: 300.0, essenceDrop: 1 },
        ],

        hpExponentCycles: [
            { maxLevel: 35, value: 1.17 },
            { maxLevel: 45, value: 1.27 },
            { maxLevel: 65, value: 1.40 },
            { maxLevel: 85, value: 1.50 },
            { maxLevel: 105, value: 1.75 },
            { maxLevel: 10000, value: 1.95 },
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

            baseHP: 2900,

            // Множитель опыта
            xpMultiplier: 5000.0,
            xpMultiplierCycles: [
                { maxLevel: 50, value: 5000.0 },
                { maxLevel: 1000000, value: 10000.0 }
            ],

            // Выпадение эссенции
            essenceDrop: 10,
            essenceDropCycles: [
                { maxLevel: 50, value: 10 },
                { maxLevel: 1000000, value: 20 }
            ],

            timeoutSeconds: 30,
            hpExponentCycles: [
                { maxLevel: 15, value: 2.00 },
                { maxLevel: 35, value: 2.20 },
                { maxLevel: 45, value: 2.40 },
                { maxLevel: 65, value: 2.55 },
                { maxLevel: 85, value: 2.75 },
                { maxLevel: 10000, value: 2.80 },
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
        playerSpawn: { xFrac: 0.5, yFrac: 0.8 },
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
                { id: 'dmg1', label: 'Damage I', type: 'damage', maxLevel: 5, valuePerLevel: 10, costPerLevel: 1, col: 0, row: 1, requires: null },
                { id: 'aspd1', label: 'Speed I', type: 'attackSpeed', maxLevel: 5, valuePerLevel: 0.05, costPerLevel: 1, col: 1, row: 0, requires: 'dmg1' },
                { id: 'aspd2', label: 'Speed II', type: 'attackSpeed', maxLevel: 5, valuePerLevel: 0.12, costPerLevel: 2, col: 2, row: 0, requires: 'aspd1' },
                { id: 'skillEssence', label: 'Essence Bonus I', type: 'essenceBonus', maxLevel: 5, valuePerLevel: 0.5, costPerLevel: 1, col: 3, row: 0, requires: 'aspd2' },
                { id: 'critC2', label: 'Crit Chance II', type: 'critChance', maxLevel: 5, valuePerLevel: 0.03, costPerLevel: 1, col: 4, row: 0, requires: 'skillEssence' },
                { id: 'skillEssence3', label: 'Essence Bonus III', type: 'essenceBonus', maxLevel: 5, valuePerLevel: 0.2, costPerLevel: 2, col: 5, row: 0, requires: 'critC2' },
                { id: 'critC1', label: 'Crit Chance I', type: 'critChance', maxLevel: 5, valuePerLevel: 0.03, costPerLevel: 1, col: 1, row: 2, requires: 'dmg1' },
                { id: 'critD1', label: 'Crit Damage I', type: 'critDamage', maxLevel: 5, valuePerLevel: 0.15, costPerLevel: 1, col: 2, row: 2, requires: 'critC1' },
                { id: 'dmg4', label: 'Damage IV', type: 'damage', maxLevel: 5, valuePerLevel: 15, costPerLevel: 2, col: 3, row: 2, requires: 'critD1' },
                { id: 'skillEssence2', label: 'Essence Bonus II', type: 'essenceBonus', maxLevel: 5, valuePerLevel: 0.5, costPerLevel: 1, col: 4, row: 2, requires: 'dmg4' },
                { id: 'dmg5', label: 'Damage V', type: 'damage', maxLevel: 10, valuePerLevel: 22, costPerLevel: 2, col: 5, row: 2, requires: 'skillEssence2' },
                { id: 'dmg2', label: 'Damage II', type: 'damage', maxLevel: 5, valuePerLevel: 16, costPerLevel: 2, col: 1, row: 1, requires: 'dmg1' },
                { id: 'dmg3', label: 'Damage III', type: 'damage', maxLevel: 5, valuePerLevel: 22, costPerLevel: 3, col: 2, row: 1, requires: 'dmg2' },
                { id: 'critD2', label: 'Crit Damage II', type: 'critDamage', maxLevel: 5, valuePerLevel: 0.15, costPerLevel: 2, col: 3, row: 1, requires: 'dmg3' },
                { id: 'aspd3', label: 'Speed III', type: 'attackSpeed', maxLevel: 10, valuePerLevel: 0.02, costPerLevel: 1, col: 4, row: 1, requires: ['critD2', 'dmg4'] },
                { id: 'dmg6', label: 'Damage VI', type: 'damage', maxLevel: 10, valuePerLevel: 30, costPerLevel: 3, col: 5, row: 1, requires: 'aspd3' },
                { id: 'areaDmg1', label: 'Area Damage', type: 'areaDamage', maxLevel: 1, valuePerLevel: 55, costPerLevel: 5, col: 3, row: -1, requires: ['skillEssence'] },
                { id: 'areaDmgPlus1', label: 'AOE Damage Power', type: 'areaDamagePlus', maxLevel: 5, valuePerLevel: 0.05, costPerLevel: 2, col: 4, row: -1, requires: 'areaDmg1' },
                { id: 'areaRadius1', label: 'AOE Damage Area', type: 'areaRadius', maxLevel: 5, valuePerLevel: 5, costPerLevel: 2, col: 5, row: -1, requires: 'areaDmgPlus1' },
                { id: 'areaDmgPlus2', label: 'AOE Damage Power', type: 'areaDamagePlus', maxLevel: 5, valuePerLevel: 0.05, costPerLevel: 2, col: 6, row: -1, requires: 'areaRadius1' },
                { id: 'aspd4', label: 'Speed IV', type: 'attackSpeed', maxLevel: 10, valuePerLevel: 0.02, costPerLevel: 1, col: 6, row: 2, requires: ['dmg5', 'dmg6'] },
                { id: 'critD3', label: 'Crit Damage III', type: 'critDamage', maxLevel: 5, valuePerLevel: 0.1, costPerLevel: 2, col: 6, row: 0, requires: ['skillEssence3', 'dmg6'] },
                { id: 'critC3', label: 'Crit Chance III', type: 'critChance', maxLevel: 5, valuePerLevel: 0.01, costPerLevel: 2, col: 6, row: 1, requires: 'dmg6' },
                { id: 'skillEssence4', label: 'Essence Bonus IV', type: 'essenceBonus', maxLevel: 10, valuePerLevel: 0.2, costPerLevel: 1, col: 7, row: 1, requires: 'critC3' },
                { id: 'dmg7', label: 'Damage VII', type: 'damage', maxLevel: 10, valuePerLevel: 20, costPerLevel: 3, col: 7, row: 0, requires: 'critD3' },
                { id: 'critD4', label: 'Crit Damage IV', type: 'critDamage', maxLevel: 10, valuePerLevel: 0.10, costPerLevel: 2, col: 7, row: 2, requires: 'aspd4' },
                { id: 'aspd5', label: 'Speed V', type: 'attackSpeed', maxLevel: 10, valuePerLevel: 0.01, costPerLevel: 3, col: 8, row: 0, requires: 'dmg7' },
                { id: 'dmg8', label: 'Damage VIII', type: 'damage', maxLevel: 10, valuePerLevel: 20, costPerLevel: 3, col: 8, row: 1, requires: 'skillEssence4' },
                { id: 'skillEssence5', label: 'Essence Bonus V', type: 'essenceBonus', maxLevel: 10, valuePerLevel: 0.2, costPerLevel: 2, col: 8, row: 2, requires: 'critD4' },

            ],
        },
        screen2: {
            label: 'Skills',
            currency: 'essence',
            nodes: [
                { id: 'skillLightning', label: 'Lightning Strike', type: 'skillLightning', maxLevel: 50, valuePerLevel: 65, costPerLevel: 1, costMultiplier: 2.5, col: 0, row: 1, requires: null },
                { id: 'skillHaste', label: 'Attack Speedup', type: 'skillHaste', maxLevel: 50, valuePerLevel: 0.6, costPerLevel: 2, costMultiplier: 2.5, col: 1, row: 1, requires: null },
                { id: 'skillPower', label: 'Damage Increase', type: 'skillPower', maxLevel: 50, valuePerLevel: 0.15, costPerLevel: 2, costMultiplier: 2, col: 2, row: 1, requires: null },
                { id: 'skillGrenade', label: 'Grenade', type: 'skillGrenade', maxLevel: 50, valuePerLevel: 100, costPerLevel: 5, costMultiplier: 2, col: 1, row: 2, requires: null },
                { id: 'skillCDR', label: 'Skill CDR', type: 'skillCDR', maxLevel: 15, valuePerLevel: 0.03, costPerLevel: 3, costMultiplier: 2, col: 0, row: 2, requires: null },
            ]
        },
        screen3: {
            label: 'Prestige',
            currency: 'prestige',
            unlockLevel: 35,
            nodes: [
                { id: 'prestige_damage', label: 'Damage', description: 'Increases total damage by 4%', valuePerLevel: 0.04, unit: '%', baseCost: 1.5, costExponent: 2.5, maxLevel: 100, },
                { id: 'prestige_crit_dmg', label: 'Crit Damage', description: 'Increases crit damage multiplier', valuePerLevel: 0.05, unit: 'x', baseCost: 2, costExponent: 2.5, maxLevel: 100, },
                { id: 'prestige_crit_chance', label: 'Crit Chance', description: 'Increases crit strike chance', valuePerLevel: 0.02, unit: '%', baseCost: 3, costExponent: 2.5, maxLevel: 25 },
                { id: 'prestige_essence', label: 'Essence', description: 'Increases essence gained', valuePerLevel: 0.20, unit: 'x', baseCost: 2, costExponent: 3.0, maxLevel: 100, },
                { id: 'prestige_bonus', label: 'Prestige', description: 'Increases prestige points gained on reset', valuePerLevel: 1.0, unit: 'x', baseCost: 2, costExponent: 3.0, maxLevel: 100, },
            ]
        },
        screen4: { label: 'Luck', nodes: [] },
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
            common: { points: 1, xEss: 10, kills: 150, color: '#ffffffff', label: 'Обычная', icon: 'image/box1.png' },
            rare: { points: 2, xEss: 15, kills: 225, color: '#1119faff', label: 'Редкая', icon: 'image/box2.png' },
            epic: { points: 3, xEss: 20, kills: 300, color: '#fb00ffff', label: 'Эпическая', icon: 'image/box3.png' },
            legendary: { points: 4, xEss: 40, kills: 450, color: '#ffb300ff', label: 'Легендарная', icon: 'image/box4.png' }
        },
    },
};
