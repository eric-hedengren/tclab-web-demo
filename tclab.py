import pyodide
import asyncio

def convert(br):
    return pyodide.ffi.to_js({"baudRate": br}, dict_converter=js.Object.fromEntries)

class TCLab():
    async def connect(self):
        self.port = await js.navigator.serial.requestPort()
        await self.port.open(convert(115200))

        self.encoder = js.TextEncoderStream.new()
        self.encoder.readable.pipeTo(self.port.writable)

    def write(self, command):
        writer = self.encoder.writable.getWriter()
        writer.write(command + '\n')
        writer.releaseLock()

    def set_led(self, level):
        self.write(f'LED {int(level)}')

    def change_heater(self, option, level):
        self.write(f'Q{option} {int(level)}')

tc = TCLab()

def initialize():
    asyncio.get_event_loop().run_until_complete(tc.connect())