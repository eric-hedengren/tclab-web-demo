let writer, reader, heater, led, connected;

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
    led = true;
    connected = true;

    document.getElementById('heater').disabled = false;
    document.getElementById('led').disabled = false;
}

async function response(key) {
    await writer.write(key+'\n');
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
            if (led) {
                await response('LED 0');
                led = false;
            } else {
                await response('LED 100');
                led = true;
            }
        }
    }
}