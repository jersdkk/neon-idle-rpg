// ============================================================
// ВИЗУАЛЬНЫЕ НАСТРОЙКИ, ЗВУК И АНИМАЦИЯ
// ============================================================

const VISUALS = {

    // ── Визуальный стиль улучшений (общий для всех вкладок) ──
    upgrades: {
        thickness: 1.5,      // Толщина обводки в SVG (вкладки 1 и 2)
        thicknessCSS: 2.0,     // Толщина рамки в CSS (вкладка престижа)
        glowBlur: 6,         // Радиус размытия (для неона)
        glowOpacity: 0.6,    // Прозрачность свечения

        maxed: {
            bg: '#0A2A4A',
            border: '#24dbe9ff',
            glow: '#24dbe9',
        },
        available: {
            bg: '#1A3A1B',
            border: '#25da70ff',
            glow: '#25da70',
        },
        locked: {
            bg: '#141420',
            border: 'rgba(255, 255, 255, 0.3)',
            glow: 'none',
        }
    },

    // ── Визуал игрока ───────────────────────────────────────
    player: {
        size: 16,
        color: '#00cc1fff',
        glowColor: '#00cc1fff',
        glowBlur: 18,
    },

    // ── Визуал врагов ───────────────────────────────────────
    enemies: {
        types: [
            {
                name: 'circle',
                shape: 'circle',
                color: '#FF073A',
                glowColor: '#FF073A',
                size: 18,
            },
            {
                name: 'triangle',
                shape: 'triangle',
                color: '#FF073A',
                glowColor: '#FF073A',
                size: 18,
            },
            {
                name: 'diamond',
                shape: 'diamond',
                color: '#FF073A',
                glowColor: '#FF073A',
                size: 18,
            },
            {
                name: 'pentagon',
                shape: 'pentagon',
                color: '#B026FF',
                glowColor: '#B026FF',
                size: 30,
            },
            {
                name: 'hexagon',
                shape: 'hexagon',
                color: '#ddff00ff',
                glowColor: '#ddff00ff',
                size: 40,
            },
        ],
        boss: {
            sizeMultiplier: 5,
            color: '#0c00f7ff',
            glowColor: '#0c00f7ff',
            shape: 'hexagon',
        },
    },

    // ── Арена ───────────────────────────────────────────────
    arena: {
        size: 400,
        bgColor: '#050510',
        floorColor: '#0a0a1a',
        floorBorderColor: 'rgba(41, 61, 117, 1)',
        floorBorderWidth: 2,
        floorGlow: 'rgba(41, 61, 117, 1)',
        floorGlowBlur: 15,
    },

    // ── Анимация ────────────────────────────────────────────
    animation: {
        teleportDurationMs: 300,
        damageNumberLife: 0.8,
        damageNumberRiseSpeed: 60,
    },

    // ── Звук ────────────────────────────────────────────────
    sounds: {
        enabled: true,
        masterVolume: 0.5,
        musicVolume: 0.4,
    },

    // ── Цвета навыков ───────────────────────────────────────
    skills: {
        lightning: { color: '#00F0FF' },
        haste: { color: '#00F0FF' },
        power: { color: '#FF073A' },
        grenade: { color: '#FF8C00' }
    },

    // ── Визуал Престижа ─────────────────────────────────────
    prestige: {
        prestige_damage: { icon: 'image/attack.png', color: '#FF073A' },
        prestige_crit_dmg: { icon: 'image/crit damag.png', color: '#FF8C00' },
        prestige_crit_chance: { icon: 'image/crit chanse.png', color: '#FFE400' },
        prestige_essence: { icon: '✧', color: '#B026FF' },
        prestige_bonus: { icon: '🌟', color: '#00F0FF' }
    }
};
