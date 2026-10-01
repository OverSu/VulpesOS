# SPDX-License-Identifier: MPL-2.0
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'tools'))
from storage_layout import mount_table


class StorageLayoutTests(unittest.TestCase):
    def layout(self):
        return dict(schema=2, device='/dev/mmcblk0p72', partitionLabel='userdata',
                    filesystem='ext4', backingDevice='259:40', size=53648801280,
                    table='0 104448000 linear 259:40 329728', firstMiBSha256='a'*64)

    def test_supported_inventory_uses_partition_path(self):
        self.assertEqual(mount_table(self.layout()),
                         '0 104448000 linear /dev/mmcblk0p72 329728')

    def test_different_inventory_offset_is_not_replaced_with_developer_offset(self):
        layout=self.layout(); layout['table']='0 104000000 linear 259:40 8192'
        self.assertEqual(mount_table(layout), '0 104000000 linear /dev/mmcblk0p72 8192')

    def test_rejects_overflow_other_partition_and_multiple_extents(self):
        for patch in ({'table':'0 104448000 linear 259:40 999999999'},
                      {'device':'/dev/mmcblk0p1'}, {'filesystem':'crypto_LUKS'},
                      {'backingDevice':'259:41'},
                      {'table':'0 104448000 linear 259:40 329728\n1 2 linear 259:40 3'},
                      {'firstMiBSha256':'not-a-hash'}):
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                mount_table(self.layout() | patch)

    def test_legacy_inventory_remains_supported_but_not_generalized(self):
        layout=self.layout();layout.pop('schema')
        self.assertIn('329728',mount_table(layout))
        layout['table']='0 104000000 linear 259:40 8192'
        with self.assertRaises(ValueError):mount_table(layout)
