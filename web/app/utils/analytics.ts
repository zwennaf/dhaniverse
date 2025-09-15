// Simple Google Analytics tracking for Dhaniverse
declare global {
    interface Window {
        gtag: (command: string, ...args: any[]) => void;
    }
}

export const analytics = {
    // Landing page events
    trackLandingPageView: () => {
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "landing_page_view", {
                event_category: "engagement",
                event_label: "homepage_visit",
            });
        }
    },

    // Authentication events
    trackSignInIntent: () => {
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "sign_in_intent", {
                event_category: "authentication",
                event_label: "clicked_sign_in_button",
            });
        }
    },

    trackSignUpIntent: () => {
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "sign_up_intent", {
                event_category: "authentication",
                event_label: "clicked_sign_up_button",
            });
        }
    },

    trackSignInSuccess: (
        method: "email" | "google",
        isNewUser: boolean = false
    ) => {
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "sign_in", {
                method: method,
                event_category: "authentication",
            });

            if (isNewUser) {
                window.gtag("event", "sign_up", {
                    method: method,
                    event_category: "authentication",
                });
            }
        }
    },

    // Game events
    trackGameStart: (username?: string) => {
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "game_start", {
                event_category: "game",
                event_label: "financial_rpg_started",
                game_name: "dhaniverse_financial_rpg",
            });
        }
    },

    trackBuildingEnter: (buildingType: "bank" | "stockmarket") => {
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "building_enter", {
                event_category: "gameplay",
                event_label: `entered_${buildingType}`,
                building_type: buildingType,
            });
        }
    },

    trackBankingAction: (
        action: "deposit" | "withdraw" | "fixed_deposit",
        amount?: number
    ) => {
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "banking_action", {
                event_category: "financial_education",
                event_label: `banking_${action}`,
                action_type: action,
                value: amount || 0,
            });
        }
    },

    trackStockMarketAction: (
        action: "buy" | "sell",
        stockSymbol?: string,
        amount?: number
    ) => {
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "stock_market_action", {
                event_category: "financial_education",
                event_label: `stock_${action}`,
                action_type: action,
                value: amount || 0,
            });
        }
    },
};

export default analytics;
