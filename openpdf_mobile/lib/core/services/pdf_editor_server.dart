import 'dart:async';
import 'dart:io';
import 'package:flutter/services.dart';

/// Local on-device loopback server providing zero-latency offline file serving
/// and secure bidirectional bridge for the 100% exact website PDF editor.
class PdfEditorServer {
  HttpServer? _server;
  File? _activePdfFile;
  Function(String filename, Uint8List bytes)? onExportReceived;

  int get port => _server?.port ?? 0;
  String get baseUrl => 'http://127.0.0.1:$port';

  Future<int> start({
    File? pdfFile,
    Function(String filename, Uint8List bytes)? onExport,
  }) async {
    _activePdfFile = pdfFile;
    onExportReceived = onExport;

    // Stop previous instance if running
    await stop();

    _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    _server!.listen(_handleRequest);

    return _server!.port;
  }

  void updatePdfFile(File file) {
    _activePdfFile = file;
  }

  Future<void> stop() async {
    try {
      await _server?.close(force: true);
    } catch (_) {}
    _server = null;
  }

  Future<void> _handleRequest(HttpRequest request) async {
    final response = request.response;
    _addCorsHeaders(response);

    if (request.method == 'OPTIONS') {
      response.statusCode = HttpStatus.ok;
      await response.close();
      return;
    }

    final path = request.uri.path;

    try {
      // 1. Current PDF Document Endpoint
      if (path == '/api/document') {
        if (_activePdfFile != null && await _activePdfFile!.exists()) {
          final bytes = await _activePdfFile!.readAsBytes();
          response.statusCode = HttpStatus.ok;
          response.headers.contentType = ContentType('application', 'pdf');
          response.headers.contentLength = bytes.length;
          response.add(bytes);
        } else {
          response.statusCode = HttpStatus.notFound;
          response.write('Document file not found');
        }
        await response.close();
        return;
      }

      // 2. Export / Save Endpoint
      if (path == '/api/save' && request.method == 'POST') {
        final filename = request.uri.queryParameters['filename'] ?? 'edited_document.pdf';
        final chunks = <int>[];
        await for (final chunk in request) {
          chunks.addAll(chunk);
        }
        final bytes = Uint8List.fromList(chunks);
        if (onExportReceived != null && bytes.isNotEmpty) {
          onExportReceived!(filename, bytes);
        }
        response.statusCode = HttpStatus.ok;
        response.headers.contentType = ContentType.json;
        response.write('{"status":"ok","saved":true}');
        await response.close();
        return;
      }

      // 3. Health check endpoint
      if (path == '/api/health') {
        response.statusCode = HttpStatus.ok;
        response.headers.contentType = ContentType.json;
        response.write('{"status":"ok","engine":"OpenPDF Native Loopback","version":"4.1"}');
        await response.close();
        return;
      }

      // 4. Serve Flutter Assets from assets/web/
      String assetPath = path == '/' || path.isEmpty ? 'index.html' : path.replaceFirst(RegExp(r'^/'), '');
      // Strip query parameters
      if (assetPath.contains('?')) {
        assetPath = assetPath.substring(0, assetPath.indexOf('?'));
      }

      final fullAssetKey = 'assets/web/$assetPath';
      ByteData byteData;
      try {
        byteData = await rootBundle.load(fullAssetKey);
      } catch (_) {
        // Fallback for root index.html
        if (assetPath.isEmpty || assetPath == 'index.html') {
          byteData = await rootBundle.load('assets/web/index.html');
        } else {
          response.statusCode = HttpStatus.notFound;
          response.write('Not found: $assetPath');
          await response.close();
          return;
        }
      }

      final bytes = byteData.buffer.asUint8List(byteData.offsetInBytes, byteData.lengthInBytes);
      response.statusCode = HttpStatus.ok;
      response.headers.contentType = _getContentType(assetPath);
      response.headers.contentLength = bytes.length;
      response.add(bytes);
      await response.close();
    } catch (e) {
      try {
        response.statusCode = HttpStatus.internalServerError;
        response.write('Server Error: $e');
        await response.close();
      } catch (_) {}
    }
  }

  void _addCorsHeaders(HttpResponse response) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
  }

  ContentType _getContentType(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.html')) return ContentType.html;
    if (lower.endsWith('.css')) return ContentType('text', 'css', charset: 'utf-8');
    if (lower.endsWith('.js') || lower.endsWith('.mjs')) return ContentType('application', 'javascript', charset: 'utf-8');
    if (lower.endsWith('.json')) return ContentType.json;
    if (lower.endsWith('.png')) return ContentType('image', 'png');
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return ContentType('image', 'jpeg');
    if (lower.endsWith('.svg')) return ContentType('image', 'svg+xml');
    if (lower.endsWith('.pdf')) return ContentType('application', 'pdf');
    if (lower.endsWith('.woff2')) return ContentType('font', 'woff2');
    if (lower.endsWith('.woff')) return ContentType('font', 'woff');
    if (lower.endsWith('.ttf')) return ContentType('font', 'ttf');
    return ContentType.binary;
  }
}
