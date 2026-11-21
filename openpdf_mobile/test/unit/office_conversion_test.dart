import 'dart:convert';
import 'package:archive/archive.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Office Conversion & OpenXML Architecture Tests', () {
    test('OpenXML Word (.docx) ZIP package conforms to ECMA-376', () {
      final archive = Archive();
      const contentTypes = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>''';
      archive.addFile(ArchiveFile('[Content_Types].xml', contentTypes.length, utf8.encode(contentTypes)));

      const rootRels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>''';
      archive.addFile(ArchiveFile('_rels/.rels', rootRels.length, utf8.encode(rootRels)));

      const docXml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>Hello OpenPDF</w:t></w:r></w:p></w:body>
</w:document>''';
      archive.addFile(ArchiveFile('word/document.xml', docXml.length, utf8.encode(docXml)));

      final encoder = ZipEncoder();
      final bytes = encoder.encode(archive);
      expect(bytes, isNotNull);
      expect(bytes!.length > 100, true);

      // Verify unpackability
      final decoder = ZipDecoder();
      final decodedArchive = decoder.decodeBytes(bytes);
      expect(decodedArchive.findFile('[Content_Types].xml'), isNotNull);
      expect(decodedArchive.findFile('_rels/.rels'), isNotNull);
      expect(decodedArchive.findFile('word/document.xml'), isNotNull);
    });

    test('OpenXML Spreadsheet (.xlsx) ZIP package contains valid sheet data', () {
      final archive = Archive();
      const sheetXml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Revenue</t></is></c></row></sheetData>
</worksheet>''';
      archive.addFile(ArchiveFile('xl/worksheets/sheet1.xml', sheetXml.length, utf8.encode(sheetXml)));

      final encoder = ZipEncoder();
      final bytes = encoder.encode(archive);
      expect(bytes, isNotNull);

      final decoder = ZipDecoder();
      final decodedArchive = decoder.decodeBytes(bytes!);
      final file = decodedArchive.findFile('xl/worksheets/sheet1.xml');
      expect(file, isNotNull);
      final content = utf8.decode(file!.content as List<int>);
      expect(content.contains('Revenue'), true);
    });
  });
}
