let writer, reader, heater, light, connected;
const data = [['Timestamp','Temperature','Heater']];

async function connect() {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    const textEncoder = new TextEncoderStream();
    textEncoder.readable.pipeTo(port.writable);
    writer = textEncoder.writable.getWriter();

    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    heater = 0;
    light = 100;

    connected = true;

    document.getElementById('heater').disabled = false;
    document.getElementById('light').disabled = false;
    document.getElementById('download').disabled = false;
}

async function response(request) {
    await writer.write(request+'\n');
    await new Promise(r => setTimeout(r, 50));

    let current = await reader.read();
    let value = current.value;

    if (!value.endsWith('\r\n')) {
        await new Promise(r => setTimeout(r, 50));
        current = await reader.read();
        value += current.value;
    }

    await new Promise(r => setTimeout(r, 50));
    return value.replace('\r\n', '');
}

async function command(option) {
    if (option == 'R') {
        if (connected) {
            let value = await response('T1');
            if (value.length == 6 && !value.includes('\r') && !value.includes('\n') && !value.includes('0.00')) {
                data.push([Date.now(), value, heater]);
                return value;
            }
        }
    } else if (option == 'H') {
        if (!heater) {
            await response('Q1 100');
            heater = 100;
        } else {
            await response('Q1 0');
            heater = 0;
        }
    } else if (option == 'L') {
        if (light) {
            await response('LED 0');
            light = 0;
        } else {
            await response('LED 100');
            light = 100;
        }
    }
}

async function download() {
    let content = "data:text/csv;charset=utf-8,";
    data.forEach(function(line) {content += line.join(",")+"\r\n"});
    window.open(encodeURI(content));
}