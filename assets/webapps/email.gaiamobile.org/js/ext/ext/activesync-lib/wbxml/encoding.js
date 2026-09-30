(function (global) {
    'use strict';
    function inRange(a, min, max) {
        return min <= a && a <= max;
    }
    function div(n, d) {
        return Math.floor(n / d);
    }
    var EOF_byte = -1;
    var EOF_code_point = -1;
    function ByteInputStream(bytes) {
        var pos = 0;
        this.get = function () {
            return pos >= bytes.length ? EOF_byte : Number(bytes[pos]);
        };
        this.offset = function (n) {
            pos += n;
            if (pos < 0) {
                throw new Error('Seeking past start of the buffer');
            }
            if (pos > bytes.length) {
                throw new Error('Seeking past EOF');
            }
        };
        this.match = function (test) {
            if (test.length > pos + bytes.length) {
                return false;
            }
            var i;
            for (i = 0; i < test.length; i += 1) {
                if (Number(bytes[pos + i]) !== test[i]) {
                    return false;
                }
            }
            return true;
        };
    }
    function ByteOutputStream(bytes) {
        var pos = 0;
        this.emit = function (var_args) {
            var last = EOF_byte;
            var i;
            for (i = 0; i < arguments.length; ++i) {
                last = Number(arguments[i]);
                bytes[pos++] = last;
            }
            return last;
        };
    }
    function CodePointInputStream(string) {
        var pos = 0;
        var cps = function () {
            var cps = [];
            var i = 0, n = string.length;
            while (i < string.length) {
                var c = string.charCodeAt(i);
                if (!inRange(c, 55296, 57343)) {
                    cps.push(c);
                } else if (inRange(c, 56320, 57343)) {
                    cps.push(65533);
                } else {
                    if (i === n - 1) {
                        cps.push(65533);
                    } else {
                        var d = string.charCodeAt(i + 1);
                        if (inRange(d, 56320, 57343)) {
                            var a = c & 1023;
                            var b = d & 1023;
                            i += 1;
                            cps.push(65536 + (a << 10) + b);
                        } else {
                            cps.push(65533);
                        }
                    }
                }
                i += 1;
            }
            return cps;
        }();
        this.offset = function (n) {
            pos += n;
            if (pos < 0) {
                throw new Error('Seeking past start of the buffer');
            }
            if (pos > cps.length) {
                throw new Error('Seeking past EOF');
            }
        };
        this.get = function () {
            if (pos >= cps.length) {
                return EOF_code_point;
            }
            return cps[pos];
        };
    }
    function CodePointOutputStream() {
        var string = '';
        this.string = function () {
            return string;
        };
        this.emit = function (c) {
            if (c <= 65535) {
                string += String.fromCharCode(c);
            } else {
                c -= 65536;
                string += String.fromCharCode(55296 + (c >> 10 & 1023));
                string += String.fromCharCode(56320 + (c & 1023));
            }
        };
    }
    function decoderError(fatal, opt_code_point) {
        if (fatal) {
            throw new Error('EncodingError');
        }
        return opt_code_point || 65533;
    }
    function encoderError(code_point) {
        throw new Error('EncodingError');
    }
    function getEncoding(label) {
        label = String(label).trim().toLowerCase();
        if (Object.prototype.hasOwnProperty.call(label_to_encoding, label)) {
            return label_to_encoding[label];
        }
        throw new Error('EncodingError: Unknown encoding: ' + label);
    }
    var encodings = [
        {
            'encodings': [{
                    'labels': [
                        'unicode-1-1-utf-8',
                        'utf-8',
                        'utf8'
                    ],
                    'name': 'utf-8'
                }],
            'heading': 'The Encoding'
        },
        {
            'encodings': [
                {
                    'labels': [
                        'cp864',
                        'ibm864'
                    ],
                    'name': 'ibm864'
                },
                {
                    'labels': [
                        'cp866',
                        'ibm866'
                    ],
                    'name': 'ibm866'
                },
                {
                    'labels': [
                        'csisolatin2',
                        'iso-8859-2',
                        'iso-ir-101',
                        'iso8859-2',
                        'iso_8859-2',
                        'l2',
                        'latin2'
                    ],
                    'name': 'iso-8859-2'
                },
                {
                    'labels': [
                        'csisolatin3',
                        'iso-8859-3',
                        'iso_8859-3',
                        'iso-ir-109',
                        'l3',
                        'latin3'
                    ],
                    'name': 'iso-8859-3'
                },
                {
                    'labels': [
                        'csisolatin4',
                        'iso-8859-4',
                        'iso_8859-4',
                        'iso-ir-110',
                        'l4',
                        'latin4'
                    ],
                    'name': 'iso-8859-4'
                },
                {
                    'labels': [
                        'csisolatincyrillic',
                        'cyrillic',
                        'iso-8859-5',
                        'iso_8859-5',
                        'iso-ir-144'
                    ],
                    'name': 'iso-8859-5'
                },
                {
                    'labels': [
                        'arabic',
                        'csisolatinarabic',
                        'ecma-114',
                        'iso-8859-6',
                        'iso_8859-6',
                        'iso-ir-127'
                    ],
                    'name': 'iso-8859-6'
                },
                {
                    'labels': [
                        'csisolatingreek',
                        'ecma-118',
                        'elot_928',
                        'greek',
                        'greek8',
                        'iso-8859-7',
                        'iso_8859-7',
                        'iso-ir-126'
                    ],
                    'name': 'iso-8859-7'
                },
                {
                    'labels': [
                        'csisolatinhebrew',
                        'hebrew',
                        'iso-8859-8',
                        'iso-8859-8-i',
                        'iso-ir-138',
                        'iso_8859-8',
                        'visual'
                    ],
                    'name': 'iso-8859-8'
                },
                {
                    'labels': [
                        'csisolatin6',
                        'iso-8859-10',
                        'iso-ir-157',
                        'iso8859-10',
                        'l6',
                        'latin6'
                    ],
                    'name': 'iso-8859-10'
                },
                {
                    'labels': ['iso-8859-13'],
                    'name': 'iso-8859-13'
                },
                {
                    'labels': [
                        'iso-8859-14',
                        'iso8859-14'
                    ],
                    'name': 'iso-8859-14'
                },
                {
                    'labels': [
                        'iso-8859-15',
                        'iso_8859-15'
                    ],
                    'name': 'iso-8859-15'
                },
                {
                    'labels': ['iso-8859-16'],
                    'name': 'iso-8859-16'
                },
                {
                    'labels': [
                        'koi8-r',
                        'koi8_r'
                    ],
                    'name': 'koi8-r'
                },
                {
                    'labels': ['koi8-u'],
                    'name': 'koi8-u'
                },
                {
                    'labels': [
                        'csmacintosh',
                        'mac',
                        'macintosh',
                        'x-mac-roman'
                    ],
                    'name': 'macintosh'
                },
                {
                    'labels': [
                        'iso-8859-11',
                        'tis-620',
                        'windows-874'
                    ],
                    'name': 'windows-874'
                },
                {
                    'labels': [
                        'windows-1250',
                        'x-cp1250'
                    ],
                    'name': 'windows-1250'
                },
                {
                    'labels': [
                        'windows-1251',
                        'x-cp1251'
                    ],
                    'name': 'windows-1251'
                },
                {
                    'labels': [
                        'ascii',
                        'ansi_x3.4-1968',
                        'csisolatin1',
                        'iso-8859-1',
                        'iso8859-1',
                        'iso_8859-1',
                        'l1',
                        'latin1',
                        'us-ascii',
                        'windows-1252'
                    ],
                    'name': 'windows-1252'
                },
                {
                    'labels': [
                        'cp1253',
                        'windows-1253'
                    ],
                    'name': 'windows-1253'
                },
                {
                    'labels': [
                        'csisolatin5',
                        'iso-8859-9',
                        'iso-ir-148',
                        'l5',
                        'latin5',
                        'windows-1254'
                    ],
                    'name': 'windows-1254'
                },
                {
                    'labels': [
                        'cp1255',
                        'windows-1255'
                    ],
                    'name': 'windows-1255'
                },
                {
                    'labels': [
                        'cp1256',
                        'windows-1256'
                    ],
                    'name': 'windows-1256'
                },
                {
                    'labels': ['windows-1257'],
                    'name': 'windows-1257'
                },
                {
                    'labels': [
                        'cp1258',
                        'windows-1258'
                    ],
                    'name': 'windows-1258'
                },
                {
                    'labels': [
                        'x-mac-cyrillic',
                        'x-mac-ukrainian'
                    ],
                    'name': 'x-mac-cyrillic'
                }
            ],
            'heading': 'Legacy single-byte encodings'
        },
        {
            'encodings': [
                {
                    'labels': [
                        'chinese',
                        'csgb2312',
                        'csiso58gb231280',
                        'gb2312',
                        'gbk',
                        'gb_2312',
                        'gb_2312-80',
                        'iso-ir-58',
                        'x-gbk'
                    ],
                    'name': 'gbk'
                },
                {
                    'labels': ['gb18030'],
                    'name': 'gb18030'
                },
                {
                    'labels': ['hz-gb-2312'],
                    'name': 'hz-gb-2312'
                }
            ],
            'heading': 'Legacy multi-byte Chinese (simplified) encodings'
        },
        {
            'encodings': [{
                    'labels': [
                        'big5',
                        'big5-hkscs',
                        'cn-big5',
                        'csbig5',
                        'x-x-big5'
                    ],
                    'name': 'big5'
                }],
            'heading': 'Legacy multi-byte Chinese (traditional) encodings'
        },
        {
            'encodings': [
                {
                    'labels': [
                        'cseucpkdfmtjapanese',
                        'euc-jp',
                        'x-euc-jp'
                    ],
                    'name': 'euc-jp'
                },
                {
                    'labels': [
                        'csiso2022jp',
                        'iso-2022-jp'
                    ],
                    'name': 'iso-2022-jp'
                },
                {
                    'labels': [
                        'csshiftjis',
                        'ms_kanji',
                        'shift-jis',
                        'shift_jis',
                        'sjis',
                        'windows-31j',
                        'x-sjis'
                    ],
                    'name': 'shift_jis'
                }
            ],
            'heading': 'Legacy multi-byte Japanese encodings'
        },
        {
            'encodings': [
                {
                    'labels': [
                        'cseuckr',
                        'csksc56011987',
                        'euc-kr',
                        'iso-ir-149',
                        'korean',
                        'ks_c_5601-1987',
                        'ks_c_5601-1989',
                        'ksc5601',
                        'ksc_5601',
                        'windows-949'
                    ],
                    'name': 'euc-kr'
                },
                {
                    'labels': [
                        'csiso2022kr',
                        'iso-2022-kr'
                    ],
                    'name': 'iso-2022-kr'
                }
            ],
            'heading': 'Legacy multi-byte Korean encodings'
        },
        {
            'encodings': [
                {
                    'labels': [
                        'utf-16',
                        'utf-16le'
                    ],
                    'name': 'utf-16'
                },
                {
                    'labels': ['utf-16be'],
                    'name': 'utf-16be'
                }
            ],
            'heading': 'Legacy utf-16 encodings'
        }
    ];
    var name_to_encoding = {};
    var label_to_encoding = {};
    encodings.forEach(function (category) {
        category.encodings.forEach(function (encoding) {
            name_to_encoding[encoding.name] = encoding;
            encoding.labels.forEach(function (label) {
                label_to_encoding[label] = encoding;
            });
        });
    });
    function indexCodePointFor(pointer, index) {
        return (index || [])[pointer] || null;
    }
    function indexPointerFor(code_point, index) {
        var pointer = index.indexOf(code_point);
        return pointer === -1 ? null : pointer;
    }
    var indexes = global['encoding-indexes'] || {};
    function indexGB18030CodePointFor(pointer) {
        if (pointer > 39419 && pointer < 189000 || pointer > 1237575) {
            return null;
        }
        var offset = 0, code_point_offset = 0, index = indexes['gb18030'];
        var i;
        for (i = 0; i < index.length; ++i) {
            var entry = index[i];
            if (entry[0] <= pointer) {
                offset = entry[0];
                code_point_offset = entry[1];
            } else {
                break;
            }
        }
        return code_point_offset + pointer - offset;
    }
    function indexGB18030PointerFor(code_point) {
        var offset = 0, pointer_offset = 0, index = indexes['gb18030'];
        var i;
        for (i = 0; i < index.length; ++i) {
            var entry = index[i];
            if (entry[1] <= code_point) {
                offset = entry[1];
                pointer_offset = entry[0];
            } else {
                break;
            }
        }
        return pointer_offset + code_point - offset;
    }
    function UTF8Decoder(options) {
        var fatal = options.fatal;
        var utf8_code_point = 0, utf8_bytes_needed = 0, utf8_bytes_seen = 0, utf8_lower_boundary = 0;
        this.decode = function (byte_pointer) {
            var bite = byte_pointer.get();
            if (bite === EOF_byte) {
                if (utf8_bytes_needed !== 0) {
                    utf8_bytes_needed = 0;
                    return decoderError(fatal);
                }
                return EOF_code_point;
            }
            byte_pointer.offset(1);
            if (utf8_bytes_needed === 0) {
                if (inRange(bite, 0, 127)) {
                    return bite;
                }
                if (inRange(bite, 194, 223)) {
                    utf8_bytes_needed = 1;
                    utf8_lower_boundary = 128;
                    utf8_code_point = bite - 192;
                } else if (inRange(bite, 224, 239)) {
                    utf8_bytes_needed = 2;
                    utf8_lower_boundary = 2048;
                    utf8_code_point = bite - 224;
                } else if (inRange(bite, 240, 244)) {
                    utf8_bytes_needed = 3;
                    utf8_lower_boundary = 65536;
                    utf8_code_point = bite - 240;
                } else {
                    return decoderError(fatal);
                }
                utf8_code_point = utf8_code_point * Math.pow(64, utf8_bytes_needed);
                return null;
            }
            if (!inRange(bite, 128, 191)) {
                utf8_code_point = 0;
                utf8_bytes_needed = 0;
                utf8_bytes_seen = 0;
                utf8_lower_boundary = 0;
                byte_pointer.offset(-1);
                return decoderError(fatal);
            }
            utf8_bytes_seen += 1;
            utf8_code_point = utf8_code_point + (bite - 128) * Math.pow(64, utf8_bytes_needed - utf8_bytes_seen);
            if (utf8_bytes_seen !== utf8_bytes_needed) {
                return null;
            }
            var code_point = utf8_code_point;
            var lower_boundary = utf8_lower_boundary;
            utf8_code_point = 0;
            utf8_bytes_needed = 0;
            utf8_bytes_seen = 0;
            utf8_lower_boundary = 0;
            if (inRange(code_point, lower_boundary, 1114111) && !inRange(code_point, 55296, 57343)) {
                return code_point;
            }
            return decoderError(fatal);
        };
    }
    function UTF8Encoder(options) {
        var fatal = options.fatal;
        this.encode = function (output_byte_stream, code_point_pointer) {
            var code_point = code_point_pointer.get();
            if (code_point === EOF_code_point) {
                return EOF_byte;
            }
            code_point_pointer.offset(1);
            if (inRange(code_point, 55296, 57343)) {
                return encoderError(code_point);
            }
            if (inRange(code_point, 0, 127)) {
                return output_byte_stream.emit(code_point);
            }
            var count, offset;
            if (inRange(code_point, 128, 2047)) {
                count = 1;
                offset = 192;
            } else if (inRange(code_point, 2048, 65535)) {
                count = 2;
                offset = 224;
            } else if (inRange(code_point, 65536, 1114111)) {
                count = 3;
                offset = 240;
            }
            var result = output_byte_stream.emit(div(code_point, Math.pow(64, count)) + offset);
            while (count > 0) {
                var temp = div(code_point, Math.pow(64, count - 1));
                result = output_byte_stream.emit(128 + temp % 64);
                count -= 1;
            }
            return result;
        };
    }
    name_to_encoding['utf-8'].getEncoder = function (options) {
        return new UTF8Encoder(options);
    };
    name_to_encoding['utf-8'].getDecoder = function (options) {
        return new UTF8Decoder(options);
    };
    function SingleByteDecoder(index, options) {
        var fatal = options.fatal;
        this.decode = function (byte_pointer) {
            var bite = byte_pointer.get();
            if (bite === EOF_byte) {
                return EOF_code_point;
            }
            byte_pointer.offset(1);
            if (inRange(bite, 0, 127)) {
                return bite;
            }
            var code_point = index[bite - 128];
            if (code_point === null) {
                return decoderError(fatal);
            }
            return code_point;
        };
    }
    function SingleByteEncoder(index, options) {
        var fatal = options.fatal;
        this.encode = function (output_byte_stream, code_point_pointer) {
            var code_point = code_point_pointer.get();
            if (code_point === EOF_code_point) {
                return EOF_byte;
            }
            code_point_pointer.offset(1);
            if (inRange(code_point, 0, 127)) {
                return output_byte_stream.emit(code_point);
            }
            var pointer = indexPointerFor(code_point, index);
            if (pointer === null) {
                encoderError(code_point);
            }
            return output_byte_stream.emit(pointer + 128);
        };
    }
    (function () {
        [
            'ibm864',
            'ibm866',
            'iso-8859-2',
            'iso-8859-3',
            'iso-8859-4',
            'iso-8859-5',
            'iso-8859-6',
            'iso-8859-7',
            'iso-8859-8',
            'iso-8859-10',
            'iso-8859-13',
            'iso-8859-14',
            'iso-8859-15',
            'iso-8859-16',
            'koi8-r',
            'koi8-u',
            'macintosh',
            'windows-874',
            'windows-1250',
            'windows-1251',
            'windows-1252',
            'windows-1253',
            'windows-1254',
            'windows-1255',
            'windows-1256',
            'windows-1257',
            'windows-1258',
            'x-mac-cyrillic'
        ].forEach(function (name) {
            var encoding = name_to_encoding[name];
            var index = indexes[name];
            encoding.getDecoder = function (options) {
                return new SingleByteDecoder(index, options);
            };
            encoding.getEncoder = function (options) {
                return new SingleByteEncoder(index, options);
            };
        });
    }());
    function GBKDecoder(gb18030, options) {
        var fatal = options.fatal;
        var gbk_first = 0, gbk_second = 0, gbk_third = 0;
        this.decode = function (byte_pointer) {
            var bite = byte_pointer.get();
            if (bite === EOF_byte && gbk_first === 0 && gbk_second === 0 && gbk_third === 0) {
                return EOF_code_point;
            }
            if (bite === EOF_byte && (gbk_first !== 0 || gbk_second !== 0 || gbk_third !== 0)) {
                gbk_first = 0;
                gbk_second = 0;
                gbk_third = 0;
                decoderError(fatal);
            }
            byte_pointer.offset(1);
            var code_point;
            if (gbk_third !== 0) {
                code_point = null;
                if (inRange(bite, 48, 57)) {
                    code_point = indexGB18030CodePointFor((((gbk_first - 129) * 10 + (gbk_second - 48)) * 126 + (gbk_third - 129)) * 10 + bite - 48);
                }
                gbk_first = 0;
                gbk_second = 0;
                gbk_third = 0;
                if (code_point === null) {
                    byte_pointer.offset(-3);
                    return decoderError(fatal);
                }
                return code_point;
            }
            if (gbk_second !== 0) {
                if (inRange(bite, 129, 254)) {
                    gbk_third = bite;
                    return null;
                }
                byte_pointer.offset(-2);
                gbk_first = 0;
                gbk_second = 0;
                return decoderError(fatal);
            }
            if (gbk_first !== 0) {
                if (inRange(bite, 48, 57) && gb18030) {
                    gbk_second = bite;
                    return null;
                }
                var lead = gbk_first;
                var pointer = null;
                gbk_first = 0;
                var offset = bite < 127 ? 64 : 65;
                if (inRange(bite, 64, 126) || inRange(bite, 128, 254)) {
                    pointer = (lead - 129) * 190 + (bite - offset);
                }
                code_point = pointer === null ? null : indexCodePointFor(pointer, indexes['gbk']);
                if (pointer === null) {
                    byte_pointer.offset(-1);
                }
                if (code_point === null) {
                    return decoderError(fatal);
                }
                return code_point;
            }
            if (inRange(bite, 0, 127)) {
                return bite;
            }
            if (bite === 128) {
                return 8364;
            }
            if (inRange(bite, 129, 254)) {
                gbk_first = bite;
                return null;
            }
            return decoderError(fatal);
        };
    }
    function GBKEncoder(gb18030, options) {
        var fatal = options.fatal;
        this.encode = function (output_byte_stream, code_point_pointer) {
            var code_point = code_point_pointer.get();
            if (code_point === EOF_code_point) {
                return EOF_byte;
            }
            code_point_pointer.offset(1);
            if (inRange(code_point, 0, 127)) {
                return output_byte_stream.emit(code_point);
            }
            var pointer = indexPointerFor(code_point, indexes['gbk']);
            if (pointer !== null) {
                var lead = div(pointer, 190) + 129;
                var trail = pointer % 190;
                var offset = trail < 63 ? 64 : 65;
                return output_byte_stream.emit(lead, trail + offset);
            }
            if (pointer === null && !gb18030) {
                return encoderError(code_point);
            }
            pointer = indexGB18030PointerFor(code_point);
            var byte1 = div(div(div(pointer, 10), 126), 10);
            pointer = pointer - byte1 * 10 * 126 * 10;
            var byte2 = div(div(pointer, 10), 126);
            pointer = pointer - byte2 * 10 * 126;
            var byte3 = div(pointer, 10);
            var byte4 = pointer - byte3 * 10;
            return output_byte_stream.emit(byte1 + 129, byte2 + 48, byte3 + 129, byte4 + 48);
        };
    }
    name_to_encoding['gbk'].getEncoder = function (options) {
        return new GBKEncoder(false, options);
    };
    name_to_encoding['gbk'].getDecoder = function (options) {
        return new GBKDecoder(false, options);
    };
    name_to_encoding['gb18030'].getEncoder = function (options) {
        return new GBKEncoder(true, options);
    };
    name_to_encoding['gb18030'].getDecoder = function (options) {
        return new GBKDecoder(true, options);
    };
    function HZGB2312Decoder(options) {
        var fatal = options.fatal;
        var hzgb2312 = false, hzgb2312_lead = 0;
        this.decode = function (byte_pointer) {
            var bite = byte_pointer.get();
            if (bite === EOF_byte && hzgb2312_lead === 0) {
                return EOF_code_point;
            }
            if (bite === EOF_byte && hzgb2312_lead !== 0) {
                hzgb2312_lead = 0;
                return decoderError(fatal);
            }
            byte_pointer.offset(1);
            if (hzgb2312_lead === 126) {
                hzgb2312_lead = 0;
                if (bite === 123) {
                    hzgb2312 = true;
                    return null;
                }
                if (bite === 125) {
                    hzgb2312 = false;
                    return null;
                }
                if (bite === 126) {
                    return 126;
                }
                if (bite === 10) {
                    return null;
                }
                byte_pointer.offset(-1);
                return decoderError(fatal);
            }
            if (hzgb2312_lead !== 0) {
                var lead = hzgb2312_lead;
                hzgb2312_lead = 0;
                var code_point = null;
                if (inRange(bite, 33, 126)) {
                    code_point = indexCodePointFor((lead - 1) * 190 + (bite + 63), indexes['gbk']);
                }
                if (bite === 10) {
                    hzgb2312 = false;
                }
                if (code_point === null) {
                    return decoderError(fatal);
                }
                return code_point;
            }
            if (bite === 126) {
                hzgb2312_lead = 126;
                return null;
            }
            if (hzgb2312) {
                if (inRange(bite, 32, 127)) {
                    hzgb2312_lead = bite;
                    return null;
                }
                if (bite === 10) {
                    hzgb2312 = false;
                }
                return decoderError(fatal);
            }
            if (inRange(bite, 0, 127)) {
                return bite;
            }
            return decoderError(fatal);
        };
    }
    function HZGB2312Encoder(options) {
        var fatal = options.fatal;
        var hzgb2312 = false;
        this.encode = function (output_byte_stream, code_point_pointer) {
            var code_point = code_point_pointer.get();
            if (code_point === EOF_code_point) {
                return EOF_byte;
            }
            code_point_pointer.offset(1);
            if (inRange(code_point, 0, 127) && hzgb2312) {
                code_point_pointer.offset(-1);
                hzgb2312 = false;
                return output_byte_stream.emit(126, 125);
            }
            if (code_point === 126) {
                return output_byte_stream.emit(126, 126);
            }
            if (inRange(code_point, 0, 127)) {
                return output_byte_stream.emit(code_point);
            }
            if (!hzgb2312) {
                code_point_pointer.offset(-1);
                hzgb2312 = true;
                return output_byte_stream.emit(126, 123);
            }
            var pointer = indexPointerFor(code_point, indexes['gbk']);
            if (pointer === null) {
                return encoderError(code_point);
            }
            var lead = div(pointer, 190) + 1;
            var trail = pointer % 190 - 63;
            if (!inRange(lead, 33, 126) || !inRange(trail, 33, 126)) {
                return encoderError(code_point);
            }
            return output_byte_stream.emit(lead, trail);
        };
    }
    name_to_encoding['hz-gb-2312'].getEncoder = function (options) {
        return new HZGB2312Encoder(options);
    };
    name_to_encoding['hz-gb-2312'].getDecoder = function (options) {
        return new HZGB2312Decoder(options);
    };
    function Big5Decoder(options) {
        var fatal = options.fatal;
        var big5_lead = 0, big5_pending = null;
        this.decode = function (byte_pointer) {
            if (big5_pending !== null) {
                var pending = big5_pending;
                big5_pending = null;
                return pending;
            }
            var bite = byte_pointer.get();
            if (bite === EOF_byte && big5_lead === 0) {
                return EOF_code_point;
            }
            if (bite === EOF_byte && big5_lead !== 0) {
                big5_lead = 0;
                return decoderError(fatal);
            }
            byte_pointer.offset(1);
            if (big5_lead !== 0) {
                var lead = big5_lead;
                var pointer = null;
                big5_lead = 0;
                var offset = bite < 127 ? 64 : 98;
                if (inRange(bite, 64, 126) || inRange(bite, 161, 254)) {
                    pointer = (lead - 129) * 157 + (bite - offset);
                }
                if (pointer === 1133) {
                    big5_pending = 772;
                    return 202;
                }
                if (pointer === 1135) {
                    big5_pending = 780;
                    return 202;
                }
                if (pointer === 1164) {
                    big5_pending = 772;
                    return 234;
                }
                if (pointer === 1166) {
                    big5_pending = 780;
                    return 234;
                }
                var code_point = pointer === null ? null : indexCodePointFor(pointer, indexes['big5']);
                if (pointer === null) {
                    byte_pointer.offset(-1);
                }
                if (code_point === null) {
                    return decoderError(fatal);
                }
                return code_point;
            }
            if (inRange(bite, 0, 127)) {
                return bite;
            }
            if (inRange(bite, 129, 254)) {
                big5_lead = bite;
                return null;
            }
            return decoderError(fatal);
        };
    }
    function Big5Encoder(options) {
        var fatal = options.fatal;
        this.encode = function (output_byte_stream, code_point_pointer) {
            var code_point = code_point_pointer.get();
            if (code_point === EOF_code_point) {
                return EOF_byte;
            }
            code_point_pointer.offset(1);
            if (inRange(code_point, 0, 127)) {
                return output_byte_stream.emit(code_point);
            }
            var pointer = indexPointerFor(code_point, indexes['big5']);
            if (pointer === null) {
                return encoderError(code_point);
            }
            var lead = div(pointer, 157) + 129;
            var trail = pointer % 157;
            var offset = trail < 63 ? 64 : 98;
            return output_byte_stream.emit(lead, trail + offset);
        };
    }
    name_to_encoding['big5'].getEncoder = function (options) {
        return new Big5Encoder(options);
    };
    name_to_encoding['big5'].getDecoder = function (options) {
        return new Big5Decoder(options);
    };
    function EUCJPDecoder(options) {
        var fatal = options.fatal;
        var eucjp_first = 0, eucjp_second = 0;
        this.decode = function (byte_pointer) {
            var bite = byte_pointer.get();
            if (bite === EOF_byte) {
                if (eucjp_first === 0 && eucjp_second === 0) {
                    return EOF_code_point;
                }
                eucjp_first = 0;
                eucjp_second = 0;
                return decoderError(fatal);
            }
            byte_pointer.offset(1);
            var lead, code_point;
            if (eucjp_second !== 0) {
                lead = eucjp_second;
                eucjp_second = 0;
                code_point = null;
                if (inRange(lead, 161, 254) && inRange(bite, 161, 254)) {
                    code_point = indexCodePointFor((lead - 161) * 94 + bite - 161, indexes['jis0212']);
                }
                if (!inRange(bite, 161, 254)) {
                    byte_pointer.offset(-1);
                }
                if (code_point === null) {
                    return decoderError(fatal);
                }
                return code_point;
            }
            if (eucjp_first === 142 && inRange(bite, 161, 223)) {
                eucjp_first = 0;
                return 65377 + bite - 161;
            }
            if (eucjp_first === 143 && inRange(bite, 161, 254)) {
                eucjp_first = 0;
                eucjp_second = bite;
                return null;
            }
            if (eucjp_first !== 0) {
                lead = eucjp_first;
                eucjp_first = 0;
                code_point = null;
                if (inRange(lead, 161, 254) && inRange(bite, 161, 254)) {
                    code_point = indexCodePointFor((lead - 161) * 94 + bite - 161, indexes['jis0208']);
                }
                if (!inRange(bite, 161, 254)) {
                    byte_pointer.offset(-1);
                }
                if (code_point === null) {
                    return decoderError(fatal);
                }
                return code_point;
            }
            if (inRange(bite, 0, 127)) {
                return bite;
            }
            if (bite === 142 || bite === 143 || inRange(bite, 161, 254)) {
                eucjp_first = bite;
                return null;
            }
            return decoderError(fatal);
        };
    }
    function EUCJPEncoder(options) {
        var fatal = options.fatal;
        this.encode = function (output_byte_stream, code_point_pointer) {
            var code_point = code_point_pointer.get();
            if (code_point === EOF_code_point) {
                return EOF_byte;
            }
            code_point_pointer.offset(1);
            if (inRange(code_point, 0, 127)) {
                return output_byte_stream.emit(code_point);
            }
            if (code_point === 165) {
                return output_byte_stream.emit(92);
            }
            if (code_point === 8254) {
                return output_byte_stream.emit(126);
            }
            if (inRange(code_point, 65377, 65439)) {
                return output_byte_stream.emit(142, code_point - 65377 + 161);
            }
            var pointer = indexPointerFor(code_point, indexes['jis0208']);
            if (pointer === null) {
                return encoderError(code_point);
            }
            var lead = div(pointer, 94) + 161;
            var trail = pointer % 94 + 161;
            return output_byte_stream.emit(lead, trail);
        };
    }
    name_to_encoding['euc-jp'].getEncoder = function (options) {
        return new EUCJPEncoder(options);
    };
    name_to_encoding['euc-jp'].getDecoder = function (options) {
        return new EUCJPDecoder(options);
    };
    function ISO2022JPDecoder(options) {
        var fatal = options.fatal;
        var state = {
            ASCII: 0,
            escape_start: 1,
            escape_middle: 2,
            escape_final: 3,
            lead: 4,
            trail: 5,
            Katakana: 6
        };
        var iso2022jp_state = state.ASCII, iso2022jp_jis0212 = false, iso2022jp_lead = 0;
        this.decode = function (byte_pointer) {
            var bite = byte_pointer.get();
            if (bite !== EOF_byte) {
                byte_pointer.offset(1);
            }
            switch (iso2022jp_state) {
            default:
            case state.ASCII:
                if (bite === 27) {
                    iso2022jp_state = state.escape_start;
                    return null;
                }
                if (inRange(bite, 0, 127)) {
                    return bite;
                }
                if (bite === EOF_byte) {
                    return EOF_code_point;
                }
                return decoderError(fatal);
            case state.escape_start:
                if (bite === 36 || bite === 40) {
                    iso2022jp_lead = bite;
                    iso2022jp_state = state.escape_middle;
                    return null;
                }
                if (bite !== EOF_byte) {
                    byte_pointer.offset(-1);
                }
                iso2022jp_state = state.ASCII;
                return decoderError(fatal);
            case state.escape_middle:
                var lead = iso2022jp_lead;
                iso2022jp_lead = 0;
                if (lead === 36 && (bite === 64 || bite === 66)) {
                    iso2022jp_jis0212 = false;
                    iso2022jp_state = state.lead;
                    return null;
                }
                if (lead === 36 && bite === 40) {
                    iso2022jp_state = state.escape_final;
                    return null;
                }
                if (lead === 40 && (bite === 66 || bite === 74)) {
                    iso2022jp_state = state.ASCII;
                    return null;
                }
                if (lead === 40 && bite === 73) {
                    iso2022jp_state = state.Katakana;
                    return null;
                }
                if (bite === EOF_byte) {
                    byte_pointer.offset(-1);
                } else {
                    byte_pointer.offset(-2);
                }
                iso2022jp_state = state.ASCII;
                return decoderError(fatal);
            case state.escape_final:
                if (bite === 68) {
                    iso2022jp_jis0212 = true;
                    iso2022jp_state = state.lead;
                    return null;
                }
                if (bite === EOF_byte) {
                    byte_pointer.offset(-2);
                } else {
                    byte_pointer.offset(-3);
                }
                iso2022jp_state = state.ASCII;
                return decoderError(fatal);
            case state.lead:
                if (bite === 10) {
                    iso2022jp_state = state.ASCII;
                    return decoderError(fatal, 10);
                }
                if (bite === 27) {
                    iso2022jp_state = state.escape_start;
                    return null;
                }
                if (bite === EOF_byte) {
                    return EOF_code_point;
                }
                iso2022jp_lead = bite;
                iso2022jp_state = state.trail;
                return null;
            case state.trail:
                iso2022jp_state = state.lead;
                if (bite === EOF_byte) {
                    return decoderError(fatal);
                }
                var code_point = null;
                var pointer = (iso2022jp_lead - 33) * 94 + bite - 33;
                if (inRange(iso2022jp_lead, 33, 126) && inRange(bite, 33, 126)) {
                    code_point = iso2022jp_jis0212 === false ? indexCodePointFor(pointer, indexes['jis0208']) : indexCodePointFor(pointer, indexes['jis0212']);
                }
                if (code_point === null) {
                    return decoderError(fatal);
                }
                return code_point;
            case state.Katakana:
                if (bite === 27) {
                    iso2022jp_state = state.escape_start;
                    return null;
                }
                if (inRange(bite, 33, 95)) {
                    return 65377 + bite - 33;
                }
                if (bite === EOF_byte) {
                    return EOF_code_point;
                }
                return decoderError(fatal);
            }
        };
    }
    function ISO2022JPEncoder(options) {
        var fatal = options.fatal;
        var state = {
            ASCII: 0,
            lead: 1,
            Katakana: 2
        };
        var iso2022jp_state = state.ASCII;
        this.encode = function (output_byte_stream, code_point_pointer) {
            var code_point = code_point_pointer.get();
            if (code_point === EOF_code_point) {
                return EOF_byte;
            }
            code_point_pointer.offset(1);
            if ((inRange(code_point, 0, 127) || code_point === 165 || code_point === 8254) && iso2022jp_state !== state.ASCII) {
                code_point_pointer.offset(-1);
                iso2022jp_state = state.ASCII;
                return output_byte_stream.emit(27, 40, 66);
            }
            if (inRange(code_point, 0, 127)) {
                return output_byte_stream.emit(code_point);
            }
            if (code_point === 165) {
                return output_byte_stream.emit(92);
            }
            if (code_point === 8254) {
                return output_byte_stream.emit(126);
            }
            if (inRange(code_point, 65377, 65439) && iso2022jp_state !== state.Katakana) {
                code_point_pointer.offset(-1);
                iso2022jp_state = state.Katakana;
                return output_byte_stream.emit(27, 40, 73);
            }
            if (inRange(code_point, 65377, 65439)) {
                return output_byte_stream.emit(code_point - 65377 - 33);
            }
            if (iso2022jp_state !== state.lead) {
                code_point_pointer.offset(-1);
                iso2022jp_state = state.lead;
                return output_byte_stream.emit(27, 36, 66);
            }
            var pointer = indexPointerFor(code_point, indexes['jis0208']);
            if (pointer === null) {
                return encoderError(code_point);
            }
            var lead = div(pointer, 94) + 33;
            var trail = pointer % 94 + 33;
            return output_byte_stream.emit(lead, trail);
        };
    }
    name_to_encoding['iso-2022-jp'].getEncoder = function (options) {
        return new ISO2022JPEncoder(options);
    };
    name_to_encoding['iso-2022-jp'].getDecoder = function (options) {
        return new ISO2022JPDecoder(options);
    };
    function ShiftJISDecoder(options) {
        var fatal = options.fatal;
        var shiftjis_lead = 0;
        this.decode = function (byte_pointer) {
            var bite = byte_pointer.get();
            if (bite === EOF_byte && shiftjis_lead === 0) {
                return EOF_code_point;
            }
            if (bite === EOF_byte && shiftjis_lead !== 0) {
                shiftjis_lead = 0;
                return decoderError(fatal);
            }
            byte_pointer.offset(1);
            if (shiftjis_lead !== 0) {
                var lead = shiftjis_lead;
                shiftjis_lead = 0;
                if (inRange(bite, 64, 126) || inRange(bite, 128, 252)) {
                    var offset = bite < 127 ? 64 : 65;
                    var lead_offset = lead < 160 ? 129 : 193;
                    var code_point = indexCodePointFor((lead - lead_offset) * 188 + bite - offset, indexes['jis0208']);
                    if (code_point === null) {
                        return decoderError(fatal);
                    }
                    return code_point;
                }
                byte_pointer.offset(-1);
                return decoderError(fatal);
            }
            if (inRange(bite, 0, 128)) {
                return bite;
            }
            if (inRange(bite, 161, 223)) {
                return 65377 + bite - 161;
            }
            if (inRange(bite, 129, 159) || inRange(bite, 224, 252)) {
                shiftjis_lead = bite;
                return null;
            }
            return decoderError(fatal);
        };
    }
    function ShiftJISEncoder(options) {
        var fatal = options.fatal;
        this.encode = function (output_byte_stream, code_point_pointer) {
            var code_point = code_point_pointer.get();
            if (code_point === EOF_code_point) {
                return EOF_byte;
            }
            code_point_pointer.offset(1);
            if (inRange(code_point, 0, 128)) {
                return output_byte_stream.emit(code_point);
            }
            if (code_point === 165) {
                return output_byte_stream.emit(92);
            }
            if (code_point === 8254) {
                return output_byte_stream.emit(126);
            }
            if (inRange(code_point, 65377, 65439)) {
                return output_byte_stream.emit(code_point - 65377 + 161);
            }
            var pointer = indexPointerFor(code_point, indexes['jis0208']);
            if (pointer === null) {
                return encoderError(code_point);
            }
            var lead = div(pointer, 188);
            var lead_offset = lead < 31 ? 129 : 193;
            var trail = pointer % 188;
            var offset = trail < 63 ? 64 : 65;
            return output_byte_stream.emit(lead + lead_offset, trail + offset);
        };
    }
    name_to_encoding['shift_jis'].getEncoder = function (options) {
        return new ShiftJISEncoder(options);
    };
    name_to_encoding['shift_jis'].getDecoder = function (options) {
        return new ShiftJISDecoder(options);
    };
    function EUCKRDecoder(options) {
        var fatal = options.fatal;
        var euckr_lead = 0;
        this.decode = function (byte_pointer) {
            var bite = byte_pointer.get();
            if (bite === EOF_byte && euckr_lead === 0) {
                return EOF_code_point;
            }
            if (bite === EOF_byte && euckr_lead !== 0) {
                euckr_lead = 0;
                return decoderError(fatal);
            }
            byte_pointer.offset(1);
            if (euckr_lead !== 0) {
                var lead = euckr_lead;
                var pointer = null;
                euckr_lead = 0;
                if (inRange(lead, 129, 198)) {
                    var temp = (26 + 26 + 126) * (lead - 129);
                    if (inRange(bite, 65, 90)) {
                        pointer = temp + bite - 65;
                    } else if (inRange(bite, 97, 122)) {
                        pointer = temp + 26 + bite - 97;
                    } else if (inRange(bite, 129, 254)) {
                        pointer = temp + 26 + 26 + bite - 129;
                    }
                }
                if (inRange(lead, 199, 253) && inRange(bite, 161, 254)) {
                    pointer = (26 + 26 + 126) * (199 - 129) + (lead - 199) * 94 + (bite - 161);
                }
                var code_point = pointer === null ? null : indexCodePointFor(pointer, indexes['euc-kr']);
                if (pointer === null) {
                    byte_pointer.offset(-1);
                }
                if (code_point === null) {
                    return decoderError(fatal);
                }
                return code_point;
            }
            if (inRange(bite, 0, 127)) {
                return bite;
            }
            if (inRange(bite, 129, 253)) {
                euckr_lead = bite;
                return null;
            }
            return decoderError(fatal);
        };
    }
    function EUCKREncoder(options) {
        var fatal = options.fatal;
        this.encode = function (output_byte_stream, code_point_pointer) {
            var code_point = code_point_pointer.get();
            if (code_point === EOF_code_point) {
                return EOF_byte;
            }
            code_point_pointer.offset(1);
            if (inRange(code_point, 0, 127)) {
                return output_byte_stream.emit(code_point);
            }
            var pointer = indexPointerFor(code_point, indexes['euc-kr']);
            if (pointer === null) {
                return encoderError(code_point);
            }
            var lead, trail;
            if (pointer < (26 + 26 + 126) * (199 - 129)) {
                lead = div(pointer, 26 + 26 + 126) + 129;
                trail = pointer % (26 + 26 + 126);
                var offset = trail < 26 ? 65 : trail < 26 + 26 ? 71 : 77;
                return output_byte_stream.emit(lead, trail + offset);
            }
            pointer = pointer - (26 + 26 + 126) * (199 - 129);
            lead = div(pointer, 94) + 199;
            trail = pointer % 94 + 161;
            return output_byte_stream.emit(lead, trail);
        };
    }
    name_to_encoding['euc-kr'].getEncoder = function (options) {
        return new EUCKREncoder(options);
    };
    name_to_encoding['euc-kr'].getDecoder = function (options) {
        return new EUCKRDecoder(options);
    };
    function ISO2022KRDecoder(options) {
        var fatal = options.fatal;
        var state = {
            ASCII: 0,
            escape_start: 1,
            escape_middle: 2,
            escape_end: 3,
            lead: 4,
            trail: 5
        };
        var iso2022kr_state = state.ASCII, iso2022kr_lead = 0;
        this.decode = function (byte_pointer) {
            var bite = byte_pointer.get();
            if (bite !== EOF_byte) {
                byte_pointer.offset(1);
            }
            switch (iso2022kr_state) {
            default:
            case state.ASCII:
                if (bite === 14) {
                    iso2022kr_state = state.lead;
                    return null;
                }
                if (bite === 15) {
                    return null;
                }
                if (bite === 27) {
                    iso2022kr_state = state.escape_start;
                    return null;
                }
                if (inRange(bite, 0, 127)) {
                    return bite;
                }
                if (bite === EOF_byte) {
                    return EOF_code_point;
                }
                return decoderError(fatal);
            case state.escape_start:
                if (bite === 36) {
                    iso2022kr_state = state.escape_middle;
                    return null;
                }
                if (bite !== EOF_byte) {
                    byte_pointer.offset(-1);
                }
                iso2022kr_state = state.ASCII;
                return decoderError(fatal);
            case state.escape_middle:
                if (bite === 41) {
                    iso2022kr_state = state.escape_end;
                    return null;
                }
                if (bite === EOF_byte) {
                    byte_pointer.offset(-1);
                } else {
                    byte_pointer.offset(-2);
                }
                iso2022kr_state = state.ASCII;
                return decoderError(fatal);
            case state.escape_end:
                if (bite === 67) {
                    iso2022kr_state = state.ASCII;
                    return null;
                }
                if (bite === EOF_byte) {
                    byte_pointer.offset(-2);
                } else {
                    byte_pointer.offset(-3);
                }
                iso2022kr_state = state.ASCII;
                return decoderError(fatal);
            case state.lead:
                if (bite === 10) {
                    iso2022kr_state = state.ASCII;
                    return decoderError(fatal, 10);
                }
                if (bite === 14) {
                    return null;
                }
                if (bite === 15) {
                    iso2022kr_state = state.ASCII;
                    return null;
                }
                if (bite === EOF_byte) {
                    return EOF_code_point;
                }
                iso2022kr_lead = bite;
                iso2022kr_state = state.trail;
                return null;
            case state.trail:
                iso2022kr_state = state.lead;
                if (bite === EOF_byte) {
                    return decoderError(fatal);
                }
                var code_point = null;
                if (inRange(iso2022kr_lead, 33, 70) && inRange(bite, 33, 126)) {
                    code_point = indexCodePointFor((26 + 26 + 126) * (iso2022kr_lead - 1) + 26 + 26 + bite - 1, indexes['euc-kr']);
                } else if (inRange(iso2022kr_lead, 71, 126) && inRange(bite, 33, 126)) {
                    code_point = indexCodePointFor((26 + 26 + 126) * (199 - 129) + (iso2022kr_lead - 71) * 94 + (bite - 33), indexes['euc-kr']);
                }
                if (code_point !== null) {
                    return code_point;
                }
                return decoderError(fatal);
            }
        };
    }
    function ISO2022KREncoder(options) {
        var fatal = options.fatal;
        var state = {
            ASCII: 0,
            lead: 1
        };
        var iso2022kr_initialization = false, iso2022kr_state = state.ASCII;
        this.encode = function (output_byte_stream, code_point_pointer) {
            var code_point = code_point_pointer.get();
            if (code_point === EOF_code_point) {
                return EOF_byte;
            }
            if (!iso2022kr_initialization) {
                iso2022kr_initialization = true;
                output_byte_stream.emit(27, 36, 41, 67);
            }
            code_point_pointer.offset(1);
            if (inRange(code_point, 0, 127) && iso2022kr_state !== state.ASCII) {
                code_point_pointer.offset(-1);
                iso2022kr_state = state.ASCII;
                return output_byte_stream.emit(15);
            }
            if (inRange(code_point, 0, 127)) {
                return output_byte_stream.emit(code_point);
            }
            if (iso2022kr_state !== state.lead) {
                code_point_pointer.offset(-1);
                iso2022kr_state = state.lead;
                return output_byte_stream.emit(14);
            }
            var pointer = indexPointerFor(code_point, indexes['euc-kr']);
            if (pointer === null) {
                return encoderError(code_point);
            }
            var lead, trail;
            if (pointer < (26 + 26 + 126) * (199 - 129)) {
                lead = div(pointer, 26 + 26 + 126) + 1;
                trail = pointer % (26 + 26 + 126) - 26 - 26 + 1;
                if (!inRange(lead, 33, 70) || !inRange(trail, 33, 126)) {
                    return encoderError(code_point);
                }
                return output_byte_stream.emit(lead, trail);
            }
            pointer = pointer - (26 + 26 + 126) * (199 - 129);
            lead = div(pointer, 94) + 71;
            trail = pointer % 94 + 33;
            if (!inRange(lead, 71, 126) || !inRange(trail, 33, 126)) {
                return encoderError(code_point);
            }
            return output_byte_stream.emit(lead, trail);
        };
    }
    name_to_encoding['iso-2022-kr'].getEncoder = function (options) {
        return new ISO2022KREncoder(options);
    };
    name_to_encoding['iso-2022-kr'].getDecoder = function (options) {
        return new ISO2022KRDecoder(options);
    };
    function UTF16Decoder(utf16_be, options) {
        var fatal = options.fatal;
        var utf16_lead_byte = null, utf16_lead_surrogate = null;
        this.decode = function (byte_pointer) {
            var bite = byte_pointer.get();
            if (bite === EOF_byte && utf16_lead_byte === null && utf16_lead_surrogate === null) {
                return EOF_code_point;
            }
            if (bite === EOF_byte && (utf16_lead_byte !== null || utf16_lead_surrogate !== null)) {
                return decoderError(fatal);
            }
            byte_pointer.offset(1);
            if (utf16_lead_byte === null) {
                utf16_lead_byte = bite;
                return null;
            }
            var code_point;
            if (utf16_be) {
                code_point = (utf16_lead_byte << 8) + bite;
            } else {
                code_point = (bite << 8) + utf16_lead_byte;
            }
            utf16_lead_byte = null;
            if (utf16_lead_surrogate !== null) {
                var lead_surrogate = utf16_lead_surrogate;
                utf16_lead_surrogate = null;
                if (inRange(code_point, 56320, 57343)) {
                    return 65536 + (lead_surrogate - 55296) * 1024 + (code_point - 56320);
                }
                byte_pointer.offset(-2);
                return decoderError(fatal);
            }
            if (inRange(code_point, 55296, 56319)) {
                utf16_lead_surrogate = code_point;
                return null;
            }
            if (inRange(code_point, 56320, 57343)) {
                return decoderError(fatal);
            }
            return code_point;
        };
    }
    function UTF16Encoder(utf16_be, options) {
        var fatal = options.fatal;
        this.encode = function (output_byte_stream, code_point_pointer) {
            function convert_to_bytes(code_unit) {
                var byte1 = code_unit >> 8;
                var byte2 = code_unit & 255;
                if (utf16_be) {
                    return output_byte_stream.emit(byte1, byte2);
                }
                return output_byte_stream.emit(byte2, byte1);
            }
            var code_point = code_point_pointer.get();
            if (code_point === EOF_code_point) {
                return EOF_byte;
            }
            code_point_pointer.offset(1);
            if (inRange(code_point, 55296, 57343)) {
                encoderError(code_point);
            }
            if (code_point <= 65535) {
                return convert_to_bytes(code_point);
            }
            var lead = div(code_point - 65536, 1024) + 55296;
            var trail = (code_point - 65536) % 1024 + 56320;
            convert_to_bytes(lead);
            return convert_to_bytes(trail);
        };
    }
    name_to_encoding['utf-16'].getEncoder = function (options) {
        return new UTF16Encoder(false, options);
    };
    name_to_encoding['utf-16'].getDecoder = function (options) {
        return new UTF16Decoder(false, options);
    };
    name_to_encoding['utf-16be'].getEncoder = function (options) {
        return new UTF16Encoder(true, options);
    };
    name_to_encoding['utf-16be'].getDecoder = function (options) {
        return new UTF16Decoder(true, options);
    };
    function detectEncoding(label, input_stream) {
        if (input_stream.match([
                255,
                254
            ])) {
            input_stream.offset(2);
            return 'utf-16';
        }
        if (input_stream.match([
                254,
                255
            ])) {
            input_stream.offset(2);
            return 'utf-16be';
        }
        if (input_stream.match([
                239,
                187,
                191
            ])) {
            input_stream.offset(3);
            return 'utf-8';
        }
        return label;
    }
    var DEFAULT_ENCODING = 'utf-8';
    function TextEncoder(opt_encoding, options) {
        if (!this || this === global) {
            return new TextEncoder(opt_encoding, options);
        }
        opt_encoding = opt_encoding ? String(opt_encoding) : DEFAULT_ENCODING;
        options = Object(options);
        this._encoding = getEncoding(opt_encoding);
        this._streaming = false;
        this._encoder = null;
        this._options = { fatal: Boolean(options.fatal) };
        if (Object.defineProperty) {
            Object.defineProperty(this, 'encoding', {
                get: function () {
                    return this._encoding.name;
                }
            });
        } else {
            this.encoding = this._encoding.name;
        }
        return this;
    }
    TextEncoder.prototype = {
        encode: function encode(opt_string, options) {
            opt_string = opt_string ? String(opt_string) : '';
            options = Object(options);
            if (!this._streaming) {
                this._encoder = this._encoding.getEncoder(this._options);
            }
            this._streaming = Boolean(options.stream);
            var bytes = [];
            var output_stream = new ByteOutputStream(bytes);
            var input_stream = new CodePointInputStream(opt_string);
            while (input_stream.get() !== EOF_code_point) {
                this._encoder.encode(output_stream, input_stream);
            }
            if (!this._streaming) {
                var last_byte;
                do {
                    last_byte = this._encoder.encode(output_stream, input_stream);
                } while (last_byte !== EOF_byte);
                this._encoder = null;
            }
            return new Uint8Array(bytes);
        }
    };
    function TextDecoder(opt_encoding, options) {
        if (!this || this === global) {
            return new TextDecoder(opt_encoding, options);
        }
        opt_encoding = opt_encoding ? String(opt_encoding) : DEFAULT_ENCODING;
        options = Object(options);
        this._encoding = getEncoding(opt_encoding);
        this._streaming = false;
        this._decoder = null;
        this._options = { fatal: Boolean(options.fatal) };
        if (Object.defineProperty) {
            Object.defineProperty(this, 'encoding', {
                get: function () {
                    return this._encoding.name;
                }
            });
        } else {
            this.encoding = this._encoding.name;
        }
        return this;
    }
    TextDecoder.prototype = {
        decode: function decode(opt_view, options) {
            if (opt_view && !('buffer' in opt_view && 'byteOffset' in opt_view && 'byteLength' in opt_view)) {
                throw new TypeError('Expected ArrayBufferView');
            } else if (!opt_view) {
                opt_view = new Uint8Array(0);
            }
            options = Object(options);
            if (!this._streaming) {
                this._decoder = this._encoding.getDecoder(this._options);
            }
            this._streaming = Boolean(options.stream);
            var bytes = new Uint8Array(opt_view.buffer, opt_view.byteOffset, opt_view.byteLength);
            var input_stream = new ByteInputStream(bytes);
            var detected = detectEncoding(this._encoding.name, input_stream);
            if (getEncoding(detected) !== this._encoding) {
                throw new Error('BOM mismatch');
            }
            var output_stream = new CodePointOutputStream(), code_point;
            while (input_stream.get() !== EOF_byte) {
                code_point = this._decoder.decode(input_stream);
                if (code_point !== null && code_point !== EOF_code_point) {
                    output_stream.emit(code_point);
                }
            }
            if (!this._streaming) {
                do {
                    code_point = this._decoder.decode(input_stream);
                    if (code_point !== null && code_point !== EOF_code_point) {
                        output_stream.emit(code_point);
                    }
                } while (code_point !== EOF_code_point);
                this._decoder = null;
            }
            return output_stream.string();
        }
    };
    global['TextEncoder'] = global['TextEncoder'] || TextEncoder;
    global['TextDecoder'] = global['TextDecoder'] || TextDecoder;
}(this));