import pyodide
import asyncio

def convert(br):
    return pyodide.ffi.to_js({"baudRate": br}, dict_converter=js.Object.fromEntries)

class TCLab():
    async def connect(self):
        self.port = await js.navigator.serial.requestPort()
        await self.port.open(convert(115200))

tc = TCLab()

def initialize():
    asyncio.get_event_loop().run_until_complete(tc.connect())