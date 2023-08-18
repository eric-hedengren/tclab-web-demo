const line = new TimeSeries();
const primary = getComputedStyle(document.querySelector(':root')).getPropertyValue('--primary')
const highlight = getComputedStyle(document.querySelector(':root')).getPropertyValue('--highlight')
const standard = getComputedStyle(document.querySelector(':root')).getPropertyValue('--standard')

setInterval(async function() {
    const value = await command('R');
    if (value && value.length == 6 && !value.includes('\r') && !value.includes('\n') && !value.includes('0.00')) {
        line.append(Date.now(), parseFloat(value));
    } else {
        const value = await command('R');
        if (value && value.length == 6 && !value.includes('\r') && !value.includes('\n') && !value.includes('0.00')) {
            line.append(Date.now(), parseFloat(value));
        }
    }
}, 400);

function createChart() {
    const chart = new SmoothieChart({responsive: true, millisPerPixel: 10, grid: {strokeStyle: standard, verticalSections: 0, millisPerLine: 300}, labels: {precision: 3, fontSize: 20, fillStyle: highlight}});
    chart.addTimeSeries(line, {lineWidth: 4, strokeStyle: primary, fillStyle: primary.substring(0,primary.length-1)+', .4)'});
    chart.streamTo(document.getElementById("chart"), 800);
}