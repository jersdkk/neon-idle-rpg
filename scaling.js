// ============================================================
//  Система масштабирования сложности (HP врагов и боссов)
// ============================================================
window.Scaling = {
    /**
     * Вспомогательная функция для получения экспоненты из конфига по уровню
     */
    _getExponent: function(cycles, currentLevel, defaultValue) {
        if (!cycles || !Array.isArray(cycles)) return defaultValue;
        for (const cycle of cycles) {
            if (currentLevel <= cycle.maxLevel) {
                return cycle.value;
            }
        }
        return defaultValue;
    },

    /**
     * Расчет HP обычного врага
     */
    getEnemyHP: function(type, level) {
        if (!type || !CONFIG || !CONFIG.enemies) return 10;
        
        const cycles = CONFIG.enemies.hpExponentCycles;
        const n = this._getExponent(cycles, level, 1.1);

        // Гарантируем, что level и n - числа
        const safeLvl = Number(level) || 1;
        const safeN = Number(n) || 1.1;
        let base = Number(type.baseHP) || 10;
        
        // Если это самая первая локация, добавляем +100 к базовому HP по просьбе пользователя
        if (safeLvl === 1) {
            base += 100;
        }

        // Формула: baseHP * level^n
        const hp = base * Math.pow(Math.max(1, safeLvl), safeN);
        
        const result = Math.round(hp);
        return isNaN(result) || result <= 0 ? base : result;
    },

    /**
     * Получить интервал появления босса
     */
    getBossInterval: function(level) {
        if (!CONFIG || !CONFIG.enemies || !CONFIG.enemies.boss) return 5;
        const cycles = CONFIG.enemies.boss.intervalCycles;
        if (!cycles) return CONFIG.enemies.boss.interval || 5;
        return this._getExponent(cycles, level, 5);
    },

    /**
     * Проверка, является ли уровень уровнем босса
     */
    isBossLevel: function(level) {
        if (level <= 0) return false;
        const interval = this.getBossInterval(level);
        return level % interval === 0;
    },

    /**
     * Получить дроп эссенции с босса
     */
    getBossEssenceDrop: function(level) {
        if (!CONFIG || !CONFIG.enemies || !CONFIG.enemies.boss) return 10;
        const cycles = CONFIG.enemies.boss.essenceDropCycles;
        if (!cycles) return CONFIG.enemies.boss.essenceDrop || 10;
        return this._getExponent(cycles, level, 10);
    },

    /**
     * Получить XP множитель для босса
     */
    getBossXPMultiplier: function(level) {
        if (!CONFIG || !CONFIG.enemies || !CONFIG.enemies.boss) return 5000;
        const cycles = CONFIG.enemies.boss.xpMultiplierCycles;
        if (!cycles) return CONFIG.enemies.boss.xpMultiplier || 5000;
        return this._getExponent(cycles, level, 5000);
    },

    /**
     * Расчет HP босса
     */
    getBossHP: function(bossCfg, level) {
        if (!bossCfg) return 100;
        
        const cycles = bossCfg.hpExponentCycles;
        const n = this._getExponent(cycles, level, 1.0);

        const safeLvl = Number(level) || 1;
        const safeN = Number(n) || 1.0;
        const base = Number(bossCfg.baseHP) || 100;
        
        // ВАЖНО: используем фиксированный интервал из конфига для сохранения баланса силы
        const difficultyInterval = Number(bossCfg.difficultyInterval) || 5;

        // Формула для босса: baseHP * (уровень / difficultyInterval)^n
        const progress = Math.max(1, safeLvl / difficultyInterval);
        const hp = base * Math.pow(progress, safeN);
        
        const result = Math.round(hp);
        
        // Лог для отладки
        if (this.isBossLevel(safeLvl)) {
            console.log(`[Scaling] Boss HP Level ${safeLvl}: base=${base}, n=${safeN}, progress=${progress.toFixed(2)}, total=${result}`);
        }

        return isNaN(result) || result <= 0 ? base : result;
    },

    /**
     * Расчет количества врагов на уровне (Базовые + Экстра)
     */
    getEnemyCount: function(level) {
        if (!CONFIG || !CONFIG.location) return { base: 4, extra: 0, total: 4 };
        const layout = CONFIG.location.enemyLayout || [];
        const cycles = CONFIG.location.spawnCycles || [];
        let rem = level - 1;
        let growthSteps = 0;
        for (const cycle of cycles) {
            const tot = (cycle.growth || 0) + (cycle.plateau || 0);
            if (rem >= tot) { growthSteps += (cycle.growth || 0); rem -= tot; }
            else { growthSteps += Math.min(rem, (cycle.growth || 0)); rem = 0; break; }
        }
        const extra = Math.min(
            growthSteps * CONFIG.location.extraEnemiesPerLevel,
            CONFIG.location.maxExtraEnemies
        );
        return { base: layout.length, extra: extra, total: layout.length + extra };
    },

    /**
     * Получить итоговые статы от престижа на основе введенных уровней
     */
    getPrestigeStats: function(levels) {
        const stats = { dmgMult: 1, critChance: 0, critDmg: 0, essenceMult: 1 };
        if (!levels || !CONFIG.upgrades || !CONFIG.upgrades.screen3) return stats;

        const nodes = CONFIG.upgrades.screen3.nodes;
        nodes.forEach(node => {
            const lvl = levels[node.id] || 0;
            if (lvl <= 0) return;
            const val = lvl * node.valuePerLevel;

            if (node.id === 'prestige_damage') stats.dmgMult += val;
            if (node.id === 'prestige_crit_chance') stats.critChance += val;
            if (node.id === 'prestige_crit_dmg') stats.critDmg += val;
            if (node.id === 'prestige_essence') stats.essenceMult += val;
        });
        return stats;
    },

    /**
     * Расчет требуемого опыта для уровня
     */
    getXPForLevel: function(lvl) {
        if (!CONFIG || !CONFIG.player || !CONFIG.player.xp) return 100;
        const xpCfg = CONFIG.player.xp;
        const n = this._getExponent(xpCfg.exponentCycles, lvl, 1.50);
        return Math.floor(xpCfg.baseXP * Math.pow(lvl, n));
    }
};
