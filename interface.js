let writer, reader, heater, light, connected;

async function connect() {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    const textEncoder = new TextEncoderStream();
    textEncoder.readable.pipeTo(port.writable);
    writer = textEncoder.writable.getWriter();

    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    heater = false;
    light = true;
    connected = true;

    document.getElementById('heater').disabled = false;
    document.getElementById('light').disabled = false;
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
    if (connected) {
        if (option == 'R') {
            return await response('T1');
        }

        else if (option == 'H') {
            if (!heater) {
                await response('Q1 100');
                heater = true;
            } else {
                await response('Q1 0');
                heater = false;
            }
        } else if (option == 'L') {
            if (light) {
                await response('LED 0');
                light = false;
            } else {
                await response('LED 100');
                light = true;
            }
        }
    }
}