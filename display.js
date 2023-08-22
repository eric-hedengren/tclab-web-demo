let previous;

const primary = getComputedStyle(document.querySelector(':root')).getPropertyValue('--primary');
const primaryTranslucent = getComputedStyle(document.querySelector(':root')).getPropertyValue('--primary-translucent');
const accent = getComputedStyle(document.querySelector(':root')).getPropertyValue('--accent');
const standard = getComputedStyle(document.querySelector(':root')).getPropertyValue('--standard');

const line = new TimeSeries();

setInterval(async function() {
    let value = await command('R');
    if (value) {
        line.append(Date.now(), value);
    } else {
        value = await command('R');
        if (value) {
            line.append(Date.now(), value);
        }
    }
}, 400);

function createChart() {
    const chart = new SmoothieChart({responsive: true, millisPerPixel: 10, maxValueScale: 1.01, minValueScale: 1.01, grid: {strokeStyle: standard, borderVisible: false, verticalSections: 0, millisPerLine: 500}, labels: {precision: 3, fontSize: 20, fillStyle: accent}});
    chart.addTimeSeries(line, {lineWidth: 4, strokeStyle: primary, fillStyle: primaryTranslucent});
    chart.streamTo(document.getElementById("chart"), 800);
}