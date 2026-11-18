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
let lastSimData = null;

run.addEventListener("click", () => { runSim(); });

function runSim() {
    console.log("Simulation Running ... ")

    // General settings
    const lumpSum = parseFloat(document.getElementById("lump-sum").value) || 10000;
    const contriFreq = parseInt(document.getElementById("contri-freq").value, 10) || 12;
    const contriAmount = parseFloat(document.getElementById("contri-amount").value) || 0;
    const years = parseFloat(document.getElementById("years").value) || 10;

    const paths = [];

    // Get savings specific settings ...
    const interest = parseFloat(document.getElementById("interest").value / 100) || 0.0315;

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
    const iterations = parseInt(document.getElementById("iterations").value) || 1000;
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
    console.log("Sorting ...")

    // Sort into percentiles
    const labels = [];
    const p10 = [];
    const p30 = [];
    const p50 = [];
    const p70 = [];
    const p90 = [];

    for (let step = 0; step <= totalSteps; step++) {
        const yearNum = (step / contriFreq).toFixed(1);
        labels.push(step % contriFreq === 0 ? `Year ${step / contriFreq}` : `Yr ${yearNum}`);

        const stepValues = paths.map(path => path[step]).sort((a, b) => a - b);
        
        p10.push(stepValues[Math.floor(iterations * 0.10)]);
        p30.push(stepValues[Math.floor(iterations * 0.30)]);
        p50.push(stepValues[Math.floor(iterations * 0.50)]);
        p70.push(stepValues[Math.floor(iterations * 0.70)]);
        p90.push(stepValues[Math.floor(iterations * 0.90)]);
    }

    lastSimData = { p10 , p30 , p50 , p70 , p90 , savingsPath , totalSteps , contriFreq }
    drawChart("simChart", lastSimData);
}

function drawChart(canvasId, { p10 , p30 , p50 , p70 , p90 , savingsPath , totalSteps , contriFreq }) {
    
    const logspace = document.getElementById("logspace").checked;
    const subtractSavings = document.getElementById("savings-subtract").checked;

    const logt = (arr) => logspace ? arr.map(v => v > 0 ? Math.log(v) : 0) : arr;
    const subt = (arr, sav) => subtractSavings ? arr.map((v, i) => v - sav[i]) : arr;

    const baseSavings = logt(savingsPath);
    const tsavingsPath = subt(baseSavings, baseSavings);

    const fullTransform = (arr) => subt(logt(arr), baseSavings);

    const tp10 = fullTransform(p10);
    const tp30 = fullTransform(p30);
    const tp50 = fullTransform(p50);
    const tp70 = fullTransform(p70);
    const tp90 = fullTransform(p90);
    
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

    const allValues = [...tp90, ...tp70, ...tp50, ...tp30, ...tp10, ...tsavingsPath];
    const minVal = Math.min(...allValues) * 0.95 ||   0;
    const maxVal = Math.max(...allValues) * 1.05 || 100;

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

        ctx.fillText("$" + Math.round(val).toLocaleString(), pad.left - 10, y);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const totalYears = Math.round(totalSteps / contriFreq);
    const yearStep = Math.max(1, Math.ceil(totalYears / 10));

    for (let yr = 0; yr <= totalYears; yr += yearStep) {
        const step = Math.min(totalSteps, yr * contriFreq);
        const x = getX(step);
        ctx.fillText(`Yr ${yr}`, x, height - pad.bottom + 10);
    }

    ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
    ctx.beginPath();
    tp90.forEach((val, step) => {
        const x = getX(step), y = getY(val);
        step === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    for (let step = totalSteps; step >= 0; step--) {
        ctx.lineTo(getX(step), getY(tp10[step]));
    }
    ctx.closePath();
    ctx.fill();

    function plotLine(data, color, lineWidth = 2, dashed = false) {
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
    }

    plotLine(tp90, "#44ce1b", 2);       
    plotLine(tp70, "#bbdb44", 2);    
    plotLine(tp50, "#2600ff", 2);        
    plotLine(tp30, "#f2a134", 2); 
    plotLine(tp10, "#e51f1f", 2);           
    plotLine(tsavingsPath, "#6b7280", 2, true); 

    const legend = [
        { label: "90p", color: "#44ce1b" },
        { label: "70p", color: "#bbdb44" },
        { label: "50p", color: "#2600ff" },
        { label: "30p", color: "#f2a134" },
        { label: "10p", color: "#e51f1f" },
        { label: "Savings", color: "#6b7280" }
    ];

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