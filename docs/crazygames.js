// ============================================================
//  CrazyGames SDK Integration
// ============================================================
(async () => {
    'use strict';

    window.CrazyGames = window.CrazyGames || {};
    let sdk = null;
    let isInitialized = false;
    let initPromise = null;
    const callQueue = [];

    // Обертка для удобного использования (создаем сразу)
    window.CG = {
        // События игры
        game: {
            loadingStart: () => {
                if (isInitialized && sdk && sdk.game) sdk.game.loadingStart();
                else callQueue.push(() => window.CG.game.loadingStart());
            },
            loadingStop: () => {
                if (isInitialized && sdk && sdk.game) sdk.game.loadingStop();
                else callQueue.push(() => window.CG.game.loadingStop());
            },
            gameplayStart: () => {
                if (isInitialized && sdk && sdk.game) sdk.game.gameplayStart();
                else callQueue.push(() => window.CG.game.gameplayStart());
            },
            gameplayStop: () => {
                if (isInitialized && sdk && sdk.game) sdk.game.gameplayStop();
                else callQueue.push(() => window.CG.game.gameplayStop());
            }
        },
        ad: {
            requestAd: async (type = 'midgame') => {
                if (!initPromise) return true; // Оффлайн режим
                await initPromise;

                if (!sdk || !sdk.ad) {
                    return true;
                }
                
                // Сохраняем предыдущее состояние
                let savedState = 'playing';
                if (window.Game && window.Game.getGameState) {
                    savedState = window.Game.getGameState();
                    window.Game.setGameState('paused');
                }

                // Приглушаем звук
                if (window.SoundManager && window.SoundManager.pauseMusic) {
                    window.SoundManager.pauseMusic();
                }

                // Уведомляем SDK о приостановке геймплея
                window.CG.game.gameplayStop();

                try {
                    console.log(`[CrazyGames] Ad started (${type})`);
                    await sdk.ad.requestAd(type);
                } catch (error) {
                    console.warn("[CrazyGames] Ad error or rejected:", error);
                }

                // Возвращаем звук если игра не на паузе
                if (window.SoundManager && window.SoundManager.playMainMusic) {
                    window.SoundManager.playMainMusic();
                }
                
                if (window.Game && window.Game.setGameState && (savedState === 'playing' || savedState === 'victory')) {
                    window.Game.setGameState(savedState);
                }
                
                // Уведомляем SDK о возобновлении геймплея
                window.CG.game.gameplayStart();
                
                // Важно: всегда возвращаем true (или можно false в случае ошибки), 
                // чтобы не блокировать выполнение дальше в основном коде.
                return true;
            }
        },
        data: {
            setItem: async (key, value) => {
                if (initPromise) await initPromise;
                if (sdk && sdk.data) {
                    return sdk.data.setItem(key, value);
                }
                return Promise.resolve();
            },
            getItem: async (key) => {
                if (initPromise) await initPromise;
                if (sdk && sdk.data) {
                    return sdk.data.getItem(key);
                }
                return Promise.resolve(null);
            }
        }
    };

    // Инициализация SDK
    initPromise = (async () => {
        try {
            if (window.location.protocol === 'file:') {
                console.warn("[CrazyGames] SDK не инициализируется в режиме file:// (нужен HTTP-сервер). Работаем в оффлайн-режиме.");
                sdk = null;
                isInitialized = true;
                return;
            }

            // Подгружаем основной скрипт SDK в голову документа
            await new Promise((resolve, reject) => {
                const cgScript = document.createElement('script');
                cgScript.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
                cgScript.async = true;
                cgScript.onload = resolve;
                cgScript.onerror = () => reject(new Error("Failed to load CrazyGames SDK script"));
                document.head.appendChild(cgScript);
            });

            if (window.CrazyGames && window.CrazyGames.SDK) {
                sdk = window.CrazyGames.SDK;
                await sdk.init();
                console.log("[CrazyGames] SDK Initialized");
                isInitialized = true;
                
                // Выполняем накопленные вызовы
                while (callQueue.length > 0) {
                    const call = callQueue.shift();
                    try { call(); } catch (e) { console.error("[CrazyGames] Queue error:", e); }
                }
            } else {
                console.warn("[CrazyGames] SDK not found after script load");
                isInitialized = true;
            }
        } catch (e) {
            console.error("[CrazyGames] Init error:", e);
            isInitialized = true;
        }
    })();


})();
