let writer, reader;
const data = [];

async function connect() {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    const textEncoder = new TextEncoderStream();
    textEncoder.readable.pipeTo(port.writable);
    writer = textEncoder.writable.getWriter();

    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    while (true) {
        const value = await command('RT');
        if (value.length == 6 && !value.includes('\r') && !value.includes('\n') && value != '100.00') {
            data.push(parseFloat(value));
        }
    }
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