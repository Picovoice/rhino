import os
import unittest

import soundfile

from .rhino import Rhino


class RhinoTestCase(unittest.TestCase):
    def test_within_context(self):
        rhino = Rhino(
            library_path=self._library_path,
            model_file_path=self._abs_path('lib/common/rhino_params.pv'),
            context_file_path=self._abs_path('resources/contexts/coffee_maker.rhn'))

        audio, sample_rate = soundfile.read(
            self._abs_path('resources/audio_samples/test_within_context.wav'),
            dtype='int16')
        assert sample_rate == rhino.sample_rate

        num_frames = len(audio) // rhino.frame_length

        is_finalized = False
        for i in range(num_frames):
            frame = audio[i * rhino.frame_length:(i + 1) * rhino.frame_length]
            is_finalized = rhino.process(frame)
            if is_finalized:
                break

        self.assertTrue(is_finalized, "couldn't finalize")

        is_understood = rhino.is_understood()

        self.assertTrue(is_understood, "couldn't understand")

        expected_slot_values = dict(
            milk='no milk',
            sugar='two sugars',
            twist='cherry twist',
            product='espresso',
            taste='salted caramel',
            shots='single shot',
            roast='dark roast',
            size='small')

        intent, slot_values = rhino.get_intent()

        self.assertEqual('order', intent, "incorrect intent")
        self.assertEqual(slot_values, expected_slot_values, "incorrect slot values")

        rhino.delete()

    def test_out_of_context(self):
        rhino = Rhino(
            library_path=self._library_path,
            model_file_path=self._abs_path('lib/common/rhino_params.pv'),
            context_file_path=self._abs_path('resources/contexts/coffee_maker.rhn'))

        audio, sample_rate = soundfile.read(
            self._abs_path('resources/audio_samples/test_out_of_context.wav'),
            dtype='int16')
        assert sample_rate == rhino.sample_rate

        num_frames = len(audio) // rhino.frame_length

        is_finalized = False
        for i in range(num_frames):
            frame = audio[i * rhino.frame_length:(i + 1) * rhino.frame_length]
            is_finalized = rhino.process(frame)
            if is_finalized:
                break

        self.assertTrue(is_finalized, "couldn't finalize")
        self.assertTrue(not rhino.is_understood(), "shouldn't be able to understand")

        rhino.delete()

    @property
    def _library_path(self):
        return self._abs_path('lib/linux/x86_64/libpv_rhino.so')

    @staticmethod
    def _abs_path(rel_path):
        return os.path.join(os.path.dirname(__file__), '../..', rel_path)


if __name__ == '__main__ ':
    pass
