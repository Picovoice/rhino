import os
import platform
import unittest

import soundfile

from rhino import Rhino


class RhinoTestCase(unittest.TestCase):
    rhino = None

    @classmethod
    def setUpClass(cls):
        cls.rhino = Rhino(
            library_path=cls._library_path(),
            model_file_path=cls._abs_path('lib/common/rhino_params.pv'),
            context_file_path=cls._context_file_path())

    @classmethod
    def tearDownClass(cls):
        if cls.rhino is not None:
            cls.rhino.delete()

    def tearDown(self):
        self.rhino.reset()

    def test_within_context(self):
        audio, sample_rate =\
            soundfile.read(self._abs_path('resources/audio_samples/test_within_context.wav'), dtype='int16')
        assert sample_rate == self.rhino.sample_rate

        num_frames = len(audio) // self.rhino.frame_length

        is_finalized = False
        for i in range(num_frames):
            frame = audio[i * self.rhino.frame_length:(i + 1) * self.rhino.frame_length]
            is_finalized = self.rhino.process(frame)
            if is_finalized:
                break

        self.assertTrue(is_finalized, "couldn't finalize")

        self.assertTrue(self.rhino.is_understood(), "couldn't understand")

        intent, slot_values = self.rhino.get_intent()

        self.assertEqual('orderDrink', intent, "incorrect intent")

        expected_slot_values = dict(
            sugarAmount='some sugar',
            milkAmount='lots of milk',
            coffeeDrink='americano',
            numberOfShots='double shot',
            size='medium')
        self.assertEqual(slot_values, expected_slot_values, "incorrect slot values")

    def test_out_of_context(self):
        audio, sample_rate =\
            soundfile.read( self._abs_path('resources/audio_samples/test_out_of_context.wav'), dtype='int16')
        assert sample_rate == self.rhino.sample_rate

        num_frames = len(audio) // self.rhino.frame_length

        is_finalized = False
        for i in range(num_frames):
            frame = audio[i * self.rhino.frame_length:(i + 1) * self.rhino.frame_length]
            is_finalized = self.rhino.process(frame)
            if is_finalized:
                break

        self.assertTrue(is_finalized, "couldn't finalize")

        self.assertFalse(self.rhino.is_understood(), "shouldn't be able to understand")

    def test_context_expressions(self):
        self.assertIsInstance(self.rhino.context_expressions, str)

    def test_version(self):
        self.assertIsInstance(self.rhino.version, str)

    @staticmethod
    def _abs_path(rel_path):
        return os.path.join(os.path.dirname(__file__), '../..', rel_path)

    @classmethod
    def _library_path(cls):
        system = platform.system()
        machine = platform.machine()

        if system == 'Darwin':
            return cls._abs_path('lib/mac/x86_64/libpv_rhino.dylib')
        elif system == 'Linux':
            if machine == 'x86_64':
                return cls._abs_path('lib/linux/x86_64/libpv_rhino.so')
            elif machine.startswith('arm'):
                return cls._abs_path('lib/raspberry-pi/arm11/libpv_rhino.so')
        elif system == 'Windows':
            return cls._abs_path('lib\\windows\\amd64\\libpv_rhino.dll')
        else:
            raise NotImplementedError('Rhino is not supported on %s/%s yet!' % (system, machine))

    @classmethod
    def _context_file_path(cls):
        system = platform.system()
        machine = platform.machine()

        if system == 'Darwin':
            return cls._abs_path('resources/contexts/mac/coffee_maker_mac.rhn')
        elif system == 'Linux':
            if machine == 'x86_64':
                return cls._abs_path('resources/contexts/linux/coffee_maker_linux.rhn')
            elif machine.startswith('arm'):
                return cls._abs_path('resources/contexts/raspberrypi/coffee_maker_raspberrypi.rhn')
        elif system == 'Windows':
            return cls._abs_path('resources/contexts/windows/coffee_maker_windows.rhn')
        else:
            raise NotImplementedError('Rhino is not supported on %s/%s yet!' % (system, machine))


if __name__ == '__main__':
    unittest.main()
