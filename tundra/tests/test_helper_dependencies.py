# SPDX-License-Identifier: MPL-2.0
"""The RAM image must retain PT_INTERP even on a translated build host."""
import os
from pathlib import Path
import stat
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'tools'))
from ramdisk_reference import select_helpers

class HelperDependenciesTests(unittest.TestCase):
    def test_french_host_keeps_dynamic_interpreter_and_library(self):
        entries = {name: {'mode':stat.S_IFREG|0o755, 'data':name.encode()}
                   for name in ('bin/busybox','sbin/dropbear','sbin/dmsetup',
                                'lib/aarch64-linux-gnu/libnss_files.so.2',
                                'lib/aarch64-linux-gnu/libc.so.6',
                                'lib/ld-linux-aarch64.so.1')}
        def readelf(command, **kwargs):
            if Path(command[-1]).read_bytes() != b'sbin/dropbear': return ''
            label = 'Requesting program interpreter' if kwargs.get('env',{}).get('LC_ALL') == 'C' else 'Interpréteur de programme requis'
            return f'[{label}: /lib/ld-linux-aarch64.so.1]\n(NEEDED) [libc.so.6]\n'
        with tempfile.TemporaryDirectory() as temp, patch.dict(os.environ, {'LC_ALL':'fr_FR.UTF-8'}), patch('ramdisk_reference.subprocess.check_output', side_effect=readelf):
            helpers=select_helpers(entries,Path(temp))
        self.assertIn('lib/ld-linux-aarch64.so.1', helpers)
        self.assertIn('lib/aarch64-linux-gnu/libc.so.6', helpers)

if __name__=='__main__': unittest.main()
