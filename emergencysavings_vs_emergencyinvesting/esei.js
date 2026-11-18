

// Market Presets

const market_presets = {
    SPY: { cagr:  9.6, volatility: 17.50 },
    QQQ: { cagr: 14.4, volatility: 25.65 }
}

const marketSelect = document.getElementById("preset-returns");
const cagrInput = document.getElementById("cagr");
const volatilityInput = document.getElementById("volatility");

marketSelect.addEventListener("change", () => { 
    const preset = market_presets[marketSelect.value];
    if (preset) { cagrInput.value = preset.cagr; volatilityInput.value = preset.volatility; }
});

const marketInputs = document.querySelectorAll(".marketInputs");
marketInputs.forEach((input) => {
    input.addEventListener("input", () => {
        marketSelect.value = "";
    });
});