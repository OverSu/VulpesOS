define([
    'mimeparser',
    'mimefuncs',
    'exports'
], function (MimeParser, mimefuncs, exports) {
    function TextParser(partDef) {
        this._partDef = partDef;
        var parser = this._parser = new MimeParser();
        this._totalBytes = 0;
        var charsetPart = '', formatPart = '';
        if (partDef.params && partDef.params.charset) {
            charsetPart = '; charset="' + partDef.params.charset.toLowerCase() + '"';
        }
        if (partDef.params && partDef.params.format) {
            formatPart = '; format="' + partDef.params.format.toLowerCase() + '"';
        }
        parser.write('Content-Type: ' + partDef.type.toLowerCase() + '/' + partDef.subtype.toLowerCase() + charsetPart + formatPart + '\r\n');
        if (partDef.encoding) {
            parser.write('Content-Transfer-Encoding: ' + partDef.encoding + '\r\n');
        }
        parser.write('\r\n');
        if (partDef.pendingBuffer) {
            this.parse(partDef.pendingBuffer);
        }
    }
    TextParser.prototype = {
        parse: function (buffer) {
            this._totalBytes += buffer.length;
            this._parser.write(buffer);
        },
        complete: function () {
            this._parser.end();
            var str = mimefuncs.charset.decode(this._parser.node.content, 'utf-8');
            return {
                bytesFetched: this._totalBytes,
                text: str
            };
        }
    };
    exports.TextParser = TextParser;
});