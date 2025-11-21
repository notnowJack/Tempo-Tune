// credit for dark mode toggle logic : 
// https://dev.to/whitep4nth3r/the-best-lightdark-mode-theme-toggle-in-javascript-368f


function calculateSettingAsThemeString({ localStorageTheme, systemSettingDark }) {
    if (localStorageTheme !== null) {
        return localStorageTheme;
    }

    if (systemSettingDark.matches) {
        return "dark";
    }

    return "light";
}

/**
* Utility function to update the button text and aria-label.
*/
function updateButton({ buttonEl, isDark }) {
    const newCta = isDark ? "Change to light theme" : "Change to dark theme";
    // use an aria-label if you are omitting text on the button
    // and using a sun/moon icon, for example
    buttonEl.setAttribute("aria-label", newCta);
    buttonEl.innerText = newCta;
}

/**
* Utility function to update the theme setting on the html tag
*/
function updateThemeOnHtmlEl({ theme }) {
    document.querySelector("html").setAttribute("data-theme", theme);
}


/**
* On page load:
*/

/**
* 1. Grab what we need from the DOM and system settings on page load
*/
const button = document.querySelector("[data-theme-toggle]");
const systemSettingDark = window.matchMedia("(prefers-color-scheme: dark)");

function getCurrentThemeSetting() {
    const localStorageTheme = localStorage.getItem("theme");
    return calculateSettingAsThemeString({ localStorageTheme, systemSettingDark });
}

// On page load, set theme and button
let currentThemeSetting = getCurrentThemeSetting();
if (button) {
    updateButton({ buttonEl: button, isDark: currentThemeSetting === "dark" });
}
updateThemeOnHtmlEl({ theme: currentThemeSetting });

// Toggle event
if (button) {
    button.addEventListener("click", (event) => {
        const newTheme = getCurrentThemeSetting() === "dark" ? "light" : "dark";
        localStorage.setItem("theme", newTheme);
        updateButton({ buttonEl: button, isDark: newTheme === "dark" });
        updateThemeOnHtmlEl({ theme: newTheme });
    }); 
}

// Listen for changes from other tabs
window.addEventListener("storage", (event) => {
    if (event.key === "theme") {
        const newTheme = event.newValue || "light";
        updateButton({ buttonEl: button, isDark: newTheme === "dark" });
        updateThemeOnHtmlEl({ theme: newTheme });
    }
});

// Also update theme on page show (for bfcache navigation)
window.addEventListener("pageshow", () => {
    const theme = getCurrentThemeSetting();
    updateThemeOnHtmlEl({ theme });
});

/**
* 4. Add an event listener to toggle the theme
*/
if (button) {
    button.addEventListener("click", (event) => {
        const newTheme = currentThemeSetting === "dark" ? "light" : "dark";

        localStorage.setItem("theme", newTheme);
        updateButton({ buttonEl: button, isDark: newTheme === "dark" });
        updateThemeOnHtmlEl({ theme: newTheme });

        currentThemeSetting = newTheme;
    }); 
}

window.addEventListener("storage", (event) => {
    if (event.key === "theme") {
        const newTheme = event.newValue || "light";
        updateButton({ buttonEl: button, isDark: newTheme === "dark" });
        updateThemeOnHtmlEl({ theme: newTheme });
        currentThemeSetting = newTheme; 
    }
})


