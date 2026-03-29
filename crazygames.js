// ============================================================
//  CrazyGames SDK Integration
// ============================================================
(async () => {
    'use strict';

    window.CrazyGames = window.CrazyGames || {};
    let sdk = null;

    // Инициализация SDK
    try {
        if (window.location.protocol === 'file:') {
            console.warn("[CrazyGames] SDK не инициализируется в режиме file:// (нужен HTTP-сервер). Работаем в оффлайн-режиме.");
            sdk = null;
        } else if (window.CrazyGames && window.CrazyGames.SDK) {
            sdk = window.CrazyGames.SDK;
            await sdk.init();
            console.log("[CrazyGames] SDK Initialized");
        } else {
            console.warn("[CrazyGames] SDK not found");
        }
    } catch (e) {
        console.error("[CrazyGames] Init error:", e);
    }

    // Обертка для удобного использования
    window.CG = {
        // События игры
        game: {
            loadingStart: () => {
                if (sdk && sdk.game) sdk.game.loadingStart();
            },
            loadingStop: () => {
                if (sdk && sdk.game) sdk.game.loadingStop();
            },
            gameplayStart: () => {
                if (sdk && sdk.game) sdk.game.gameplayStart();
            },
            gameplayStop: () => {
                if (sdk && sdk.game) sdk.game.gameplayStop();
            }
        },
        ad: {
            requestAd: async (type = 'midgame') => {
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

                if (window.Game && window.Game.gameplayStop) {
                    window.Game.gameplayStop();
                }

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
                
                // Важно: всегда возвращаем true (или можно false в случае ошибки), 
                // чтобы не блокировать выполнение дальше в основном коде.
                return true;
            }
        },
        data: {
            setItem: (key, value) => {
                if (sdk && sdk.data) {
                    return sdk.data.setItem(key, value);
                }
                return Promise.resolve();
            },
            getItem: (key) => {
                if (sdk && sdk.data) {
                    return sdk.data.getItem(key);
                }
                return Promise.resolve(null);
            }
        }
    };
})();
