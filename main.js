let writer, reader, connected;
const data = [];

async function connect() {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    connected = true

    const textEncoder = new TextEncoderStream();
    textEncoder.readable.pipeTo(port.writable);
    writer = textEncoder.writable.getWriter();

    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    while (connected) {
        await gather();
    }
}

async function gather() {
    data.push(await grab());
}

async function grab() {
    await writer.write('T1\n');
    await new Promise(r => setTimeout(r, 50));

    let current = await reader.read();
    let value = current.value;

    if (value.indexOf('\r\n') != 6) {
        await new Promise(r => setTimeout(r, 50));
        current = await reader.read();
        value += current.value;
    }

    await new Promise(r => setTimeout(r, 50));
    return value.replace('\r\n', '');
}