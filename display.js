let successful, previous;

const primary = getComputedStyle(document.querySelector(':root')).getPropertyValue('--primary');
const primaryTranslucent = getComputedStyle(document.querySelector(':root')).getPropertyValue('--primary-translucent');
const accent = getComputedStyle(document.querySelector(':root')).getPropertyValue('--accent');
const standard = getComputedStyle(document.querySelector(':root')).getPropertyValue('--standard');

const line = new TimeSeries();

async function validateData() {
    let value = await command('R');
    if (value && value.length == 6 && !value.includes('\r') && !value.includes('\n') && !value.includes('0.00')) {
        if (previous && previous == value) {
            value = parseFloat(value);
            value += ((Math.random()/50)-.01);
            value = value.toFixed(3);
            line.append(Date.now(), value);
        } else {
            previous = value;
            line.append(Date.now(), value);
        }
        return true;
    }
}

setInterval(async function() {
    successful = await validateData();
    if (!successful) {
        await validateData();
    }
}, 400);

function createChart() {
    const chart = new SmoothieChart({responsive: true, millisPerPixel: 10, grid: {strokeStyle: standard, borderVisible: false, verticalSections: 0, millisPerLine: 500}, labels: {precision: 3, fontSize: 20, fillStyle: accent}});
    chart.addTimeSeries(line, {lineWidth: 4, strokeStyle: primary, fillStyle: primaryTranslucent});
    chart.streamTo(document.getElementById("chart"), 800);
}