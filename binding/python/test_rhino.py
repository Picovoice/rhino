import os
import unittest

import soundfile

from .rhino import Rhino


class RhinoTestCase(unittest.TestCase):
    rhino = None

    @classmethod
    def setUpClass(cls):
        cls.rhino = Rhino(
            library_path=cls._library_path(),
            model_file_path=cls._abs_path('lib/common/rhino_params.pv'),
            context_file_path=cls._abs_path('resources/contexts/coffee_maker_linux.rhn'))

    @classmethod
    def tearDownClass(cls):
        if cls.rhino is not None:
            cls.rhino.delete()

    def tearDown(self):
        self.rhino.reset()

    def test_within_context(self):
        audio, sample_rate = soundfile.read(
            self._abs_path('resources/audio_samples/test_within_context.wav'),
            dtype='int16')
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

        self.assertEqual('order', intent, "incorrect intent")
        self.assertEqual(
            slot_values,
            dict(sugar='some sugar', milk='lots of milk', product='americano', shot='double shot', size='medium'),
            "incorrect slot values")

    def test_out_of_context(self):
        audio, sample_rate = soundfile.read(
            self._abs_path('resources/audio_samples/test_out_of_context.wav'),
            dtype='int16')
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

    @classmethod
    def _library_path(cls):
        return cls._abs_path('lib/linux/x86_64/libpv_rhino.so')

    @staticmethod
    def _abs_path(rel_path):
        return os.path.join(os.path.dirname(__file__), '../..', rel_path)


if __name__ == '__main__':
    unittest.main()
