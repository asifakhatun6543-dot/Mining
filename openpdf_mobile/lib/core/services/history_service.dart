import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/entities/history_entity.dart';

/// OpenPDF Studio - Persistent Local Document History Service
class HistoryService extends ChangeNotifier {
  static const String _storageKey = 'openpdf_recent_history';
  static final HistoryService instance = HistoryService._();

  List<HistoryEntity> _items = [];
  bool _isInitialized = false;

  HistoryService._();

  List<HistoryEntity> get items => List.unmodifiable(_items);
  int get count => _items.length;

  Future<void> init() async {
    if (_isInitialized) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw != null) {
        final List<dynamic> decoded = jsonDecode(raw);
        _items = decoded
            .map((e) => HistoryEntity.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {
      _items = [];
    }
    _isInitialized = true;
    notifyListeners();
  }

  Future<void> addRecord({
    required String fileName,
    String? filePath,
    required String toolUsed,
    required String fileType,
    required String sizeFormatted,
  }) async {
    await init();

    // Prevent duplicate clutter
    _items.removeWhere((item) => item.fileName == fileName && item.toolUsed == toolUsed);

    final record = HistoryEntity(
      id: 'doc_${DateTime.now().millisecondsSinceEpoch}',
      fileName: fileName,
      filePath: filePath,
      toolUsed: toolUsed,
      fileType: fileType.toLowerCase(),
      sizeFormatted: sizeFormatted,
      timestamp: DateTime.now(),
    );

    _items.insert(0, record);

    // Keep top 30 records
    if (_items.length > 30) {
      _items = _items.sublist(0, 30);
    }

    await _persist();
    notifyListeners();
  }

  Future<void> removeRecord(String id) async {
    await init();
    _items.removeWhere((item) => item.id == id);
    await _persist();
    notifyListeners();
  }

  Future<void> clearAll() async {
    await init();
    _items.clear();
    await _persist();
    notifyListeners();
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = jsonEncode(_items.map((e) => e.toJson()).toList());
      await prefs.setString(_storageKey, encoded);
    } catch (_) {}
  }
}
