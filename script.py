import time
import random
import serial
from serial.tools import list_ports

class Labtime():
    def __init__(self):
        self._realtime = time.time()
        self._labtime = 0
        self._rate = 1
        self._running = True
        self.lastsleep = 0

    @property
    def running(self):
        return self._running

    def time(self):
        if self.running:
            elapsed = time.time() - self._realtime
            return self._labtime + self._rate * elapsed
        else:
            return self._labtime

    def set_rate(self, rate=1):
        if rate <= 0:
            raise ValueError("Labtime rates must be positive.")
        self._labtime = self.time()
        self._realtime = time.time()
        self._rate = rate

    def get_rate(self):
        return self._rate

    def sleep(self, delay):
        self.lastsleep = delay
        if self._running:
            time.sleep(delay / self._rate)
        else:
            raise RuntimeWarning("sleep is not valid when labtime is stopped.")

    def stop(self):
        self._labtime = self.time()
        self._realtime = time.time()
        self._running = False

    def start(self):
        self._realtime = time.time()
        self._running = True

    def reset(self, val=0):
        self._labtime = val
        self._realtime = time.time()

labtime = Labtime()
sep = ' '

arduinos = [('USB VID:PID=16D0:0613', 'Arduino Uno'),
            ('USB VID:PID=1A86:7523', 'NHduino'),
            ('USB VID:PID=2341:8036', 'Arduino Leonardo'),
            ('USB VID:PID=2A03', 'Arduino.org device'),
            ('USB VID:PID', 'unknown device'),]

_sketchurl = 'https://github.com/jckantor/TCLab-sketch'
_connected = False

def clip(val, lower=0, upper=100):
    return max(lower, min(val, upper))

def command(name, argument, lower=0, upper=100):
    return name + sep + str(clip(argument, lower, upper))

def find_arduino(port=''):
    comports = [tuple for tuple in list_ports.comports() if port in tuple[0]] # fix needed
    for port, desc, hwid in comports:
        for identifier, arduino in arduinos:
            if hwid.startswith(identifier):
                return port, arduino
    print('--- Serial Ports ---')
    for port, desc, hwid in list_ports.comports(): # fix needed
        print(port, desc, hwid)
    return None, None

class AlreadyConnectedError(Exception):
    pass

class TCLab(object):
    def __init__(self, port='', debug=False):
        global _connected
        self.debug = debug
        self.port, self.arduino = find_arduino(port)
        if self.port is None:
            raise RuntimeError('No Arduino device found.')
        
        try:
            self.connect(baud=115200)
        except AlreadyConnectedError:
            raise
        except:
            try:
                _connected = False
                self.sp.close()
                self.connect(baud=9600)
                print('Could not connect at high speed, but succeeded at low speed.')
                print('This may be due to an old TCLab firmware.')
                print('New Arduino TCLab firmware available at:')
                print(_sketchurl)
            except:
                raise RuntimeError('Failed to Connect.')
            
        self.sp.readline().decode('UTF-8')
        self.version = self.send_and_receive('VER')
        if self.sp.isOpen():
            print(self.arduino, 'connected on port', self.port, 'at', self.baud, 'baud')
            print(self.version + '.')
        labtime.set_rate(1)
        labtime.start()
        self._P1 = 200.0
        self._P2 = 100.0
        self.Q2(0)
        self.sources = [('T1', self.scan),
                        ('T2', None),
                        ('Q1', None),
                        ('Q2', None),]
        
    def __enter__(self):
        return self
    
    def __exit__(self):
        self.close()
        return
    
    def connect(self, baud):
        global _connected

        if _connected:
            raise AlreadyConnectedError('You already have an open connection')
        
        _connected = True

        self.sp = serial.Serial(port=self.port, baudrate=baud, timeout=2) # fix needed
        time.sleep(2)
        self.Q1(0)
        self.baud = baud
    
    def close(self):
        global _connected

        self.Q1(0)
        self.Q2(0)
        self.send_and_receive('X')
        self.sp.close()
        _connected = False
        print('TCLab disconnected successfully.')
        return
    
    def send(self, msg):
        self.sp.write((msg + '\r\n').encode())
        if self.debug:
            print('Sent: "' + msg + '"')
        self.sp.flush()

    def receive(self):
        msg = self.sp.readline().decode('UTF-8').replace('\r\n', '')
        if self.debug:
            print('Return: "' + msg + '"')
        return msg
    
    def send_and_receive(self, msg, convert=str):
        self.send(msg)
        return convert(self.receive())
    
    def LED(self, val=100):
        return self.send_and_receive(command('LED', val), float)
    
    @property
    def T1(self):
        return self.send_and_receive('T1', float)
    
    @property
    def T2(self):
        return self.send_and_receive('T2', float)
    
    @property
    def P1(self):
        return self._P1

    @P1.setter
    def P1(self, val):
        self._P1 = self.send_and_receive(command('P1', val, 0, 255), float)

    @property
    def P2(self):
        return self._P2

    @P2.setter
    def P2(self, val):
        self._P2 = self.send_and_receive(command('P2', val, 0, 255), float)

    def Q1(self, val=None):
        if val is None:
            msg = 'R1'
        else:
            msg = 'Q1' + sep + str(clip(val))
        return self.send_and_receive(msg, float)

    def Q2(self, val=None):
        if val is None:
            msg = 'R2'
        else:
            msg = 'Q2' + sep + str(clip(val))
        return self.send_and_receive(msg, float)
    
    def scan(self):
        T1 = self.T1
        T2 = self.T2
        Q1 = self.Q1()
        Q2 = self.Q2()
        return T1, T2, Q1, Q2

    U1 = property(fget=Q1, fset=Q1, doc="Heater 1 value")
    U2 = property(fget=Q2, fset=Q2, doc="Heater 2 value")

