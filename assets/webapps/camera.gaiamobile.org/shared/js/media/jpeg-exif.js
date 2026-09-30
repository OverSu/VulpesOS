var JPEGParser = JPEGParser || {};
JPEGParser.BlobView = function () {
    function fail(msg) {
        throw Error(msg);
    }
    function BlobView(blob, sliceOffset, sliceLength, slice, viewOffset, viewLength, littleEndian) {
        this.blob = blob;
        this.sliceOffset = sliceOffset;
        this.sliceLength = sliceLength;
        this.slice = slice;
        this.viewOffset = viewOffset;
        this.viewLength = viewLength;
        this.littleEndian = littleEndian;
        this.view = new DataView(slice, viewOffset, viewLength);
        this.buffer = slice;
        this.byteLength = viewLength;
        this.byteOffset = viewOffset;
        this.index = 0;
    }
    BlobView.get = function (blob, offset, length, callback, littleEndian) {
        if (offset < 0)
            fail('negative offset');
        if (length < 0)
            fail('negative length');
        if (offset > blob.size)
            fail('offset larger than blob size');
        if (offset + length > blob.size)
            length = blob.size - offset;
        var slice = blob.slice(offset, offset + length);
        var reader = new FileReader();
        reader.readAsArrayBuffer(slice);
        reader.onloadend = function () {
            var result = null;
            if (reader.result) {
                result = new BlobView(blob, offset, length, reader.result, 0, length, littleEndian || false);
            }
            callback(result, reader.error);
        };
    };
    BlobView.prototype = {
        constructor: BlobView,
        getMore: function (offset, length, callback) {
            if (offset >= this.sliceOffset && offset + length <= this.sliceOffset + this.sliceLength) {
                callback(new BlobView(this.blob, this.sliceOffset, this.sliceLength, this.slice, offset - this.sliceOffset, length, this.littleEndian));
            } else {
                BlobView.get(this.blob, offset, length, callback, this.littleEndian);
            }
        },
        littleEndian: function () {
            this.littleEndian = true;
        },
        bigEndian: function () {
            this.littleEndian = false;
        },
        getUint8: function (offset) {
            return this.view.getUint8(offset);
        },
        getInt8: function (offset) {
            return this.view.getInt8(offset);
        },
        getUint16: function (offset, le) {
            return this.view.getUint16(offset, le !== undefined ? le : this.littleEndian);
        },
        getInt16: function (offset, le) {
            return this.view.getInt16(offset, le !== undefined ? le : this.littleEndian);
        },
        getUint32: function (offset, le) {
            return this.view.getUint32(offset, le !== undefined ? le : this.littleEndian);
        },
        getInt32: function (offset, le) {
            return this.view.getInt32(offset, le !== undefined ? le : this.littleEndian);
        },
        getFloat32: function (offset, le) {
            return this.view.getFloat32(offset, le !== undefined ? le : this.littleEndian);
        },
        getFloat64: function (offset, le) {
            return this.view.getFloat64(offset, le !== undefined ? le : this.littleEndian);
        },
        setUint8: function (offset, value) {
            return this.view.setUint8(offset, value);
        },
        setInt8: function (offset, value) {
            return this.view.setInt8(offset, value);
        },
        setUint16: function (offset, value, le) {
            return this.view.setUint16(offset, value, le !== undefined ? le : this.littleEndian);
        },
        setInt16: function (offset, value, le) {
            return this.view.setInt16(offset, value, le !== undefined ? le : this.littleEndian);
        },
        setUint32: function (offset, value, le) {
            return this.view.setUint32(offset, value, le !== undefined ? le : this.littleEndian);
        },
        setInt32: function (offset, value, le) {
            return this.view.setInt32(offset, value, le !== undefined ? le : this.littleEndian);
        },
        setFloat32: function (offset, value, le) {
            return this.view.setFloat32(offset, value, le !== undefined ? le : this.littleEndian);
        },
        setFloat64: function (offset, value, le) {
            return this.view.setFloat64(offset, value, le !== undefined ? le : this.littleEndian);
        },
        readByte: function () {
            return this.view.getInt8(this.index++);
        },
        readUnsignedByte: function () {
            return this.view.getUint8(this.index++);
        },
        readShort: function (le) {
            var val = this.view.getInt16(this.index, le !== undefined ? le : this.littleEndian);
            this.index += 2;
            return val;
        },
        readUnsignedShort: function (le) {
            var val = this.view.getUint16(this.index, le !== undefined ? le : this.littleEndian);
            this.index += 2;
            return val;
        },
        readInt: function (le) {
            var val = this.view.getInt32(this.index, le !== undefined ? le : this.littleEndian);
            this.index += 4;
            return val;
        },
        readUnsignedInt: function (le) {
            var val = this.view.getUint32(this.index, le !== undefined ? le : this.littleEndian);
            this.index += 4;
            return val;
        },
        readFloat: function (le) {
            var val = this.view.getFloat32(this.index, le !== undefined ? le : this.littleEndian);
            this.index += 4;
            return val;
        },
        readDouble: function (le) {
            var val = this.view.getFloat64(this.index, le !== undefined ? le : this.littleEndian);
            this.index += 8;
            return val;
        },
        tell: function () {
            return this.index;
        },
        seek: function (index) {
            if (index < 0)
                fail('negative index');
            if (index >= this.byteLength)
                fail('index greater than buffer size');
            this.index = index;
        },
        advance: function (n) {
            var index = this.index + n;
            if (index < 0)
                fail('advance past beginning of buffer');
            if (index > this.byteLength)
                fail('advance past end of buffer');
            this.index = index;
        },
        getUnsignedByteArray: function (offset, n) {
            return new Uint8Array(this.buffer, offset + this.viewOffset, n);
        },
        readUnsignedByteArray: function (n) {
            var val = new Uint8Array(this.buffer, this.index + this.viewOffset, n);
            this.index += n;
            return val;
        },
        getBit: function (offset, bit) {
            var byte = this.view.getUint8(offset);
            return (byte & 1 << bit) !== 0;
        },
        getUint24: function (offset, le) {
            var b1, b2, b3;
            if (le !== undefined ? le : this.littleEndian) {
                b1 = this.view.getUint8(offset);
                b2 = this.view.getUint8(offset + 1);
                b3 = this.view.getUint8(offset + 2);
            } else {
                b3 = this.view.getUint8(offset);
                b2 = this.view.getUint8(offset + 1);
                b1 = this.view.getUint8(offset + 2);
            }
            return (b3 << 16) + (b2 << 8) + b1;
        },
        readUint24: function (le) {
            var value = this.getUint24(this.index, le);
            this.index += 3;
            return value;
        },
        getASCIIText: function (offset, len) {
            var bytes = new Uint8Array(this.buffer, offset + this.viewOffset, len);
            return String.fromCharCode.apply(String, bytes);
        },
        getNullTerminatedASCIIString: function (offset) {
            var string = '';
            var characterCode;
            while (offset < this.sliceLength) {
                characterCode = this.view.getUint8(offset);
                if (characterCode === 0) {
                    break;
                }
                string += String.fromCharCode(characterCode);
                offset++;
            }
            return string;
        },
        readASCIIText: function (len) {
            var bytes = new Uint8Array(this.buffer, this.index + this.viewOffset, len);
            this.index += len;
            return String.fromCharCode.apply(String, bytes);
        },
        getUTF8Text: function (offset, len) {
            function fail() {
                throw new Error('Illegal UTF-8');
            }
            var pos = offset;
            var end = offset + len;
            var charcode;
            var s = '';
            var b1, b2, b3, b4;
            while (pos < end) {
                var b1 = this.view.getUint8(pos);
                if (b1 < 128) {
                    s += String.fromCharCode(b1);
                    pos += 1;
                } else if (b1 < 194) {
                    fail();
                } else if (b1 < 224) {
                    if (pos + 1 >= end)
                        fail();
                    b2 = this.view.getUint8(pos + 1);
                    if (b2 < 128 || b2 > 191)
                        fail();
                    charcode = ((b1 & 31) << 6) + (b2 & 63);
                    s += String.fromCharCode(charcode);
                    pos += 2;
                } else if (b1 < 240) {
                    if (pos + 3 >= end)
                        fail();
                    b2 = this.view.getUint8(pos + 1);
                    if (b2 < 128 || b2 > 191)
                        fail();
                    b3 = this.view.getUint8(pos + 2);
                    if (b3 < 128 || b3 > 191)
                        fail();
                    charcode = ((b1 & 15) << 12) + ((b2 & 63) << 6) + (b3 & 63);
                    s += String.fromCharCode(charcode);
                    pos += 3;
                } else if (b1 < 245) {
                    if (pos + 3 >= end)
                        fail();
                    b2 = this.view.getUint8(pos + 1);
                    if (b2 < 128 || b2 > 191)
                        fail();
                    b3 = this.view.getUint8(pos + 2);
                    if (b3 < 128 || b3 > 191)
                        fail();
                    b4 = this.view.getUint8(pos + 3);
                    if (b4 < 128 || b4 > 191)
                        fail();
                    charcode = ((b1 & 7) << 18) + ((b2 & 63) << 12) + ((b3 & 63) << 6) + (b4 & 63);
                    charcode -= 65536;
                    s += String.fromCharCode(55296 + ((charcode & 1047552) >>> 10));
                    s += String.fromCharCode(56320 + (charcode & 1023));
                    pos += 4;
                } else {
                    fail();
                }
            }
            return s;
        },
        readUTF8Text: function (len) {
            try {
                return this.getUTF8Text(this.index, len);
            } finally {
                this.index += len;
            }
        },
        getID3Uint28BE: function (offset) {
            var b1 = this.view.getUint8(offset) & 127;
            var b2 = this.view.getUint8(offset + 1) & 127;
            var b3 = this.view.getUint8(offset + 2) & 127;
            var b4 = this.view.getUint8(offset + 3) & 127;
            return b1 << 21 | b2 << 14 | b3 << 7 | b4;
        },
        readID3Uint28BE: function () {
            var value = this.getID3Uint28BE(this.index);
            this.index += 4;
            return value;
        },
        readNullTerminatedLatin1Text: function (size) {
            var s = '';
            for (var i = 0; i < size; i++) {
                var charcode = this.view.getUint8(this.index + i);
                if (charcode === 0) {
                    i++;
                    break;
                }
                s += String.fromCharCode(charcode);
            }
            this.index += i;
            return s;
        },
        readNullTerminatedUTF8Text: function (size) {
            for (var len = 0; len < size; len++) {
                if (this.view.getUint8(this.index + len) === 0)
                    break;
            }
            var s = this.readUTF8Text(len);
            if (len < size)
                this.advance(1);
            return s;
        },
        readNullTerminatedUTF16Text: function (size, le) {
            if (le == null) {
                var BOM = this.readUnsignedShort();
                size -= 2;
                if (BOM === 65279)
                    le = false;
                else
                    le = true;
            }
            var s = '';
            for (var i = 0; i < size; i += 2) {
                var charcode = this.getUint16(this.index + i, le);
                if (charcode === 0) {
                    i += 2;
                    break;
                }
                s += String.fromCharCode(charcode);
            }
            this.index += i;
            return s;
        }
    };
    return { get: BlobView.get };
}();
(function () {
    var tagTypes = {
        BYTE: 1,
        ASCII: 2,
        SHORT: 3,
        LONG: 4,
        RATIONAL: 5,
        SBYTE: 6,
        UNDEFINED: 7,
        SSHORT: 8,
        SLONG: 9,
        SRATIONAL: 10,
        FLOAT: 11,
        DOUBLE: 12
    };
    var tagTypesString = {
        1: 'BYTE',
        2: 'ASCII',
        3: 'SHORT',
        4: 'LONG',
        5: 'RATIONAL',
        6: 'SBYTE',
        7: 'UNDEFINED',
        8: 'SSHORT',
        9: 'SLONG',
        10: 'SRATIONAL',
        11: 'FLOAT',
        12: 'DOUBLE'
    };
    var tagTypeSize = {
        1: 1,
        2: 1,
        3: 2,
        4: 4,
        5: 8,
        6: 1,
        7: 1,
        8: 2,
        9: 4,
        10: 8,
        11: 4,
        12: 8
    };
    var IFDId = {
        Image: 1,
        Photo: 2,
        GPSInfo: 3,
        Iop: 4
    };
    var interOperabilityTags = {
        '1': {
            'IFD': 4,
            'key': 'InteroperabilityIndex',
            'type': 2
        },
        '2': {
            'IFD': 4,
            'key': 'InteroperabilityVersion',
            'type': 7
        },
        '4096': {
            'IFD': 4,
            'key': 'RelatedImageFileFormat',
            'type': 2
        },
        '4097': {
            'IFD': 4,
            'key': 'RelatedImageWidth',
            'type': 4
        },
        '4098': {
            'IFD': 4,
            'key': 'RelatedImageLength',
            'type': 4
        }
    };
    var tags = {
        '0': {
            'IFD': 3,
            'key': 'GPSVersionID',
            'type': 1
        },
        '1': {
            'IFD': 3,
            'key': 'GPSLatitudeRef',
            'type': 2
        },
        '2': {
            'IFD': 3,
            'key': 'GPSLatitude',
            'type': 5
        },
        '3': {
            'IFD': 3,
            'key': 'GPSLongitudeRef',
            'type': 2
        },
        '4': {
            'IFD': 3,
            'key': 'GPSLongitude',
            'type': 5
        },
        '5': {
            'IFD': 3,
            'key': 'GPSAltitudeRef',
            'type': 1
        },
        '6': {
            'IFD': 3,
            'key': 'GPSAltitude',
            'type': 5
        },
        '7': {
            'IFD': 3,
            'key': 'GPSTimeStamp',
            'type': 5
        },
        '8': {
            'IFD': 3,
            'key': 'GPSSatellites',
            'type': 2
        },
        '9': {
            'IFD': 3,
            'key': 'GPSStatus',
            'type': 2
        },
        '10': {
            'IFD': 3,
            'key': 'GPSMeasureMode',
            'type': 2
        },
        '11': {
            'IFD': 3,
            'key': 'GPSDOP',
            'type': 5
        },
        '12': {
            'IFD': 3,
            'key': 'GPSSpeedRef',
            'type': 2
        },
        '13': {
            'IFD': 3,
            'key': 'GPSSpeed',
            'type': 5
        },
        '14': {
            'IFD': 3,
            'key': 'GPSTrackRef',
            'type': 2
        },
        '15': {
            'IFD': 3,
            'key': 'GPSTrack',
            'type': 5
        },
        '16': {
            'IFD': 3,
            'key': 'GPSImgDirectionRef',
            'type': 2
        },
        '17': {
            'IFD': 3,
            'key': 'GPSImgDirection',
            'type': 5
        },
        '18': {
            'IFD': 3,
            'key': 'GPSMapDatum',
            'type': 2
        },
        '19': {
            'IFD': 3,
            'key': 'GPSDestLatitudeRef',
            'type': 2
        },
        '20': {
            'IFD': 3,
            'key': 'GPSDestLatitude',
            'type': 5
        },
        '21': {
            'IFD': 3,
            'key': 'GPSDestLONGitudeRef',
            'type': 2
        },
        '22': {
            'IFD': 3,
            'key': 'GPSDestLONGitude',
            'type': 5
        },
        '23': {
            'IFD': 3,
            'key': 'GPSDestBearingRef',
            'type': 2
        },
        '24': {
            'IFD': 3,
            'key': 'GPSDestBearing',
            'type': 5
        },
        '25': {
            'IFD': 3,
            'key': 'GPSDestDistanceRef',
            'type': 2
        },
        '26': {
            'IFD': 3,
            'key': 'GPSDestDistance',
            'type': 5
        },
        '27': {
            'IFD': 3,
            'key': 'GPSProcessingMethod',
            'type': 7
        },
        '28': {
            'IFD': 3,
            'key': 'GPSAreaInformation',
            'type': 7
        },
        '29': {
            'IFD': 3,
            'key': 'GPSDateStamp',
            'type': 2
        },
        '30': {
            'IFD': 3,
            'key': 'GPSDifferential',
            'type': 3
        },
        '254': {
            'IFD': 1,
            'key': 'NewSubfileType',
            'type': 4
        },
        '255': {
            'IFD': 1,
            'key': 'SubfileType',
            'type': 3
        },
        '256': {
            'IFD': 1,
            'key': 'ImageWidth',
            'type': 4
        },
        '257': {
            '': 1,
            'key': 'ImageLength',
            'type': 4
        },
        '258': {
            'IFD': 1,
            'key': 'BitsPerSample',
            'type': 3
        },
        '259': {
            'IFD': 1,
            'key': 'Compression',
            'type': 3
        },
        '262': {
            'IFD': 1,
            'key': 'PhotometricInterpretation',
            'type': 3
        },
        '263': {
            'IFD': 1,
            'key': 'Threshholding',
            'type': 3
        },
        '264': {
            'IFD': 1,
            'key': 'CellWidth',
            'type': 3
        },
        '265': {
            'IFD': 1,
            'key': 'CellLength',
            'type': 3
        },
        '266': {
            'IFD': 1,
            'key': 'FillOrder',
            'type': 3
        },
        '269': {
            'IFD': 1,
            'key': 'DocumentName',
            'type': 2
        },
        '270': {
            'IFD': 1,
            'key': 'ImageDescription',
            'type': 2
        },
        '271': {
            'IFD': 1,
            'key': 'Make',
            'type': 2
        },
        '272': {
            'IFD': 1,
            'key': 'Model',
            'type': 2
        },
        '273': {
            'IFD': 1,
            'key': 'StripOffsets',
            'type': 4
        },
        '274': {
            'IFD': 1,
            'key': 'Orientation',
            'type': 3
        },
        '277': {
            'IFD': 1,
            'key': 'SamplesPerPixel',
            'type': 3
        },
        '278': {
            'IFD': 1,
            'key': 'RowsPerStrip',
            'type': 4
        },
        '279': {
            'IFD': 1,
            'key': 'StripByteCounts',
            'type': 4
        },
        '282': {
            'IFD': 1,
            'key': 'XResolution',
            'type': 5
        },
        '283': {
            'IFD': 1,
            'key': 'YResolution',
            'type': 5
        },
        '284': {
            'IFD': 1,
            'key': 'PlanarConfiguration',
            'type': 3
        },
        '290': {
            'IFD': 1,
            'key': 'GrayResponseUnit',
            'type': 3
        },
        '291': {
            'IFD': 1,
            'key': 'GrayResponseCurve',
            'type': 3
        },
        '292': {
            'IFD': 1,
            'key': 'T4Options',
            'type': 4
        },
        '293': {
            'IFD': 1,
            'key': 'T6Options',
            'type': 4
        },
        '296': {
            'IFD': 1,
            'key': 'ResolutionUnit',
            'type': 3
        },
        '301': {
            'IFD': 1,
            'key': 'TransferFunction',
            'type': 3
        },
        '305': {
            'IFD': 1,
            'key': 'Software',
            'type': 2
        },
        '306': {
            'IFD': 1,
            'key': 'DateTime',
            'type': 2
        },
        '315': {
            'IFD': 1,
            'key': 'Artist',
            'type': 2
        },
        '316': {
            'IFD': 1,
            'key': 'HostComputer',
            'type': 2
        },
        '317': {
            'IFD': 1,
            'key': 'Predictor',
            'type': 3
        },
        '318': {
            'IFD': 1,
            'key': 'WhitePoint',
            'type': 5
        },
        '319': {
            'IFD': 1,
            'key': 'PrimaryChromaticities',
            'type': 5
        },
        '320': {
            'IFD': 1,
            'key': 'ColorMap',
            'type': 3
        },
        '321': {
            'IFD': 1,
            'key': 'HalftoneHints',
            'type': 3
        },
        '322': {
            'IFD': 1,
            'key': 'TileWidth',
            'type': 3
        },
        '323': {
            'IFD': 1,
            'key': 'TileLength',
            'type': 3
        },
        '324': {
            'IFD': 1,
            'key': 'TileOffsets',
            'type': 3
        },
        '325': {
            'IFD': 1,
            'key': 'TileByteCounts',
            'type': 3
        },
        '330': {
            'IFD': 1,
            'key': 'SubIFDs',
            'type': 4
        },
        '332': {
            'IFD': 1,
            'key': 'InkSet',
            'type': 3
        },
        '333': {
            'IFD': 1,
            'key': 'InkNames',
            'type': 2
        },
        '334': {
            'IFD': 1,
            'key': 'NumberOfInks',
            'type': 3
        },
        '336': {
            'IFD': 1,
            'key': 'DotRange',
            'type': 1
        },
        '337': {
            'IFD': 1,
            'key': 'TargetPrinter',
            'type': 2
        },
        '338': {
            'IFD': 1,
            'key': 'ExtraSamples',
            'type': 3
        },
        '339': {
            'IFD': 1,
            'key': 'SampleFormat',
            'type': 3
        },
        '340': {
            'IFD': 1,
            'key': 'SMinSampleValue',
            'type': 3
        },
        '341': {
            'IFD': 1,
            'key': 'SMaxSampleValue',
            'type': 3
        },
        '342': {
            'IFD': 1,
            'key': 'TransferRange',
            'type': 3
        },
        '343': {
            'IFD': 1,
            'key': 'ClipPath',
            'type': 1
        },
        '344': {
            'IFD': 1,
            'key': 'XClipPathUnits',
            'type': 8
        },
        '345': {
            'IFD': 1,
            'key': 'YClipPathUnits',
            'type': 8
        },
        '346': {
            'IFD': 1,
            'key': 'Indexed',
            'type': 3
        },
        '347': {
            'IFD': 1,
            'key': 'JPEGTables',
            'type': 7
        },
        '351': {
            'IFD': 1,
            'key': 'OPIProxy',
            'type': 3
        },
        '512': {
            'IFD': 1,
            'key': 'JPEGProc',
            'type': 4
        },
        '513': {
            'IFD': 1,
            'key': 'JPEGInterchangeFormat',
            'type': 4
        },
        '514': {
            'IFD': 1,
            'key': 'JPEGInterchangeFormatLength',
            'type': 4
        },
        '515': {
            'IFD': 1,
            'key': 'JPEGRestartInterval',
            'type': 3
        },
        '517': {
            'IFD': 1,
            'key': 'JPEGLosslessPredictors',
            'type': 3
        },
        '518': {
            'IFD': 1,
            'key': 'JPEGPointTransforms',
            'type': 3
        },
        '519': {
            'IFD': 1,
            'key': 'JPEGQTables',
            'type': 4
        },
        '520': {
            'IFD': 1,
            'key': 'JPEGDCTables',
            'type': 4
        },
        '521': {
            'IFD': 1,
            'key': 'JPEGACTables',
            'type': 4
        },
        '529': {
            'IFD': 1,
            'key': 'YCbCrCoefficients',
            'type': 5
        },
        '530': {
            'IFD': 1,
            'key': 'YCbCrSubSampling',
            'type': 3
        },
        '531': {
            'IFD': 1,
            'key': 'YCbCrPositioning',
            'type': 3
        },
        '532': {
            'IFD': 1,
            'key': 'ReferenceBlackWhite',
            'type': 5
        },
        '700': {
            'IFD': 1,
            'key': 'XMLPacket',
            'type': 1
        },
        '18246': {
            'IFD': 1,
            'key': 'Rating',
            'type': 3
        },
        '18249': {
            'IFD': 1,
            'key': 'RatingPercent',
            'type': 3
        },
        '32781': {
            'IFD': 1,
            'key': 'ImageID',
            'type': 2
        },
        '33421': {
            'IFD': 1,
            'key': 'CFARepeatPatternDim',
            'type': 3
        },
        '33422': {
            'IFD': 1,
            'key': 'CFAPattern',
            'type': 1
        },
        '33423': {
            'IFD': 1,
            'key': 'BatteryLevel',
            'type': 5
        },
        '33432': {
            'IFD': 1,
            'key': 'Copyright',
            'type': 2
        },
        '33434': {
            'IFD': 2,
            'key': 'ExposureTime',
            'type': 5
        },
        '33437': {
            'IFD': 2,
            'key': 'FNumber',
            'type': 5
        },
        '33723': {
            'IFD': 1,
            'key': 'IPTCNAA',
            'type': 4
        },
        '34377': {
            'IFD': 1,
            'key': 'ImageResources',
            'type': 1
        },
        '34665': {
            'IFD': 1,
            'key': 'ExifTag',
            'type': 4
        },
        '34675': {
            'IFD': 1,
            'key': 'InterColorProfile',
            'type': 7
        },
        '34850': {
            'IFD': 2,
            'key': 'ExposureProgram',
            'type': 3
        },
        '34852': {
            'IFD': 2,
            'key': 'SpectralSensitivity',
            'type': 2
        },
        '34853': {
            'IFD': 1,
            'key': 'GPSTag',
            'type': 4
        },
        '34855': {
            'IFD': 2,
            'key': 'ISOSpeedRatings',
            'type': 3
        },
        '34856': {
            'IFD': 2,
            'key': 'OECF',
            'type': 7
        },
        '34857': {
            'IFD': 1,
            'key': 'Interlace',
            'type': 3
        },
        '34858': {
            'IFD': 1,
            'key': 'TimeZoneOffset',
            'type': 8
        },
        '34859': {
            'IFD': 1,
            'key': 'SelfTimerMode',
            'type': 3
        },
        '34864': {
            'IFD': 2,
            'key': 'SensitivityType',
            'type': 3
        },
        '34865': {
            'IFD': 2,
            'key': 'StandardOutputSensitivity',
            'type': 4
        },
        '34866': {
            'IFD': 2,
            'key': 'RecommendedExposureIndex',
            'type': 4
        },
        '34867': {
            'IFD': 2,
            'key': 'ISOSpeed',
            'type': 4
        },
        '34868': {
            'IFD': 2,
            'key': 'ISOSpeedLatitudeyyy',
            'type': 4
        },
        '34869': {
            'IFD': 2,
            'key': 'ISOSpeedLatitudezzz',
            'type': 4
        },
        '36864': {
            'IFD': 2,
            'key': 'ExifVersion',
            'type': 7
        },
        '36867': {
            'IFD': 2,
            'key': 'DateTimeOriginal',
            'type': 2
        },
        '36868': {
            'IFD': 2,
            'key': 'DateTimeDigitized',
            'type': 2
        },
        '37121': {
            'IFD': 2,
            'key': 'ComponentsConfiguration',
            'type': 7
        },
        '37122': {
            'IFD': 2,
            'key': 'CompressedBitsPerPixel',
            'type': 5
        },
        '37377': {
            'IFD': 2,
            'key': 'ShutterSpeedValue',
            'type': 10
        },
        '37378': {
            'IFD': 2,
            'key': 'ApertureValue',
            'type': 5
        },
        '37379': {
            'IFD': 2,
            'key': 'BrightnessValue',
            'type': 10
        },
        '37380': {
            'IFD': 2,
            'key': 'ExposureBiasValue',
            'type': 10
        },
        '37381': {
            'IFD': 2,
            'key': 'MaxApertureValue',
            'type': 5
        },
        '37382': {
            'IFD': 2,
            'key': 'SubjectDistance',
            'type': 5
        },
        '37383': {
            'IFD': 2,
            'key': 'MeteringMode',
            'type': 3
        },
        '37384': {
            'IFD': 2,
            'key': 'LightSource',
            'type': 3
        },
        '37385': {
            'IFD': 2,
            'key': 'Flash',
            'type': 3
        },
        '37386': {
            'IFD': 2,
            'key': 'FocalLength',
            'type': 5
        },
        '37387': {
            'IFD': 1,
            'key': 'FlashEnergy',
            'type': 5
        },
        '37388': {
            'IFD': 1,
            'key': 'SpatialFrequencyResponse',
            'type': 7
        },
        '37389': {
            'IFD': 1,
            'key': 'Noise',
            'type': 7
        },
        '37390': {
            'IFD': 1,
            'key': 'FocalPlaneXResolution',
            'type': 5
        },
        '37391': {
            'IFD': 1,
            'key': 'FocalPlaneYResolution',
            'type': 5
        },
        '37392': {
            'IFD': 1,
            'key': 'FocalPlaneResolutionUnit',
            'type': 3
        },
        '37393': {
            'IFD': 1,
            'key': 'ImageNumber',
            'type': 4
        },
        '37394': {
            'IFD': 1,
            'key': 'SecurityClassification',
            'type': 2
        },
        '37395': {
            'IFD': 1,
            'key': 'ImageHistory',
            'type': 2
        },
        '37396': {
            'IFD': 2,
            'key': 'SubjectArea',
            'type': 3
        },
        '37397': {
            'IFD': 1,
            'key': 'ExposureIndex',
            'type': 5
        },
        '37398': {
            'IFD': 1,
            'key': 'TIFFEPStandardID',
            'type': 1
        },
        '37399': {
            'IFD': 1,
            'key': 'SensingMethod',
            'type': 3
        },
        '37500': {
            'IFD': 2,
            'key': 'MakerNote',
            'type': 7
        },
        '37510': {
            'IFD': 2,
            'key': 'UserComment',
            'type': 2
        },
        '37520': {
            'IFD': 2,
            'key': 'SubSecTime',
            'type': 2
        },
        '37521': {
            'IFD': 2,
            'key': 'SubSecTimeOriginal',
            'type': 2
        },
        '37522': {
            'IFD': 2,
            'key': 'SubSecTimeDigitized',
            'type': 2
        },
        '40091': {
            'IFD': 1,
            'key': 'XPTitle',
            'type': 1
        },
        '40092': {
            'IFD': 1,
            'key': 'XPComment',
            'type': 1
        },
        '40093': {
            'IFD': 1,
            'key': 'XPAuthor',
            'type': 1
        },
        '40094': {
            'IFD': 1,
            'key': 'XPKeywords',
            'type': 1
        },
        '40095': {
            'IFD': 1,
            'key': 'XPSubject',
            'type': 1
        },
        '40960': {
            'IFD': 2,
            'key': 'FlashpixVersion',
            'type': 7
        },
        '40961': {
            'IFD': 2,
            'key': 'ColorSpace',
            'type': 3
        },
        '40962': {
            'IFD': 2,
            'key': 'PixelXDimension',
            'type': 4
        },
        '40963': {
            'IFD': 2,
            'key': 'PixelYDimension',
            'type': 4
        },
        '40964': {
            'IFD': 2,
            'key': 'RelatedSoundFile',
            'type': 2
        },
        '40965': {
            'IFD': 2,
            'key': 'InteroperabilityTag',
            'type': 4
        },
        '41483': {
            'IFD': 2,
            'key': 'FlashEnergy',
            'type': 5
        },
        '41484': {
            'IFD': 2,
            'key': 'SpatialFrequencyResponse',
            'type': 7
        },
        '41486': {
            'IFD': 2,
            'key': 'FocalPlaneXResolution',
            'type': 5
        },
        '41487': {
            'IFD': 2,
            'key': 'FocalPlaneYResolution',
            'type': 5
        },
        '41488': {
            'IFD': 2,
            'key': 'FocalPlaneResolutionUnit',
            'type': 3
        },
        '41492': {
            'IFD': 2,
            'key': 'SubjectLocation',
            'type': 3
        },
        '41493': {
            'IFD': 2,
            'key': 'ExposureIndex',
            'type': 5
        },
        '41495': {
            'IFD': 2,
            'key': 'SensingMethod',
            'type': 3
        },
        '41728': {
            'IFD': 2,
            'key': 'FileSource',
            'type': 7
        },
        '41729': {
            'IFD': 2,
            'key': 'SceneType',
            'type': 7
        },
        '41730': {
            'IFD': 2,
            'key': 'CFAPattern',
            'type': 7
        },
        '41985': {
            'IFD': 2,
            'key': 'CustomRendered',
            'type': 3
        },
        '41986': {
            'IFD': 2,
            'key': 'ExposureMode',
            'type': 3
        },
        '41987': {
            'IFD': 2,
            'key': 'WhiteBalance',
            'type': 3
        },
        '41988': {
            'IFD': 2,
            'key': 'DigitalZoomRatio',
            'type': 5
        },
        '41989': {
            'IFD': 2,
            'key': 'FocalLengthIn35mmFilm',
            'type': 3
        },
        '41990': {
            'IFD': 2,
            'key': 'SceneCaptureType',
            'type': 3
        },
        '41991': {
            'IFD': 2,
            'key': 'GainControl',
            'type': 3
        },
        '41992': {
            'IFD': 2,
            'key': 'Contrast',
            'type': 3
        },
        '41993': {
            'IFD': 2,
            'key': 'Saturation',
            'type': 3
        },
        '41994': {
            'IFD': 2,
            'key': 'Sharpness',
            'type': 3
        },
        '41995': {
            'IFD': 2,
            'key': 'DeviceSettingDescription',
            'type': 7
        },
        '41996': {
            'IFD': 2,
            'key': 'SubjectDistanceRange',
            'type': 3
        },
        '42016': {
            'IFD': 2,
            'key': 'ImageUniqueID',
            'type': 2
        },
        '42032': {
            'IFD': 2,
            'key': 'CameraOwnerName',
            'type': 2
        },
        '42033': {
            'IFD': 2,
            'key': 'BodySerialNumber',
            'type': 2
        },
        '42034': {
            'IFD': 2,
            'key': 'LensSpecification',
            'type': 5
        },
        '42035': {
            'IFD': 2,
            'key': 'LensMake',
            'type': 2
        },
        '42036': {
            'IFD': 2,
            'key': 'LensModel',
            'type': 2
        },
        '42037': {
            'IFD': 2,
            'key': 'LensSerialNumber',
            'type': 2
        },
        '50341': {
            'IFD': 1,
            'key': 'PrintImageMatching',
            'type': 7
        },
        '50706': {
            'IFD': 1,
            'key': 'DNGVersion',
            'type': 1
        },
        '50707': {
            'IFD': 1,
            'key': 'DNGBackwardVersion',
            'type': 1
        },
        '50708': {
            'IFD': 1,
            'key': 'UniqueCameraModel',
            'type': 2
        },
        '50709': {
            'IFD': 1,
            'key': 'LocalizedCameraModel',
            'type': 1
        },
        '50710': {
            'IFD': 1,
            'key': 'CFAPlaneColor',
            'type': 1
        },
        '50711': {
            'IFD': 1,
            'key': 'CFALayout',
            'type': 3
        },
        '50712': {
            'IFD': 1,
            'key': 'LinearizationTable',
            'type': 3
        },
        '50713': {
            'IFD': 1,
            'key': 'BlackLevelRepeatDim',
            'type': 3
        },
        '50714': {
            'IFD': 1,
            'key': 'BlackLevel',
            'type': 5
        },
        '50715': {
            'IFD': 1,
            'key': 'BlackLevelDeltaH',
            'type': 10
        },
        '50716': {
            'IFD': 1,
            'key': 'BlackLevelDeltaV',
            'type': 10
        },
        '50717': {
            'IFD': 1,
            'key': 'WhiteLevel',
            'type': 3
        },
        '50718': {
            'IFD': 1,
            'key': 'DefaultScale',
            'type': 5
        },
        '50719': {
            'IFD': 1,
            'key': 'DefaultCropOrigin',
            'type': 3
        },
        '50720': {
            'IFD': 1,
            'key': 'DefaultCropSize',
            'type': 3
        },
        '50721': {
            'IFD': 1,
            'key': 'ColorMatrix1',
            'type': 10
        },
        '50722': {
            'IFD': 1,
            'key': 'ColorMatrix2',
            'type': 10
        },
        '50723': {
            'IFD': 1,
            'key': 'CameraCalibration1',
            'type': 10
        },
        '50724': {
            'IFD': 1,
            'key': 'CameraCalibration2',
            'type': 10
        },
        '50725': {
            'IFD': 1,
            'key': 'ReductionMatrix1',
            'type': 10
        },
        '50726': {
            'IFD': 1,
            'key': 'ReductionMatrix2',
            'type': 10
        },
        '50727': {
            'IFD': 1,
            'key': 'AnalogBalance',
            'type': 5
        },
        '50728': {
            'IFD': 1,
            'key': 'AsShotNeutral',
            'type': 3
        },
        '50729': {
            'IFD': 1,
            'key': 'AsShotWhiteXY',
            'type': 5
        },
        '50730': {
            'IFD': 1,
            'key': 'BaselineExposure',
            'type': 10
        },
        '50731': {
            'IFD': 1,
            'key': 'BaselineNoise',
            'type': 5
        },
        '50732': {
            'IFD': 1,
            'key': 'BaselineSharpness',
            'type': 5
        },
        '50733': {
            'IFD': 1,
            'key': 'BayerGreenSplit',
            'type': 4
        },
        '50734': {
            'IFD': 1,
            'key': 'LinearResponseLimit',
            'type': 5
        },
        '50735': {
            'IFD': 1,
            'key': 'CameraSerialNumber',
            'type': 2
        },
        '50736': {
            'IFD': 1,
            'key': 'LensInfo',
            'type': 5
        },
        '50737': {
            'IFD': 1,
            'key': 'ChromaBlurRadius',
            'type': 5
        },
        '50738': {
            'IFD': 1,
            'key': 'AntiAliasStrength',
            'type': 5
        },
        '50739': {
            'IFD': 1,
            'key': 'ShadowScale',
            'type': 10
        },
        '50740': {
            'IFD': 1,
            'key': 'DNGPrivateData',
            'type': 1
        },
        '50741': {
            'IFD': 1,
            'key': 'MakerNoteSafety',
            'type': 3
        },
        '50778': {
            'IFD': 1,
            'key': 'CalibrationIlluminant1',
            'type': 3
        },
        '50779': {
            'IFD': 1,
            'key': 'CalibrationIlluminant2',
            'type': 3
        },
        '50780': {
            'IFD': 1,
            'key': 'BestQualityScale',
            'type': 5
        },
        '50781': {
            'IFD': 1,
            'key': 'RawDataUniqueID',
            'type': 1
        },
        '50827': {
            'IFD': 1,
            'key': 'OriginalRawFileName',
            'type': 1
        },
        '50828': {
            'IFD': 1,
            'key': 'OriginalRawFileData',
            'type': 7
        },
        '50829': {
            'IFD': 1,
            'key': 'ActiveArea',
            'type': 3
        },
        '50830': {
            'IFD': 1,
            'key': 'MaskedAreas',
            'type': 3
        },
        '50831': {
            'IFD': 1,
            'key': 'AsShotICCProfile',
            'type': 7
        },
        '50832': {
            'IFD': 1,
            'key': 'AsShotPreProfileMatrix',
            'type': 10
        },
        '50833': {
            'IFD': 1,
            'key': 'CurrentICCProfile',
            'type': 7
        },
        '50834': {
            'IFD': 1,
            'key': 'CurrentPreProfileMatrix',
            'type': 10
        },
        '50879': {
            'IFD': 1,
            'key': 'ColorimetricReference',
            'type': 3
        },
        '50931': {
            'IFD': 1,
            'key': 'CameraCalibrationSignature',
            'type': 1
        },
        '50932': {
            'IFD': 1,
            'key': 'ProfileCalibrationSignature',
            'type': 1
        },
        '50934': {
            'IFD': 1,
            'key': 'AsShotProfileName',
            'type': 1
        },
        '50935': {
            'IFD': 1,
            'key': 'NoiseReductionApplied',
            'type': 5
        },
        '50936': {
            'IFD': 1,
            'key': 'ProfileName',
            'type': 1
        },
        '50937': {
            'IFD': 1,
            'key': 'ProfileHueSatMapDims',
            'type': 4
        },
        '50938': {
            'IFD': 1,
            'key': 'ProfileHueSatMapData1',
            'type': 11
        },
        '50939': {
            'IFD': 1,
            'key': 'ProfileHueSatMapData2',
            'type': 11
        },
        '50940': {
            'IFD': 1,
            'key': 'ProfileToneCurve',
            'type': 11
        },
        '50941': {
            'IFD': 1,
            'key': 'ProfileEmbedPolicy',
            'type': 4
        },
        '50942': {
            'IFD': 1,
            'key': 'ProfileCopyright',
            'type': 1
        },
        '50964': {
            'IFD': 1,
            'key': 'ForwardMatrix1',
            'type': 10
        },
        '50965': {
            'IFD': 1,
            'key': 'ForwardMatrix2',
            'type': 10
        },
        '50966': {
            'IFD': 1,
            'key': 'PreviewApplicationName',
            'type': 1
        },
        '50967': {
            'IFD': 1,
            'key': 'PreviewApplicationVersion',
            'type': 1
        },
        '50968': {
            'IFD': 1,
            'key': 'PreviewSettingsName',
            'type': 1
        },
        '50969': {
            'IFD': 1,
            'key': 'PreviewSettingsDigest',
            'type': 1
        },
        '50970': {
            'IFD': 1,
            'key': 'PreviewColorSpace',
            'type': 4
        },
        '50971': {
            'IFD': 1,
            'key': 'PreviewDateTime',
            'type': 2
        },
        '50972': {
            'IFD': 1,
            'key': 'RawImageDigest',
            'type': 7
        },
        '50973': {
            'IFD': 1,
            'key': 'OriginalRawFileDigest',
            'type': 7
        },
        '50974': {
            'IFD': 1,
            'key': 'SubTileBlockSize',
            'type': 4
        },
        '50975': {
            'IFD': 1,
            'key': 'RowInterleaveFactor',
            'type': 4
        },
        '50981': {
            'IFD': 1,
            'key': 'ProfileLookTableDims',
            'type': 4
        },
        '50982': {
            'IFD': 1,
            'key': 'ProfileLookTableData',
            'type': 11
        },
        '51008': {
            'IFD': 1,
            'key': 'OpcodeList1',
            'type': 7
        },
        '51009': {
            'IFD': 1,
            'key': 'OpcodeList2',
            'type': 7
        },
        '51022': {
            'IFD': 1,
            'key': 'OpcodeList3',
            'type': 7
        },
        '51041': {
            'IFD': 1,
            'key': 'NoiseProfile',
            'type': 12
        }
    };
    var tagsStringValues = {
        'ExposureProgram': {
            0: 'Not defined',
            1: 'Manual',
            2: 'Normal program',
            3: 'Aperture priority',
            4: 'Shutter priority',
            5: 'Creative program',
            6: 'Action program',
            7: 'Portrait mode',
            8: 'Landscape mode'
        },
        'MeteringMode': {
            0: 'Unknown',
            1: 'Average',
            2: 'CenterWeightedAverage',
            3: 'Spot',
            4: 'MultiSpot',
            5: 'Pattern',
            6: 'Partial',
            255: 'Other'
        },
        'LightSource': {
            0: 'Unknown',
            1: 'Daylight',
            2: 'Fluorescent',
            3: 'Tungsten (incandescent light)',
            4: 'Flash',
            9: 'Fine weather',
            10: 'Cloudy weather',
            11: 'Shade',
            12: 'Daylight fluorescent (D 5700 - 7100K)',
            13: 'Day white fluorescent (N 4600 - 5400K)',
            14: 'Cool white fluorescent (W 3900 - 4500K)',
            15: 'White fluorescent (WW 3200 - 3700K)',
            17: 'Standard light A',
            18: 'Standard light B',
            19: 'Standard light C',
            20: 'D55',
            21: 'D65',
            22: 'D75',
            23: 'D50',
            24: 'ISO studio tungsten',
            255: 'Other'
        },
        'Flash': {
            0: 'Flash did not fire',
            1: 'Flash fired',
            5: 'Strobe return light not detected',
            7: 'Strobe return light detected',
            9: 'Flash fired, compulsory flash mode',
            13: 'Flash fired, compulsory flash mode, return light not detected',
            15: 'Flash fired, compulsory flash mode, return light detected',
            16: 'Flash did not fire, compulsory flash mode',
            24: 'Flash did not fire, auto mode',
            25: 'Flash fired, auto mode',
            29: 'Flash fired, auto mode, return light not detected',
            31: 'Flash fired, auto mode, return light detected',
            32: 'No flash function',
            65: 'Flash fired, red-eye reduction mode',
            69: 'Flash fired, red-eye reduction mode, return light not detected',
            71: 'Flash fired, red-eye reduction mode, return light detected',
            73: 'Flash fired, compulsory flash mode, red-eye reduction mode',
            77: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected',
            79: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light detected',
            89: 'Flash fired, auto mode, red-eye reduction mode',
            93: 'Flash fired, auto mode, return light not detected, red-eye reduction mode',
            95: 'Flash fired, auto mode, return light detected, red-eye reduction mode'
        },
        'SensingMethod': {
            1: 'Not defined',
            2: 'One-chip color area sensor',
            3: 'Two-chip color area sensor',
            4: 'Three-chip color area sensor',
            5: 'Color sequential area sensor',
            7: 'Trilinear sensor',
            8: 'Color sequential linear sensor'
        },
        'SceneCaptureType': {
            0: 'Standard',
            1: 'Landscape',
            2: 'Portrait',
            3: 'Night scene'
        },
        'SceneType': { 1: 'Directly photographed' },
        'CustomRendered': {
            0: 'Normal process',
            1: 'Custom process'
        },
        'WhiteBalance': {
            0: 'Auto white balance',
            1: 'Manual white balance'
        },
        'GainControl': {
            0: 'None',
            1: 'Low gain up',
            2: 'High gain up',
            3: 'Low gain down',
            4: 'High gain down'
        },
        'Contrast': {
            0: 'Normal',
            1: 'Soft',
            2: 'Hard'
        },
        'Saturation': {
            0: 'Normal',
            1: 'Low saturation',
            2: 'High saturation'
        },
        'Sharpness': {
            0: 'Normal',
            1: 'Soft',
            2: 'Hard'
        },
        'SubjectDistanceRange': {
            0: 'Unknown',
            1: 'Macro',
            2: 'Close view',
            3: 'Distant view'
        },
        'FileSource': { 3: 'DSC' },
        'Components': {
            0: '',
            1: 'Y',
            2: 'Cb',
            3: 'Cr',
            4: 'R',
            5: 'G',
            6: 'B'
        }
    };
    var orientationDegrees = {
        '1': 0,
        '2': 0,
        '3': 180,
        '4': 180,
        '5': 90,
        '6': 90,
        '7': 270,
        '8': 270
    };
    var rotateImage = function (orientation, degrees) {
        var clockWiseRotation = {
            1: 6,
            2: 5,
            3: 8,
            4: 7,
            5: 4,
            6: 3,
            7: 2,
            8: 1
        };
        var counterClockWiseRotation = {
            1: 8,
            2: 7,
            3: 6,
            4: 5,
            5: 2,
            6: 1,
            7: 4,
            8: 3
        };
        var steps = Math.abs(Math.ceil(degrees / 90));
        var clockWise = degrees > 0;
        while (steps > 0) {
            orientation = clockWise ? clockWiseRotation[orientation] : counterClockWiseRotation[orientation];
            steps--;
        }
        return orientation;
    };
    var getTagId = function (key) {
        var id;
        Object.keys(tags).forEach(function (tagId) {
            if (tags[tagId].key === key) {
                id = tagId;
            }
        });
        return id;
    };
    this.JPEGParser = this.JPEGParser || {};
    this.JPEGParser.exifSpec = {
        rotateImage: rotateImage,
        orientationDegrees: orientationDegrees,
        getTagId: getTagId,
        tags: tags,
        interOperabilityTags: interOperabilityTags,
        tagTypeSize: tagTypeSize
    };
}.call(this));
(function () {
    'use strict';
    var segmentTypes = {
        1: 'TEM',
        2: 'RES',
        192: 'SOF0',
        193: 'SOF1',
        194: 'SOF2',
        195: 'SOF3',
        197: 'SOF5',
        198: 'SOF6',
        199: 'SOF7',
        201: 'SOF9',
        202: 'SOF10',
        203: 'SOF11',
        205: 'SOF13',
        206: 'SOF14',
        207: 'SOF15',
        204: 'DAC',
        196: 'DHT',
        208: 'RST0',
        209: 'RST1',
        210: 'RST2',
        211: 'RST3',
        212: 'RST4',
        213: 'RST5',
        214: 'RST6',
        215: 'RST7',
        216: 'SOI',
        217: 'EOI',
        218: 'SOS',
        219: 'DQT',
        220: 'DNL',
        221: 'DRI',
        222: 'DHP',
        223: 'EXP',
        224: 'APP0',
        225: 'APP1',
        226: 'APP2',
        227: 'APP3',
        228: 'APP4',
        229: 'APP5',
        230: 'APP6',
        231: 'APP7',
        232: 'APP8',
        233: 'APP9',
        234: 'APP10',
        235: 'APP11',
        236: 'APP12',
        237: 'APP13',
        238: 'APP14',
        239: 'APP15',
        240: 'JPG0',
        241: 'JPG1',
        242: 'JPG2',
        243: 'JPG3',
        244: 'JPG4',
        245: 'JPG5',
        246: 'JPG6',
        247: 'JPG7',
        248: 'JPG8',
        249: 'JPG9',
        250: 'JPG10',
        251: 'JPG11',
        252: 'JPG12',
        253: 'JPG13',
        254: 'COM'
    };
    var APPSegmentFormats = {
        'JFIF': { 'segmentType': 'APP1' },
        'JFXX': { 'segmentType': 'APP1' },
        'Exif': { 'segmentType': 'APP0' }
    };
    this.JPEGParser = this.JPEGParser || {};
    this.JPEGParser.jpegSpec = {};
    this.JPEGParser.jpegSpec.segmentTypes = segmentTypes;
    this.JPEGParser.jpegSpec.APPSegmentFormats = APPSegmentFormats;
}.call(this));
(function () {
    'use strict';
    var readSegment = function (blobView, offset) {
        var metaData = {};
        var thumbnailBlob;
        metaData.version = blobView.getUint8(offset + 9).toString();
        metaData.version += '.0' + blobView.getUint8(offset + 10);
        metaData.units = blobView.getUint8(offset + 11);
        metaData.XDensity = blobView.getUint16(offset + 12);
        metaData.YDensity = blobView.getUint16(offset + 14);
        metaData.XThumbnail = blobView.getUint8(offset + 16);
        metaData.YThumbnail = blobView.getUint8(offset + 17);
        if (metaData.XThumbnail !== 0 && metaData.YThumbnail !== 0) {
            thumbnailBlob = blobView.blob.slice(offset + 18, 3 * metaData.XThumbnail * metaData.YThumbnail);
        }
        return {
            'metaData': metaData,
            'thumbnailBlob': thumbnailBlob
        };
    };
    this.JPEGParser = this.JPEGParser || {};
    this.JPEGParser.JFIF = this.JPEGParser.JFIF || {};
    this.JPEGParser.JFIF.readSegment = readSegment;
}.call(this));
(function () {
    'use strict';
    var offsets = {
        'segmentMarker': 0,
        'APP1Marker': 1,
        'APP1Length': 2,
        'TIFFHeader': 10,
        'TIFFByteOrder': 10,
        'TIFFMagicNumber': 12,
        'TIFFFirstIFD': 14
    };
    var exifSpec = JPEGParser.exifSpec;
    var mergeObjects = function (object1, object2) {
        for (var tag in object2) {
            if (object2.hasOwnProperty(tag)) {
                object1[tag] = object2[tag];
            }
        }
        return object1;
    };
    var parseASCIIString = function (blobView, offset, count) {
        var value = '';
        for (var i = 0; i < count; i++) {
            var ch = blobView.getUint8(offset + i);
            if (ch !== 0 || i < count - 1) {
                value += String.fromCharCode(ch);
            }
        }
        return value;
    };
    var writeTagValueArray = function (blobView, valueOffset, type, arrayOfValues, byteOrder) {
        var writtenBytes = 0;
        var i;
        if (Array.isArray(arrayOfValues)) {
            for (i = 0; i < arrayOfValues.length; ++i) {
                writtenBytes += writeTagValue(blobView, valueOffset + writtenBytes, type, arrayOfValues[i], byteOrder);
            }
        } else {
            throw 'Error writing array, the value is not an array: ' + arrayOfValues;
        }
        return writtenBytes;
    };
    var writeTagValue = function (blobView, valueOffset, typeId, newValue, byteOrder) {
        var writtenBytes;
        if (Array.isArray(newValue)) {
            writtenBytes = writeTagValueArray(blobView, valueOffset, typeId, newValue, byteOrder);
        } else {
            switch (typeId) {
            case 1:
                blobView.setUint8(valueOffset, newValue);
                writtenBytes = 1;
                break;
            case 2:
                writtenBytes = writeString(blobView, valueOffset, newValue);
                break;
            case 3:
                blobView.setUint16(valueOffset, newValue, byteOrder);
                writtenBytes = 2;
                break;
            case 4:
                blobView.setUint32(valueOffset, newValue, byteOrder);
                writtenBytes = 4;
                break;
            case 6:
                blobView.setInt8(valueOffset, newValue);
                writtenBytes = 1;
                break;
            case 7:
                blobView.setUint8(valueOffset, newValue);
                writtenBytes = 1;
                break;
            case 8:
                blobView.setInt16(valueOffset, newValue, byteOrder);
                writtenBytes = 2;
                break;
            case 9:
                blobView.setInt32(valueOffset, newValue, byteOrder);
                writtenBytes = 4;
                break;
            case 10:
            case 5:
                writeRational(blobView, valueOffset, typeId, newValue, byteOrder);
                writtenBytes = 8;
                break;
            case 11:
                blobView.setFloat32(valueOffset, newValue, byteOrder);
                writtenBytes = 4;
                break;
            case 12:
                blobView.setFloat64(valueOffset, newValue, byteOrder);
                writtenBytes = 8;
                break;
            default:
                throw 'Writting Exif Tag Value: Unkown value type: ' + valueType;
            }
        }
        return writtenBytes;
    };
    var parseTagValue = function (blobView, valueOffset, typeId, count) {
        var numerator;
        var denominator;
        switch (typeId) {
        case 1:
            return blobView.getUint8(valueOffset);
        case 2:
            return parseASCIIString(blobView, valueOffset, count);
        case 3:
            return blobView.getUint16(valueOffset);
        case 4:
            return blobView.getUint32(valueOffset);
        case 5:
            numerator = blobView.getUint32(valueOffset);
            denominator = blobView.getUint32(valueOffset + 4);
            return {
                'numerator': numerator,
                'denominator': denominator
            };
        case 6:
            return blobView.getInt8(valueOffset);
        case 7:
            return blobView.getUint8(valueOffset);
        case 8:
            return blobView.getInt16(valueOffset);
        case 9:
            return blobView.getInt32(valueOffset);
        case 10:
            numerator = blobView.getInt32(valueOffset);
            denominator = blobView.getInt32(valueOffset + 4);
            return {
                'numerator': numerator,
                'denominator': denominator
            };
        case 11:
            return blobView.getFloat32(valueOffset);
        case 12:
            return blobView.getFloat64(valueOffset);
        default:
            throw 'Reading Exif Tag Value: Unkown value type: ' + typeId;
        }
    };
    var readTagValue = function (blobView, TIFFHeaderOffset, valueOffset, typeId, count) {
        var tagValues;
        var typeSize = exifSpec.tagTypeSize[typeId];
        if (typeSize * count > 4) {
            valueOffset = TIFFHeaderOffset + blobView.getUint32(valueOffset);
        }
        if (count === 1 || typeId === 2) {
            return parseTagValue(blobView, valueOffset, typeId, count);
        } else {
            tagValues = [];
            for (var i = 0; i < count; ++i) {
                tagValues.push(parseTagValue(blobView, valueOffset, typeId, 1));
                valueOffset += typeSize;
            }
            return tagValues;
        }
    };
    var writeRational = function (blobView, valueOffset, typeId, newValue, byteOrder) {
        if (typeId === 10) {
            blobView.setInt32(valueOffset, newValue.numerator, byteOrder);
            blobView.setInt32(valueOffset + 4, newValue.denominator, byteOrder);
        }
        if (typeId === 5) {
            blobView.setUint32(valueOffset, newValue.numerator, byteOrder);
            blobView.setUint32(valueOffset + 4, newValue.denominator, byteOrder);
        }
        return 8;
    };
    var writeString = function (blobView, offset, str) {
        var i;
        for (i = 0; i < str.length; ++i) {
            blobView.setUint8(offset + i, str.charCodeAt(i));
        }
        blobView.setUint8(offset + str.length, 0);
        return str.length + 1;
    };
    var readIFD = function (blobView, TIFFHeaderOffset, IFDOffset) {
        var offset = TIFFHeaderOffset + IFDOffset;
        var numberOfEntries = blobView.getUint16(offset);
        offset += 2;
        var i;
        var entries;
        var entry;
        var tag;
        var typeId;
        var count;
        var tagValueOffset;
        var nextIFDOffset;
        if (numberOfEntries > 0) {
            entries = {};
        }
        for (i = 0; i < numberOfEntries; ++i) {
            tag = blobView.getUint16(offset);
            typeId = blobView.getUint16(offset + 2);
            count = blobView.getUint32(offset + 4);
            entries[tag] = {
                'type': typeId,
                'count': count,
                'value': readTagValue(blobView, TIFFHeaderOffset, offset + 8, typeId, count),
                'valueOffset': offset + 8
            };
            offset += 12;
        }
        nextIFDOffset = blobView.getUint32(offset);
        return {
            'entries': entries,
            'nextIFDOffset': nextIFDOffset
        };
    };
    var writeIFD = function (blobView, TIFFHeaderOffset, IFDOffset, valuesOffset, IFDType, metaData, nextIFD) {
        var count;
        var bytesWritten = 0;
        var bytesWrittenValue;
        var numberOfEntries = 0;
        var offset = IFDOffset + 2;
        Object.keys(metaData).forEach(function (key) {
            var tagId = exifSpec.getTagId(key);
            var tagInfo = exifSpec.tags[tagId];
            if (!tagInfo) {
                return;
            }
            var type = tagInfo.type;
            var typeSize = exifSpec.tagTypeSize[type];
            if (tagId && tagInfo.IFD === IFDType) {
                blobView.setUint16(offset, tagId, false);
                blobView.setUint16(offset + 2, type, false);
                count = calculateTagValueCount(type, metaData[key]);
                blobView.setUint32(offset + 4, count, false);
                if (count * typeSize <= 4) {
                    writeTagValue(blobView, offset + 8, type, metaData[key], false);
                } else {
                    blobView.setUint32(offset + 8, valuesOffset - TIFFHeaderOffset, false);
                    bytesWrittenValue = writeTagValue(blobView, valuesOffset, type, metaData[key], false);
                    if (bytesWrittenValue % 2 === 1)
                        bytesWrittenValue++;
                    valuesOffset += bytesWrittenValue;
                    bytesWritten += bytesWrittenValue;
                }
                bytesWritten += 12;
                offset += 12;
                numberOfEntries++;
            }
        });
        if (numberOfEntries || IFDType === 2 && metaData.ExifTag || IFDType === 3 && metaData.GPSTag || IFDType === 4 && metaData.InteroperabilityTag) {
            blobView.setUint16(IFDOffset, numberOfEntries, false);
            bytesWritten += 2;
        }
        if (IFDType === 1) {
            bytesWritten += 4;
            if (nextIFD) {
                blobView.setUint32(offset, bytesWritten + 8, false);
            } else {
                blobView.setUint32(offset, 0, false);
            }
        }
        return bytesWritten;
    };
    var makeDirectoryEntriesHumanReadable = function (entries) {
        var tags = {};
        var tagInfo;
        Object.keys(entries).forEach(function (tag) {
            tagInfo = entries.IFD === 4 ? interOperabilityTags.tags[tag] : exifSpec.tags[tag];
            if (!tagInfo) {
                if (showErrors)
                    console.log('Error parsing IFD: Tag  ' + tag + ' is not valid');
                return;
            }
            tags[tagInfo.key] = entries[tag].value;
        });
        return tags;
    };
    var readTIFFByteOrder = function (blobView, TIFFOffset) {
        var byteOrder = blobView.getUint16(TIFFOffset + offsets.TIFFByteOrder);
        if (byteOrder !== 18761 && byteOrder !== 19789) {
            throw 'TIFF Image parser failed: Invalid byte order in EXIF segment';
        }
        return byteOrder;
    };
    var isTIFFLittleEndian = function (byteOrder) {
        if (byteOrder === 18761) {
            return true;
        } else if (byteOrder === 19789) {
            return false;
        } else {
            throw 'TIFF Image parser failed: Invalid byte order in EXIF segment';
        }
    };
    var isValidTIFFFile = function (blobView, TIFFOffset) {
        var TIFFMagicNumber = blobView.getUint16(TIFFOffset + offsets.TIFFMagicNumber);
        if (TIFFMagicNumber !== 42) {
            throw 'TIFF Image parser failed: Wrong magic number in TIFF header';
        }
        return true;
    };
    var readExifMetaData = function (blobView, TIFFOffset) {
        var thumbnailBlob;
        var thumbnailIFDEntries;
        var IFD0;
        var IFD1;
        var EXIFIFD;
        var GPSIFD;
        var interoperabilityIFD;
        var JPEGInterchangeFormatLength;
        var JPEGInterchangeFormat;
        var TIFFHeaderOffset = TIFFOffset + offsets.TIFFHeader;
        var byteOrder = readTIFFByteOrder(blobView, TIFFOffset);
        blobView.littleEndian = isTIFFLittleEndian(byteOrder);
        if (!isValidTIFFFile(blobView, TIFFOffset)) {
            return;
        }
        offsets.firstIFD = blobView.getUint32(TIFFOffset + offsets.TIFFFirstIFD);
        IFD0 = readIFD(blobView, TIFFHeaderOffset, offsets.firstIFD);
        if (IFD0.nextIFDOffset) {
            IFD1 = readIFD(blobView, TIFFHeaderOffset, IFD0.nextIFDOffset);
        }
        if (IFD1 && IFD1.entries[exifSpec.getTagId('JPEGInterchangeFormat')]) {
            JPEGInterchangeFormatLength = IFD1.entries[exifSpec.getTagId('JPEGInterchangeFormatLength')].value;
            JPEGInterchangeFormat = IFD1.entries[exifSpec.getTagId('JPEGInterchangeFormat')].value;
            thumbnailBlob = blobView.blob.slice(TIFFHeaderOffset + JPEGInterchangeFormat, TIFFHeaderOffset + JPEGInterchangeFormat + JPEGInterchangeFormatLength);
        }
        if (typeof IFD0.entries === 'undefined')
            IFD0.entries = [{}];
        if (IFD0.entries[exifSpec.getTagId('ExifTag')]) {
            EXIFIFD = readIFD(blobView, TIFFHeaderOffset, IFD0.entries[exifSpec.getTagId('ExifTag')].value);
        }
        if (IFD0.entries[exifSpec.getTagId('GPSTag')]) {
            GPSIFD = readIFD(blobView, TIFFHeaderOffset, IFD0.entries[exifSpec.getTagId('GPSTag')].value);
        }
        if (IFD0.entries[exifSpec.getTagId('InteroperabilityTag')]) {
            interoperabilityIFD = readIFD(blobView, TIFFHeaderOffset, IFD0.entries[exifSpec.getTagId('InteroperabilityTag')].value);
        }
        return {
            'IFD0': IFD0.entries,
            'IFD1': IFD1 && IFD1.entries,
            'EXIFIFD': EXIFIFD && EXIFIFD.entries,
            'GPSIFD': GPSIFD && GPSIFD.entries,
            'interoperabilityIFD': interoperabilityIFD && interoperabilityIFD.entries,
            'thumbnailBlob': thumbnailBlob,
            'byteOrder': byteOrder
        };
    };
    var calculateTagValueSize = function (tagName, value) {
        var tagId = exifSpec.getTagId(tagName);
        var tagTypeId = exifSpec.tags[tagId].type;
        var length = 0;
        switch (tagTypeId) {
        case 1:
        case 6:
        case 7:
            length = 1;
            break;
        case 2:
            length = value.length + 1;
            break;
        case 3:
        case 8:
            length = 2;
            break;
        case 4:
        case 9:
        case 11:
            length = 4;
            break;
        case 10:
        case 5:
        case 12:
            length = 8;
            break;
        default:
            throw 'Calculating Exif Tag Value Size: Unkown value type: ' + tagTypeId;
        }
        if (Array.isArray(value)) {
            length = value.length * length;
        }
        return length;
    };
    var calculateTagValueCount = function (tagType, value) {
        if (Array.isArray(value)) {
            return value.length;
        }
        if (tagType === 2) {
            return value.length + 1;
        }
        return 1;
    };
    var calculateIFDLengths = function (metaData) {
        var ExifTags;
        var GPSTags;
        var interoperabilityTags;
        var IFD0Tags = false;
        var lengths = {
            IFD0Length: 0,
            IFD0LengthDataSection: 0,
            ExifIFDLength: 0,
            ExifIFDLengthDataSection: 0,
            GPSIFDLength: 0,
            GPSIFDLengthDataSection: 0,
            interoperabilityIFDLength: 0,
            interoperabilityLengthDataSection: 0
        };
        var exifTagAlreadyPresent = false;
        var gpsTagAlreadyPresent = false;
        var interoperabilityTagAlreadyPresent = false;
        var valueSize;
        var IFDSize = 12;
        Object.keys(metaData).forEach(function (key) {
            var tagId = exifSpec.getTagId(key);
            var tagInfo = tagId && exifSpec.tags[tagId];
            if (tagInfo) {
                valueSize = calculateTagValueSize(key, metaData[key]);
                if (valueSize <= 4) {
                    valueSize = 0;
                } else {
                    if (valueSize % 2 === 1)
                        valueSize += 1;
                }
                if (tagInfo.IFD === 1) {
                    lengths.IFD0Length += IFDSize;
                    lengths.IFD0LengthDataSection += valueSize;
                    IFD0Tags = true;
                }
                if (tagInfo.IFD === 2) {
                    lengths.ExifIFDLength += IFDSize;
                    lengths.ExifIFDLengthDataSection += valueSize;
                    ExifTags = true;
                }
                if (tagInfo.IFD === 3) {
                    lengths.GPSIFDLength += IFDSize;
                    lengths.GPSIFDLengthDataSection += valueSize;
                    GPSTags = true;
                }
                if (tagInfo.IFD === 4) {
                    lengths.interoperabilityIFDLength += IFDSize;
                    lengths.interoperabilityLengthDataSection += valueSize;
                    interoperabilityTags = true;
                }
            }
        });
        lengths.IFD0Length += 4;
        if (ExifTags && !metaData.ExifTag) {
            lengths.IFD0Length += 12;
        }
        if (GPSTags && !metaData.GPSTag) {
            lengths.IFD0Length += 12;
        }
        if (interoperabilityTags && !metaData.InteroperabilityTag) {
            lengths.IFD0Length += 12;
        }
        lengths.IFD0Length += 2;
        if (metaData.ExifTag) {
            lengths.ExifIFDLength += 2;
        }
        if (metaData.GPSTag) {
            lengths.GPSIFDLength += 2;
        }
        if (metaData.InteroperabilityTag) {
            lengths.interoperabilityIFDLength += 2;
        }
        return lengths;
    };
    var writeSegmentHeader = function (blobView, offset, length) {
        blobView.setUint16(offset, 65505, false);
        blobView.setUint16(offset + 2, length, false);
        blobView.setUint8(offset + 4, 69);
        blobView.setUint8(offset + 5, 120);
        blobView.setUint8(offset + 6, 105);
        blobView.setUint8(offset + 7, 102);
        blobView.setUint8(offset + 8, 0);
        blobView.setUint8(offset + 9, 0);
        return 10;
    };
    var writeTiffHeader = function (blobView, offset) {
        blobView.setUint16(offset + 0, 19789, false);
        blobView.setUint16(offset + 2, 42, false);
        blobView.setUint32(offset + 4, 8, false);
        return 8;
    };
    var createSegment = function (metaData, callback, thumbnailBlob, thumbnailMetaData) {
        var IFDBuffer;
        var blob;
        var valuesOffset;
        var offset = 0;
        thumbnailMetaData = thumbnailMetaData || {};
        if (thumbnailBlob) {
            thumbnailMetaData.JPEGInterchangeFormat = 0;
            thumbnailMetaData.JPEGInterchangeFormatLength = thumbnailBlob.size;
            thumbnailMetaData.Orientation = metaData.Orientation;
        }
        var IFD1Lengths = calculateIFDLengths(thumbnailMetaData);
        var IFD1Length = thumbnailBlob ? IFD1Lengths.IFD0Length : 0;
        var IFD1LengthDataSection = thumbnailBlob ? IFD1Lengths.IFD0LengthDataSection : 0;
        var IFDlengths = calculateIFDLengths(metaData);
        var IFD0Length = IFDlengths.IFD0Length;
        var IFD0LengthDataSection = IFDlengths.IFD0LengthDataSection;
        var ExifIFDLength = IFDlengths.ExifIFDLength;
        var ExifIFDLengthDataSection = IFDlengths.ExifIFDLengthDataSection;
        var GPSIFDLength = IFDlengths.GPSIFDLength;
        var GPSIFDLengthDataSection = IFDlengths.GPSIFDLengthDataSection;
        var interoperabilityIFDLength = IFDlengths.interoperabilityIFDLength;
        var interoperabilityLengthDataSection = IFDlengths.interoperabilityLengthDataSection;
        var tiffHeaderOffset;
        var exifSegmentBlob;
        var segmentContent = [];
        var headerLength = 18;
        var IFDLengths = headerLength + IFD0Length + IFD1Length + ExifIFDLength + GPSIFDLength + interoperabilityIFDLength;
        var DataSectionsLength = IFD0LengthDataSection + IFD1LengthDataSection + ExifIFDLengthDataSection + GPSIFDLengthDataSection + interoperabilityLengthDataSection;
        var segmentLength = IFDLengths + DataSectionsLength;
        var segmentLengthWithThumbnail = thumbnailBlob ? segmentLength + thumbnailBlob.size : segmentLength;
        var writtenBytesError = 'Written bytes and segment length don\'t match. There was a problem creating the segment';
        IFDBuffer = new ArrayBuffer(segmentLength);
        blob = new Blob([IFDBuffer], { type: 'image/jpeg' });
        JPEGParser.BlobView.get(blob, 0, blob.size, function (blobView) {
            offset += writeSegmentHeader(blobView, offset, segmentLengthWithThumbnail - 2);
            tiffHeaderOffset = offset;
            offset += writeTiffHeader(blobView, offset);
            if (ExifIFDLength) {
                metaData.ExifTag = 8 + IFD0Length + IFD0LengthDataSection + IFD1Length + IFD1LengthDataSection;
            }
            if (GPSIFDLength) {
                metaData.GPSTag = 8 + IFD0Length + IFD0LengthDataSection + IFD1Length + IFD1LengthDataSection + ExifIFDLength + ExifIFDLengthDataSection;
            }
            if (interoperabilityIFDLength) {
                metaData.InteroperabilityTag = 8 + IFD0Length + IFD0LengthDataSection + IFD1Length + IFD1LengthDataSection + ExifIFDLength + ExifIFDLengthDataSection + GPSIFDLength + GPSIFDLengthDataSection;
            }
            offset += writeIFD(blobView, tiffHeaderOffset, offset, offset + IFD0Length, 1, metaData, ExifIFDLength);
            if (IFD1Length) {
                thumbnailMetaData.JPEGInterchangeFormat = segmentLength - 10;
                offset += writeIFD(blobView, tiffHeaderOffset, offset, offset + IFD1Length, 1, thumbnailMetaData, ExifIFDLength);
            }
            offset += writeIFD(blobView, tiffHeaderOffset, offset, offset + ExifIFDLength, 2, metaData);
            offset += writeIFD(blobView, tiffHeaderOffset, offset, offset + GPSIFDLength, 3, metaData);
            offset += writeIFD(blobView, tiffHeaderOffset, offset, offset + interoperabilityIFDLength, 4, metaData);
            if (offset !== segmentLength) {
                if (showErrors)
                    console.log(writtenBytesError);
                callback(writtenBytesError);
                return;
            }
            segmentContent.push(blobView.buffer);
            if (thumbnailMetaData && thumbnailBlob) {
                segmentContent.push(thumbnailBlob);
            }
            exifSegmentBlob = new Blob(segmentContent);
            callback(null, exifSegmentBlob);
        });
    };
    var createThumbnail = function (file, callback, scaleFactor) {
        var image = new Image();
        var thumbnailCreated = function (thumbnailBlob) {
            callback(null, thumbnailBlob);
        };
        scaleFactor = scaleFactor || 8;
        image.onload = function () {
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            canvas.height = image.height / scaleFactor;
            canvas.width = image.width / scaleFactor;
            context.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(thumbnailCreated, 'image/jpeg');
            URL.revokeObjectURL(image.src);
            image.src = '';
        };
        image.src = URL.createObjectURL(file);
    };
    var readSegment = function (blobView, segmentOffset) {
        var segmentMetaData = readExifMetaData(blobView, segmentOffset);
        var exifMetaData = segmentMetaData.IFD0;
        exifMetaData = mergeObjects(exifMetaData, segmentMetaData.EXIFIFD);
        exifMetaData = mergeObjects(exifMetaData, segmentMetaData.GPSIFD);
        return {
            'metaData': makeDirectoryEntriesHumanReadable(exifMetaData),
            'thumbnailMetaData': segmentMetaData.IFD1 && makeDirectoryEntriesHumanReadable(segmentMetaData.IFD1),
            'thumbnailBlob': segmentMetaData.thumbnailBlob
        };
    };
    this.JPEGParser = this.JPEGParser || {};
    this.JPEGParser.Exif = this.JPEGParser.Exif || {};
    this.JPEGParser.Exif.mergeObjects = mergeObjects;
    this.JPEGParser.Exif.readSegment = readSegment;
    this.JPEGParser.Exif.createSegment = createSegment;
    this.JPEGParser.Exif.createThumbnail = createThumbnail;
}.call(this));
(function () {
    'use strict';
    var offsets = {
        'SOIMarker': 0,
        'segmentMarker': 0,
        'segmentType': 1,
        'segmentLength': 2,
        'segmentFormat': 4,
        'firstSegment': 2
    };
    var metaDataTypes = {
        'Exif': JPEGParser.Exif,
        'JFIF': JPEGParser.JFIF
    };
    var showErrors = false;
    var turnErrorsOn = function () {
        showErrors = true;
    };
    var readSegmentMarker = function (blobView, offset) {
        return blobView.getUint8(offset + offsets.segmentMarker);
    };
    var readSegmentType = function (blobView, offset) {
        return blobView.getUint8(offset + offsets.segmentType);
    };
    var readSegmentLength = function (blobView, offset) {
        var segmentType = JPEGParser.jpegSpec.segmentTypes[readSegmentType(blobView, offset)];
        if (segmentType === 'SOS' || segmentType.indexOf('RST') === 0) {
            return findNextSegmentOffset(blobView, offset) - offset;
        }
        return blobView.getUint16(offset + 2, false) + 2;
    };
    var readSegmentFormat = function (blobView, offset) {
        return blobView.getNullTerminatedASCIIString(offset + offsets.segmentFormat);
    };
    var validateJPEGFile = function (blobView) {
        if (blobView.byteLength < 2 || blobView.getUint16(offsets.SOIMarker) !== 65496) {
            return false;
        }
        return true;
    };
    var validateSegment = function (segmentMarker, segmentType) {
        return segmentMarker === 255 && segmentType > 0 && segmentType < 255;
    };
    var findNextSegmentOffset = function (blobView, offset) {
        offset += 2;
        var previousByte = 0;
        var currentByte;
        while (true) {
            if (offset >= blobView.sliceLength) {
                break;
            }
            currentByte = blobView.getUint8(offset);
            if (currentByte !== 0 && previousByte === 255) {
                break;
            }
            previousByte = currentByte;
            offset += 1;
        }
        return offset - 1;
    };
    var isSOFSegment = function (segmentType) {
        return segmentType >= 192 && segmentType <= 195 || segmentType >= 197 && segmentType <= 199 || segmentType >= 201 && segmentType <= 203 || segmentType >= 205 && segmentType <= 207;
    };
    var isEOISegment = function (segmentType) {
        return segmentType === 217;
    };
    var isAPPSegment = function (segmentType) {
        return segmentType >= 224 && segmentType <= 239;
    };
    var parseAPPSegment = function (blobView, offset) {
        var segmentFormat = readSegmentFormat(blobView, offset);
        var segment;
        if (metaDataTypes[segmentFormat]) {
            segment = metaDataTypes[segmentFormat].readSegment(blobView, offset);
            return {
                'format': segmentFormat,
                'offset': offset,
                'metaData': segment.metaData,
                'thumbnailMetaData': segment.thumbnailMetaData,
                'thumbnailBlob': segment.thumbnailBlob
            };
        } else {
            if (showErrors)
                console.log('Unkown APP segment format: ' + segmentFormat);
        }
    };
    var parseSegments = function (blobView) {
        var offset = 2;
        var segmentsMetaData = {};
        var APPSegment;
        var segmentLength;
        while (offset + 4 <= blobView.sliceLength) {
            var segmentMarker = readSegmentMarker(blobView, offset);
            var segmentType = readSegmentType(blobView, offset);
            if (!validateSegment(segmentMarker, segmentType)) {
                if (showErrors)
                    console.log('Invalid JPEG Segment at offset ' + offset);
                break;
            }
            if (isEOISegment(segmentType)) {
                break;
            }
            if (isSOFSegment(segmentType)) {
                segmentsMetaData.height = blobView.getUint16(offset + 5, false);
                segmentsMetaData.width = blobView.getUint16(offset + 7, false);
                segmentsMetaData.progressive = segmentType === 194;
            }
            if (isAPPSegment(segmentType)) {
                APPSegment = parseAPPSegment(blobView, offset);
                if (APPSegment) {
                    segmentsMetaData[APPSegment.format] = APPSegment.metaData;
                    segmentsMetaData[APPSegment.format].segmentOffset = APPSegment.offset;
                    segmentsMetaData[APPSegment.format].segmentLength = readSegmentLength(blobView, offset);
                    segmentsMetaData.thumbnailBlob = segmentsMetaData.thumbnailBlob || APPSegment.thumbnailBlob;
                    segmentsMetaData.thumbnailMetaData = segmentsMetaData.thumbnailBlob || APPSegment.thumbnailMetaData;
                }
            }
            segmentLength = readSegmentLength(blobView, offset);
            if (segmentLength <= 0) {
                throw 'Invalid length in segement at offset: ' + offset;
            }
            offset += segmentLength;
        }
        return segmentsMetaData;
    };
    var validateExifSegment = function (blobView, offset) {
        var firstSegmentType = JPEGParser.jpegSpec.segmentTypes[readSegmentType(blobView, offset)];
        var firstSegmentFormat = readSegmentFormat(blobView, offset);
        if (firstSegmentType !== 'APP1' || firstSegmentFormat !== 'Exif') {
            return false;
        }
        return true;
    };
    var readJPEGSegments = function (blob, size, callback, validateFirstSegment) {
        JPEGParser.BlobView.get(blob, 0, size, function (blobView) {
            if (validateJPEGFile(blobView) === false) {
                callback('Not a valid JPEG file');
            } else {
                if (validateFirstSegment && !validateFirstSegment(blobView, 2)) {
                    callback('First segment not valid');
                } else {
                    callback(null, parseSegments(blobView), blobView);
                }
            }
        });
    };
    var insertSegment = function (segmentBlob, blob, metaDataType, callback) {
        JPEGParser.BlobView.get(blob, 0, blob.size, function (blobView) {
            var blobSegments;
            var blob;
            var blobBeforeSegment;
            var blobAfterSegment;
            var existingSegment;
            var fileSegments;
            if (validateJPEGFile(blobView) === false) {
                callback('Not a valid JPEG file');
            } else {
                fileSegments = parseSegments(blobView);
                if (fileSegments[metaDataType]) {
                    existingSegment = fileSegments[metaDataType];
                    blobBeforeSegment = blobView.blob.slice(0, existingSegment.segmentOffset);
                    blobAfterSegment = blobView.blob.slice(existingSegment.segmentOffset + existingSegment.segmentLength, blobView.sliceLength);
                } else {
                    blobBeforeSegment = blobView.blob.slice(0, 2);
                    blobAfterSegment = blobView.blob.slice(2, blobView.sliceLength);
                }
                blob = new Blob([
                    blobBeforeSegment,
                    segmentBlob,
                    blobAfterSegment
                ], { type: 'image/jpeg' });
                callback(null, blob);
            }
        });
    };
    var readMetaData = function (blob, callback, validateFirstSegment) {
        var processSegments = function (error, segmentsMetaData) {
            if (error) {
                callback(error);
            } else {
                segmentsMetaData.fileType = 'JPEG';
                segmentsMetaData.fileSize = blob.size;
                callback(null, segmentsMetaData);
            }
        };
        var size = Math.min(64 * 1024 + 2, blob.size);
        readJPEGSegments(blob, size, processSegments, validateFirstSegment);
    };
    var writeMetaData = function (blob, size, newMetaData, metaDataType, callback, createNewThumbnail) {
        var processSegments = function (error, segmentsMetaData, blobView) {
            var segmentCreated = function (error, segmentBlob) {
                insertSegment(segmentBlob, blob, metaDataType, callback);
            };
            var createSegment = function (thumbnailMetaData, thumbnailBlob) {
                metaDataTypes[metaDataType].createSegment(newMetaData, segmentCreated, thumbnailBlob, thumbnailMetaData);
            };
            var thumbnailCreated = function (error, thumbnailBlob) {
                createSegment({}, thumbnailBlob);
            };
            if (metaDataTypes[metaDataType]) {
                if (segmentsMetaData[metaDataType]) {
                    newMetaData = JPEGParser.Exif.mergeObjects(segmentsMetaData[metaDataType], newMetaData);
                }
                if (createNewThumbnail) {
                    metaDataTypes[metaDataType].createThumbnail(blob, thumbnailCreated, 16);
                } else {
                    createSegment(segmentsMetaData.thumbnailMetaData, segmentsMetaData.thumbnailBlob);
                }
            } else {
                throw 'Writting MetaData: Unknown type of MetaData ' + metaDataType;
            }
        };
        readJPEGSegments(blob, size, processSegments);
    };
    var readExifMetaData = function (blob, callback) {
        var processMetaData = function (error, metaData) {
            metaData = metaData && metaData.Exif;
            callback(error, metaData);
        };
        readMetaData(blob, processMetaData);
    };
    var writeExifMetaData = function (blob, metaData, callback) {
        writeMetaData(blob, blob.size, metaData, 'Exif', callback);
    };
    this.JPEGParser = this.JPEGParser || {};
    this.showErrors = false;
    this.JPEGParser.turnErrorsOn = turnErrorsOn;
    this.JPEGParser.readMetaData = readMetaData;
    this.JPEGParser.readExifMetaData = readExifMetaData;
    this.JPEGParser.writeExifMetaData = writeExifMetaData;
}.call(this));