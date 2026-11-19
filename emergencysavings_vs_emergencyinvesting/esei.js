// Market Presets

const market_presets = {
    // US Markets
    SPY:    { cagr:   9.60, volatility: 17.50 },
    QQQ:    { cagr:  14.40, volatility: 25.65 },
    RUS:    { cagr:  11.10, volatility: 19.95 },
    USSCV:  { cagr:  12.95, volatility: 19.75 },

    // Metals
    Gold:   { cagr:   8.15, volatility: 19.40 },
    Silver: { cagr:   5.15, volatility: 34.20 },

    // Vangaurd's Totals
    VT:     { cagr:   9.90, volatility: 16.40 },
    VTI:    { cagr:  10.29, volatility: 17.55 },
    VXUS:   { cagr:   8.70, volatility: 18.35 },

    // Misc
    BTC:    { cagr: 126.25, volatility: 96.50 },
    CDTY:   { cagr:   3.70, volatility: 20.35 },
    MFUT:   { cagr:   7.50, volatility: 14.10 },
    REIT:   { cagr:   6.15, volatility: 33.25 }
    
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

// Enforce correct frequency usage 
const stepFrequency = document.getElementById("step-freq");
const contriFrequency = document.getElementById("contri-freq");
function enforceFrequency() {
    const step = parseInt(stepFrequency.value, 10) || 12;
    const contri = parseInt(contriFrequency.value, 10) || 12;

    if (step < contri) stepFrequency.value = contri;
}
stepFrequency.addEventListener("change", enforceFrequency);
contriFrequency.addEventListener("change", enforceFrequency);

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
let simMarketData = null;
let percentBeatingSavings = null;

run.addEventListener("click", () => { runSim(); });

function runSim() {
    console.log("Simulation Running ... ")

    // General settings
    const lumpSum = parseFloat(document.getElementById("lump-sum").value) || 10000;
    const stepFreq = parseInt(stepFrequency.value, 10) || 12;
    const contriFreq = parseInt(contriFrequency.value, 10) || 12;
    const contriAmount = parseFloat(document.getElementById("contri-amount").value) || 0;
    const years = parseFloat(document.getElementById("years").value) || 10;
    const leverage = parseFloat(document.getElementById("leverage").value) || 1;
    const applyfees = document.getElementById("marginfee").checked;

    const paths = [];

    // Get savings specific settings ...
    const interest = parseFloat(document.getElementById("interest").value / 100) || 0.0335;
    const marginrate = (applyfees) ? interest + ((parseFloat(document.getElementById("marginrate").value) || 0) / 100.0) : 0;

    // Calculate steps and delta time
    const totalSteps = years * stepFreq;
    const dt = 1 / stepFreq;
    const stepsPerContri = Math.round(stepFreq / contriFreq);

    console.log("Savings Simulation Running ... ")

    // Run savings simulation
    const stepGrowth = Math.pow(1 + interest, dt);
    let save = lumpSum;
    savingsPath = [save];
    for (let step = 1; totalSteps >= step; step++) {
        const contribution = (step % stepsPerContri === 0) ? contriAmount : 0;
        save = save * stepGrowth + contribution;
        savingsPath.push(save);
    }

    console.log("Savings Simulation Complete!")

    // Get all market sim specific settings ...
    const iterations = parseInt(document.getElementById("iterations").value) || 1000;
    const cagr = cagrInput.value / 100.0;
    const volatility = volatilityInput.value / 100.0;
    const leverageStepCost = (leverage - 1) * marginrate * dt;

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
            const contribution = (step % stepsPerContri === 0) ? contriAmount : 0;
            const z = normRand();

            const chng = leverage*(Math.exp(drift + diff*z) - 1) - leverageStepCost;

            bal = bal*(Math.max(0, chng+1)) + contribution;
            path.push(bal);
        }
        paths.push(path);
    }

    console.log("Market Simulation Complete!")
    console.log(`Generated ${paths.length} paths with ${totalSteps} steps each.`);
    console.log("All Simulations Complete!")

    console.log("Sorting ...")

    // Sort into percentiles
    const labels = [];
    const p10 = [];
    const p30 = [];
    const p50 = [];
    const p70 = [];
    const p90 = [];

    const pctB = []; // % beating savings
    const pctL = []; // % losing against savings
    const pctD = []; // % of portfolios dead

    for (let step = 0; step <= totalSteps; step++) {
        const yearNum = (step / stepFreq).toFixed(1);
        labels.push(step % stepFreq === 0 ? `Year ${step / stepFreq}` : `Yr ${yearNum}`);

        const stepValues = paths.map(path => path[step]).sort((a, b) => a - b);
        
        p10.push(stepValues[Math.floor(iterations * 0.10)]);
        p30.push(stepValues[Math.floor(iterations * 0.30)]);
        p50.push(stepValues[Math.floor(iterations * 0.50)]);
        p70.push(stepValues[Math.floor(iterations * 0.70)]);
        p90.push(stepValues[Math.floor(iterations * 0.90)]);

        // Starts %s at 50% so the chart is prettier
        let simsAboveSavings = iterations/2;
        if (step != 0) {
            const savings = savingsPath[step];
            simsAboveSavings = stepValues.filter(i => i > savings).length;
        }

        const pctAboveSavings = 100*(simsAboveSavings / iterations);
        pctB.push(pctAboveSavings);
        pctL.push(100-pctAboveSavings);
        pctD.push(100*(stepValues.filter(i => 0 >= i).length / iterations));
    }

    // Apply stress test / drawdown
    const stress = parseFloat(document.getElementById("stress").value);
    const stressMulti = 1 - (stress / 100.0);
    const percentiles = [p10, p30, p50, p70, p90];
    percentiles.forEach(path => {
        path.forEach((v, i) => {
            path[i] = v*stressMulti
        });
    });
    

    simMarketData = [
        { data: p10 , name: "p10" , color: "#e51f1f"},
        { data: p30 , name: "p30" , color: "#f2a134"},
        { data: p50 , name: "p50" , color: "#2600ff"},
        { data: p70 , name: "p70" , color: "#bbdb44"},
        { data: p90 , name: "p90" , color: "#44ce1b"} 
    ]
    percentBeatingSavings = [ 
        { data: pctB , name: "% Over Savings"  , color: "#f3f"},
        { data: pctL , name: "% Under Savings" , color: "#3f3"},
        { data: pctD , name: "% of Dead Portfolios" , color: "rgb(105, 78, 26)"}
    ];

    // Chart Settings ...
    const logspace = document.getElementById("logspace").checked;
    const benchmark = document.getElementById("savings-subtract").checked;

    drawChart("simChart", simMarketData, totalSteps, stepFreq, savingsPath, logspace, benchmark, true, null, null, (logspace) ? "ln" : "$", (logspace) ? 1 : 0);
    drawChart("percentChart", percentBeatingSavings, totalSteps, stepFreq, undefined, undefined, undefined, undefined, 0, 100, "%", 1);

    // Format Currency and whatnot ...
    function roundNStuff(value, sign = "$", back = 0) {
        if (isNaN(value) || value === null) return "$0.00";
        if (value === 0) return "$0.00";

        const isNegative = value < 0;
        const absValue = Math.abs(value);

        const fixed = absValue.toFixed(2);

        const parts = fixed.split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        let formatted = parts.join(".");
        formatted = (back) ? formatted + sign : sign + formatted;
        return isNegative ? `(${formatted})` : formatted;
    }

    let rows = ["savings", "p90", "p70", "p50", "p30", "p10"];
    const results = {savings: savingsPath.at(-1), p90: p90.at(-1),  p70: p70.at(-1), p50: p50.at(-1),  p30: p30.at(-1), p10: p10.at(-1)}

    rows.forEach(key => {
        const endValue = results[key];
        const gainLoss = endValue - results.savings;
        const logPoints = Math.log(endValue);
        const ratio = endValue / results.savings;

        document.getElementById(key + "v").textContent = roundNStuff(endValue);
        document.getElementById(key + "b").textContent = roundNStuff(gainLoss);
        document.getElementById(key + "l").textContent = roundNStuff(logPoints, "ln", 1);
        document.getElementById(key + "r").textContent = roundNStuff(ratio, "x", 1);
    });
}

