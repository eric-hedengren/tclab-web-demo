const line = new TimeSeries();

setInterval(async function() {
    const value = await command('R');
    if (value && value.length == 6 && !value.includes('\r') && !value.includes('\n') && value != '100.00') {
        line.append(Date.now(), value);
    }
}, 1000);

function createChart() {
    const chart = new SmoothieChart({ responsive: true });
    chart.addTimeSeries(line);
    chart.streamTo(document.getElementById("chart"), 1000);
}