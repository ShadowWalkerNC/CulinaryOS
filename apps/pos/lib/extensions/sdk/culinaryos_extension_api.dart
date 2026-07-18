import 'dart:isolate';
import 'package:flutter/widgets.dart';

/// The complete typed API surface exposed to every extension.
/// Extensions receive this object — nothing else.
abstract class CulinaryOSExtensionAPI {

  // ── Menu ──────────────────────────────────────────────────────────────────
  Future<List<MenuItem>> getMenuItems();
  Future<List<ModifierGroup>> getModifierGroups({required String itemId});

  // ── Orders ────────────────────────────────────────────────────────────────
  Future<void> addItemToOrder({
    required String orderId,
    required String menuItemId,
    List<String> selectedModifierIds = const [],
    String? specialNote,
  });
  Future<void> removeItemFromOrder({
    required String orderId,
    required String orderItemId,
  });
  Future<Order?> getCurrentOrder();

  // ── UI ────────────────────────────────────────────────────────────────────
  Future<void> showBottomSheet({required String title, required Widget content});
  Future<void> showToast({required String message, ToastType type = ToastType.info});
  Future<bool> showConfirmDialog({
    required String title,
    required String body,
    String confirmLabel = 'Confirm',
    String cancelLabel = 'Cancel',
  });

  // ── Settings ──────────────────────────────────────────────────────────────
  T getSetting<T>(String key);
  Future<void> setSetting<T>(String key, T value);

  // ── Events ────────────────────────────────────────────────────────────────
  Stream<ExtensionEvent> on(String hookName);

  // ── Logging ───────────────────────────────────────────────────────────────
  void log(String message, {LogLevel level = LogLevel.info});
}

enum ToastType  { info, success, warning, error }
enum LogLevel   { debug, info, warning, error }

class ExtensionEvent {
  final String hook;
  final Map<String, dynamic> payload;
  const ExtensionEvent({required this.hook, required this.payload});
}

class MenuItem {
  final String id;
  final String name;
  final int priceCents;
  final List<String> allergens;
  final bool is86d;
  const MenuItem({
    required this.id,
    required this.name,
    required this.priceCents,
    required this.allergens,
    required this.is86d,
  });
}

class ModifierGroup {
  final String id;
  final String name;
  final List<Modifier> options;
  final int minSelections;
  final int maxSelections;
  const ModifierGroup({
    required this.id,
    required this.name,
    required this.options,
    required this.minSelections,
    required this.maxSelections,
  });
}

class Modifier {
  final String id;
  final String name;
  final int priceDeltaCents;
  const Modifier({
    required this.id,
    required this.name,
    required this.priceDeltaCents,
  });
}

class Order {
  final String id;
  final List<OrderItem> items;
  final int subtotalCents;
  final String status;
  const Order({
    required this.id,
    required this.items,
    required this.subtotalCents,
    required this.status,
  });
}

class OrderItem {
  final String id;
  final String menuItemId;
  final String menuItemName;
  final List<String> selectedModifierIds;
  final String? specialNote;
  const OrderItem({
    required this.id,
    required this.menuItemId,
    required this.menuItemName,
    required this.selectedModifierIds,
    this.specialNote,
  });
}