function drawChart(canvasId, data, totalSteps, stepFreq, benchmarkData = null, 
    logspace = false, benchmark = false, fill = false, min = null, max = null, sign = "$", back = false) {

    // Transform functions
    const logt = (arr) => logspace ? arr.map(v => v > 0 ? Math.log(v) : 0) : arr;
    const subt = (arr, bch) => (benchmark && bch) ? arr.map((v, i) => v - bch[i]) : arr;

    const logBenchmark = benchmarkData ? logt(benchmarkData) : null;

    const fullTransform = (arr) => subt(logt(arr), logBenchmark);

    const transformedBenchmark = benchmarkData ? fullTransform(benchmarkData) : null

    const transformedData = data.map(v => ({
        ...v,
        data: fullTransform(v.data)
    }));
    
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { top: 45, right: 30, bottom: 45, left: 85 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    ctx.clearRect(0, 0, width, height);

    const allValues = [...transformedData.flatMap(v => v.data), ...(transformedBenchmark || [])];
    const minVal = (min == null) ? Math.min(...allValues) * 0.95 : min;
    const maxVal = (max == null) ? Math.max(...allValues) * 1.05 : max;

    const getX = (step) => pad.left + (step / totalSteps) * plotW;
    const getY = (val) => pad.top + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

    ctx.strokeStyle = "#e5e7eb";
    ctx.fillStyle = "#4b5563";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
        const val = minVal + (maxVal - minVal) * (i / yTicks);
        const y = getY(val);

        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();

        const str = Math.round(val).toLocaleString()
        const l = (back) ? str + sign : sign + str;
        ctx.fillText(l, pad.left - 10, y);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const totalYears = Math.round(totalSteps / stepFreq);
    const yearStep = Math.max(1, Math.ceil(totalYears / 10));

    for (let yr = 0; yr <= totalYears; yr += yearStep) {
        const step = Math.min(totalSteps, yr * stepFreq);
        const x = getX(step);
        ctx.fillText(`Yr ${yr}`, x, height - pad.bottom + 10);
    }

    if (fill && transformedData.length >= 2) {
        const lower = transformedData.at(0).data; 
        const upper = transformedData.at(-1).data; 

        ctx.fillStyle = "rgba(170, 255, 200, 0.25)";
        ctx.beginPath();
        
        upper.forEach((val, step) => {
            const x = getX(step), y = getY(val);
            step === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        
        for (let step = totalSteps; step >= 0; step--) {
            ctx.lineTo(getX(step), getY(lower[step]));
        }
        
        ctx.closePath();
        ctx.fill();
    }

    const legend = [];
    function plotLine(data, color, name, lineWidth = 2, dashed = false) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if (dashed) ctx.setLineDash([6, 4]);

        ctx.beginPath();
        data.forEach((val, step) => {
            const x = getX(step);
            const y = getY(val);
            step === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.restore();

        legend.push({ label: name , color: color });
    }

    const lineWidth = 2;
    transformedData.forEach(v => { plotLine(v.data, v.color, v.name, lineWidth) });

    // Add Benchmark
    if (benchmarkData) plotLine(transformedBenchmark, "#6b7280", "Savings", lineWidth, true); 
    

    let legendX = pad.left;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    legend.forEach((item) => {
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX, 14, 14, 14);
        ctx.fillStyle = "#111827";
        ctx.fillText(item.label, legendX + 20, 21);
        legendX += ctx.measureText(item.label).width + 42;
    });
}

runSim();