class TCLabModel(object):
    def __init__(self, port='', debug=False, synced=True):
        self.debug = debug
        self.synced = synced
        labtime.start()
        print('Simulated TCLab')
        self.Ta = 21
        self.tstart = labtime.time()
        self.tlast = self.tstart
        self._P1 = 200.0
        self._P2 = 100.0
        self._Q1 = 0
        self._Q2 = 0
        self._T1 = self.Ta
        self._T2 = self.Ta
        self._H1 = self.Ta
        self._H2 = self.Ta
        self.maxstep = 0.2
        self.sources = [('T1', self.scan),
                        ('T2', None),
                        ('Q1', None),
                        ('Q2', None),]

    def __enter__(self):
        return self

    def __exit__(self):
        self.close()
        return

    def close(self):
        self.Q1(0)
        self.Q2(0)
        print('TCLab Model disconnected successfully.')
        return

    def LED(self, val=100):
        self.update()
        return clip(val)

    @property
    def T1(self):
        self.update()
        return self.measurement(self._T1)

    @property
    def T2(self):
        self.update()
        return self.measurement(self._T2)

    @property
    def P1(self):
        self.update()
        return self._P1

    @P1.setter
    def P1(self, val):
        self.update()
        self._P1 = clip(val, 0, 255)

    @property
    def P2(self):
        self.update()
        return self._P2

    @P2.setter
    def P2(self, val):
        self.update()
        self._P2 = clip(val, 0, 255)

    def Q1(self, val=None):
        self.update()
        if val is not None:
            self._Q1 = clip(val)
        return self._Q1

    def Q2(self, val=None):
        self.update()
        if val is not None:
            self._Q2 = clip(val)
        return self._Q2

    def scan(self):
        self.update()
        return (self.measurement(self._T1),
                self.measurement(self._T2),
                self._Q1,
                self._Q2)

    U1 = property(fget=Q1, fset=Q1, doc="Heater 1 value")
    U2 = property(fget=Q2, fset=Q2, doc="Heater 2 value")

    def quantize(self, T):
        return max(-50, min(132.2, T - T % 0.3223))

    def measurement(self, T):
        return self.quantize(T + random.normalvariate(0, 0.043))

    def update(self, t=None):
        if t is None:
            if self.synced:
                self.tnow = labtime.time() - self.tstart
            else:
                return
        else:
            self.tnow = t

        teuler = self.tlast

        while teuler < self.tnow:
            dt = min(self.maxstep, self.tnow - teuler)
            DeltaTaH1 = self.Ta - self._H1
            DeltaTaH2 = self.Ta - self._H2
            DeltaT12 = self._H1 - self._H2
            dH1 = self._P1 * self._Q1 / 5720 + DeltaTaH1 / 20 - DeltaT12 / 100
            dH2 = self._P2 * self._Q2 / 5720 + DeltaTaH2 / 20 + DeltaT12 / 100
            dT1 = (self._H1 - self._T1)/140
            dT2 = (self._H2 - self._T2)/140

            self._H1 += dt * dH1
            self._H2 += dt * dH2
            self._T1 += dt * dT1
            self._T2 += dt * dT2
            teuler += dt

        self.tlast = self.tnow

def diagnose(port=''):
    def countdown(t=10):
        for i in reversed(range(t)):
            print('\r' + "Countdown: {0:d}  ".format(i), end='', flush=True)
            time.sleep(1)

    print('Checking connection')

    if port:
        print('Looking for Arduino on {}...'.format(port))
    else:
        print('Looking for Arduino on any port...')
    comport, name = find_arduino(port=port)

    if comport is None:
        print('No known Arduino was found in the ports listed above.')
        return

    print(name, 'found on port', comport)

    print('Testing TCLab object in debug mode')

    with TCLab(port=port, debug=True) as lab:
        print('Reading temperature')
        print(lab.T1)

    print('Testing TCLab functions')

    with TCLab(port=port) as lab:
        print('Testing LED. Should turn on for 10 seconds.')
        lab.LED(100)
        countdown()

        print('Reading temperatures')
        T1 = lab.T1
        T2 = lab.T2
        print('T1 = {} °C, T2 = {} °C'.format(T1, T2))

        print('Writing fractional value to heaters...')
        try:
            Q1 = lab.Q1(0.5)
        except:
            Q1 = -1.0
        print("We wrote Q1 = 0.5, and read back Q1 =", Q1)

        if Q1 != 0.5:
            print("Your TCLab firmware version ({}) doesn't support fractional heater values.".format(lab.version))
            print("You need to upgrade to at least version 1.4.0 for this:")
            print(_sketchurl)

        print('We will now turn on the heaters, wait 30 seconds and see if the temperatures have gone up.')
        lab.Q1(100)
        lab.Q2(100)
        countdown(30)

        def tempcheck(name, T_initial, T_final):
            print('{} started at {} °C and went to {} °C'.format(name, T_initial, T_final))
            if T_final - T_initial < 0.8:
                print('The temperature went up less than expected.')
                print('Check the heater power supply.')

        T1_final = lab.T1
        T2_final = lab.T2

        tempcheck('T1', T1, T1_final)
        tempcheck('T2', T2, T2_final)

        print("Throughput check")
        print("This part checks how fast your unit is")
        print("We will read T1 as fast as possible")

        start = time.time()
        n = 0
        while time.time() - start < 10:
            elapsed = time.time() - start + 0.0001
            T1 = lab.T1
            n += 1
            print('\rTime elapsed: {:3.2f} s.'
                  ' Number of reads: {}.'
                  ' Sampling rate: {:2.2f} Hz'.format(elapsed, n, n/elapsed), end='')

    print('Diagnostics complete')