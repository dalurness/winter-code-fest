import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        yeti: {
          light: {
            1: "#E5F0FF",
            3: "#D0E3FF",
            DEFAULT: "#B9D1FF",
            5: "#B9D1FF",
            7: "#99BDFF",
            9: "#5D7DBA",
          },

          dark: {
            1: "#5C5C5C",
            3: "#474747",
            DEFAULT: "#333333",
            5: "#333333",
            7: "#1F1F1F",
            9: "#0A0A0A",
          },
        },
      },
      fontFamily: {
        poppins: ["Poppins", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
