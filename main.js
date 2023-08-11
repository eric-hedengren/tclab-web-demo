let writer, reader, connected;

async function connect() {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    connected = true;

    const textEncoder = new TextEncoderStream();
    textEncoder.readable.pipeTo(port.writable);
    writer = textEncoder.writable.getWriter();

    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();
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
    if (option == 'RT') {
        return await response('T1');
    } else if (option == 'HON') {
        await response('Q1 100');
    } else if (option == 'HOF') {
        await response('Q1 0');
    } else if (option == 'LON') {
        await response('LED 100');
    } else if (option == 'LOF') {
        await response('LED 0');
    }
}