

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
    input.addEventListener("input", () => { marketSelect.value = ""; });
});

// Simulation Stuff

// Use Box Muller to get a normal random ...
function normRand(mean = 0, stdDev = 1) {
    let u = 0; let v = 0;

    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();

    const w = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return w * stdDev + mean;
}

const run = document.getElementById("run-button");

run.addEventListener("click", () => {

    console.log("Simulation Running ... ")

    // General settings
    const lumpSum = document.getElementById("lump-sum").value;
    const contriFreq = document.getElementById("contri-freq").value;
    const contriAmount = document.getElementById("contri-amount").value;
    const years = document.getElementById("years").value;

    const paths = [];

    // Get savings specific settings ...
    const interest = document.getElementById("interest")

    // Calculate steps and delta time
    const totalSteps = years * contriFreq;
    const dt = 1 / contriFreq;

    console.log("Savings Simulation Running ... ")

    // Run savings simulation
    const stepGrowth = Math.pow(1 + interest, dt);
    let save = lumpSum;
    savingsPath = [save];
    for (let step = 1; totalSteps >= step; step++) {
        save = save * stepGrowth + contriAmount;
        savingsPath.push(save);
    }

    console.log("Savings Simulation Complete!")

    // Get all market sim specific settings ...
    const iterations = document.getElementById("iterations").value;
    const cagr = cagrInput.value / 100.0;
    const volatility = volatilityInput.value / 100.0;

    // GBM stuffs 
    const mu = Math.log(1 + cagr);
    const drift = dt*(mu - 0.5*volatility*volatility);
    const diff = volatility*Math.sqrt(dt);

    console.log("Market Simulation Running ... ")

    // Run all Simulations
    for (let i = 0; iterations > i; i++) {
        let bal = lumpSum;
        const path = [bal];

        for (let step = 1; totalSteps >= step; step++) {
            const z = normRand();
            bal = bal*Math.exp(drift + diff*z) + contriAmount;
            path.push(bal);
        }
        paths.push(path);
    }

    console.log("Market Simulation Complete!")
    console.log(`Generated ${paths.length} paths with ${totalSteps} steps each.`);
    console.log("All Simulations Complete!")

});





