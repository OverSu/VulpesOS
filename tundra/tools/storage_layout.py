# SPDX-License-Identifier: MPL-2.0
"""Validate an inventoried, single-extent Sargo userdata mapping."""
import re


def mount_table(layout):
    device = layout.get('device')
    if device != '/dev/mmcblk0p72':
        raise ValueError('Expected Sargo userdata, not another partition')
    if not re.fullmatch(r'[0-9a-f]{64}', layout.get('firstMiBSha256', '')):
        raise ValueError('Missing userdata identity checksum')
    match = re.fullmatch(r'0 ([0-9]+) linear ([0-9]+:[0-9]+) ([0-9]+)',
                         layout.get('table', ''))
    if not match:
        raise ValueError('Only a single linear extent is supported')
    sectors, backing, offset = int(match[1]), match[2], int(match[3])
    size = int(layout['size'])
    if size <= 0 or size % 512 or sectors <= 0 or offset < 2048:
        raise ValueError('Invalid userdata extent geometry')
    if (sectors + offset) * 512 > size:
        raise ValueError('Extent exceeds userdata')
    if layout.get('schema') == 2:
        if (layout.get('partitionLabel') != 'userdata' or
                layout.get('filesystem') != 'ext4' or
                layout.get('backingDevice') != backing):
            raise ValueError('Mapping must be ext4 on the inventoried userdata device')
    elif not (layout['table'] == '0 104448000 linear 259:40 329728'
              and size == 53648801280):
        raise ValueError('A new layout requires a schema 2 inventory')
    # Kernel major/minor numbers can change between boots. The partition path
    # is stable with this Sargo kernel, and its first MiB is checked before use.
    return f'0 {sectors} linear {device} {offset}'
