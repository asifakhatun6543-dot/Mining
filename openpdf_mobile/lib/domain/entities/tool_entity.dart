import 'package:flutter/material.dart';

enum ToolCategory {
  all,
  ai,
  convertFrom,
  convertTo,
  optimize,
  edit,
  organize,
  security,
}

/// Represents an executable PDF/Document tool
class ToolEntity {
  final String id;
  final String title;
  final String description;
  final ToolCategory category;
  final IconData icon;
  final Color accentColor;
  final String? badge;
  final List<String> keywords;
  final bool isPopular;
  final bool isFavorite;

  const ToolEntity({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.icon,
    required this.accentColor,
    this.badge,
    required this.keywords,
    this.isPopular = false,
    this.isFavorite = false,
  });

  ToolEntity copyWith({
    bool? isFavorite,
  }) {
    return ToolEntity(
      id: id,
      title: title,
      description: description,
      category: category,
      icon: icon,
      accentColor: accentColor,
      badge: badge,
      keywords: keywords,
      isPopular: isPopular,
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }

  String get categoryName {
    switch (category) {
      case ToolCategory.all:
        return 'All Tools';
      case ToolCategory.ai:
        return 'AI & Smart';
      case ToolCategory.convertFrom:
        return 'Convert from PDF';
      case ToolCategory.convertTo:
        return 'Convert to PDF';
      case ToolCategory.optimize:
        return 'Optimize & Scan';
      case ToolCategory.edit:
        return 'Edit & Sign';
      case ToolCategory.organize:
        return 'Organize';
      case ToolCategory.security:
        return 'Security';
    }
  }
}
