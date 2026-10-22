#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Decode a private GIF test into bounded RGB565 frames for the cover panel."""
import argparse
from array import array
from pathlib import Path
import struct
import sys
from PIL import Image, ImageOps


def prepare(source, destination):
    if source.stat().st_size > 16 * 1024 * 1024:
        raise ValueError('GIF exceeds 16 MiB')
    with Image.open(source) as image:
        if image.format != 'GIF' or not 1 <= image.n_frames <= 240:
            raise ValueError('Expected a GIF with at most 240 frames')
        if image.width * image.height > 4_000_000:
            raise ValueError('GIF dimensions exceed limit')
        with destination.open('wb') as output:
            output.write(b'VULPANM1' + struct.pack('<I', image.n_frames))
            for index in range(image.n_frames):
                image.seek(index)
                duration = max(50, min(1000, int(image.info.get('duration', 100))))
                fitted = ImageOps.contain(image.convert('RGB'), (240, 240), Image.Resampling.LANCZOS)
                frame = Image.new('RGB', (240, 240))
                frame.paste(fitted, ((240-fitted.width)//2, (240-fitted.height)//2))
                rgb=frame.tobytes()
                pixels = array('H', (((r>>3)<<11) | ((g>>2)<<5) | (b>>3)
                                    for r,g,b in zip(rgb[0::3],rgb[1::3],rgb[2::3])))
                if sys.byteorder != 'little': pixels.byteswap()
                output.write(struct.pack('<I', duration)); output.write(pixels.tobytes())
    return destination.stat().st_size


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path);parser.add_argument('destination',type=Path)
    args=parser.parse_args()
    print('Cover animation bytes:',prepare(args.source,args.destination))
