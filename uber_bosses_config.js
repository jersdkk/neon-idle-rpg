// ============================================================
//  UBER BOSSES CONFIGURATION
// ============================================================
const UBER_BOSSES_CONFIG = {
    // Настройки каждого босса по его ID из карты (uber_bosses_map.js)
    bosses: {
        0: { name: "NEON GUARDIAN", icon: "🤖", hp: 250000, timer: 30, shape: "hexagon", sizeMult: 6, colors: ["#00F0FF", "#00FF6A", "#B026FF"], reward: { xp: 50000, essence: 100 } },
        1: { name: "CYBER STRIKER", icon: "⚔️", hp: 500000, timer: 30, shape: "triangle", sizeMult: 5.5, colors: ["#FF073A", "#FFE400"], reward: { xp: 75000, essence: 150 } },
        2: { name: "PLASMA CORE", icon: "🔮", hp: 500000, timer: 35, shape: "circle", sizeMult: 6.5, colors: ["#FF8C00", "#FF073A"], reward: { xp: 100000, essence: 200 } },
        3: { name: "VOID REAPER", icon: "💀", hp: 1200000, timer: 30, shape: "diamond", sizeMult: 6, colors: ["#710193", "#000000", "#B026FF"], reward: { xp: 100000, essence: 250 } },
        4: { name: "CHRONO MASTER", icon: "⏳", hp: 2000000, timer: 45, shape: "hexagon", sizeMult: 7, colors: ["#00F0FF", "#FFFFFF"], reward: { xp: 150000, essence: 500 } },
        5: { name: "STORM BLAZER", icon: "🌩️", hp: 3000000, timer: 30, shape: "pentagon", colors: ["#FFE400", "#FF0000"], reward: { xp: 250000, essence: 1000 } },
        6: { name: "COSMOS ENTITY", icon: "🌌", hp: 5000000, timer: 30, shape: "circle", colors: ["#0000FF", "#00F0FF"], reward: { xp: 300000, essence: 1000 } },
        7: { name: "IRON GARK", icon: "👹", hp: 8000000, timer: 35, shape: "hexagon", colors: ["#888888", "#FF073A"], reward: { xp: 500000, essence: 1500 } },
        8: { name: "PHANTOM RIG", icon: "👻", hp: 12000000, timer: 30, shape: "diamond", colors: ["#444444", "#710193"], reward: { xp: 500000, essence: 2000 } },
        9: { name: "GLITCH CORE", icon: "💿", hp: 18000000, timer: 30, shape: "diamond", colors: ["#FFFFFF", "#000000"], reward: { xp: 750000, essence: 3000 } },
        10: { name: "HYPERION", icon: "☀️", hp: 28000000, timer: 40, shape: "hexagon", colors: ["#FFD700", "#00FF6A"], reward: { xp: 1000000, essence: 5000 } },
        11: { name: "OMEGA WING", icon: "🦅", hp: 45000000, timer: 30, shape: "triangle", colors: ["#00F0FF", "#FF073A"], reward: { xp: 1500000, essence: 8000 } },
        12: { name: "DARK STAR", icon: "🌑", hp: 75000000, timer: 30, shape: "circle", colors: ["#222222", "#B026FF"], reward: { xp: 2500000, essence: 15000 } },
        13: { name: "END GAME", icon: "👑", hp: 150000000, timer: 60, shape: "hexagon", colors: ["#FFFFFF", "#B026FF", "#00F0FF"], reward: { xp: 10000000, essence: 30000 } }
    },

    // Дефолтные значения, если в конфиге босса не указано
    defaults: {
        timer: 30,
        colors: ["#FF073A"],
        sizeMult: 5
    }
};

window.UBER_BOSSES_CONFIG = UBER_BOSSES_CONFIG;
