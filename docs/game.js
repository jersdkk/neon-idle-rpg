// ============================================================
//  Neon RPG — Движок игры с авто-боем
// ============================================================
(() => {
    'use strict';

    // ── Объединение баланса и визуальных настроек ────────────────
    // Это позволяет коду обращаться к CONFIG и получать как статы, так и цвета/размеры
    Object.assign(CONFIG.player, VISUALS.player);
    Object.assign(CONFIG.enemies.boss, VISUALS.enemies.boss);

    // Флаг для предотвращения автосохранения при сбросе
    let isResetting = false;

    // ── Мобильное Ли Окружение (для оптимизации производительности) ──
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    VISUALS.enemies.types.forEach((vType, i) => {
        if (CONFIG.enemies.types[i]) Object.assign(CONFIG.enemies.types[i], vType);
    });
    for (const key in VISUALS.skills) {
        if (CONFIG.skills[key]) Object.assign(CONFIG.skills[key], VISUALS.skills[key]);
    }
    // Объединяем визуал престижа
    CONFIG.upgrades.screen3.nodes.forEach(pSkill => {
        if (VISUALS.prestige[pSkill.id]) Object.assign(pSkill, VISUALS.prestige[pSkill.id]);
    });

    // ── Ссылки на DOM-элементы ──────────────────────────────
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const appContainer = document.getElementById('app'); // Ссылка на основной контейнер
    const levelLabel = document.getElementById('level-label');
    const xpBarFill = document.getElementById('xp-bar-fill');
    const xpText = document.getElementById('xp-text');
    const locLabel = document.getElementById('location-label');
    const statDmg = document.getElementById('stat-dmg');
    const statAspd = document.getElementById('stat-aspd');
    const statDps = document.getElementById('stat-dps');
    const statCdr = document.getElementById('stat-cdr');
    const victoryOvl = document.getElementById('victory-overlay');
    const btnRepeat = document.getElementById('btn-repeat');
    const btnNext = document.getElementById('btn-next');
    const defeatOvl = document.getElementById('defeat-overlay');
    const btnRestartDefeat = document.getElementById('btn-restart-defeat');
    const btnBackDefeat = document.getElementById('btn-back-defeat');
    const btnPrevLevel = document.getElementById('btn-prev-level');
    const bossTimerEl = document.getElementById('boss-timer');
    const victoryXpGained = document.getElementById('victory-xp-gained');
    const debugEnemyCount = document.getElementById('debug-enemy-count');
    const debugReqDps = document.getElementById('debug-req-dps');
    const debugBossHP = document.getElementById('debug-boss-hp');

    const tab2 = document.getElementById('tab-2');
    const tab3 = document.getElementById('tab-3');
    const skillsUnlockOvl = document.getElementById('skills-unlock-overlay');
    const btnCloseSkillsUnlock = document.getElementById('btn-close-skills-unlock');
    const prestigeUnlockOvl = document.getElementById('prestige-unlock-overlay');
    const btnClosePrestigeUnlock = document.getElementById('btn-close-prestige-unlock');

    // ── Gift Box UI Elements ──
    const giftBoxContainer = document.getElementById('gift-box-container');
    const giftBoxFill = document.getElementById('gift-box-fill');
    const giftBoxIcon = document.getElementById('gift-box');
    const skillsBar = document.getElementById('skills-bar');

    const ratingOvl = document.getElementById('rating-overlay');
    const btnSubmitRating = document.getElementById('btn-submit-rating');
    const btnCloseRating = document.getElementById('btn-close-rating');
    const btnSkillLightning = document.getElementById('btn-skill-lightning');
    const btnSkillHaste = document.getElementById('btn-skill-haste');
    const btnSkillPower = document.getElementById('btn-skill-power');

    // Кнопка будущей механики
    const btnFutureMechanic = document.getElementById('btn-future-mechanic');
    if (btnFutureMechanic) {
        const valEl = btnFutureMechanic.querySelector('.btn-future-value');
        if (valEl) valEl.textContent = CONFIG.location.futureMechanicUnlockLevel;

        // Добавляем тултип (только для заблокированной кнопки)
        btnFutureMechanic.addEventListener('mouseenter', (e) => {
            if (!btnFutureMechanic.classList.contains('locked')) return;

            const tooltip = document.getElementById('upgrade-tooltip');
            if (tooltip) {
                const n = CONFIG.location.futureMechanicUnlockLevel;
                tooltip.innerHTML = `unlocks after level ${n}`;
                tooltip.style.display = 'block';
            }
        });
        btnFutureMechanic.addEventListener('mousemove', (e) => {
            const tooltip = document.getElementById('upgrade-tooltip');
            if (tooltip) {
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY + 10) + 'px';
            }
        });
        btnFutureMechanic.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('upgrade-tooltip');
            if (tooltip) tooltip.style.display = 'none';
        });
    }

    // Контейнеры и прогресс-бары длительности навыков
    const contLightning = document.getElementById('container-skill-lightning');
    const contHaste = document.getElementById('container-skill-haste');
    const contPower = document.getElementById('container-skill-power');
    const contGrenade = document.getElementById('container-skill-grenade');
    const fillHaste = document.getElementById('fill-skill-haste');
    const fillPower = document.getElementById('fill-skill-power');
    const btnSkillGrenade = document.getElementById('btn-skill-grenade');

    const cbAutoSkill = document.getElementById('cb-auto-skill');
    const autoSkillContainer = document.getElementById('auto-skill-container');

    // ── Sound Manager (Максимально надежный) ─────────────────
    const SoundManager = (() => {
        let audioCtx = null;
        let clickBuffer = null;
        let bgMusic = null;
        let bossMusic = null;
        let isStarted = false;

        // Инициализация при любом взаимодействии для Safari
        const resumeContext = () => {
            init(); // Гарантируем, что контекст создан
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume().then(() => {
                    // Короткий звук тишины для окончательной разблокировки
                    const osc = audioCtx.createOscillator();
                    const g = audioCtx.createGain();
                    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
                    osc.connect(g);
                    g.connect(audioCtx.destination);
                    osc.start(0);
                    osc.stop(0.1);
                });
            }
        };
        // Слушаем все события первичного контакта
        document.addEventListener('mousedown', resumeContext, { once: true });
        document.addEventListener('touchstart', resumeContext, { once: true });
        document.addEventListener('keydown', resumeContext, { once: true });
        document.addEventListener('click', resumeContext, { once: true });

        function init() {
            if (!audioCtx) {
                try {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) { console.error("AudioContext error:", e); }
            }
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

            if (!isStarted) {
                isStarted = true;
                // Инициализация музыки
                try {
                    bgMusic = new Audio('audio/AskaMain-sharedassets1.assets-574.ogg');
                    bgMusic.loop = true;

                    bossMusic = new Audio('audio/boss musick.ogg');
                    bossMusic.loop = true;
                } catch (e) { console.error("Music init error:", e); }
                loadSounds();
            }
        }

        async function loadSounds() {
            if (!audioCtx) return;
            try {
                const response = await fetch('audio/click_01-sharedassets1.assets-571.ogg');
                const arrayBuffer = await response.arrayBuffer();
                clickBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            } catch (e) { console.warn("Load click sound error, using fallback."); }
        }

        function play(freq, type, duration, volume, slide = 0) {
            if (!VISUALS.sounds.enabled) return;
            init();
            if (!audioCtx) return;

            try {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                if (slide !== 0) {
                    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq + slide), audioCtx.currentTime + duration);
                }
                gain.gain.setValueAtTime(volume * VISUALS.sounds.masterVolume, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            } catch (e) { }
        }

        const manager = {
            init,
            playAttack: () => { },
            playDeath: () => { },
            playLevelUp: () => {
                play(440, 'triangle', 0.1, 0.3);
                setTimeout(() => play(660, 'triangle', 0.1, 0.3), 100);
                setTimeout(() => play(880, 'triangle', 0.2, 0.3), 200);
            },
            playClick: () => {
                if (!VISUALS.sounds.enabled) return;
                init();
                // Приятный мягкий клик (натуральный звук без неоновой резкости)
                // 1. Акустический "тик" (короткий мягкий синус)
                play(700, 'sine', 0.012, 0.12); 
                // 2. Мягкое тело клика (низкий затухающий синус)
                setTimeout(() => play(350, 'sine', 0.06, 0.15, -100), 2);
            },
            playVictory: () => {
                play(523.25, 'sine', 0.15, 0.3);
                setTimeout(() => play(659.25, 'sine', 0.15, 0.3), 150);
                setTimeout(() => play(783.99, 'sine', 0.3, 0.3), 300);
            },
            playMusic: () => {
                if (!VISUALS.sounds.enabled) return;
                init();
                if (!bgMusic) return;
                bgMusic.volume = VISUALS.sounds.musicVolume * VISUALS.sounds.masterVolume;
                bgMusic.play().catch(() => {
                    const unlock = () => {
                        if (bgMusic) bgMusic.play();
                        document.removeEventListener('click', unlock);
                    };
                    document.addEventListener('click', unlock);
                });
            },
            playBossMusic: () => {
                if (!VISUALS.sounds.enabled) return;
                init();
                if (bgMusic) bgMusic.pause();
                if (bossMusic) {
                    bossMusic.volume = VISUALS.sounds.musicVolume * VISUALS.sounds.masterVolume;
                    // Исправлено: Сбрасываем время только если музыка НЕ играет
                    if (bossMusic.paused) {
                        bossMusic.currentTime = 0;
                    }
                    bossMusic.play().catch(e => console.warn("Boss music play failed", e));
                }
            },
            playMainMusic: () => {
                if (!VISUALS.sounds.enabled) return;
                init();
                if (bossMusic) bossMusic.pause();
                if (bgMusic) {
                    bgMusic.volume = VISUALS.sounds.musicVolume * VISUALS.sounds.masterVolume;
                    // Исправлено: Не перезапускаем, если уже играет
                    if (bgMusic.paused) {
                        bgMusic.play().catch(e => console.warn("Main music play failed", e));
                    }
                }
            },
            pauseMusic: () => {
                if (bgMusic) bgMusic.pause();
                if (bossMusic) bossMusic.pause();
            }
        };

        // Обработка сворачивания вкладки (Page Visibility API)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (bgMusic) bgMusic.pause();
                if (bossMusic) bossMusic.pause();
                if (audioCtx) audioCtx.suspend();
                // Добавлено: Сохраняем игру при сворачивании
                saveGame();
            } else {
                if (audioCtx) audioCtx.resume();
                if (isStarted) {
                    if (typeof enemies !== 'undefined' && enemies.some(e => e.alive && e.isBoss)) {
                        if (bossMusic) bossMusic.play();
                    } else {
                        if (bgMusic) bgMusic.play();
                    }
                }
            }
        });

        return manager;
    })();

    // Экспортируем сразу
    window.SoundManager = SoundManager;

    // ── Состояние игры ──────────────────────────────────────
    let arenaSize, player, enemies, locationLevel = 1, maxReachedLevel = 1, gameState;
    let damageNumbers = [];   // всплывающий текст урона
    let particles = [];   // частицы смерти
    let attackTimer = 0;
    let lastTime = 0;
    let bossTimer = 0; // Таймер для босса
    let levelXpGained = 0; // Опыт, полученный за текущий уровень
    let visualEffects = []; // Эффекты (молнии и т.д.)
    let currentUberBossId = null; // ID текущего Uber-босса (если мы в этом режиме)
    let savedLocationBeforeUberBoss = 1; // Чтобы вернуться назад после боя

    let skillCooldowns = { lightning: 0, haste: 0, power: 0, grenade: 0 };
    let skillActiveTimes = { haste: 0, power: 0 };

    // ── Турель (PNG-спрайты) — временно отключено ───────────────────
    // const turretBaseImg = new Image();
    // turretBaseImg.src = 'image/turret_base.png';
    // const turretBarrelImg = new Image();
    // turretBarrelImg.src = 'image/turret_barrel.png';
    // let turretAngleSmooth = -Math.PI / 2; // Текущий сглаженный угол поворота

    // ── Вспомогательные функции ─────────────────────────────
    function xpForLevel(lvl) {
        return window.Scaling.getXPForLevel(lvl);
    }

    // Текущие характеристики с учетом активных навыков и бонусов престижа
    function getCurrentStats() {
        if (!player) return { damage: 0, attackSpeed: 1, critChance: 0, critDamage: 1.5, essenceMult: 1 };
        let currentDmg = player.damage;
        let currentAspd = player.attackSpeed;
        let currentCritChance = player.critChance || 0;
        let currentCritDmg = player.critDamage || 1.5;
        let currentEssenceMult = player.essenceMult || 1;

        // Престиж: бонусы
        if (window.PrestigeManager) {
            currentDmg *= (window.PrestigeManager.getDamageMultiplier ? window.PrestigeManager.getDamageMultiplier() : 1);
            currentCritChance += window.PrestigeManager.getCritChanceBonus();
            currentCritDmg += window.PrestigeManager.getCritDmgBonus();
            currentEssenceMult *= (window.PrestigeManager.getEssenceMultiplier ? window.PrestigeManager.getEssenceMultiplier() : 1);
        }

        if (skillActiveTimes.power > 0) {
            currentDmg *= (1 + CONFIG.skills.power.damageBonusPerLevel * (player.skills.power || 1));
        }
        if (skillActiveTimes.haste > 0) {
            currentAspd *= (1 + CONFIG.skills.haste.speedBonusPerLevel * (player.skills.haste || 1));
        }

        return {
            damage: currentDmg,
            attackSpeed: currentAspd,
            critChance: currentCritChance,
            critDamage: currentCritDmg,
            essenceMult: currentEssenceMult
        };
    }

    function dist(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function isInsideDiamond(x, y) {
        const s = arenaSize;
        const cx = s / 2, cy = s / 2;
        const half = s * 0.44; // Slightly less than 0.48 to account for sprite size
        return (Math.abs(x - cx) + Math.abs(y - cy)) <= half;
    }

    // ── Изменение размера холста ────────────────────────────
    function resize() {
        if (!appContainer) return;

        // Доступная ширина внутри контейнера #app
        const maxW = appContainer.clientWidth - 20;

        // Динамический и 100% точный расчет доступной высоты
        const gameSec = document.getElementById('game-section');
        let maxH = VISUALS.arena.size;

        if (gameSec) {
            // canvas.offsetTop автоматически содержит высоту всех элементов НАД холстом (таймер босса и т.д.)
            const topUI = canvas.offsetTop;
            const paddingBottom = 15; // минимальный зазор снизу

            // Настоящее свободное место = жесткая высота всей секции МИНУС отступ сверху
            maxH = gameSec.clientHeight - topUI - paddingBottom;
        }

        // Квадратная арена
        arenaSize = Math.floor(Math.min(maxW, maxH, VISUALS.arena.size));
        if (arenaSize < 150) arenaSize = 150;

        // Для четкости на Retina/HiDPI экранах используем коэффициент плотности пикселей
        const dpr = window.devicePixelRatio || 1;
        canvas.width = arenaSize * dpr;
        canvas.height = arenaSize * dpr;

        // Визуальный размер в CSS остается прежним
        canvas.style.width = arenaSize + 'px';
        canvas.style.height = arenaSize + 'px';

        // Масштабируем контекст отрисовки, чтобы все координаты в коде (0..arenaSize) 
        // автоматически попадали в сетку dpr.
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Обновляем интерфейс
        if (player) {
            updateUI();
        }
    }

    // ── Создание игрока ─────────────────────────────────────
    function createPlayer() {
        const sp = CONFIG.location.playerSpawn;
        return {
            x: sp.xFrac * arenaSize,
            y: sp.yFrac * arenaSize,
            level: CONFIG.player.startLevel,
            xp: 0,
            xpToNext: xpForLevel(CONFIG.player.startLevel),
            damage: CONFIG.player.baseDamage,
            attackSpeed: CONFIG.player.baseAttackSpeed,
            critChance: CONFIG.player.baseCritChance || 0,
            critDamage: CONFIG.player.baseCritDamage || 1.5,
            areaDamageRadius: CONFIG.player.baseAreaDamageRadius || 0, // радиус урона по площади
            areaDamageMult: CONFIG.player.baseAreaDamageMult || 0.5, // множитель урона по площади
            cooldownReduction: CONFIG.player.baseCooldownReduction || 0,
            essenceMult: CONFIG.player.baseEssenceMult || 1, // множитель получаемой эссенции
            xpMult: 1,       // множитель получаемого опыта
            size: CONFIG.player.size,
            shownSkillsInfo: false,
            shownPrestigeInfo: false,
            shownRatingInfo: false,
            targetEnemy: null,
            skills: { lightning: 0, haste: 0, power: 0, grenade: 0 },
            // animation
            prevX: sp.xFrac * arenaSize,
            prevY: sp.yFrac * arenaSize,
            teleportProgress: 1,   // 0→1  (1 = arrived)
            drawX: sp.xFrac * arenaSize,
            drawY: sp.yFrac * arenaSize,
            // Анимация атаки
            attackAnim: 0,
            dashX: 0,
            dashY: 0,
            // Механика Коробки с подарком
            giftBox: {
                kills: 0,
                requiredKills: CONFIG.giftBox.fixedRequirements[0],
                openedCount: 0,
                currentRarity: CONFIG.giftBox.fixedSequence[0]
            }
        };
    }

    // ── Создание врагов ─────────────────────────────────────
    function createEnemies(locLvl) {
        const layout = CONFIG.location.enemyLayout;

        // Расчет количества дополнительных врагов на основе циклов сложности
        const countInfo = window.Scaling.getEnemyCount(locLvl);
        const extra = countInfo.extra;
        const totalPlanned = countInfo.total;

        let spawnScale = 1;
        if (totalPlanned > 20) spawnScale = 0.7;
        else if (totalPlanned > 12) spawnScale = 0.8;

        const list = [];

        // Проверка на Босса
        const bossCfg = CONFIG.enemies.boss;
        if (window.Scaling.isBossLevel(locLvl)) {
            const bossType = {
                name: bossCfg.name,
                shape: bossCfg.shape,
                color: bossCfg.color,
                glowColor: bossCfg.glowColor,
                size: CONFIG.player.size * bossCfg.sizeMultiplier,
                baseHP: bossCfg.baseHP,
                // XP и Essence будут заданы в makeEnemy
            };
            // Босс спавнится в центре арены
            const bx = arenaSize / 2;
            const by = arenaSize * 0.4;
            return [makeEnemy(bossType, locLvl, bx, by)];
        }

        // Обычные враги — полностью случайный спавн
        const availableTypes = CONFIG.enemies.types.filter(t =>
            (!t.minLevel || locLvl >= t.minLevel) && (!t.maxLevel || locLvl <= t.maxLevel)
        );
        const extraTypes = availableTypes.length > 0 ? availableTypes : [CONFIG.enemies.types[0]];

        // Расчет адаптивного масштаба врагов (почти полностью отключен)
        let globalEnemyScale = 1.0;
        if (arenaSize < 400) globalEnemyScale = Math.max(0.9, arenaSize / 400);

        // Расчет "идеальной" дистанции для равномерного заполнения всей площади арены
        const diamondR = arenaSize * 0.45;
        const diamondArea = 2 * diamondR * diamondR; // Площадь ромба ARENA
        const idealSpacing = Math.sqrt(diamondArea / (totalPlanned + 2)) * 1.1; // +2 для учета игрока и запаса

        const baseDistFrac = 25 / 750;
        const minDist = baseDistFrac * arenaSize * spawnScale * globalEnemyScale;

        for (let i = 0; i < totalPlanned; i++) {
            const type = extraTypes[randomInt(0, extraTypes.length - 1)];
            const eLvl = clamp(locLvl, 1, 999);

            let ex, ey, attempts = 0, isTooClose;
            do {
                ex = randomInt(arenaSize * 0.1, arenaSize * 0.9);
                ey = randomInt(arenaSize * 0.1, arenaSize * 0.7);
                attempts++;

                // Сначала просто исключаем ОЧЕНЬ близкий спавн
                isTooClose = list.some(other => dist({ x: ex, y: ey }, other) < minDist);
                const playerSp = CONFIG.location.playerSpawn;
                if (dist({ x: ex, y: ey }, { x: playerSp.xFrac * arenaSize, y: playerSp.yFrac * arenaSize }) < minDist) {
                    isTooClose = true;
                }

            } while ((!isInsideDiamond(ex, ey) || isTooClose) && attempts < 150);

            if (attempts < 150) {
                list.push(makeEnemy(type, eLvl, ex, ey, globalEnemyScale));
            }
        }

        // ── Глобальная релаксация для полной равномерности (50 итераций) ──
        const pSp = CONFIG.location.playerSpawn;
        // Безопасная зона игрока теперь масштабируется (10% от размера арены)
        const playerSafeZoneRadius = arenaSize * 0.12;
        const playerDummy = { x: pSp.xFrac * arenaSize, y: pSp.yFrac * arenaSize, size: playerSafeZoneRadius };

        for (let step = 0; step < 50; step++) {
            for (let i = 0; i < list.length; i++) {
                const e1 = list[i];
                if (e1.isBoss) continue;

                // Отталкивание от игрока (чуть менее агрессивное для мелких окон)
                const dPx = e1.x - playerDummy.x;
                const dPy = e1.y - playerDummy.y;
                const dPsq = dPx * dPx + dPy * dPy;
                const minPD = playerDummy.size;
                if (dPsq < minPD * minPD && dPsq > 0) {
                    const dP = Math.sqrt(dPsq);
                    const overP = minPD - dP;
                    e1.x += (dPx / dP) * overP * 0.25;
                    e1.y += (dPy / dP) * overP * 0.25;
                }

                for (let j = i + 1; j < list.length; j++) {
                    const e2 = list[j];
                    if (e2.isBoss) continue;

                    const dx = e1.x - e2.x;
                    const dy = e1.y - e2.y;
                    const dSq = dx * dx + dy * dy;

                    // Используем ИДЕАЛЬНОЕ расстояние для расталкивания (spread)
                    // Но не меньше физического размера
                    const minD = Math.max((e1.size + e2.size) * 0.8, idealSpacing);

                    if (dSq < minD * minD && dSq > 0) {
                        const d = Math.sqrt(dSq);
                        const overlap = minD - d;

                        // Плавное расталкивание к свободному месту
                        const pushForce = 0.3 * (1 - step / 50);
                        const pushX = (dx / d) * overlap * pushForce;
                        const pushY = (dy / d) * overlap * pushForce;

                        e1.x += pushX; e1.y += pushY;
                        e2.x -= pushX; e2.y -= pushY;

                        // Сдерживание внутри арены (мягкое)
                        if (!isInsideDiamond(e1.x, e1.y)) { e1.x -= pushX * 1.05; e1.y -= pushY * 1.05; }
                        if (!isInsideDiamond(e2.x, e2.y)) { e2.x += pushX * 1.05; e2.y += pushY * 1.05; }
                    }
                }
            }
        }

        return list;
    }

    function makeEnemy(type, level, x, y, scale = 1.0) {
        const bossCfg = CONFIG.enemies.boss;
        const isBoss = type.name === bossCfg.name;

        // Определяем визуальные параметры типа
        const vCfg = VISUALS.enemies.types.find(t => t.name === type.name) || VISUALS.enemies.types[0];

        let hp;
        if (isBoss) {
            // Используем формулу для босса из внешнего файла
            hp = window.Scaling.getBossHP(bossCfg, level);
        } else {
            // Используем формулу для обычных врагов из внешнего файла
            hp = window.Scaling.getEnemyHP(type, level);
        }

        if (isNaN(hp) || hp <= 0) hp = 10;

        return {
            x, y,
            xFrac: x / arenaSize,
            yFrac: y / arenaSize,
            name: type.name,
            level,
            hp,
            maxHP: hp,
            isBoss: isBoss,
            xpMultiplier: isBoss ? window.Scaling.getBossXPMultiplier(level) : (type.xpMultiplier || 0),
            shape: type.shape || vCfg.shape,
            color: type.color || vCfg.color,
            glowColor: type.glowColor || vCfg.glowColor,
            size: (isBoss ? (CONFIG.player.size * bossCfg.sizeMultiplier) : (vCfg.size)) * scale,
            alive: true,
            hitFlash: 0,
            deathFade: 1,

            essenceDrop: isBoss ? window.Scaling.getBossEssenceDrop(level) : (type.essenceDrop || 0),
            gearDrop: isBoss ? 0 : (type.gearDrop || 0), // Детали для турелей
            // Анимация отталкивания
            kbX: 0,
            kbY: 0,
            kbTimer: 0
        };
    }

    function makeUberEnemy(bossCfg, id) {
        return {
            x: arenaSize / 2,
            y: arenaSize * 0.4,
            uberId: id,
            name: bossCfg.name,
            level: 1, // У Uber-боссов свой баланс через HP в конфиге
            hp: bossCfg.hp,
            maxHP: bossCfg.hp,
            isBoss: true,
            isUber: true,
            xpMultiplier: 0, // Награда выдается отдельно
            shape: bossCfg.shape,
            uberColors: bossCfg.colors || ["#B026FF"],
            size: CONFIG.player.size * (bossCfg.sizeMult || 5),
            alive: true,
            hitFlash: 0,
            deathFade: 1,
            kbX: 0, kbY: 0, kbTimer: 0
        };
    }

    // ── Init / Restart ─────────────────────────────────────
    function initLevel(locLvl, keepPlayer) {
        console.log(`[INIT] Запуск уровня: ${locLvl}, Сохранить персонажа: ${keepPlayer}`);
        resize();

        locationLevel = locLvl || (CONFIG && CONFIG.location ? CONFIG.location.startLevel : 1) || 1;

        // Очистка ракет и взрывов турелей при смене уровня
        if (window.TurretManager && window.TurretManager.clearRockets) {
            window.TurretManager.clearRockets();
        }

        // Видимость кнопки «Назад» только для боссов и уберов
        const isBossLvlInit = window.Scaling.isBossLevel(locationLevel);
        const isUberInit = currentUberBossId !== null;
        if (btnPrevLevel) {
            btnPrevLevel.style.display = (isBossLvlInit || isUberInit) ? 'flex' : 'none';
        }
        if (locationLevel > maxReachedLevel) {
            maxReachedLevel = locationLevel;
        }
        if (!keepPlayer) {
            player = createPlayer();
        } else {
            // Reset position only
            const sp = CONFIG.location.playerSpawn;
            player.x = sp.xFrac * arenaSize;
            player.y = sp.yFrac * arenaSize;
            player.drawX = player.x;
            player.drawY = player.y;
            player.prevX = player.x;
            player.prevY = player.y;
            player.teleportProgress = 1;
            player.targetEnemy = null;
        }

        if (currentUberBossId !== null) {
            const bCfg = window.UBER_BOSSES_CONFIG.bosses[currentUberBossId];
            enemies = [makeUberEnemy(bCfg, currentUberBossId)];
        } else {
            enemies = createEnemies(locLvl);
        }

        // Динамическое изменение размера при большом скоплении врагов
        let scale = 1;
        if (enemies.length > 15) {
            scale = 0.6; // Уменьшаем на 20%, а потом еще на 25% (0.8 * 0.75 = 0.6)
        } else if (enemies.length > 10) {
            scale = 0.8; // Уменьшаем на 20%
        }

        if (scale !== 1) {
            player.size = CONFIG.player.size * scale;
            enemies.forEach(e => {
                if (e.size) e.size *= scale;
            });
        } else {
            player.size = CONFIG.player.size;
        }

        damageNumbers = [];
        particles = [];
        visualEffects = [];
        updateGiftBoxUI();
        attackTimer = 0;
        gameState = 'playing';
        victoryOvl.classList.remove('visible');
        defeatOvl.classList.remove('visible');
        const uberVictoryOvl = document.getElementById('uber-victory-overlay');
        const uberDefeatOvl = document.getElementById('uber-defeat-overlay');
        if (uberVictoryOvl) {
            uberVictoryOvl.classList.remove('visible');
            uberVictoryOvl.style.display = 'none';
        }
        if (uberDefeatOvl) {
            uberDefeatOvl.classList.remove('visible');
            uberDefeatOvl.style.display = 'none';
        }
        if (btnNext) {
            btnNext.classList.remove('btn-boss-next');
            btnNext.textContent = 'Next level';
        }
        levelXpGained = 0; // Сброс счетчика опыта за уровень

        // Настройка таймера для босса
        const bossCfg = CONFIG.enemies.boss;
        const isUber = currentUberBossId !== null;

        if (isUber || window.Scaling.isBossLevel(locLvl)) {
            bossTimer = isUber ? (window.UBER_BOSSES_CONFIG.bosses[currentUberBossId].timer || 30) : bossCfg.timeoutSeconds;
            bossTimerEl.style.display = 'block';
            bossTimerEl.textContent = bossTimer.toFixed(1);
        } else {
            bossTimer = 0;
            bossTimerEl.style.display = 'none';
        }
        if (window.PrestigeManager) {
            window.PrestigeManager.refresh();
        }

        // Трекинг начала уровня (для анализа прогресса и сложности)
        if (typeof window.gtag_game_event === 'function') {
            window.gtag_game_event('level_start', {
                level: locLvl,
                is_boss: (window.Scaling.isBossLevel(locLvl) || currentUberBossId !== null),
                is_uber_boss: currentUberBossId !== null,
                uber_boss_id: currentUberBossId
            });
        }


        // Настройка заголовка для Uber-босса
        const uberBossNameEl = document.getElementById('uber-boss-name');
        if (currentUberBossId !== null) {
            const bCfg = window.UBER_BOSSES_CONFIG.bosses[currentUberBossId];
            if (locLabel) locLabel.style.display = 'none';
            if (uberBossNameEl) {
                uberBossNameEl.style.display = 'block';
                uberBossNameEl.textContent = bCfg.name;
            }
            if (btnFutureMechanic) btnFutureMechanic.style.display = 'none';
        } else {
            if (locLabel) locLabel.style.display = 'block';
            if (uberBossNameEl) uberBossNameEl.style.display = 'none';
            if (btnFutureMechanic) btnFutureMechanic.style.display = 'flex';
        }

        updateUI();

        // Проверяем видимость вкладки навыков при инициализации уровня
        // Показываем, если уровень >= 5 или если уже куплен хотя бы один навык (даже после престижа)
        const hasSkills = player && player.skills && Object.values(player.skills).some(lvl => lvl > 0);
        if (tab2) {
            if (locationLevel >= 5 || maxReachedLevel >= 5 || hasSkills) {
                tab2.style.display = 'inline-block';
            }
        }

        // Обновляем систему прокачки (включая уведомления о новых скиллах)
        if (window.UpgradeManager) {
            window.UpgradeManager.refresh();
        }

        // ПРИНУДИТЕЛЬНЫЙ ПЕРЕСЧЕТ:
        // Так как таймер босса или имя убер-босса показались или скрылись,
        // нам нужно моментально пересчитать размер холста с новыми отступами!
        window.dispatchEvent(new Event('resize'));

        // Сохраняем игру при смене уровня (если это не первая загрузка)
        if (keepPlayer) saveGame();
    }

    // Вспомогательная функция для сокращения больших чисел
    function formatNum(num, isFloat = false, precision = 1) {
        const n = Number(num);
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
        return isFloat ? n.toFixed(precision) : Math.round(n).toString();
    }

    // Вспомогательная функция для сокращения больших чисел и уменьшения шрифта если текст слишком длинный
    function formatValue(val, el, isFloat = false, precision = 1) {
        if (!el) return;

        const formatted = formatNum(val, isFloat, precision);

        // Масштабируем шрифт в зависимости от длины текста
        // Базовый размер 10.5px. Если символов > 5, уменьшаем.
        const len = formatted.length;
        if (len > 7) el.style.fontSize = '8px';
        else if (len > 5) el.style.fontSize = '9px';
        else el.style.fontSize = ''; // Наследуемый 10.5px

        el.textContent = formatted;
    }

    // ── Обновление интерфейса ───────────────────────────────
    function updateUI() {
        if (!player) return;
        levelLabel.textContent = `LVL ${player.level}`;
        locLabel.textContent = `Location ${locationLevel}`;

        // Обновление полоски опыта
        if (xpBarFill) {
            const xpPct = (player.xp / player.xpToNext) * 100;
            xpBarFill.style.width = `${xpPct}%`;
        }
        if (xpText) {
            xpText.textContent = `${formatNum(player.xp)} / ${formatNum(player.xpToNext)} XP`;
        }

        // Скрываем/показываем кнопку возврата на карту
        const isUber = currentUberBossId !== null;
        const btnBackToMapVictory = document.getElementById('btn-uber-back-to-map');

        if (btnBackToMapVictory) btnBackToMapVictory.style.display = isUber ? 'block' : 'none';

        // В оверлее победы скрываем кнопку "Следующий уровень" если это Uber-босс
        if (btnNext) btnNext.style.display = isUber ? 'none' : 'block';

        const stats = getCurrentStats();

        formatValue(stats.damage, statDmg);
        formatValue(stats.attackSpeed, statAspd, true, 2);

        // Обновляем криты в статах
        const critCEl = document.getElementById('stat-crit-chance');
        const critDEl = document.getElementById('stat-crit-dmg');
        const essMultEl = document.getElementById('stat-ess-mult');

        if (critCEl) formatValue(stats.critChance * 100, critCEl);
        if (critDEl) formatValue(stats.critDamage, critDEl, true, 2);
        if (essMultEl) formatValue(stats.essenceMult || 1, essMultEl, true, 2);

        // Обновляем кнопку будущей механики (состояние)
        if (btnFutureMechanic) {
            const unlockLvl = CONFIG.location.futureMechanicUnlockLevel || 100;
            const isUnlocked = maxReachedLevel > unlockLvl;

            btnFutureMechanic.classList.toggle('locked', !isUnlocked);
            btnFutureMechanic.classList.toggle('available', isUnlocked);
        }

        // Обновляем КД (CDR)
        if (statCdr) formatValue(player.cooldownReduction * 100, statCdr);

        // Расчет и отображение СРЕДНЕГО DPS
        if (statDps) {
            const cdr = player.cooldownReduction || 0;
            const effectiveCritChance = Math.min(1, Math.max(0, stats.critChance));
            const critMult = 1 + effectiveCritChance * (stats.critDamage - 1);

            let avgDmg = player.damage;
            let avgAspd = player.attackSpeed;
            if (window.PrestigeManager) {
                avgDmg *= (window.PrestigeManager.getDamageMultiplier ? window.PrestigeManager.getDamageMultiplier() : 1);
            }

            if (player.skills.power > 0) {
                const uptime = Math.min(1, CONFIG.skills.power.duration / (CONFIG.skills.power.cooldown * (1 - cdr)));
                const bonus = CONFIG.skills.power.damageBonusPerLevel * (player.skills.power || 1);
                avgDmg *= (1 + bonus * uptime);
            }

            if (player.skills.haste > 0) {
                const uptime = Math.min(1, CONFIG.skills.haste.duration / (CONFIG.skills.haste.cooldown * (1 - cdr)));
                const bonus = CONFIG.skills.haste.speedBonusPerLevel * (player.skills.haste || 1);
                avgAspd *= (1 + bonus * uptime);
            }

            let totalDps = avgDmg * avgAspd * critMult;
            const singleTargetDps = totalDps;

            let skillsDps = 0;
            if (player.skills.lightning > 0) {
                const ltnLvl = player.skills.lightning;
                const ltnBaseCd = CONFIG.skills.lightning.cooldown;
                const ltnDmgMult = CONFIG.skills.lightning.damageMultiplier;
                const ltnCd = ltnBaseCd * (1 - cdr);
                skillsDps += (avgDmg * ltnDmgMult * ltnLvl) / ltnCd;
            }

            if (player.skills.grenade > 0) {
                const grnLvl = player.skills.grenade;
                const grnBaseCd = CONFIG.skills.grenade.cooldown;
                const grnDmgMult = CONFIG.skills.grenade.damageMultiplier;
                const grnCd = grnBaseCd * (1 - cdr);
                skillsDps += (avgDmg * grnDmgMult * grnLvl) / grnCd;
            }

            let turretDps = 0;
            if (window.TurretManager && window.TurretManager.getTurretDPS) {
                turretDps = window.TurretManager.getTurretDPS();
            }

            const finalSingleDps = singleTargetDps + skillsDps + turretDps;
            formatValue(finalSingleDps, statDps);

            // Динамический цвет DPS в зависимости от сложности босса — ИСПОЛЬЗУЕМ ТОЛЬКО SINGLE TARGET
            if (window.Scaling && CONFIG.enemies.boss) {
                const bossCfg = CONFIG.enemies.boss;
                const isBossLvl = window.Scaling.isBossLevel(locationLevel);
                const currentInt = window.Scaling.getBossInterval(locationLevel) || bossCfg.interval;
                const targetLvl = isBossLvl ? locationLevel : Math.ceil(locationLevel / currentInt) * currentInt;

                const bossHP = window.Scaling.getBossHP(bossCfg, targetLvl);
                if (debugBossHP) debugBossHP.textContent = `Boss HP (${targetLvl}): ` + formatNum(bossHP);
                const reqDps = bossHP / bossCfg.timeoutSeconds;

                const adjustedRatio = Math.min(1, finalSingleDps / (reqDps * 1.5));
                const hue = adjustedRatio * 120;

                const dpsColor = `hsl(${hue}, 100%, 50%)`;
                const dpsShadow = `0 0 10px hsl(${hue}, 100%, 30%)`;

                statDps.style.color = dpsColor;
                statDps.style.textShadow = dpsShadow;

                if (locLabel) {
                    locLabel.style.color = dpsColor;
                    locLabel.style.textShadow = dpsShadow;
                }

                if (debugReqDps) {
                    debugReqDps.textContent = `Req. DPS: ${Math.round(reqDps)}`;
                }
            }
        }

        // Обновляем счетчик врагов (дебаг)
        if (debugEnemyCount && typeof enemies !== 'undefined') {
            const aliveCount = enemies.filter(e => e.alive).length;
            debugEnemyCount.textContent = `Enemies: ${aliveCount}`;
        }

        updateGiftBoxUI();
    }

    function updateGiftBoxUI() {
        if (!player || !player.giftBox || !giftBoxContainer || !giftBoxFill) return;
        const gb = player.giftBox;

        if (!gb.requiredKills) gb.requiredKills = CONFIG.giftBox.baseKills;
        if (!gb.currentRarity) gb.currentRarity = CONFIG.giftBox.fixedSequence[0];

        const progress = Math.min(100, (gb.kills / gb.requiredKills) * 100);
        giftBoxFill.style.width = `${progress}%`;

        const isFull = gb.kills >= gb.requiredKills;
        giftBoxContainer.classList.toggle('full', isFull);

        const reward = CONFIG.giftBox.rewards[gb.currentRarity];
        if (giftBoxIcon) {
            const img = giftBoxIcon.querySelector('img');
            if (img && reward.icon) {
                if (img.src.indexOf(reward.icon) === -1) {
                    img.src = reward.icon;
                }
            }
        }
    }

    function addGiftBoxKill() {
        if (!player || !player.giftBox) return;
        const gb = player.giftBox;
        if (gb.kills < gb.requiredKills) {
            gb.kills++;
            updateGiftBoxUI();
        }
    }

    function openGiftBox() {
        if (!player || !player.giftBox) return;
        const gb = player.giftBox;
        if (gb.kills < gb.requiredKills) return;

        const rarity = gb.currentRarity;
        const reward = CONFIG.giftBox.rewards[rarity];

        // Определение типа награды
        let type = 'xp';
        if (gb.openedCount < CONFIG.giftBox.fixedRewardTypes.length) {
            type = CONFIG.giftBox.fixedRewardTypes[gb.openedCount];
        } else {
            type = Math.random() < 0.5 ? 'xp' : 'essence';
        }

        if (type === 'xp') {
            // ВЫДАЕМ ОЧКИ ПРОКАЧКИ (Upgrade Points)
            const ptsPerLevel = (CONFIG.player.basePointsPerLevelUp || 1) + (player.pointsBonus || 0);
            const pts = (reward.points || 1) * ptsPerLevel;
            if (window.UpgradeManager && window.UpgradeManager.addPoint) {
                for (let i = 0; i < pts; i++) {
                    window.UpgradeManager.addPoint();
                }
            }
            showDOMReward(`+${pts} Points`, reward.color);
        } else {
            // ВЫДАЕМ ЭССЕНЦИЮ (essenceMult * xEss)
            const stats = getCurrentStats();
            const essAmount = Math.floor((stats.essenceMult || 1) * reward.xEss);
            if (window.UpgradeManager && window.UpgradeManager.addEssence) {
                window.UpgradeManager.addEssence(essAmount);
            }
            showDOMReward(`+${formatNum(essAmount)} Ess.`, reward.color);
        }

        SoundManager.playClick();

        // Аналитика: открытие коробки
        if (typeof window.gtag_game_event === 'function') {
            window.gtag_game_event('gift_box_open', {
                'rarity': rarity,
                'count': gb.openedCount + 1
            });
        }

        gb.openedCount++;
        gb.kills = 0;

        const seq = CONFIG.giftBox.fixedSequence;
        const reqs = CONFIG.giftBox.fixedRequirements;

        if (gb.openedCount < seq.length) {
            gb.currentRarity = seq[gb.openedCount];
            gb.requiredKills = reqs[gb.openedCount];
        } else {
            gb.currentRarity = rollGiftRarity();
            gb.requiredKills = CONFIG.giftBox.rewards[gb.currentRarity].kills;
        }

        updateGiftBoxUI();
        if (window.Game && window.Game.save) window.Game.save();
    }

    function showDOMReward(text, color) {
        if (!giftBoxContainer) return;

        // 1. Текст награды улетает вверх (Выравниваем по правому краю)
        const rewardEl = document.createElement('div');
        rewardEl.textContent = text;
        rewardEl.style.position = 'absolute';
        rewardEl.style.color = color;
        rewardEl.style.fontSize = '14px';
        rewardEl.style.fontWeight = 'bold';
        rewardEl.style.pointerEvents = 'none';
        rewardEl.style.textShadow = `0 0 5px ${color}, 0 0 2px #000`;
        rewardEl.style.fontFamily = "'Orbitron', sans-serif";
        rewardEl.style.zIndex = '200';

        // Привязываем текст к правому краю location-row, чтобы защитить от ховер-скейла коробки
        rewardEl.style.right = '15px';
        rewardEl.style.top = '-14px';
        rewardEl.style.whiteSpace = 'nowrap';
        rewardEl.style.transform = 'translateY(0)';

        // Разделяем эффекты: движение вверх плавно 4.5с, а растворение (opacity) занимает 1с и начинается с задержкой 3с
        rewardEl.style.transition = 'transform 3.0s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 1s ease 2s';

        const locRow = document.getElementById('location-row') || document.body;
        locRow.appendChild(rewardEl);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                rewardEl.style.transform = 'translateY(-30px)'; // Текст улетает не так высоко
                rewardEl.style.opacity = '0';
            });
        });

        setTimeout(() => {
            if (rewardEl.parentNode) rewardEl.parentNode.removeChild(rewardEl);
        }, 4500);

        // 2. Партиклы взрыва вокруг коробки (Используем Canvas для идеальной резкости)
        spawnGiftBoxParticles(color);
    }

    function spawnGiftBoxParticles(color) {
        if (!giftBoxContainer) return;

        const canvas = document.createElement('canvas');
        const size = 300; // увеличено для бОльшего разлета
        canvas.width = size;
        canvas.height = size;
        canvas.style.position = 'absolute';
        canvas.style.top = '50%';
        canvas.style.left = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '-1'; // Под коробку
        giftBoxContainer.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        // Массив частиц (в 2 раза больше - 40 штук)
        let particles = [];
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 140; // Сильно увеличен разлет

            // Формы: 0 = круг, 4 = квадрат, 3 = треугольник, 6 = шестиугольник
            const shapes = [0, 4, 3, 6];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];

            particles.push({
                x: size / 2,
                y: size / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8 + Math.random() * 0.4,
                maxLife: 1.2,
                radius: 4 + Math.random() * 3, // Радиус (размер)
                color: color,
                shape: shape,
                rotation: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 10
            });
        }

        let lastTime = performance.now();
        function animate() {
            const now = performance.now();
            const dt = (now - lastTime) / 1000;
            lastTime = now;

            ctx.clearRect(0, 0, size, size);
            let active = false;

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life -= dt;
                if (p.life > 0) {
                    active = true;
                    // Физика
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    // Плавное торможение
                    p.vx *= 0.95;
                    p.vy *= 0.95;
                    p.rotation += p.vRot * dt;

                    const Math_PI2 = Math.PI * 2;
                    const alpha = Math.max(0, p.life / p.maxLife);
                    const currentSize = p.radius * alpha;

                    ctx.save();
                    ctx.globalAlpha = alpha;

                    ctx.beginPath();
                    if (p.shape === 0) {
                        ctx.arc(p.x, p.y, currentSize, 0, Math_PI2);
                    } else {
                        for (let j = 0; j < p.shape; j++) {
                            const ang = p.rotation + (Math_PI2 / p.shape) * j;
                            const px = p.x + Math.cos(ang) * currentSize;
                            const py = p.y + Math.sin(ang) * currentSize;
                            if (j === 0) ctx.moveTo(px, py);
                            else ctx.lineTo(px, py);
                        }
                        ctx.closePath();
                    }

                    // Рендер полностью без свечения (только контур)
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 2.0;
                    ctx.stroke();

                    ctx.restore();
                }
            }

            if (active) {
                requestAnimationFrame(animate);
            } else {
                if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            }
        }

        requestAnimationFrame(animate);
    }

    function rollGiftRarity() {
        const weights = CONFIG.giftBox.rarityWeights;
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (const [rarity, weight] of Object.entries(weights)) {
            if (r < weight) return rarity;
            r -= weight;
        }
        return 'common';
    }

    // ── Опыт и повышение уровня ─────────────────────────────
    function grantXP(amount, skipUI = false) {
        if (isNaN(amount) || amount <= 0) return;
        if (isNaN(player.xp)) player.xp = 0;

        // Применяем множитель XP из прокачки
        const gained = Math.floor(amount * (player.xpMult || 1));
        player.xp += (isNaN(gained) ? 0 : gained);
        levelXpGained += (isNaN(gained) ? 0 : gained);

        let leveledUp = false;
        while (player.xp >= player.xpToNext) {
            player.xp -= player.xpToNext;
            player.level++;
            player.xpToNext = xpForLevel(player.level);
            SoundManager.playLevelUp();
            if (typeof UpgradeManager !== 'undefined') {
                const ptsToAdd = (CONFIG.player.basePointsPerLevelUp || 1) + (player.pointsBonus || 0);
                for (let i = 0; i < ptsToAdd; i++) {
                    UpgradeManager.addPoint();
                }
            }
            leveledUp = true;
        }
        if (!skipUI || leveledUp) updateUI();
    }

    // ── Поиск ближайшего живого врага ───────────────────────
    function findNearest() {
        let best = null, bestD = Infinity;
        for (const e of enemies) {
            if (!e.alive) continue;
            const d = dist(player, e);
            if (d < bestD) { bestD = d; best = e; }
        }
        return best;
    }

    // Расчет КД с учетом пассивной прокачки
    function getSkillCooldown(key) {
        const base = CONFIG.skills[key].cooldown;
        // Кап КД на 90%, чтобы не было нулевого отката, вызывающего зависания
        const cdr = Math.min(0.9, (player && player.cooldownReduction) || 0);
        return Math.max(0.1, base * (1 - cdr));
    }

    function processHitData(hit) {
        const target = hit.target;
        if (!target || !target.alive) return;

        // Apply damage and knockback now
        target.hp -= hit.damage;
        target.hitFlash = 1;

        target.kbTimer = 0.1;
        target.kbX = Math.cos(hit.angle) * 7;
        target.kbY = Math.sin(hit.angle) * 7;

        // Effects at hit point
        visualEffects.push({
            type: 'slash',
            x: target.x,
            y: target.y,
            angle: hit.angle + Math.PI / 2,
            color: '#FFFFFF',
            life: 0.2,
            maxLife: 0.2
        });

        spawnDamageNumber(target.x, target.y - target.size, hit.damage, hit.isCrit);
        spawnHitParticles(target.x, target.y, target.color);

        // Area Damage
        const stats = hit.stats;
        if (player.areaDamageRadius && player.areaDamageRadius > 0) {
            const radius = player.areaDamageRadius * (arenaSize / 400);
            const aoeMult = player.areaDamageMult || 0.5;
            const aoeDmg = Math.max(1, Math.round(hit.damage * aoeMult));

            for (const enemy of enemies) {
                if (enemy !== target && enemy.alive) {
                    const d = dist(target, enemy);
                    if (d <= radius) {
                        enemy.hp -= aoeDmg;
                        enemy.hitFlash = 1;
                        spawnDamageNumber(enemy.x, enemy.y - enemy.size, aoeDmg, false, '#FF4500');
                        spawnHitParticles(enemy.x, enemy.y, enemy.color);
                        if (enemy.hp <= 0) {
                            handleEnemyDeath(enemy);
                        }
                    }
                }
            }
        }

        // Check main target's death
        if (target.hp <= 0) {
            handleEnemyDeath(target);
        }
    }

    // ── Обновление боя ──────────────────────────────────────
    function updateCombat(dt) {
        if (gameState !== 'playing') return;

        // Таймеры откатов обновляются каждый кадр
        let uiUpdateNeeded = false;
        for (let key in skillCooldowns) {
            if (skillCooldowns[key] > 0) skillCooldowns[key] -= dt;
        }
        for (let key in skillActiveTimes) {
            if (skillActiveTimes[key] > 0) {
                skillActiveTimes[key] -= dt;
                if (skillActiveTimes[key] <= 0) uiUpdateNeeded = true;
            }
        }

        // Если нет цели — ищем ближайшую
        if (!player.targetEnemy || !player.targetEnemy.alive) {
            const next = findNearest();
            if (!next) {
                // Все враги мертвы — победа
                gameState = 'victory';
                // victoryOvl.classList.add('visible'); // Удалено по просьбе пользователя для бесшовного перехода

                if (currentUberBossId !== null) {
                    const bCfg = window.UBER_BOSSES_CONFIG.bosses[currentUberBossId];
                    const reward = bCfg.reward;
                    grantXP(reward.xp);
                    if (window.UpgradeManager) window.UpgradeManager.addEssence(reward.essence);

                    // Сообщаем карте о победе
                    if (window.UberBossMap) window.UberBossMap.onBossDefeated(currentUberBossId);

                    // Показываем ТОЛЬКО СПЕЦИАЛЬНЫЙ оверлей победы
                    if (victoryOvl) victoryOvl.classList.remove('visible'); // Убеждаемся что обычный скрыт

                    const uberVictoryOvl = document.getElementById('uber-victory-overlay');
                    if (uberVictoryOvl) {
                        uberVictoryOvl.style.display = 'flex'; // Принудительно показываем
                        uberVictoryOvl.classList.add('visible');
                        const iconEl = document.getElementById('uber-victory-boss-icon');
                        if (iconEl) iconEl.textContent = bCfg.icon || "👾";
                        document.getElementById('uber-victory-boss-name').textContent = bCfg.name;
                        document.getElementById('uber-victory-xp').textContent = `+${formatNum(reward.xp)}`;
                        document.getElementById('uber-victory-essence').textContent = `+${formatNum(reward.essence)}`;
                    }

                    SoundManager.playVictory();
                    return;
                }

                if (victoryXpGained) victoryXpGained.textContent = levelXpGained;
                SoundManager.playVictory();

                // Трекинг победы на уровне
                if (typeof window.gtag_game_event === 'function') {
                    window.gtag_game_event('level_victory', {
                        level: locationLevel,
                        is_boss: (window.Scaling.isBossLevel(locationLevel) || currentUberBossId !== null)
                    });
                }

                const nextLvl = locationLevel + 1;

                // Окно разблокировки навыков ПОСЛЕ прохождения 5-го уровня
                if (locationLevel === 5 && skillsUnlockOvl && !player.shownSkillsInfo) {
                    skillsUnlockOvl.classList.add('visible');
                    player.shownSkillsInfo = true;
                    // Автоматически открываем 2 вкладку (Навыки)
                    if (window.UpgradeManager && window.UpgradeManager.switchTab) {
                        window.UpgradeManager.switchTab(2);
                    }
                    if (window.Game && window.Game.save) window.Game.save();
                    if (typeof window.gtag_game_event === 'function') {
                        window.gtag_game_event('skills_unlocked', { level: 5 });
                    }
                }

                // Окно разблокировки престижа ПОСЛЕ прохождения заданного уровня
                const pUnlockLvl = (CONFIG.upgrades && CONFIG.upgrades.screen3 && CONFIG.upgrades.screen3.unlockLevel) ? CONFIG.upgrades.screen3.unlockLevel : 35;
                if (locationLevel === pUnlockLvl && !player.shownPrestigeInfo && prestigeUnlockOvl) {
                    prestigeUnlockOvl.classList.add('visible');
                    player.shownPrestigeInfo = true;
                    // Автоматически открываем 3 вкладку (Престиж)
                    if (window.UpgradeManager && window.UpgradeManager.switchTab) {
                        window.UpgradeManager.switchTab(3);
                    }
                    if (window.Game && window.Game.save) window.Game.save();
                    if (typeof window.gtag_game_event === 'function') {
                        window.gtag_game_event('prestige_unlocked', { level: pUnlockLvl });
                    }
                }

                // Окно оценки игры ПОСЛЕ прохождения 40 уровня
                if (locationLevel === 40 && !player.shownRatingInfo && ratingOvl) {
                    ratingOvl.classList.add('visible');
                    player.shownRatingInfo = true;
                    if (window.Game && window.Game.save) window.Game.save();
                }

                // Проверка разблокировки турелей
                if (window.TurretManager && window.TurretManager.checkUnlock) {
                    window.TurretManager.checkUnlock();
                }

                // Обновляем UI перед выходом
                updateSkillButtons();

                // Автоматический переход: Реклама каждые 10 уровней
                if (typeof window.CG !== 'undefined' && locationLevel % 10 === 0) {
                    gameState = 'paused'; // Сразу ставим на паузу до начала рекламы
                    (async () => {
                        try {
                            console.log("[CrazyGames] Ad transition started...");
                            // Запускаем гонку Promise.race (Реклама против Тайм-аута 2.5 секунды)
                            await Promise.race([
                                window.CG.ad.requestAd('midgame'),
                                new Promise((_, reject) => setTimeout(() => reject(new Error("Ad Timeout Fallback")), 2500))
                            ]);
                            initLevel(nextLvl, true);
                        } catch (error) {
                            console.error("[CrazyGames] Ad fallback/rejected:", error);
                            // Если произошла любая ошибка или реклама зависла из-за закэшированного старого кода
                            // принудительно восстанавливаем статус игры и идем на следующий уровень
                            initLevel(nextLvl, true);
                        }
                    })();
                } else {
                    initLevel(nextLvl, true);
                }
                return;
            }
            // Телепортируемся к ближайшему врагу с небольшим отступом
            player.targetEnemy = next;
            player.prevX = player.drawX;
            player.prevY = player.drawY;

            // Вычисляем угол, чтобы стоять ПЕРЕД врагом
            const angle = Math.atan2(player.drawY - next.y, player.drawX - next.x);
            // Коэффициент масштабирования арены (400 — эталонный размер)
            const arenaScaleFactor = arenaSize / 400;
            // Динамический отступ: масштабируется вместе с аренной для корректного
            // отображения на разных размерах окна браузера
            const offset = (next.size + 15) * arenaScaleFactor;
            player.x = next.x + Math.cos(angle) * offset;
            player.y = next.y + Math.sin(angle) * offset;

            player.teleportProgress = 0;
            attackTimer = 0;
            // Сбрасываем анимацию рывка при телепортации, чтобы не "доигрывать" старый удар на новом месте
            player.attackAnim = 0;
            player.dashX = 0;
            player.dashY = 0;
        }

        // Анимация телепортации
        if (player.teleportProgress < 1) {
            player.teleportProgress += dt / (VISUALS.animation.teleportDurationMs / 1000);
            if (player.teleportProgress >= 1) player.teleportProgress = 1;
            const t = easeOutCubic(player.teleportProgress);
            player.drawX = lerp(player.prevX, player.x, t);
            player.drawY = lerp(player.prevY, player.y, t);
            // Во время телепорта обновляем только UI кнопок и выходим
            updateSkillButtons();
            if (uiUpdateNeeded) updateUI();
            return;
        }

        // ── Авто-навыки (только когда игрок у цели, НЕ в телепортации) ──
        // Это предотвращает сброс attackTimer от молнии и бесконечную телепортацию
        if (cbAutoSkill && cbAutoSkill.checked && player.skills && player.targetEnemy && player.targetEnemy.alive) {
            if (player.skills.lightning > 0 && skillCooldowns.lightning <= 0 && castLightning()) {
                skillCooldowns.lightning = getSkillCooldown('lightning');
            }
            if (player.skills.haste > 0 && skillCooldowns.haste <= 0) {
                skillActiveTimes.haste = CONFIG.skills.haste.duration;
                skillCooldowns.haste = getSkillCooldown('haste');
                uiUpdateNeeded = true;
            }
            if (player.skills.power > 0 && skillCooldowns.power <= 0) {
                skillActiveTimes.power = CONFIG.skills.power.duration;
                skillCooldowns.power = getSkillCooldown('power');
                uiUpdateNeeded = true;
            }
            if (player.skills.grenade > 0 && skillCooldowns.grenade <= 0 && castGrenade()) {
                // КД уже установлен внутри castGrenade
            }
        }

        // Обновляем UI кнопок навыков и характеристик раз в кадр
        updateSkillButtons();
        if (uiUpdateNeeded) updateUI();

        // ── Анимации ──
        // 1. Анимация рывка игрока
        if (player.attackAnim > 0) {
            player.attackAnim -= dt / 0.15; // длительность 0.15 сек
            
            // Если анимация дошла до середины или завершилась (при низком FPS) - наносим урон
            if (player.pendingHit && player.attackAnim <= 0.5) {
                processHitData(player.pendingHit);
                player.pendingHit = null; // Удар обработан
            }

            if (player.attackAnim <= 0) {
                player.attackAnim = 0;
                player.dashX = 0;
                player.dashY = 0;
            } else {
                const surge = Math.sin((1 - player.attackAnim) * Math.PI); // smooth dash curve
                player.dashX = player.dashTargetX * surge;
                player.dashY = player.dashTargetY * surge;
            }
        }

        // 2. Enemy knockback animation
        for (const e of enemies) {
            if (e.kbTimer > 0) {
                e.kbTimer -= dt;
                if (e.kbTimer <= 0) {
                    e.kbTimer = 0;
                    e.kbX = 0; e.kbY = 0;
                } else {
                    const factor = e.kbTimer / 0.1;
                    e.kbX *= factor;
                    e.kbY *= factor;
                }
            }
        }

        // ── Attack ──
        attackTimer += dt;

        // Boss timer update
        if (bossTimer > 0 && gameState === 'playing') {
            bossTimer -= dt;
            bossTimerEl.textContent = Math.max(0, bossTimer).toFixed(1);
            if (bossTimer <= 0) {
                bossTimer = 0;
                gameState = 'defeat';

                if (currentUberBossId !== null) {
                    const bCfg = window.UBER_BOSSES_CONFIG.bosses[currentUberBossId];
                    const uberDefeatOvl = document.getElementById('uber-defeat-overlay');
                    if (uberDefeatOvl) {
                        if (defeatOvl) defeatOvl.classList.remove('visible');
                        uberDefeatOvl.style.display = 'flex';
                        uberDefeatOvl.classList.add('visible');
                        const iconEl = document.getElementById('uber-defeat-boss-icon');
                        if (iconEl) iconEl.textContent = bCfg.icon || "👾";
                        document.getElementById('uber-defeat-boss-name').textContent = bCfg.name;
                        const reasonEl = document.getElementById('uber-defeat-reason');
                        if (reasonEl) reasonEl.textContent = "TIME EXPIRED!";
                    }
                } else {
                    const isBossLvl = window.Scaling.isBossLevel(locationLevel);
                    if (btnRestartDefeat) {
                        btnRestartDefeat.style.display = isBossLvl ? 'none' : 'inline-block';
                    }
                    defeatOvl.classList.add('visible');
                }

                // Трекинг поражения на уровне
                if (typeof window.gtag_game_event === 'function') {
                    const isBoss = (window.Scaling.isBossLevel(locationLevel) || currentUberBossId !== null);
                    let bossHpPercent = 0;
                    if (isBoss && enemies.length > 0) {
                        const boss = enemies[0];
                        bossHpPercent = Math.round((boss.hp / boss.maxHp) * 100);
                    }

                    window.gtag_game_event('level_defeat', {
                        level: locationLevel,
                        is_boss: isBoss,
                        boss_hp_left_percent: bossHpPercent,
                        enemies_killed: enemies.filter(e => !e.alive).length
                    });
                }
                return;
            }
        }

        const stats = getCurrentStats();
        const safeAspd = Math.max(0.1, stats.attackSpeed); // Защита от NaN/Infinity при огромных статах
        const interval = 1.0 / safeAspd;
        
        // Позволяем отрабатывать несколько атак в кадр при сверх-скоростях, лимит = 10 для производительности
        let attacksProcessed = 0;
        while (attackTimer >= interval && attacksProcessed < 10) {
            attackTimer -= interval;
            attacksProcessed++;
            const target = player.targetEnemy;
            if (target && target.alive) {
                // Critical hit calculation
                const isCrit = Math.random() < stats.critChance;
                const finalDmg = isCrit ? stats.damage * stats.critDamage : stats.damage;
                const roundedDmg = Math.round(finalDmg);

                // Start player dash animation
                const ang = Math.atan2(target.y - player.drawY, target.x - player.drawX);
                player.attackAnim = 1.0;
                // Рывок атаки масштабируется с размером арены
                const dashScale = arenaSize / 400;
                player.dashTargetX = Math.cos(ang) * 12.5 * dashScale;
                player.dashTargetY = Math.sin(ang) * 12.5 * dashScale;

                const hitData = {
                    target: target,
                    damage: roundedDmg,
                    isCrit: isCrit,
                    angle: ang,
                    stats: stats // save stats at the moment of hit
                };

                // Если старая атака еще висит (из-за высокой скорости), применяем её ПЕРЕД новой мгновенно
                if (player.pendingHit) {
                    processHitData(player.pendingHit);
                    player.pendingHit = null;
                }

                if (interval < 0.075) {
                    // При очень высокой скорости (ASP > ~13.3) атакуем сразу, не ожидая завершения половины анимации
                    processHitData(hitData);
                } else {
                    // При нормальной скорости сохраняем удар для нанесения "на пике" анимации рывка
                    player.pendingHit = hitData;
                }
            } else {
                // Цели больше нет
                attackTimer = 0;
                break;
            }
        }
        
        // Предотвращение бесконечного накопления таймера за кадр при абсурдно высоких скоростях атаки
        if (attackTimer > interval * 10) {
            attackTimer = interval * 10;
        }
    }

    const pendingDamageNumbers = [];

    function spawnDamageNumber(x, y, amount, isCrit = false, customColor = null, instant = false) {
        // Проверяем скорость атаки. Если <= 3.5 ударов в секунду, то выводим урон без задержки
        if (!instant) {
            const stats = getCurrentStats();
            if (stats && stats.attackSpeed <= 3.5) {
                instant = true;
            }
        }

        // Мгновенный вылет (для медленных атак, скиллов, бомб, турелей) — без задержки
        if (instant) {
            // Ограничение на количество одновременных вылетов урона (для оптимизации на мобильных)
            const maxDamageNumbers = isMobile ? 15 : 25;
            if (damageNumbers.length > maxDamageNumbers) {
                damageNumbers.splice(0, damageNumbers.length - maxDamageNumbers);
            }

            let formattedAmount = amount;
            if (formattedAmount >= 1e12) formattedAmount = (formattedAmount / 1e12).toFixed(1).replace(/\.0$/, '') + 'т';
            else if (formattedAmount >= 1e9) formattedAmount = (formattedAmount / 1e9).toFixed(1).replace(/\.0$/, '') + 'б';
            else if (formattedAmount >= 1e6) formattedAmount = (formattedAmount / 1e6).toFixed(1).replace(/\.0$/, '') + 'м';
            else if (formattedAmount >= 1000) formattedAmount = (formattedAmount / 1000).toFixed(1).replace(/\.0$/, '') + 'к';
            else formattedAmount = Math.floor(formattedAmount).toString();

            const jitterX = (Math.random() - 0.5) * 24;
            const jitterY = (Math.random() - 0.5) * 12;

            damageNumbers.push({
                x: x + jitterX,
                y: y + jitterY,
                text: `-${formattedAmount}`,
                life: VISUALS.animation.damageNumberLife || 0.7,
                maxLife: VISUALS.animation.damageNumberLife || 0.7,
                color: customColor || (isCrit ? '#FF073A' : '#FFFFFF'),
                isCrit: isCrit
            });
            return;
        }

        // Накопление урона персонажа за 300мс
        let existing = null;
        for (let i = 0; i < pendingDamageNumbers.length; i++) {
            const p = pendingDamageNumbers[i];
            const dx = p.x - x;
            const dy = p.y - y;
            // Ищем в радиусе 40 пикселей
            if ((dx * dx + dy * dy) < 1600) {
                existing = p;
                break;
            }
        }

        if (existing) {
            existing.amount += amount;
            if (isCrit) existing.isCrit = true; // Если хотя бы один урон - крит, общая цифра становится критом
            if (customColor && isCrit) existing.color = customColor; // Приоритет цвету крита/скилла
            return;
        }

        pendingDamageNumbers.push({
            x: x,
            y: y,
            amount: amount,
            isCrit: isCrit,
            color: customColor,
            timer: 0.3 // Задержка в 300мс перед вылетом объединенной цифры
        });
    }

    function updateDamageNumbers(dt) {
        // Обработка ожидающего урона (вылет просуммированных цифр)
        for (let i = pendingDamageNumbers.length - 1; i >= 0; i--) {
            const p = pendingDamageNumbers[i];
            p.timer -= dt;
            if (p.timer <= 0) {
                let formattedAmount = p.amount;
                // Форматирование чисел: т - триллионы, б - миллиарды, м - миллионы, к - тысячи
                if (formattedAmount >= 1e12) formattedAmount = (formattedAmount / 1e12).toFixed(1).replace(/\.0$/, '') + 'т';
                else if (formattedAmount >= 1e9) formattedAmount = (formattedAmount / 1e9).toFixed(1).replace(/\.0$/, '') + 'б';
                else if (formattedAmount >= 1e6) formattedAmount = (formattedAmount / 1e6).toFixed(1).replace(/\.0$/, '') + 'м';
                else if (formattedAmount >= 1000) formattedAmount = (formattedAmount / 1000).toFixed(1).replace(/\.0$/, '') + 'к';
                else formattedAmount = Math.floor(formattedAmount).toString();

                const jitterX = (Math.random() - 0.5) * 24;
                const jitterY = (Math.random() - 0.5) * 12;

                damageNumbers.push({
                    x: p.x + jitterX,
                    y: p.y + jitterY,
                    text: p.isCrit ? `-${formattedAmount}` : `-${formattedAmount}`,
                    life: VISUALS.animation.damageNumberLife || 0.8,
                    maxLife: VISUALS.animation.damageNumberLife || 0.8,
                    color: p.color || (p.isCrit ? '#FF073A' : '#FFFFFF'),
                    isCrit: p.isCrit
                });

                pendingDamageNumbers.splice(i, 1);
            }
        }

        for (let i = damageNumbers.length - 1; i >= 0; i--) {
            const d = damageNumbers[i];
            d.life -= dt;
            // Скорость подъёма адаптируется к размеру арены (окна)
            const scale = arenaSize / 400;
            d.y -= VISUALS.animation.damageNumberRiseSpeed * scale * dt;
            if (d.life <= 0) damageNumbers.splice(i, 1);
        }
    }

    // ── Particles ─────────────────────────────────────────────
    const MAX_PARTICLES = 400; // Максимум частиц — предотвращает зависание при боссе

    function spawnHitParticles(x, y, color) {
        // Не спавним частицы удара если массив уже переполнен
        if (particles.length >= MAX_PARTICLES) return;
        for (let i = 0; i < 4; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 120,
                vy: (Math.random() - 0.5) * 120,
                life: 0.3,
                maxLife: 0.3,
                size: 2 + Math.random() * 2,
                color,
            });
        }
    }

    // Death particles: circles scattering based on enemy size
    function spawnDeathParticles(x, y, color, enemySize, enemyShape) {
        // Ограничиваем максимальное количество частиц смерти
        const baseSize = enemySize || 20;
        const baseCount = Math.min(60, Math.max(15, baseSize * 1.0)); // Снижен с 100 до 60
        let count = Math.round(baseCount);

        // For red enemies, reduce particle count by 30%
        if (color === '#FF073A') {
            count = Math.round(count * 0.7);
        }

        for (let i = 0; i < count; i++) {
            // Random angle for each particle
            const angle = Math.random() * Math.PI * 2;
            // Speed now depends more on size: small enemies - compact explosion, large - wide spread
            const size = (enemySize || 20);
            const scale = arenaSize / 400; // Базовая арена 400
            const speed = (10 + size * 2.5 + Math.random() * size * 3.5) * scale;
            const r = 2 + Math.random() * 2.5;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.825 + Math.random() * 0.45,
                maxLife: 1.275,
                size: r,
                color,
                shape: enemyShape || 'circle',
                isHollow: true, // Flag for drawing outline
            });
        }
    }

    function spawnLevelUpParticles() {
        for (let i = 0; i < 24; i++) {
            const angle = (Math.PI * 2 / 24) * i;
            const scale = arenaSize / 400;
            const speed = (100 + Math.random() * 80) * scale;
            particles.push({
                x: player.drawX,
                y: player.drawY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8,
                maxLife: 0.8,
                size: 3 + Math.random() * 3,
                color: CONFIG.player.color,
            });
        }
    }

    function updateParticles(dt) {
        // Ограничение общего количества частиц для производительности
        const maxParticles = isMobile ? 180 : 350;
        if (particles.length > maxParticles) {
            particles.splice(0, particles.length - maxParticles);
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            // Friction: reduced so particles slow down slower and travel 70% further
            p.vx *= 0.953;
            p.vy *= 0.953;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    // ── Auxiliary Drawing Functions ───────────────────
    function lerp(a, b, t) { return a + (b - a) * t; }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function drawStar(cx, cy, spikes, outerR, innerR, color, glow) {
        ctx.save();
        ctx.shadowColor = glow;
        ctx.shadowBlur = CONFIG.player.glowBlur;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5; // Thick outline of main color
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (Math.PI * 2 / (spikes * 2)) * i - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        // First pass: main color
        ctx.strokeStyle = color;
        ctx.stroke();

        // Second pass: white "core" for brightness (neon)
        ctx.shadowBlur = 0; // Remove glow for sharper white center
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.restore();
    }

    function drawShape(e) {
        if (!e.alive && e.deathFade <= 0) return;
        ctx.save();

        const alpha = e.alive ? 1 : e.deathFade;
        const flashColor = e.hitFlash > 0 ? '#FFFFFF' : null;

        let color = e.color;
        let glow = e.glowColor;

        if (e.isUber && e.uberColors && e.uberColors.length > 1) {
            const time = performance.now() / 1000;
            const speed = 1.5;
            const total = e.uberColors.length;
            const idx = Math.floor(time * speed) % total;
            color = e.uberColors[idx];
            glow = e.uberColors[idx];
        }

        if (flashColor) { color = flashColor; glow = flashColor; }

        ctx.globalAlpha = alpha;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 14;
        // Remove direct strokeStyle assignment here, as we draw in two stages below

        const scale = arenaSize / 400; // Базовый размер 400
        const { x, y, shape } = e;
        const size = e.size * scale;
        const dx = x + (e.kbX || 0);
        const dy = y + (e.kbY || 0);

        ctx.beginPath();
        switch (shape) {
            case 'circle':
                ctx.arc(dx, dy, size, 0, Math.PI * 2);
                break;
            case 'triangle':
                polygon(dx, dy, size, 3, -Math.PI / 2);
                break;
            case 'pentagon':
                polygon(dx, dy, size, 5, -Math.PI / 2);
                break;
            case 'hexagon':
                polygon(dx, dy, size, 6, 0);
                break;
            case 'diamond':
                polygon(dx, dy, size, 4, -Math.PI / 2);
                break;
            default:
                ctx.arc(dx, dy, size, 0, Math.PI * 2);
        }
        ctx.closePath();

        // Gradient fill for Uber-bosses (BRIGHT NEON)
        if (e.isUber && e.uberColors && e.uberColors.length >= 2) {
            const grad = ctx.createLinearGradient(dx - size, dy - size, dx + size, dy + size);
            e.uberColors.forEach((c, idx) => {
                grad.addColorStop(idx / (e.uberColors.length - 1), c);
            });
            ctx.save();
            ctx.globalCompositeOperation = 'lighter'; // Creates a glow effect when overlaid
            ctx.shadowBlur = 15 * scale; // Slight glow for the fill itself
            ctx.shadowColor = e.uberColors[0];
            ctx.globalAlpha = 0.75 * alpha; // Increase fill density
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();
            ctx.globalAlpha = alpha;
        }

        // Prepare color for outline (apply flashColor here)
        const finalColor = flashColor ? flashColor : color;
        const finalGlow = flashColor ? flashColor : glow;

        // First pass: thick main outline
        ctx.strokeStyle = finalColor;
        ctx.shadowColor = finalGlow;
        ctx.lineWidth = (e.isUber ? 5 : 3.5) * scale;
        ctx.shadowBlur = (e.isUber ? 30 : 14) * scale;
        ctx.stroke();

        // Second pass: neon accent inside
        ctx.shadowBlur = (e.isUber ? 15 : 0) * scale;
        ctx.strokeStyle = e.isUber ? finalColor : '#ffffff';
        ctx.lineWidth = (e.isUber ? 2.5 : 1.4) * scale;
        ctx.stroke();

        // HP bar above enemy
        if (e.alive) {
            const barW = size * 2.2;
            const barH = 4 * scale;
            const barX = dx - barW / 2;
            const barY = dy - size - (12 * scale);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.globalAlpha = 0.9;
            const hpPct = Math.max(e.hp / e.maxHP, 0);
            ctx.fillStyle = hpPct > 0.4 ? '#00FF6A' : '#FF073A';
            ctx.fillRect(barX, barY, barW * hpPct, barH);

            // Text above enemy
            if (e.isBoss) {
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${16 * scale}px Orbitron`;
                ctx.textAlign = 'center';
                const label = e.isUber ? 'UBER' : 'BOSS';
                ctx.fillText(label, x, barY - (5 * scale));
            }
        }

        ctx.restore();
    }

    function polygon(cx, cy, r, sides, startAngle) {
        for (let i = 0; i < sides; i++) {
            const angle = startAngle + (Math.PI * 2 / sides) * i;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
    }

    // ── Draw Arena (diamond shape) ────────────────────────
    function drawArena() {
        const s = arenaSize;
        const cx = s / 2, cy = s / 2;
        const half = s * 0.48;
        const scale = arenaSize / 400;

        ctx.save();
        ctx.fillStyle = VISUALS.arena.bgColor;
        ctx.fillRect(0, 0, s, s);

        // Diamond floor
        ctx.beginPath();
        ctx.moveTo(cx, cy - half);
        ctx.lineTo(cx + half, cy);
        ctx.lineTo(cx, cy + half);
        ctx.lineTo(cx - half, cy);
        ctx.closePath();

        ctx.fillStyle = VISUALS.arena.floorColor;
        ctx.fill();

        ctx.shadowColor = VISUALS.arena.floorGlow;
        ctx.shadowBlur = VISUALS.arena.floorGlowBlur * scale;
        ctx.strokeStyle = VISUALS.arena.floorBorderColor;
        ctx.lineWidth = VISUALS.arena.floorBorderWidth * scale;
        ctx.stroke();
        ctx.restore();

        // Grid lines inside diamond for flair
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = VISUALS.arena.floorBorderColor;
        ctx.lineWidth = 0.5 * scale;
        for (let i = -half; i <= half; i += 30 * scale) {
            ctx.beginPath();
            ctx.moveTo(cx + i, cy - half + Math.abs(i));
            ctx.lineTo(cx + i, cy + half - Math.abs(i));
            ctx.stroke();
        }
        ctx.restore();
    }

    // ── Draw teleport trail ────────────────────────────────
    function drawTeleportTrail() {
        if (player.teleportProgress >= 1) return;
        ctx.save();
        ctx.globalAlpha = 0.3 * (1 - player.teleportProgress);
        ctx.strokeStyle = CONFIG.player.color;
        ctx.shadowColor = CONFIG.player.glowColor;
        const scale = arenaSize / 400;
        ctx.shadowBlur = 10 * scale;
        ctx.lineWidth = 2 * scale;
        ctx.setLineDash([4 * scale, 4 * scale]);
        ctx.beginPath();
        ctx.moveTo(player.prevX, player.prevY);
        ctx.lineTo(player.drawX, player.drawY);
        ctx.stroke();
        ctx.restore();
    }

    // ── Draw particles ────────────────────────────────────
    function drawParticles() {
        const scale = arenaSize / 400;
        // На мобильных отключаем или минимизируем shadowBlur для частиц, если их много
        const skipShadows = isMobile && (particles.length > 50);
        
        for (const p of particles) {
            ctx.save();
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;

            if (p.isHollow) {
                // Draw enemy shape outline particle
                if (!skipShadows) {
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 8 * scale;
                }
                
                ctx.beginPath();
                const s = p.size * scale;
                switch (p.shape) {
                    case 'triangle': polygon(p.x, p.y, s, 3, -Math.PI / 2); break;
                    case 'pentagon': polygon(p.x, p.y, s, 5, -Math.PI / 2); break;
                    case 'hexagon': polygon(p.x, p.y, s, 6, 0); break;
                    case 'diamond': polygon(p.x, p.y, s, 4, -Math.PI / 2); break;
                    default: ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
                }
                ctx.closePath();

                // Main color (aura)
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2.5 * scale;
                ctx.stroke();

                // White core (strong glow) - на мобильных пропускаем второй проход для скорости
                if (!skipShadows) {
                    ctx.shadowColor = '#ffffff';
                    ctx.shadowBlur = 1 * scale;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.0 * scale;
                    ctx.stroke();
                }
            } else {
                // Regular particles
                const currentSize = p.size * alpha * scale;
                
                if (!skipShadows) {
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 10 * scale;
                }
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                // Bright white center with glow - только на ПК или если мало частиц
                if (!skipShadows) {
                    ctx.shadowColor = '#ffffff';
                    ctx.shadowBlur = 12 * scale;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, currentSize * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }
    }

    // ── Draw damage numbers ────────────────────────────────
    function drawDamageNumbers() {
        // Пропускаем тени для текста, если чисел слишком много (особенно на мобильных)
        const skipShadows = isMobile && (damageNumbers.length > 5);
        
        for (const d of damageNumbers) {
            ctx.save();
            const alpha = d.life / d.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = d.color;

            const scale = arenaSize / 400;
            const fontSize = (d.isCrit ? 18 : 14) * scale;
            ctx.font = `bold ${fontSize}px Orbitron`;

            ctx.textAlign = 'center';
            if (!skipShadows) {
                ctx.shadowColor = d.color;
                // Свечение тоже затухает вместе с альфой для плавного исчезновения
                ctx.shadowBlur = (d.isCrit ? 12 : 6) * scale * alpha;
            }
            ctx.fillText(d.text, d.x, d.y);
            ctx.restore();
        }
    }

    // ── Draw attack animation (pulse ring) ─────────────────
    let attackPulse = 0;
    function drawAttackPulse() {
        if (player.teleportProgress < 1 || gameState !== 'playing') return;
        if (!player.targetEnemy || !player.targetEnemy.alive) return;

        attackPulse += 0.15;
        const scale = arenaSize / 400;
        const r = (6 + Math.sin(attackPulse * 3) * 4) * scale;

        ctx.save();
        ctx.strokeStyle = CONFIG.player.color;
        ctx.shadowColor = CONFIG.player.glowColor;
        ctx.shadowBlur = 10 * scale;
        ctx.lineWidth = 1.5 * scale;
        ctx.globalAlpha = 0.4 + Math.sin(attackPulse * 3) * 0.3;
        ctx.beginPath();
        ctx.arc(player.drawX, player.drawY, (player.size * scale) + r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /* ── Турель из PNG-спрайтов (временно отключено) ─────────────
    function drawTurret() {
        if (!turretBaseImg.complete || !turretBarrelImg.complete) return;

        const scale = arenaSize / 400;
        const cx = arenaSize / 2;
        const cy = arenaSize * 0.94;

        const baseSize = 60 * scale;
        const barrelSize = 50 * scale;

        let targetAngle = -Math.PI / 2;
        if (player.targetEnemy && player.targetEnemy.alive) {
            targetAngle = Math.atan2(
                player.targetEnemy.y - cy,
                player.targetEnemy.x - cx
            );
        }

        let diff = targetAngle - turretAngleSmooth;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        turretAngleSmooth += diff * 0.12;

        ctx.save();

        ctx.drawImage(
            turretBaseImg,
            cx - baseSize / 2,
            cy - baseSize / 2,
            baseSize, baseSize
        );

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(turretAngleSmooth);
        ctx.drawImage(
            turretBarrelImg,
            -barrelSize / 2,
            -barrelSize / 2,
            barrelSize, barrelSize
        );

        if (player.attackAnim > 0.5) {
            const flash = (player.attackAnim - 0.5) * 2;
            const tipX = barrelSize * 0.48;
            const flashSize = 14 * scale * flash;

            ctx.globalCompositeOperation = 'lighter';

            const grad = ctx.createRadialGradient(tipX, 0, 0, tipX, 0, flashSize);
            grad.addColorStop(0, `rgba(255, 255, 220, ${0.9 * flash})`);
            grad.addColorStop(0.3, `rgba(255, 200, 50, ${0.7 * flash})`);
            grad.addColorStop(0.6, `rgba(255, 100, 20, ${0.3 * flash})`);
            grad.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(tipX, 0, flashSize, 0, Math.PI * 2);
            ctx.fill();

            const grad2 = ctx.createRadialGradient(tipX, 0, 0, tipX, 0, flashSize * 1.8);
            grad2.addColorStop(0, `rgba(100, 220, 255, ${0.35 * flash})`);
            grad2.addColorStop(1, 'rgba(100, 220, 255, 0)');
            ctx.fillStyle = grad2;
            ctx.beginPath();
            ctx.arc(tipX, 0, flashSize * 1.8, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
        ctx.restore();
    }
    */

    // ── Main render ────────────────────────────────────────
    function render() {
        ctx.clearRect(0, 0, arenaSize, arenaSize);
        drawArena();
        // drawTurret(); // Турель внизу арены (временно отключено)

        // Турели (PNG-спрайты вокруг арены)
        if (window.TurretManager && window.TurretManager.render) {
            window.TurretManager.render(ctx, arenaSize);
        }

        drawTeleportTrail();

        // Enemies
        for (const e of enemies) {
            if (e.hitFlash > 0) e.hitFlash -= 0.1;
            if (!e.alive) {
                e.deathFade -= 0.05;
            }
            drawShape(e);
        }

        // Player
        const px = player.drawX + (player.dashX || 0);
        const py = player.drawY + (player.dashY || 0);

        const pScale = arenaSize / 400;
        drawStar(
            px, py,
            5, player.size * pScale, player.size * 0.45 * pScale,
            CONFIG.player.color, CONFIG.player.glowColor
        );

        // Aura effects from skills (removed at user's request)

        // Draw visual effects (e.g., lightning)
        for (const eff of visualEffects) {
            if (eff.type === 'lightning') {
                ctx.save();
                const lifePct = eff.life / eff.maxLife;
                // Быстрое затухание в конце
                const alpha = lifePct > 0.2 ? 1 : lifePct * 5;

                // Функция отрисовки ломаной линии по сохраненным сегментам
                const strokeBolt = (width, color, blur, gAlpha) => {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = width;
                    ctx.shadowColor = (blur > 0) ? color : 'transparent';
                    ctx.shadowBlur = blur;
                    ctx.globalAlpha = gAlpha * alpha;

                    ctx.beginPath();
                    ctx.moveTo(eff.sx, eff.sy);
                    if (eff.segments) {
                        eff.segments.forEach(p => ctx.lineTo(p.x, p.y));
                    }
                    ctx.stroke();
                };

                // 1. Супер-широкое свечение (Bloom)
                ctx.globalCompositeOperation = 'lighter';
                strokeBolt(10 * lifePct, eff.color, 40, 0.2);
                strokeBolt(6 * lifePct, eff.color, 20, 0.4);

                // 2. Яркое белое ядро
                ctx.globalCompositeOperation = 'source-over';
                strokeBolt(1.5 * lifePct, '#FFFFFF', 5, 1.0);

                // Отрисовка веток (филиалов) молнии
                if (eff.branches) {
                    eff.branches.forEach(branch => {
                        ctx.beginPath();
                        ctx.moveTo(branch.sx, branch.sy);
                        branch.segments.forEach(p => ctx.lineTo(p.x, p.y));
                        ctx.strokeStyle = lifePct > 0.5 ? eff.color : '#FFFFFF';
                        ctx.lineWidth = 0.8 * lifePct;
                        ctx.globalAlpha = 0.5 * lifePct;
                        ctx.stroke();
                    });
                }

                ctx.restore();
            } else if (eff.type === 'explosion') {
                const lifePct = eff.life / eff.maxLife;
                const progress = 1 - lifePct; // 0 -> 1
                const alpha = lifePct;

                ctx.save();
                ctx.globalCompositeOperation = 'lighter';

                // 1. Центральное ядро вспышки (сильный блум)
                ctx.beginPath();
                const rCore = eff.radius * (0.1 + progress * 0.9);
                ctx.arc(eff.x, eff.y, rCore * 0.6, 0, Math.PI * 2);
                
                // Оптимизация градиента: только если не совсем прозрачный
                if (alpha > 0.1) {
                    const gradient = ctx.createRadialGradient(eff.x, eff.y, 0, eff.x, eff.y, rCore * 0.6);
                    gradient.addColorStop(0, '#FFFFFF');
                    gradient.addColorStop(0.4, eff.color);
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                    
                    // На мобильных уменьшаем shadowBlur для основной вспышки
                    ctx.shadowBlur = (isMobile ? 20 : 40) * alpha;
                    ctx.shadowColor = eff.color;
                    ctx.globalAlpha = alpha;
                    ctx.fill();
                }

                // 2. Осколки (Shatter particles)
                if (eff.shards) {
                    // Сбрасываем тень для осколков — это главная причина тормозов!
                    ctx.shadowBlur = 0;
                    
                    eff.shards.forEach(sh => {
                        const dist = sh.speed * progress;
                        const sx = eff.x + Math.cos(sh.angle) * dist;
                        const sy = eff.y + Math.sin(sh.angle) * dist;

                        ctx.save();
                        ctx.translate(sx, sy);
                        ctx.rotate(sh.angle + progress * 5); // Вращение осколков
                        ctx.beginPath();
                        ctx.strokeStyle = lifePct > 0.4 ? '#FFFFFF' : eff.color;
                        ctx.lineWidth = 1.5 * alpha; // Уменьшена толщина на мобильных
                        
                        // Рисуем маленькую геометрическую фигуру (осколок)
                        const s = sh.size * alpha;
                        if (sh.shape === 0) { // Треугольник
                            ctx.moveTo(0, -s);
                            ctx.lineTo(s, s);
                            ctx.lineTo(-s, s);
                            ctx.closePath();
                        } else { // Ромб
                            ctx.moveTo(0, -s);
                            ctx.lineTo(s, 0);
                            ctx.lineTo(0, s);
                            ctx.lineTo(-s, 0);
                            ctx.closePath();
                        }
                        ctx.stroke();
                        ctx.restore();
                    });
                }

                // 3. Световые лучи (вспышка) - меньше лучей на мобильных
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1 * alpha;
                const rayCount = isMobile ? 8 : 12;
                for (let i = 0; i < rayCount; i++) {
                    const angle = (i / rayCount) * Math.PI * 2 + progress * 0.2;
                    const len = eff.radius * (0.3 + progress * 1.0);
                    ctx.beginPath();
                    ctx.moveTo(eff.x, eff.y);
                    ctx.lineTo(eff.x + Math.cos(angle) * len, eff.y + Math.sin(angle) * len);
                    ctx.globalAlpha = alpha * 0.35;
                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        drawParticles();
        drawDamageNumbers();
    }

    // ── Game loop ──────────────────────────────────────────
    function gameLoop(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        if (gameState === 'playing') {
            updateCombat(dt);
            updateDamageNumbers(dt);
            updateParticles(dt);

            // Обновление турелей (ракеты, взрывы, таймеры)
            if (window.TurretManager && window.TurretManager.update) {
                window.TurretManager.update(dt, enemies, arenaSize);
            }

            // Update effects
            for (let i = visualEffects.length - 1; i >= 0; i--) {
                const eff = visualEffects[i];
                eff.life -= dt;
                if (eff.life <= 0) visualEffects.splice(i, 1);
            }
        }

        render();

        requestAnimationFrame(gameLoop);
    }

    // ── Active Skills ─────────────────────────────────────
    // Variables for caching UI skill state to avoid updating DOM every frame (causes click issues)
    let lastSkillHTMLStatus = {
        lightning: { visible: false, cd: -1 },
        haste: { visible: false, cd: -1, active: -1 },
        power: { visible: false, cd: -1, active: -1 },
        grenade: { visible: false, cd: -1 },
        barVisible: false
    };

    function updateSkillButtons() {
        if (!player || !player.skills) return;
        const s = player.skills;

        // ── Lightning ──
        if (btnSkillLightning && contLightning) {
            const isVisible = s.lightning > 0;
            const cd = skillCooldowns.lightning;
            const status = lastSkillHTMLStatus.lightning;

            if (status.visible !== isVisible) {
                contLightning.style.display = isVisible ? 'flex' : 'none';
                status.visible = isVisible;
            }

            if (isVisible) {
                const cdText = cd > 0 ? cd.toFixed(1) : 0;
                if (status.cd !== cdText) {
                    btnSkillLightning.classList.toggle('cooldown', cd > 0);
                    btnSkillLightning.innerHTML = cd > 0 ? `⚡<div class="skill-cd-overlay">${cdText}</div>` : `⚡`;
                    status.cd = cdText;
                }
            }
        }

        // ── Haste ──
        if (btnSkillHaste && contHaste && fillHaste) {
            const isVisible = s.haste > 0;
            const cd = skillCooldowns.haste;
            const active = skillActiveTimes.haste;
            const status = lastSkillHTMLStatus.haste;

            if (status.visible !== isVisible) {
                contHaste.style.display = isVisible ? 'flex' : 'none';
                status.visible = isVisible;
            }

            if (isVisible) {
                const cdText = cd > 0 ? cd.toFixed(1) : 0;
                if (status.cd !== cdText) {
                    btnSkillHaste.classList.toggle('cooldown', cd > 0);
                    const iconImg = `<img src="image/attack%20speed.png" alt="Haste">`;
                    btnSkillHaste.innerHTML = cd > 0 ? `${iconImg}<div class="skill-cd-overlay">${cdText}</div>` : iconImg;
                    status.cd = cdText;
                }

                if (status.active !== active) {
                    const barContainer = contHaste.querySelector('.skill-progress-container');
                    if (active > 0) {
                        const maxDur = CONFIG.skills.haste.duration;
                        const pct = (active / maxDur) * 100;
                        fillHaste.style.width = `${pct}%`;
                        barContainer.classList.add('active');
                    } else {
                        fillHaste.style.width = '0%';
                        barContainer.classList.remove('active');
                    }
                    status.active = active;
                }
            }
        }

        // ── Power ──
        if (btnSkillPower && contPower && fillPower) {
            const isVisible = s.power > 0;
            const cd = skillCooldowns.power;
            const active = skillActiveTimes.power;
            const status = lastSkillHTMLStatus.power;

            if (status.visible !== isVisible) {
                contPower.style.display = isVisible ? 'flex' : 'none';
                status.visible = isVisible;
            }

            if (isVisible) {
                const cdText = cd > 0 ? cd.toFixed(1) : 0;
                if (status.cd !== cdText) {
                    btnSkillPower.classList.toggle('cooldown', cd > 0);
                    const iconImg = `<img src="image/attack.png" alt="Power">`;
                    btnSkillPower.innerHTML = cd > 0 ? `${iconImg}<div class="skill-cd-overlay">${cdText}</div>` : iconImg;
                    status.cd = cdText;
                }

                if (status.active !== active) {
                    const barContainer = contPower.querySelector('.skill-progress-container');
                    if (active > 0) {
                        const maxDur = CONFIG.skills.power.duration;
                        const pct = (active / maxDur) * 100;
                        fillPower.style.width = `${pct}%`;
                        barContainer.classList.add('active');
                    } else {
                        fillPower.style.width = '0%';
                        barContainer.classList.remove('active');
                    }
                    status.active = active;
                }
            }
        }

        // ── Grenade ──
        if (btnSkillGrenade && contGrenade) {
            const isVisible = s.grenade > 0;
            const cd = skillCooldowns.grenade;
            const status = lastSkillHTMLStatus.grenade;

            if (status.visible !== isVisible) {
                contGrenade.style.display = isVisible ? 'flex' : 'none';
                status.visible = isVisible;
            }

            if (isVisible) {
                const cdText = cd > 0 ? cd.toFixed(1) : 0;
                if (status.cd !== cdText) {
                    btnSkillGrenade.classList.toggle('cooldown', cd > 0);
                    btnSkillGrenade.innerHTML = cd > 0 ? `💣<div class="skill-cd-overlay">${cdText}</div>` : `💣`;
                    status.cd = cdText;
                }
            }
        }

        const barVisible = (s.lightning > 0 || s.haste > 0 || s.power > 0 || s.grenade > 0);
        if (lastSkillHTMLStatus.barVisible !== barVisible) {
            if (skillsBar) skillsBar.style.display = barVisible ? 'flex' : 'none';
            if (autoSkillContainer) autoSkillContainer.style.display = barVisible ? 'flex' : 'none';
            lastSkillHTMLStatus.barVisible = barVisible;
        }
    }

    function checkDeathForEssence(target) {
        // Essence drops only from location level 5 onwards
        if (locationLevel >= 5 && target.essenceDrop && target.essenceDrop > 0) {
            if (window.UpgradeManager && window.UpgradeManager.addEssence) {
                // Apply essence multiplier from upgrades and prestige
                const stats = getCurrentStats();
                const mult = stats.essenceMult || 1;
                const amount = Math.floor(target.essenceDrop * mult);
                window.UpgradeManager.addEssence(amount);
            }
        }
        // Дроп ⚙️ Деталей для турелей
        if (target.gearDrop && target.gearDrop > 0) {
            if (window.TurretManager && window.TurretManager.addGears) {
                window.TurretManager.addGears(target.gearDrop);
            }
        }
    }

    // Обработка смерти врага (общая логика для всех источников урона)
    function handleEnemyDeath(target) {
        if (!target || !target.alive) return;
        target.alive = false;
        target.deathFade = 1;

        // Начисление опыта (теперь сразу при убийстве)
        const xpGain = Math.floor(target.level * target.xpMultiplier);
        grantXP(xpGain);

        // Прогресс коробки с подарком
        addGiftBoxKill();

        // Визуальные эффекты смерти
        spawnDeathParticles(target.x, target.y, target.color, target.size, target.shape);

        // Проверка дропа эссенции и деталей
        checkDeathForEssence(target);
    }

    function castLightning() {
        if (!enemies || gameState !== 'playing') return false;
        const aliveEnemies = enemies.filter(e => e.alive);
        if (aliveEnemies.length === 0) return false;

        const target = aliveEnemies[randomInt(0, aliveEnemies.length - 1)];
        const dmgSkillVal = player.skills.lightning || 1;
        const stats = getCurrentStats();
        const dmg = Math.round(stats.damage * CONFIG.skills.lightning.damageMultiplier * dmgSkillVal);

        target.hp -= dmg;
        target.hitFlash = 1;

        spawnDamageNumber(target.x, target.y - target.size, dmg, true, VISUALS.skills.lightning.color, true);

        // Visual lightning effect
        const generateSegments = (sx, sy, tx, ty, count, spread) => {
            const segs = [];
            const dx = (tx - sx) / count;
            const dy = (ty - sy) / count;
            for (let j = 1; j <= count; j++) {
                if (j === count) {
                    segs.push({ x: tx, y: ty });
                } else {
                    segs.push({
                        x: sx + dx * j + (Math.random() - 0.5) * spread,
                        y: sy + dy * j + (Math.random() - 0.5) * spread
                    });
                }
            }
            return segs;
        };

        // Коэффициент масштабирования молнии: все размеры зависят от текущей арены
        const lightningScale = arenaSize / 400;

        const startY = Math.max(0, target.y - 180 * lightningScale); // высота молнии
        const mainSegments = generateSegments(target.x, startY, target.x, target.y, 10, 30 * lightningScale);
        const branches = [];
        // Создаем 3-4 случайных ответвления
        const branchCount = randomInt(3, 4);
        for (let b = 0; b < branchCount; b++) {
            const startIdx = randomInt(1, 4);
            const startPos = mainSegments[startIdx];
            if (!startPos) continue;
            const endX = startPos.x + (Math.random() - 0.5) * 80 * lightningScale;
            const endY = startPos.y + (Math.random() * 60 * lightningScale);
            branches.push({
                sx: startPos.x, sy: startPos.y,
                segments: generateSegments(startPos.x, startPos.y, endX, endY, 5, 20 * lightningScale)
            });
        }

        visualEffects.push({
            type: 'lightning',
            sx: target.x, sy: startY,
            tx: target.x, ty: target.y,
            segments: mainSegments,
            branches: branches,
            life: 0.6, maxLife: 0.6,
            color: (VISUALS.skills && VISUALS.skills.lightning.color) ? VISUALS.skills.lightning.color : '#00F0FF'
        });

        // Частицы молнии — размер и диапазон разброса масштабируются
        for (let i = 0; i < 20; i++) {
            particles.push({
                x: target.x + randomInt(-30 * lightningScale, 30 * lightningScale),
                y: target.y - randomInt(0, 150 * lightningScale),
                vx: randomInt(-50, 50),
                vy: Math.random() * 200,
                life: 0.3, maxLife: 0.3,
                size: 1.5, color: '#FFE400'
            });
        }



        if (target.hp <= 0) {
            handleEnemyDeath(target);
        }
        return true;
    }

    function castGrenade() {
        if (!enemies || gameState !== 'playing') return false;
        const aliveEnemies = enemies.filter(e => e.alive);
        if (aliveEnemies.length === 0) return false;

        // Throw at a random enemy
        const target = aliveEnemies[randomInt(0, aliveEnemies.length - 1)];
        const grenadeLvl = player.skills.grenade || 1;
        const stats = getCurrentStats();
        const cfg = CONFIG.skills.grenade;
        const dmg = Math.round(stats.damage * cfg.damageMultiplier * grenadeLvl);

        // Explosion - damage all in radius
        const explosionRadius = cfg.radius * (arenaSize / 400);
        aliveEnemies.forEach(e => {
            const d = dist(target, e);
            if (d <= explosionRadius) {
                e.hp -= dmg;
                e.hitFlash = 1;
                spawnDamageNumber(e.x, e.y - e.size, dmg, true, cfg.color, true);

                if (e.hp <= 0) {
                    handleEnemyDeath(e);
                }
            }
        });

        const shards = [];
        // Коэффициент масштабирования осколков: скорость и размер зависят от размера арены
        const shardScale = arenaSize / 400;
        const shardCount = isMobile ? 24 : 60; // Меньше осколков на мобильных
        for (let i = 0; i < shardCount; i++) {
            shards.push({
                angle: Math.random() * Math.PI * 2,
                speed: (60 + Math.random() * 120) * shardScale, // скорость осколков масштабируется
                size: (2.5 + Math.random() * 4) * shardScale,  // размер осколков масштабируется
                shape: randomInt(0, 1) // 0 - triangle, 1 - diamond
            });
        }

        // Visual explosion effect
        visualEffects.push({
            type: 'explosion',
            x: target.x, y: target.y,
            radius: explosionRadius,
            shards: shards,
            color: cfg.color,
            life: 0.7,
            maxLife: 0.7
        });

        skillCooldowns.grenade = getSkillCooldown('grenade');
        return true;
    }

    if (btnSkillLightning) btnSkillLightning.addEventListener('click', (e) => {
        SoundManager.playClick();
        if (player.skills && player.skills.lightning > 0 && skillCooldowns.lightning <= 0) {
            if (castLightning()) {
                skillCooldowns.lightning = getSkillCooldown('lightning');
                updateSkillButtons();
            }
        }
    });

    if (btnSkillHaste) btnSkillHaste.addEventListener('click', (e) => {
        SoundManager.playClick();
        if (player.skills && player.skills.haste > 0 && skillCooldowns.haste <= 0) {
            if (gameState !== 'playing') return;
            skillActiveTimes.haste = CONFIG.skills.haste.duration;
            skillCooldowns.haste = getSkillCooldown('haste');
            updateSkillButtons();
            updateUI(); // update UI immediately
        }
    });

    if (btnSkillPower) btnSkillPower.addEventListener('click', (e) => {
        SoundManager.playClick();
        if (player.skills && player.skills.power > 0 && skillCooldowns.power <= 0) {
            if (gameState !== 'playing') return;
            skillActiveTimes.power = CONFIG.skills.power.duration;
            skillCooldowns.power = getSkillCooldown('power');
            updateSkillButtons();
            updateUI(); // update UI immediately
        }
    });

    if (btnSkillGrenade) btnSkillGrenade.addEventListener('click', (e) => {
        SoundManager.playClick();
        if (player.skills && player.skills.grenade > 0 && skillCooldowns.grenade <= 0) {
            if (gameState !== 'playing') return;
            castGrenade();
            updateSkillButtons();
        }
    });

    if (giftBoxContainer) giftBoxContainer.addEventListener('click', () => {
        openGiftBox();
    });

    if (btnCloseSkillsUnlock) btnCloseSkillsUnlock.addEventListener('click', () => {
        SoundManager.playClick();
        if (skillsUnlockOvl) skillsUnlockOvl.classList.remove('visible');
    });

    // ── Rewarded Ad: Free Points ──
    const btnRewardPoints = document.getElementById('btn-reward-points');
    const rewardTooltip = document.getElementById('upgrade-tooltip');

    if (btnRewardPoints) {
        btnRewardPoints.addEventListener('mouseenter', (e) => {
            if (rewardTooltip) {
                rewardTooltip.innerHTML = `<b>Free Rewards</b><br><span style="color:#00FF6A">Watch an ad to get +3 Upgrade Points</span>`;
                rewardTooltip.style.display = 'block';
                rewardTooltip.style.left = (e.clientX + 10) + 'px';
                rewardTooltip.style.top = (e.clientY + 10) + 'px';
            }
        });
        btnRewardPoints.addEventListener('mousemove', (e) => {
            if (rewardTooltip) {
                rewardTooltip.style.left = (e.clientX + 10) + 'px';
                rewardTooltip.style.top = (e.clientY + 10) + 'px';
            }
        });
        btnRewardPoints.addEventListener('mouseleave', () => {
            if (rewardTooltip) rewardTooltip.style.display = 'none';
        });

        btnRewardPoints.addEventListener('click', async () => {
            if (window.SoundManager) window.SoundManager.playClick();

            const success = await window.CG.ad.requestAd('rewarded');

            if (success) {
                if (window.UpgradeManager && window.UpgradeManager.addPoint) {
                    for (let i = 0; i < 3; i++) {
                        window.UpgradeManager.addPoint();
                    }
                    if (typeof showDOMReward === 'function') {
                        showDOMReward("+3 Free Points", "#FFE400");
                    }
                }
                saveGame();
            }
        });
    }

    if (btnClosePrestigeUnlock) btnClosePrestigeUnlock.addEventListener('click', () => {
        SoundManager.playClick();
        if (prestigeUnlockOvl) prestigeUnlockOvl.classList.remove('visible');
    });

    // ── Button Handlers ──────────────────────────────────
    if (btnRepeat) btnRepeat.addEventListener('click', () => {
        SoundManager.playClick();
        initLevel(locationLevel, true);
    });

    if (btnNext) btnNext.addEventListener('click', () => {
        SoundManager.playClick();
        initLevel(locationLevel + 1, true);
    });

    if (btnRestartDefeat) btnRestartDefeat.addEventListener('click', () => {
        SoundManager.playClick();
        console.log("RESTART DEFEAT CLICKED");
        initLevel(locationLevel, true);
    });

    if (btnBackDefeat) btnBackDefeat.addEventListener('click', () => {
        SoundManager.playClick();
        console.log("BACK DEFEAT CLICKED");
        let prev = locationLevel - 1;
        if (window.Scaling.isBossLevel(locationLevel)) {
            prev = locationLevel - window.Scaling.getBossInterval(locationLevel) + 1;
        }
        initLevel(Math.max(1, prev), true);
    });

    if (btnPrevLevel) btnPrevLevel.addEventListener('click', () => {
        SoundManager.playClick();
        if (currentUberBossId !== null) {
            currentUberBossId = null;
            SoundManager.playMainMusic();
            initLevel(savedLocationBeforeUberBoss, true);
            if (window.UberBossMap) window.UberBossMap.show();
        } else {
            const prev = Math.max(1, locationLevel - 1);
            initLevel(prev, true);
        }
    });

    window.addEventListener('resize', () => {
        const oldSize = arenaSize;
        resize();
        const newSize = arenaSize;
        if (oldSize === newSize) return;

        if (gameState && player) {
            // Репозиционируем игрока и врагов пропорционально новой арене
            player.x = (player.x / oldSize) * newSize;
            player.y = (player.y / oldSize) * newSize;
            player.drawX = player.x;
            player.drawY = player.y;
            player.prevX = player.x;
            player.prevY = player.y;

            if (enemies) {
                enemies.forEach(e => {
                    e.x = (e.x / oldSize) * newSize;
                    e.y = (e.y / oldSize) * newSize;
                });
            }
        }
    });

    // ── Логика окна оценки игры ──────────────────────────────
    if (btnSubmitRating) {
        btnSubmitRating.addEventListener('click', () => {
            console.log(`[RATING] User clicked Continue`);

            // Трекинг события в аналитику
            if (typeof window.gtag_game_event === 'function') {
                window.gtag_game_event('game_rated_continue', {
                    level: locationLevel
                });
            }

            if (ratingOvl) ratingOvl.classList.remove('visible');
            saveGame();
        });
    }

    if (btnCloseRating) {
        btnCloseRating.addEventListener('click', () => {
            if (ratingOvl) ratingOvl.classList.remove('visible');
            saveGame();
        });
    }

    // Закрытие по клику на фон (вне модального окна)
    if (ratingOvl) {
        ratingOvl.addEventListener('click', (e) => {
            if (e.target === ratingOvl) {
                ratingOvl.classList.remove('visible');
                saveGame();
            }
        });
    }

    resize();

    // ── Принудительный пересчет после загрузки ─────────────
    // Гарантирует, что шрифты и картинки (gift-box) не сдвинут холст
    window.addEventListener('load', () => window.dispatchEvent(new Event('resize')));
    if (document.fonts) {
        document.fonts.ready.then(() => window.dispatchEvent(new Event('resize')));
    }

    // ── Система сохранений ─────────────────────────────────
    let isSaving = false;
    async function saveGame() {
        if (isResetting || isSaving) return; // Предотвращаем конфликты и параллельные запросы к SDK
        if (!player || isNaN(locationLevel) || locationLevel < 1) {
            console.warn("[SAVE] Попытка сохранения в некорректном состоянии", { locationLevel, player });
            return;
        }

        isSaving = true;
        try {

            const data = {
                locationLevel: Number(locationLevel),
                maxReachedLevel: Number(maxReachedLevel),
                player: {
                    level: player.level,
                    xp: player.xp,
                    // Сохраняем базовые характеристики
                    damage: player.damage,
                    attackSpeed: player.attackSpeed,
                    critChance: player.critChance,
                    critDamage: player.critDamage,
                    essenceMult: player.essenceMult,
                    xpToNext: player.xpToNext,
                    cooldownReduction: player.cooldownReduction,
                    areaDamageRadius: player.areaDamageRadius,
                    areaDamageMult: player.areaDamageMult,
                    shownSkillsInfo: player.shownSkillsInfo,
                    shownPrestigeInfo: player.shownPrestigeInfo,
                    shownRatingInfo: player.shownRatingInfo,
                    skills: player.skills,
                    giftBox: player.giftBox,
                    autoSkill: cbAutoSkill.checked
                },
                upgrades: window.UpgradeManager ? window.UpgradeManager.save() : null,
                prestige: window.PrestigeManager ? window.PrestigeManager.save() : null,
                turrets: window.TurretManager ? window.TurretManager.save() : null,
                timestamp: Date.now()
            };

            const json = JSON.stringify(data);

            // 1. Сохраняем локально (Fallback)
            localStorage.setItem('neon_rpg_save', json);

            // 2. Сохраняем в облако CrazyGames (если доступно)
            if (window.CG && window.CG.data && window.CG.data.setItem) {
                try {
                    await window.CG.data.setItem('neon_rpg_save', json);
                    console.log("[SAVE] Cloud Save Success");
                } catch (e) {
                    console.warn("[SAVE] Cloud Save Failed:", e);
                }
            }

            console.log(`[SAVE] Сохранено: Локация ${data.locationLevel}, Уровень персонажа ${player.level}`);
        } finally {
            isSaving = false; // Освобождаем флаг после завершения всех процессов
        }
    }

    async function loadGame() {
        try {
            let json = null;

            // 1. ПРИОРИТЕТ: Облако CrazyGames
            if (window.CG && window.CG.data && window.CG.data.getItem) {
                try {
                    json = await window.CG.data.getItem('neon_rpg_save');
                    if (json) {
                        console.log("[LOAD] ПРИОРИТЕТ: Загружено из облака CrazyGames SDK.");
                        // Синхронизируем локальный кэш при успешной облачной загрузке
                        localStorage.setItem('neon_rpg_save', json);
                    }
                } catch (e) {
                    console.warn("[LOAD] Ошибка загрузки из SDK, пробуем localStorage:", e);
                }
            }

            // 2. ФАЛЛБЭК: Локальная память (только если в облаке пусто или нет доступа к SDK)
            if (!json) {
                json = localStorage.getItem('neon_rpg_save');
                if (json) console.log("[LOAD] ФАЛЛБЭК: Загружено из localStorage.");
            }

            if (!json) {
                console.log("[LOAD] Сохранение не найдено (ни в облаке, ни локально).");
                return false;
            }
            const data = JSON.parse(json);

            // 1. Загружаем уровень локации
            if (data.locationLevel !== undefined) {
                locationLevel = parseInt(data.locationLevel) || 1;
            }
            if (data.maxReachedLevel !== undefined) {
                maxReachedLevel = parseInt(data.maxReachedLevel) || 1;
            }

            // 2. Создаем игрока и восстанавливаем его состояние
            const freshPlayer = createPlayer();
            if (data.player) {
                Object.assign(freshPlayer, data.player);
                if (data.player.autoSkill !== undefined) {
                    cbAutoSkill.checked = data.player.autoSkill;
                }
            }
            player = freshPlayer;

            // 3. Загружаем прокачку (внутри .load() теперь автоматически вызывается applyToPlayer)
            if (data.upgrades && window.UpgradeManager) {
                window.UpgradeManager.load(data.upgrades);
            }

            if (data.prestige && window.PrestigeManager) {
                window.PrestigeManager.load(data.prestige);
            }

            // 4. Загружаем данные турелей
            if (data.turrets && window.TurretManager) {
                window.TurretManager.load(data.turrets);
            }
            // Проверяем видимость вкладки турелей
            if (window.TurretManager && window.TurretManager.checkUnlock) {
                window.TurretManager.checkUnlock();
            }

            console.log(`[LOAD] Successfully loaded! Location: ${locationLevel}, Character: lvl.${player.level}`);
            return true;
        } catch (e) {
            console.error("[LOAD] Critical error during load:", e);
            return false;
        }
    }

    // Экспортируем API для системы прокачки и престижа
    window.Game = {
        getPlayer: () => player,
        getCurrentStats: getCurrentStats,
        getMaxReachedLevel: () => maxReachedLevel,
        getLocationLevel: () => locationLevel || 1,
        updateUI: updateUI,
        updateSkillUI: () => { if (typeof updateSkillButtons !== 'undefined') updateSkillButtons(); },
        drawCircleEffect: (x, y, r, color) => {
            visualEffects.push({ type: 'explosion', x, y, radius: r, color, life: 0.3, maxLife: 0.3 });
        },
        onEnemyKilled: handleEnemyDeath,
        // Для престижа: сброс до нужного уровня с сохранением прокачки
        initLevelExternal: (lvl) => initLevel(lvl, true),
        save: saveGame,
        load: loadGame,
        spawnDamageNumber: spawnDamageNumber,
        getEnemies: () => enemies,
        getArenaSize: () => arenaSize,
        getGameState: () => gameState,
        setGameState: (s) => gameState = s,
        reset: () => {
            console.log("[DEBUG] Полный сброс игры (Жесткий)...");
            isResetting = true; // Блокируем любые новые сохранения

            // Очищаем все возможные ключи
            localStorage.clear();
            sessionStorage.clear();

            // Жесткая перезагрузка без возможности кэширования старых скриптов
            location.replace(location.origin + location.pathname + '?reset=' + Date.now());
        }
    };

    // ── Запуск ──────────────────────────────────────────────
    window.addEventListener('DOMContentLoaded', async () => {
        if (window.CG && window.CG.game) window.CG.game.loadingStart();

        // Ждем загрузки данных (Облако или Локально)
        const loaded = await loadGame();

        if (!loaded) {
            initLevel(CONFIG.location.startLevel, false);
        } else {
            initLevel(locationLevel, true);
        }

        // Запускаем музыку
        SoundManager.playMusic();

        lastTime = performance.now();
        requestAnimationFrame(gameLoop);

        if (window.CG && window.CG.game) {
            window.CG.game.loadingStop();
            window.CG.game.gameplayStart();
        }

        // ── Авто-сохранение и надежность ───────────────────────
        // 1. Каждые 60 секунд (не нужно слишком часто, т.к. игра сохраняется на старте каждого уровня)
        setInterval(() => {
            saveGame();
        }, 60000);

        // 2. При закрытии вкладки
        window.addEventListener('beforeunload', () => {
            saveGame();
        });

        // 3. При сворачивании/переключении вкладки (Page Visibility API)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                saveGame();
            }
        });
    });

    // ── Обработчики отладки (Debug Handlers) ─────────────────
    const btnDbgNext = document.getElementById('btn-dbg-next-level');
    const btnDbgLvl35 = document.getElementById('btn-dbg-lvl-35');
    const btnDbgMaxSkills = document.getElementById('btn-dbg-max-skills');
    const btnDbgPoints = document.getElementById('btn-dbg-add-points');
    const btnDbgEssence = document.getElementById('btn-dbg-add-essence');
    const btnDbgEssenceBig = document.getElementById('btn-dbg-add-essence-big');
    const btnDbgFillBox = document.getElementById('btn-dbg-fill-box');
    if (btnDbgFillBox) btnDbgFillBox.addEventListener('click', () => {
        if (player && player.giftBox) {
            player.giftBox.kills = player.giftBox.requiredKills;
            updateGiftBoxUI();
        }
    });

    const btnDbgReset = document.getElementById('btn-dbg-reset');
    const btnDbgSave = document.getElementById('btn-dbg-save');

    if (btnDbgNext) btnDbgNext.addEventListener('click', () => {
        SoundManager.playClick();
        initLevel(locationLevel + 1, true);
    });

    const btnDbgPlus50 = document.getElementById('btn-dbg-plus-50');
    if (btnDbgPlus50) btnDbgPlus50.addEventListener('click', () => {
        SoundManager.playClick();
        initLevel(locationLevel + 50, true);
    });

    if (btnDbgLvl35) btnDbgLvl35.addEventListener('click', () => {
        SoundManager.playClick();
        initLevel(35, true);
    });

    if (btnDbgMaxSkills) btnDbgMaxSkills.addEventListener('click', () => {
        SoundManager.playClick();
        if (window.UpgradeManager && window.UpgradeManager.maxAllSkills) {
            window.UpgradeManager.maxAllSkills();
        }
    });

    if (btnDbgPoints) btnDbgPoints.addEventListener('click', () => {
        SoundManager.playClick();
        if (window.UpgradeManager && player) {
            for (let i = 0; i < 10; i++) {
                window.UpgradeManager.addPoint();
                player.level++;
                player.xpToNext = xpForLevel(player.level);
                SoundManager.playLevelUp();
            }
            updateUI();
            console.log(`[DEBUG] Добавлено 10 очков и 10 уровней. Текущий уровень: ${player.level}`);
        }
    });

    if (btnDbgEssence) btnDbgEssence.addEventListener('click', () => {
        SoundManager.playClick();
        if (window.UpgradeManager) {
            window.UpgradeManager.addEssence(100);
        }
    });

    if (btnDbgEssenceBig) btnDbgEssenceBig.addEventListener('click', () => {
        SoundManager.playClick();
        if (window.UpgradeManager) {
            window.UpgradeManager.addEssence(20000);
        }
    });

    if (btnDbgReset) btnDbgReset.addEventListener('click', () => {
        SoundManager.playClick();
        window.Game.reset();
    });

    if (btnDbgSave) btnDbgSave.addEventListener('click', () => {
        SoundManager.playClick();
        window.Game.save();
        alert('Game saved manually!');
    });

    // ── Системные обработчики Uber-боссов ─────────────────────
    // Отладка: добавление деталей (валюта турелей)
    const btnDbgGears = document.getElementById('btn-dbg-add-gears');
    if (btnDbgGears) btnDbgGears.addEventListener('click', () => {
        SoundManager.playClick();
        if (window.TurretManager) window.TurretManager.addGears(1000);
    });

    const btnDbgPrestige = document.getElementById('btn-dbg-add-prestige');
    if (btnDbgPrestige) btnDbgPrestige.addEventListener('click', () => {
        console.log("[DEBUG] Clicked +10k Prestige button");
        SoundManager.playClick();
        if (window.PrestigeManager && window.PrestigeManager.addPrestigePoints) {
            window.PrestigeManager.addPrestigePoints(10000);
        } else {
            console.error("[DEBUG] PrestigeManager.addPrestigePoints not found!");
        }
    });
    const btnUberBackToMapV = document.getElementById('btn-uber-back-to-map');
    const btnUberBackToMapD = document.getElementById('btn-uber-defeat-back-to-map');
    const btnUberRestart = document.getElementById('btn-uber-defeat-restart');

    const handleBackToMap = () => {
        currentUberBossId = null;
        SoundManager.playMainMusic();
        initLevel(savedLocationBeforeUberBoss, true);
        if (window.UberBossMap) window.UberBossMap.show();
    };

    if (btnUberBackToMapV) btnUberBackToMapV.addEventListener('click', handleBackToMap);
    if (btnUberBackToMapD) btnUberBackToMapD.addEventListener('click', handleBackToMap);

    if (btnUberRestart) {
        btnUberRestart.addEventListener('click', () => {
            if (currentUberBossId !== null) {
                SoundManager.playBossMusic(); // На всякий случай
                initLevel(1, true); // Перезапуск того же босса
            }
        });
    }

    // Экспорт функции запуска Uber-боя
    window.startUberBoss = function (bossId) {
        savedLocationBeforeUberBoss = locationLevel;
        currentUberBossId = bossId;
        SoundManager.playBossMusic();
        initLevel(1, true); // Перезапускаем уровень в режиме Uber
    };
})();
