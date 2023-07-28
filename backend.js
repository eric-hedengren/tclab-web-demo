let writer, reader, value;

async function connect() {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    const textEncoder = new TextEncoderStream();
    textEncoder.readable.pipeTo(port.writable);
    writer = textEncoder.writable.getWriter();

    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();
}

async function read(command) {
    await writer.write(command);
    await new Promise(r => setTimeout(r, 50));
    let data = await reader.read();

    while (data.value.indexOf('\r\n') != 6) {
        await new Promise(r => setTimeout(r, 50));
        let extra = await reader.read();
        data.value += extra.value;
    }
    await new Promise(r => setTimeout(r, 50));
    value = data.value.replace('\r\n', '');
}

function give() {
    return value;
}
