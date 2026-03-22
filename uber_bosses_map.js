// ============================================================
//  UBER BOSS MAP SYSTEM
// ============================================================
(() => {
    'use strict';

    const BOSS_MAP_CONFIG = {
        nodes: [
            // [id, x(%), y(%), bossLevel, parents(ids)]
            { id: 0, x: 50, y: 88, level: 40, parents: [] }, // Корень (начинаем после 40 ур)
            
            { id: 1, x: 25, y: 75, level: 50, parents: [0] },
            { id: 2, x: 75, y: 75, level: 50, parents: [0] },

            { id: 3, x: 25, y: 60, level: 60, parents: [1] },
            { id: 4, x: 50, y: 62, level: 65, parents: [1, 2] },
            { id: 5, x: 75, y: 60, level: 60, parents: [2] },

            { id: 6, x: 10, y: 45, level: 75, parents: [3] },
            { id: 7, x: 50, y: 42, level: 80, parents: [4] },
            { id: 8, x: 90, y: 45, level: 75, parents: [5] },

            { id: 9, x: 30, y: 28, level: 90, parents: [6, 7] },
            { id: 10, x: 70, y: 28, level: 90, parents: [7, 8] },

            { id: 11, x: 15, y: 12, level: 110, parents: [9] },
            { id: 12, x: 50, y: 12, level: 125, parents: [9, 10] },
            { id: 13, x: 85, y: 12, level: 110, parents: [10] },
        ],
        rewards: {
            xpBase: 10000,
            essBase: 25
        }
    };

    let progress = {
        beatenIds: [] // Список ID побежденных боссов
    };

    // DOM Элементы
    const overlay = document.getElementById('boss-map-overlay');
    const nodesContainer = document.getElementById('boss-map-nodes');
    const svg = document.getElementById('boss-map-svg');
    const btnOpen = document.getElementById('btn-future-mechanic');
    const btnClose = document.getElementById('btn-close-boss-map');

    // Сохранение/Загрузка
    function saveProgress() {
        localStorage.setItem('uberBossProgress', JSON.stringify(progress));
    }
    function loadProgress() {
        const saved = localStorage.getItem('uberBossProgress');
        if (saved) progress = JSON.parse(saved);
    }

    // Инициализация
    function init() {
        console.log("UberBossMap: Initializing...");
        loadProgress();
        renderMap();

        if (btnOpen) {
            console.log("UberBossMap: Button found!");
            btnOpen.addEventListener('click', () => {
                console.log("UberBossMap: Clicked!");
                if (!btnOpen.classList.contains('locked')) {
                    renderMap(); // Обновляем перед показом
                    overlay.classList.add('visible');
                    console.log("UberBossMap: Map should be visible now.");
                } else {
                    console.log("UberBossMap: Start button is LOCKED.");
                }
            });
        } else {
            console.error("UberBossMap: Start button NOT FOUND!");
        }

        if (btnClose) {
            btnClose.addEventListener('click', () => {
                overlay.classList.remove('visible');
                // Скрываем другие оверлеи (победа/поражение), которые могли остаться
                document.querySelectorAll('.overlay').forEach(el => el.classList.remove('visible'));
            });
        }
    }

    function renderMap() {
        nodesContainer.innerHTML = '';
        svg.innerHTML = '';

        // Обновляем счетчик
        const progressEl = document.getElementById('boss-map-progress');
        if (progressEl) {
            progressEl.textContent = `${progress.beatenIds.length}/${BOSS_MAP_CONFIG.nodes.length}`;
        }

        // 1. Отрисовка линий (связей)
        BOSS_MAP_CONFIG.nodes.forEach(node => {
            node.parents.forEach(parentId => {
                const parent = BOSS_MAP_CONFIG.nodes.find(n => n.id === parentId);
                if (parent) {
                    createLine(parent, node);
                }
            });
        });

        // 2. Отрисовка узлов
        BOSS_MAP_CONFIG.nodes.forEach(node => {
            createNode(node);
        });
    }

    function createLine(start, end) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", `${start.x}%`);
        line.setAttribute("y1", `${start.y}%`);
        line.setAttribute("x2", `${end.x}%`);
        line.setAttribute("y2", `${end.y}%`);
        
        // Статус линии
        const startBeaten = progress.beatenIds.includes(start.id);
        const endAvailable = isNodeUnlocked(end);
        
        if (startBeaten && endAvailable) {
            line.classList.add('available');
        }
        
        svg.appendChild(line);
    }

    function createNode(node) {
        const div = document.createElement('div');
        div.className = 'map-node upg-node'; 
        div.style.left = `${node.x}%`;
        div.style.top = `${node.y}%`;

        const unlocked = isNodeUnlocked(node);
        const beaten = progress.beatenIds.includes(node.id);

        if (beaten) {
            div.classList.add('maxed');
        } else if (unlocked) {
            div.classList.add('available');
        } else {
            div.classList.add('locked');
        }

        div.innerHTML = `
            <span class="upg-node-lvl">👾</span>
        `;

        // Клик по боссу
        div.addEventListener('click', () => {
            if (unlocked) {
                startBossFight(node);
            }
        });

        nodesContainer.appendChild(div);
    }

    function isNodeUnlocked(node) {
        if (node.parents.length === 0) return true;
        // Достаточно победить ОДНОГО из родителей
        return node.parents.some(id => progress.beatenIds.includes(id));
    }

    function startBossFight(node) {
        // Закрываем карту
        overlay.classList.remove('visible');
        
        // Глобальная функция запуска Uber-боя в game.js
        if (window.startUberBoss) {
            window.startUberBoss(node.id);
        }
    }

    // Вызывается из game.js при победе над боссом
    function onBossDefeated(id) {
        if (!progress.beatenIds.includes(id)) {
            progress.beatenIds.push(id);
            saveProgress();
            renderMap();
        }
    }

    // Запуск при загрузке
    document.addEventListener('DOMContentLoaded', init);

    // Экспорт
    window.UberBossMap = { 
        init, 
        renderMap, 
        progress,
        onBossDefeated,
        show: () => {
            renderMap();
            overlay.classList.add('visible');
        }
    };
})();
