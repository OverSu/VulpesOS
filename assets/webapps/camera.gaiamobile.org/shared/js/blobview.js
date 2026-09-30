var BlobView = function () {
    function fail(msg) {
        throw Error(msg);
    }
    var decoderCache = {};
    function getDecoder(encoding) {
        if (encoding in decoderCache) {
            return decoderCache[encoding];
        }
        var decoder = decoderCache[encoding] = new TextDecoder(encoding);
        return decoder;
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
        if (offset < 0) {
            fail('negative offset');
        }
        if (length < 0) {
            fail('negative length');
        }
        if (offset > blob.size) {
            fail('offset larger than blob size');
        }
        if (offset + length > blob.size) {
            length = blob.size - offset;
        }
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
    BlobView.getFromArrayBuffer = function (buffer, offset, length, littleEndian) {
        return new BlobView(null, offset, length, buffer, offset, length, littleEndian);
    };
    BlobView.prototype = {
        constructor: BlobView,
        getMore: function (offset, length, callback) {
            if (!this.blob) {
                fail('no blob backing this BlobView');
            }
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
        remaining: function () {
            return this.byteLength - this.index;
        },
        seek: function (index) {
            if (index < 0) {
                fail('negative index');
            }
            if (index > this.byteLength) {
                fail('index greater than buffer size');
            }
            this.index = index;
        },
        advance: function (n) {
            var index = this.index + n;
            if (index < 0) {
                fail('advance past beginning of buffer');
            }
            if (index > this.byteLength) {
                fail('advance past end of buffer');
            }
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
        getBinaryText: function (offset, len) {
            var bytes = new Uint8Array(this.buffer, offset + this.viewOffset, len);
            return String.fromCharCode.apply(String, bytes);
        },
        readBinaryText: function (len) {
            var s = this.getBinaryText(this.index, len);
            this.index += len;
            return s;
        },
        getLatin1Text: function (offset, len) {
            var bytes = new Uint8Array(this.buffer, offset + this.viewOffset, len);
            return getDecoder('latin1').decode(bytes);
        },
        readLatin1Text: function (len) {
            var s = this.getLatin1Text(this.index, len);
            this.index += len;
            return s;
        },
        getUTF8Text: function (offset, len) {
            var bytes = new Uint8Array(this.buffer, offset + this.viewOffset, len);
            return getDecoder('utf-8').decode(bytes);
        },
        readUTF8Text: function (len) {
            var s = this.getUTF8Text(this.index, len);
            this.index += len;
            return s;
        },
        getUTF16Text: function (offset, len, le) {
            if (len % 2) {
                fail('len must be a multiple of two');
            }
            var bytes = new Uint8Array(this.buffer, offset + this.viewOffset, len);
            if (le === null || le === undefined) {
                var BOM = (bytes[0] << 8) + bytes[1];
                if (BOM === 65279) {
                    bytes = bytes.subarray(2);
                    le = false;
                } else if (BOM === 65534) {
                    bytes = bytes.subarray(2);
                    le = true;
                } else {
                    le = true;
                }
            }
            var encoding = le ? 'utf-16le' : 'utf-16be';
            return getDecoder(encoding).decode(bytes);
        },
        readUTF16Text: function (len, le) {
            var s = this.getUTF16Text(this.index, len, le);
            this.index += len;
            return s;
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
        readNullTerminatedLatin1Text: function (size, advance_by_size = false) {
            var bytes = new Uint8Array(this.buffer, this.viewOffset + this.index, size);
            var nil = bytes.indexOf(0);
            if (nil !== -1) {
                bytes = bytes.subarray(0, nil);
            }
            var s = getDecoder('latin1').decode(bytes);
            if (nil === -1 || advance_by_size) {
                this.index += size;
            } else {
                this.index += nil + 1;
            }
            return s;
        },
        readNullTerminatedUTF8Text: function (size, advance_by_size = false) {
            var bytes = new Uint8Array(this.buffer, this.viewOffset + this.index, size);
            var nil = bytes.indexOf(0);
            if (nil !== -1) {
                bytes = bytes.subarray(0, nil);
            }
            var s = getDecoder('utf-8').decode(bytes);
            if (nil === -1 || advance_by_size) {
                this.index += size;
            } else {
                this.index += nil + 1;
            }
            return s;
        },
        readNullTerminatedUTF16Text: function (size, le, advance_by_size = false) {
            if (size % 2) {
                fail('size must be a multiple of two');
            }
            for (var len = 0; len < size; len += 2) {
                if (this.getUint16(this.index + len, le) === 0) {
                    break;
                }
            }
            var s = this.getUTF16Text(this.index, len, le);
            if (len === size || advance_by_size) {
                this.index += size;
            } else {
                this.index += len + 2;
            }
            return s;
        }
    };
    return {
        get: BlobView.get,
        getFromArrayBuffer: BlobView.getFromArrayBuffer
    };
}();