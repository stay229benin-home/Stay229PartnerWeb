import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Palette Stay229 alignée sur l'app Android (cyan néon dark-first)
                brand: {
                    cyan: "#00AAFF",
                    cyanLight: "#00E5FF",
                    purple: "#7C4DFF",
                    pink: "#FF4FB3",
                    navy: "#0A1A2C",
                    badge: "#0F2A44",
                },
            },
            fontFamily: {
                sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
