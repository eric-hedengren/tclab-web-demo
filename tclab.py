import js
import asyncio

loop = asyncio.get_event_loop()

class TCLab():
    def connect(self):
        loop.run_until_complete(js.connect())

    def read(self, option):
        loop.run_until_complete(js.read(f'T{option}\n'))
        print(js.give())

tc = TCLab()