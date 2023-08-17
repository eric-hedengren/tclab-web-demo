const line = new TimeSeries();
const primary = getComputedStyle(document.querySelector(':root')).getPropertyValue('--primary')
const highlight = getComputedStyle(document.querySelector(':root')).getPropertyValue('--highlight')
const standard = getComputedStyle(document.querySelector(':root')).getPropertyValue('--standard')

setInterval(async function() {
    const value = await command('R');
    if (value && value.length == 6 && !value.includes('\r') && !value.includes('\n') && value != '100.00' && value != '00.000') {
        line.append(Date.now(), value);
    }
}, 1000);

function createChart() {
    const chart = new SmoothieChart({responsive: true, grid: {strokeStyle: standard}, labels: {fillStyle: highlight}});
    chart.addTimeSeries(line, {lineWidth: 4, strokeStyle: primary, fillStyle: primary.substring(0,primary.length-1)+', .4)'});
    chart.streamTo(document.getElementById("chart"), 1000);
}